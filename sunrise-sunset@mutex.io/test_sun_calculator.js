#!/usr/bin/env gjs
// Unit tests for sun calculator using ES6 modules
// Compares against data from timeanddate.com
// Run with: gjs -m test_sun_calculator.js

import GLib from 'gi://GLib';
import * as SunCalc from './utils/sun_calculator.js';

function assert(condition, message) {
    if (!condition) {
        log('FAIL: ' + message);
        throw new Error(message);
    }
}

function assertApprox(actual, expected, tolerance, message) {
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
        log(`FAIL: ${message}`);
        log(`  Expected: ${expected} minutes, got: ${actual} minutes`);
        log(`  Difference: ${diff} minutes (tolerance: ${tolerance})`);
        throw new Error(message);
    }
}

function parseTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function testVancouverMarch25() {
    log('\n=== Test: Vancouver, BC - March 25, 2026 ===');
    
    // Vancouver, Canada coordinates (from timeanddate.com)
    const lat = 49.2827;
    const lon = -123.1207;
    const date = new Date('2026-03-25');
    
    const times = SunCalc.computeAllSunTimes(lat, lon, date);
    
    log('Computed times:');
    log('  Astro dawn:    ' + times.astronomical_sunrise);
    log('  Nautical dawn: ' + times.nautical_sunrise);
    log('  Civil dawn:    ' + times.civil_sunrise);
    log('  Sunrise:       ' + times.sunrise);
    log('  Sunset:        ' + times.sunset);
    log('  Civil dusk:    ' + times.civil_sunset);
    log('  Nautical dusk: ' + times.nautical_sunset);
    log('  Astro dusk:    ' + times.astronomical_sunset);
    
    // Reference data from timeanddate.com for Vancouver, March 25, 2026
    // Note: These times have DST applied (UTC-7)
    const expected = {
        astronomical_sunrise: '05:22',  // 5:22 am
        nautical_sunrise: '05:58',      // 5:58 am  
        civil_sunrise: '06:33',         // 6:33 am
        sunrise: '07:03',               // 7:03 am
        sunset: '19:29',                // 7:29 pm
        civil_sunset: '19:59',          // 7:59 pm
        nautical_sunset: '20:34',       // 8:34 pm
        astronomical_sunset: '21:11'    // 9:11 pm
    };
    
    // Check all times exist
    assert(times.sunrise !== null, 'sunrise should not be null');
    assert(times.sunset !== null, 'sunset should not be null');
    assert(times.civil_sunrise !== null, 'civil dawn should not be null');
    assert(times.civil_sunset !== null, 'civil dusk should not be null');
    
    // Verify times are within ±15 minutes of expected (reasonable tolerance for different algorithms)
    const tolerance = 15;
    assertApprox(parseTime(times.sunrise), parseTime(expected.sunrise), tolerance, 'sunrise time');
    assertApprox(parseTime(times.sunset), parseTime(expected.sunset), tolerance, 'sunset time');
    assertApprox(parseTime(times.civil_sunrise), parseTime(expected.civil_sunrise), tolerance, 'civil dawn');
    assertApprox(parseTime(times.civil_sunset), parseTime(expected.civil_sunset), tolerance, 'civil dusk');
    
    // Parse computed times for ordering checks
    const astroDawn = parseTime(times.astronomical_sunrise);
    const nauticalDawn = parseTime(times.nautical_sunrise);
    const civilDawn = parseTime(times.civil_sunrise);
    const sunrise = parseTime(times.sunrise);
    const sunset = parseTime(times.sunset);
    const civilDusk = parseTime(times.civil_sunset);
    const nauticalDusk = parseTime(times.nautical_sunset);
    const astroDusk = parseTime(times.astronomical_sunset);
    
    // Verify morning order: astro < nautical < civil < sunrise
    assert(astroDawn < nauticalDawn, 'astro dawn (' + times.astronomical_sunrise + ') should be before nautical dawn (' + times.nautical_sunrise + ')');
    assert(nauticalDawn < civilDawn, 'nautical dawn (' + times.nautical_sunrise + ') should be before civil dawn (' + times.civil_sunrise + ')');
    assert(civilDawn < sunrise, 'civil dawn (' + times.civil_sunrise + ') should be before sunrise (' + times.sunrise + ')');
    
    // Verify evening order: sunset < civil < nautical < astro
    assert(sunset < civilDusk, 'sunset (' + times.sunset + ') should be before civil dusk (' + times.civil_sunset + ')');
    assert(civilDusk < nauticalDusk, 'civil dusk (' + times.civil_sunset + ') should be before nautical dusk (' + times.nautical_sunset + ')');
    assert(nauticalDusk < astroDusk, 'nautical dusk (' + times.nautical_sunset + ') should be before astro dusk (' + times.astronomical_sunset + ')');
    
    // Verify day length is reasonable (between 10-16 hours for Vancouver in March)
    const dayLength = sunset - sunrise;
    assert(dayLength > 600 && dayLength < 960, 'day length should be between 10-16 hours, got: ' + (dayLength/60).toFixed(1) + ' hours');
    
    log('✓ Vancouver test passed!');
    log('  Sunrise error: ' + (parseTime(times.sunrise) - parseTime(expected.sunrise)) + ' minutes');
    log('  Sunset error: ' + (parseTime(times.sunset) - parseTime(expected.sunset)) + ' minutes');
    return true;
}

