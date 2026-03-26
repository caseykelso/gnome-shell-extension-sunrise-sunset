/* sunrise-sunset@mutex.io - Extension Preferences
 *
 * Provides a settings UI for configuring latitude/longitude manually
 * or relying on timezone-based detection.
 */

const { Adw, Gio, Gtk, GObject } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

function init() {}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings(
        'org.gnome.shell.extensions.sunrise-sunset'
    );

    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup({
        title: 'Location Settings',
        description: 'Configure how the extension determines your location.',
    });

    const useManualRow = new Adw.ActionRow({
        title: 'Use Manual Location',
        subtitle: 'Override automatic timezone-based detection',
    });
    const useManualToggle = new Gtk.Switch({
        active: settings.get_boolean('use-manual-location'),
        valign: Gtk.Align.CENTER,
    });
    settings.bind(
        'use-manual-location',
        useManualToggle,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );
    useManualRow.add_suffix(useManualToggle);
    group.add(useManualRow);

    const latRow = new Adw.ActionRow({
        title: 'Latitude',
        subtitle: 'Decimal degrees, e.g. 40.7128 for New York',
    });
    const latEntry = new Gtk.Entry({
        text: settings.get_double('latitude').toFixed(4),
        valign: Gtk.Align.CENTER,
        width_chars: 12,
        input_purpose: Gtk.InputPurpose.NUMBER,
    });
    latEntry.connect('changed', () => {
        const val = parseFloat(latEntry.text);
        if (!isNaN(val) && val >= -90 && val <= 90) {
            settings.set_double('latitude', val);
        }
    });
    latRow.add_suffix(latEntry);
    group.add(latRow);

    const lonRow = new Adw.ActionRow({
        title: 'Longitude',
        subtitle: 'Decimal degrees, e.g. -74.0060 for New York',
    });
    const lonEntry = new Gtk.Entry({
        text: settings.get_double('longitude').toFixed(4),
        valign: Gtk.Align.CENTER,
        width_chars: 12,
        input_purpose: Gtk.InputPurpose.NUMBER,
    });
    lonEntry.connect('changed', () => {
        const val = parseFloat(lonEntry.text);
        if (!isNaN(val) && val >= -180 && val <= 180) {
            settings.set_double('longitude', val);
        }
    });
    lonRow.add_suffix(lonEntry);
    group.add(lonRow);

    page.add(group);
    window.add(page);
}
