/* sunrise-sunset@mutex.io - GNOME Shell Extension
 *
 * Main entry point. Registers a panel button that displays sunrise/sunset
 * information in a popup menu.
 */

const { GObject, St, Clutter, Gio, GLib } = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const SunCalculator = Me.imports.utils.sun_calculator;

const SunriseSunsetIndicator = GObject.registerClass(
    {},
    class SunriseSunsetIndicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, 'Sunrise Sunset Indicator', false);

            this._geo = null;
            this._timeoutId = null;
            this._settingsChangedId = null;

            this._box = new St.BoxLayout({
                style_class: 'sunrise-sunset-panel-box',
            });

            this._icon = new St.Icon({
                gicon: Gio.ThemedIcon.new('weather-clear-symbolic'),
                style_class: 'sunrise-sunset-panel-icon',
            });

            this._label = new St.Label({
                style_class: 'sunrise-sunset-panel-label',
                y_align: Clutter.ActorAlign.CENTER,
            });

            this._box.add_child(this._icon);
            this._box.add_child(this._label);
            this.add_child(this._box);

            this._buildMenu();
            this._loadLocation();
            this._startRefreshTimer();
        }

        _buildMenu() {
            this._menuItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false,
            });

            this._menuContent = new St.BoxLayout({
                style_class: 'sunrise-sunset-menu-content',
                vertical: true,
            });

            this._menuItem.add_child(this._menuContent);
            this.menu.addMenuItem(this._menuItem);

            this._menuTitle = new St.Label({
                style_class: 'sunrise-sunset-menu-title',
                text: 'Sunrise & Sunset',
            });

            this._locationLabel = new St.Label({
                style_class: 'sunrise-sunset-location',
                text: '',
            });

            this._menuContent.add_child(this._menuTitle);
            this._menuContent.add_child(this._locationLabel);

            this._rowsBox = new St.BoxLayout({
                style_class: 'sunrise-sunset-rows',
                vertical: true,
            });
            this._menuContent.add_child(this._rowsBox);

            this._menuSeparator = new PopupMenu.PopupSeparatorMenuItem();
            this.menu.addMenuItem(this._menuSeparator);

            this._refreshItem = new PopupMenu.PopupMenuItem('Refresh');
            this._refreshItem.connect('activate', () => this._refresh());
            this.menu.addMenuItem(this._refreshItem);

            this._settingsItem = new PopupMenu.PopupMenuItem('Settings');
            this._settingsItem.connect('activate', () => {
                try {
                    ExtensionUtils.openPrefs();
                } catch (e) {
                    log('sunrise-sunset: Could not open prefs: ' + e.message);
                }
            });
            this.menu.addMenuItem(this._settingsItem);
        }

        _loadLocation() {
            try {
                const settings = ExtensionUtils.getSettings(
                    'org.gnome.shell.extensions.sunrise-sunset'
                );
                const manualLat = settings.get_double('latitude');
                const manualLon = settings.get_double('longitude');
                const useManual = settings.get_boolean('use-manual-location');

                if (useManual) {
                    this._geo = {
                        lat: manualLat,
                        lon: manualLon,
                        name: `${manualLat.toFixed(2)}, ${manualLon.toFixed(2)}`,
                    };
                } else {
                    this._geo = SunCalculator.getGeolocationFromTimezone();
                }

                this._connectSettings(settings);
            } catch (e) {
                log('sunrise-sunset: Could not load settings: ' + e.message);
                this._geo = SunCalculator.getGeolocationFromTimezone();
            }

            this._refresh();
        }

        _connectSettings(settings) {
            if (this._settingsChangedId) return;
            this._settingsChangedId = settings.connect('changed', () => {
                this._loadLocation();
            });
            this._settings = settings;
        }

        _refresh() {
            if (!this._geo) return;

            const times = SunCalculator.computeAllSunTimes(
                this._geo.lat,
                this._geo.lon
            );

            if (times.sunrise && times.sunset) {
                this._label.set_text(`${times.sunrise} \u2192 ${times.sunset}`);
            } else {
                this._label.set_text('N/A');
            }

            this._updateMenu(times);
        }

        _updateMenu(times) {
            this._rowsBox.destroy_all_children();

            if (this._geo) {
                this._locationLabel.set_text(
                    `${this._geo.name}`
                );
            }

            const rows = [
                {
                    label: 'Sunrise / Sunset',
                    sunrise: times.sunrise,
                    sunset: times.sunset,
                    cssClass: 'standard',
                },
                {
                    label: 'Civil Twilight',
                    sunrise: times.civil_sunrise,
                    sunset: times.civil_sunset,
                    cssClass: 'civil',
                },
                {
                    label: 'Nautical Twilight',
                    sunrise: times.nautical_sunrise,
                    sunset: times.nautical_sunset,
                    cssClass: 'nautical',
                },
                {
                    label: 'Astronomical Twilight',
                    sunrise: times.astronomical_sunrise,
                    sunset: times.astronomical_sunset,
                    cssClass: 'astronomical',
                },
            ];

            for (const row of rows) {
                const rowBox = new St.BoxLayout({
                    style_class: `sunrise-sunset-row ${row.cssClass}`,
                });

                const nameLabel = new St.Label({
                    style_class: 'sunrise-sunset-row-name',
                    text: row.label,
                });

                const timeBox = new St.BoxLayout({
                    style_class: 'sunrise-sunset-row-times',
                });

                const sunriseLabel = new St.Label({
                    style_class: 'sunrise-sunset-time sunrise',
                    text: row.sunrise || '--:--',
                });

                const separator = new St.Label({
                    style_class: 'sunrise-sunset-time-separator',
                    text: '\u2192',
                });

                const sunsetLabel = new St.Label({
                    style_class: 'sunrise-sunset-time sunset',
                    text: row.sunset || '--:--',
                });

                timeBox.add_child(sunriseLabel);
                timeBox.add_child(separator);
                timeBox.add_child(sunsetLabel);

                rowBox.add_child(nameLabel);
                rowBox.add_child(timeBox);

                this._rowsBox.add_child(rowBox);
            }
        }

        _startRefreshTimer() {
            this._timeoutId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                300,
                () => {
                    this._refresh();
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }

        destroy() {
            if (this._timeoutId) {
                GLib.source_remove(this._timeoutId);
                this._timeoutId = null;
            }
            if (this._settingsChangedId && this._settings) {
                this._settings.disconnect(this._settingsChangedId);
                this._settingsChangedId = null;
            }
            super.destroy();
        }
    }
);

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        this._indicator = null;
    }

    enable() {
        this._indicator = new SunriseSunsetIndicator();
        Main.panel.addToStatusArea('sunrise-sunset', this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
