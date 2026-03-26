/* sunrise-sunset@mutex.io - Sun position calculator
 *
 * Computes sunrise, sunset, and twilight times (civil, nautical, astronomical)
 * using the NOAA solar equations. All times are returned in local time.
 */

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const DEG2RAD = Math.PI / 180.0;
const RAD2DEG = 180.0 / Math.PI;

const SUN_EVENT_ANGLES = {
    sunrise_sunset: -0.833,
    civil: -6.0,
    nautical: -12.0,
    astronomical: -18.0,
};

function _julianDay(year, month, day) {
    if (month <= 2) {
        year -= 1;
        month += 12;
    }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return (
        Math.floor(365.25 * (year + 4716)) +
        Math.floor(30.6001 * (month + 1)) +
        day +
        B -
        1524.5
    );
}

function _solarNoonJD(julianCentury) {
    return (
        0.0053 * Math.sin(julianCentury * 2 * Math.PI) -
        0.0069 * Math.sin(julianCentury * 4 * Math.PI)
    );
}

function _solarDeclination(julianCentury) {
    const epsilon = _obliquityCorrection(julianCentury);
    const lambda = _sunApparentLong(julianCentury);
    return Math.asin(Math.sin(epsilon) * Math.sin(lambda));
}

function _obliquityCorrection(julianCentury) {
    return (
        (23.439291 - 0.0130042 * julianCentury) * DEG2RAD +
        0.00256 * Math.cos((125.04 - 1934.136 * julianCentury) * DEG2RAD)
    );
}

function _sunApparentLong(julianCentury) {
    const trueLong = _sunTrueLong(julianCentury);
    const omega = (125.04 - 1934.136 * julianCentury) * DEG2RAD;
    return trueLong - 0.00569 * DEG2RAD - 0.00478 * Math.sin(omega) * DEG2RAD;
}

function _sunTrueLong(julianCentury) {
    const geometricMean = _sunGeometricMeanLong(julianCentury);
    const center = _equationOfCenter(julianCentury);
    return geometricMean + center;
}

function _sunGeometricMeanLong(julianCentury) {
    return (
        (280.46646 + julianCentury * (36000.76983 + julianCentury * 0.0003032)) %
        360
    ) * DEG2RAD;
}

function _equationOfCenter(julianCentury) {
    return (
        (1.9146 - 0.004817 * julianCentury - 0.000014 * julianCentury * julianCentury) *
            Math.sin(julianCentury * 35999.05029 * DEG2RAD) +
        (0.019993 - 0.000101 * julianCentury) *
            Math.sin(julianCentury * 71998.1 * DEG2RAD * 2) +
        0.00029 * Math.sin(julianCentury * 35999.05029 * DEG2RAD * 3)
    ) * DEG2RAD;
}

function _equationOfTime(julianCentury) {
    const epsilon = _obliquityCorrection(julianCentury);
    const geomMeanLong = _sunGeometricMeanLong(julianCentury);
    const ecc = _earthOrbitEccentricity(julianCentury);
    const geomMeanAnomaly =
        ((357.52911 + julianCentury * 35999.05029) % 360) * DEG2RAD;

    const y = Math.tan(epsilon / 2) * Math.tan(epsilon / 2);
    return (
        (y * Math.sin(2 * geomMeanLong) -
            2 * ecc * Math.sin(geomMeanAnomaly) +
            4 * ecc * y * Math.sin(geomMeanAnomaly) * Math.cos(2 * geomMeanLong) -
            0.5 * y * y * Math.sin(4 * geomMeanLong) -
            1.25 * ecc * ecc * Math.sin(2 * geomMeanAnomaly)) *
        RAD2DEG *
        4
    );
}

function _earthOrbitEccentricity(julianCentury) {
    return 0.016708634 - julianCentury * (0.000042037 + 0.0000001267 * julianCentury);
}

function _hourAngle(latitude, declination, zenith) {
    const latRad = latitude * DEG2RAD;
    const cosHA =
        (Math.sin(zenith * DEG2RAD) - Math.sin(latRad) * Math.sin(declination)) /
        (Math.cos(latRad) * Math.cos(declination));

    if (cosHA > 1.0) return null;
    if (cosHA < -1.0) return null;

    return Math.acos(cosHA);
}

function _computeSunEventTime(date, latitude, longitude, zenith, isSunrise) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    const JD = _julianDay(year, month, day);
    const jc = (JD - 2451545.0) / 36525.0;

    const eqTime = _equationOfTime(jc);
    const declination = _solarDeclination(jc);

    const HA = _hourAngle(latitude, declination * RAD2DEG, zenith);
    if (HA === null) return null;

    const HAdeg = HA * RAD2DEG;
    const sign = isSunrise ? -1 : 1;

    let solarNoon = 720 - 4 * longitude - eqTime + sign * HAdeg * 4;
    let localMinutes = solarNoon % 1440;
    if (localMinutes < 0) localMinutes += 1440;

    return localMinutes;
}