function testTimezoneDetection() {
    log('\n=== Test: Timezone Detection ===');
    
    const geo = SunCalc.getGeolocationFromTimezone();
    
    assert(geo !== null, 'should return geolocation object');
    assert(typeof geo.lat === 'number', 'should have numeric latitude');
    assert(typeof geo.lon === 'number', 'should have numeric longitude');
    assert(typeof geo.name === 'string', 'should have string name');
    
    log('  Detected location: ' + geo.name + ' (' + geo.lat.toFixed(4) + ', ' + geo.lon.toFixed(4) + ')');
    log('✓ Timezone test passed!');
    return true;
}

function testEdgeCases() {
    log('\n=== Test: Edge Cases ===');
    
    // Test summer solstice (longest day)
    const june21 = new Date('2026-06-21');
    const summerTimes = SunCalc.computeAllSunTimes(49.2827, -123.1207, june21);
    
    // Test winter solstice (shortest day)
    const dec21 = new Date('2026-12-21');
    const winterTimes = SunCalc.computeAllSunTimes(49.2827, -123.1207, dec21);
    
    assert(summerTimes.sunrise !== null, 'summer solstice should have sunrise');
    assert(winterTimes.sunrise !== null, 'winter solstice should have sunrise');
    
    const summerDayLength = parseTime(summerTimes.sunset) - parseTime(summerTimes.sunrise);
    const winterDayLength = parseTime(winterTimes.sunset) - parseTime(winterTimes.sunrise);
    
    assert(summerDayLength > winterDayLength, 'summer day should be longer than winter day');
    
    log('  Summer day length: ' + (summerDayLength/60).toFixed(1) + ' hours');
    log('  Winter day length: ' + (winterDayLength/60).toFixed(1) + ' hours');
    log('✓ Edge cases test passed!');
    return true;
}

function main() {
    log('========================================');
    log('Sun Calculator Unit Tests');
    log('Reference: timeanddate.com');
    log('========================================');
    
    let passed = 0;
    let failed = 0;
    
    try {
        testVancouverMarch25();
        passed++;
    } catch (e) {
        log('Vancouver test failed: ' + e.message);
        failed++;
    }
    
    try {
        testTimezoneDetection();
        passed++;
    } catch (e) {
        log('Timezone test failed: ' + e.message);
        failed++;
    }
    
    try {
        testEdgeCases();
        passed++;
    } catch (e) {
        log('Edge cases test failed: ' + e.message);
        failed++;
    }
    
    log('\n========================================');
    if (failed === 0) {
        log('All ' + passed + ' tests passed!');
        log('========================================');
        return 0;
    } else {
        log('RESULTS: ' + passed + ' passed, ' + failed + ' failed');
        log('========================================');
        return 1;
    }
}

main();