function _minutesToTimeStr(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function computeAllSunTimes(latitude, longitude, date = null) {
    if (!date) {
        date = new Date();
    }

    const results = {};

    for (const [key, angle] of Object.entries(SUN_EVENT_ANGLES)) {
        if (key === 'sunrise_sunset') {
            const sunriseMin = _computeSunEventTime(
                date,
                latitude,
                longitude,
                -angle,
                true
            );
            const sunsetMin = _computeSunEventTime(
                date,
                latitude,
                longitude,
                -angle,
                false
            );
            results.sunrise = sunriseMin !== null ? _minutesToTimeStr(sunriseMin) : null;
            results.sunset = sunsetMin !== null ? _minutesToTimeStr(sunsetMin) : null;
        } else {
            const riseMin = _computeSunEventTime(
                date,
                latitude,
                longitude,
                -angle,
                true
            );
            const setMin = _computeSunEventTime(
                date,
                latitude,
                longitude,
                -angle,
                false
            );
            results[`${key}_sunrise`] = riseMin !== null ? _minutesToTimeStr(riseMin) : null;
            results[`${key}_sunset`] = setMin !== null ? _minutesToTimeStr(setMin) : null;
        }
    }

    return results;
}

function getGeolocationFromTimezone() {
    const tz = GLib.TimeZone.new_local().get_identifier();

    const fallback = {
        'America/New_York': { lat: 40.7128, lon: -74.006, name: 'New York' },
        'America/Chicago': { lat: 41.8781, lon: -87.6298, name: 'Chicago' },
        'America/Denver': { lat: 39.7392, lon: -104.9903, name: 'Denver' },
        'America/Los_Angeles': { lat: 34.0522, lon: -118.2437, name: 'Los Angeles' },
        'America/Phoenix': { lat: 33.4484, lon: -112.074, name: 'Phoenix' },
        'America/Anchorage': { lat: 61.2181, lon: -149.9003, name: 'Anchorage' },
        'Pacific/Honolulu': { lat: 21.3069, lon: -157.8583, name: 'Honolulu' },
        'Europe/London': { lat: 51.5074, lon: -0.1278, name: 'London' },
        'Europe/Paris': { lat: 48.8566, lon: 2.3522, name: 'Paris' },
        'Europe/Berlin': { lat: 52.52, lon: 13.405, name: 'Berlin' },
        'Europe/Madrid': { lat: 40.4168, lon: -3.7038, name: 'Madrid' },
        'Europe/Rome': { lat: 41.9028, lon: 12.4964, name: 'Rome' },
        'Europe/Amsterdam': { lat: 52.3676, lon: 4.9041, name: 'Amsterdam' },
        'Europe/Zurich': { lat: 47.3769, lon: 8.5417, name: 'Zurich' },
        'Europe/Stockholm': { lat: 59.3293, lon: 18.0686, name: 'Stockholm' },
        'Europe/Helsinki': { lat: 60.1699, lon: 24.9384, name: 'Helsinki' },
        'Europe/Moscow': { lat: 55.7558, lon: 37.6173, name: 'Moscow' },
        'Asia/Tokyo': { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
        'Asia/Shanghai': { lat: 31.2304, lon: 121.4737, name: 'Shanghai' },
        'Asia/Kolkata': { lat: 28.6139, lon: 77.209, name: 'Delhi' },
        'Asia/Dubai': { lat: 25.2048, lon: 55.2708, name: 'Dubai' },
        'Asia/Singapore': { lat: 1.3521, lon: 103.8198, name: 'Singapore' },
        'Asia/Seoul': { lat: 37.5665, lon: 126.978, name: 'Seoul' },
        'Australia/Sydney': { lat: -33.8688, lon: 151.2093, name: 'Sydney' },
        'Australia/Melbourne': { lat: -37.8136, lon: 144.9631, name: 'Melbourne' },
        'Australia/Perth': { lat: -31.9505, lon: 115.8605, name: 'Perth' },
        'Pacific/Auckland': { lat: -36.8485, lon: 174.7633, name: 'Auckland' },
        'Africa/Cairo': { lat: 30.0444, lon: 31.2357, name: 'Cairo' },
        'Africa/Johannesburg': { lat: -33.9249, lon: 18.4241, name: 'Cape Town' },
        'America/Sao_Paulo': { lat: -23.5505, lon: -46.6333, name: 'Sao Paulo' },
        'America/Buenos_Aires': { lat: -34.6037, lon: -58.3816, name: 'Buenos Aires' },
        'America/Toronto': { lat: 43.6532, lon: -79.3832, name: 'Toronto' },
        'America/Vancouver': { lat: 49.2827, lon: -123.1207, name: 'Vancouver' },
    };

    for (const [tzName, coords] of Object.entries(fallback)) {
        if (tz.endsWith(tzName) || tz === tzName) {
            return coords;
        }
    }

    return { lat: 40.7128, lon: -74.006, name: 'New York (default)' };
}
