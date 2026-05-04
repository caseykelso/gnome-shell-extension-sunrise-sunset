# Sunrise Sunset - GNOME Shell Extension

A GNOME Shell extension that displays sunrise and sunset times in the top panel, with detailed breakdowns including civil, nautical, and astronomical twilight.

![Sunrise Sunset Extension](https://img.shields.io/badge/GNOME-Shell%2045--47-blue)

## Features

- **Panel indicator** showing sunrise and sunset times at a glance
- **Click to expand** detailed twilight information:
  - Sunrise / Sunset (standard)
  - Civil Twilight
  - Nautical Twilight
  - Astronomical Twilight
- **Automatic location** detection via system timezone
- **Manual override** for latitude/longitude in preferences
- **Auto-refresh** every 5 minutes
- **Dark theme** styling matching GNOME Shell

## Compatibility

- GNOME Shell 45 to 49
- Ubuntu 24.04 LTS (GNOME 46)
- Fedora 39+ (GNOME 45+)
- Bluefin Sehll 49.5

## Prerequisites

```bash
# Ubuntu / Debian
sudo apt install libglib2.0-dev glib-compile-schemas zip

# Fedora
sudo dnf install glib2-devel glib2 zip
```

## Quick Start

```bash
git clone https://github.com/caseykelso/gnome-shell-extension-sunrise-sunset.git
cd gnome-shell-extension-sunrise-sunset
make ci
make install
```

Then enable the extension:

```bash
gnome-extensions enable sunrise-sunset@mutex.io
```

Or log out and back in.

## Build from Scratch

The full build from a fresh clone:

```bash
git clone https://github.com/caseykelso/gnome-shell-extension-sunrise-sunset.git
cd gnome-shell-extension-sunrise-sunset
make ci
```

This runs all targets: schema compilation and package building.

## Make Targets

| Target | Description |
|--------|-------------|
| `make ci` | Full CI build (compile schemas + package) |
| `make all` | Same as `ci` |
| `make schemas` | Compile GSettings schema |
| `make package` | Build zip in `dist/` |
| `make install` | Install to `~/.local/share/gnome-shell/extensions/` |
| `make deploy` | Remove old install, reinstall, and reload extension |
| `make uninstall` | Remove installed extension |
| `make clean` | Remove build artifacts |
| `make dist` | Same as `package` |
| `make test` | Run unit tests |
| `make gnome-nested` | Start nested GNOME Shell for testing |
| `make restart-shell` | Restart GNOME Shell (restores window positions) |
| `make version` | Print current version from git tag or branch |
| `make check-deps` | Verify build dependencies |

## Deploy for Local Testing

The fastest way to iterate during development:

```bash
make deploy
```

This will:
1. Compile schemas
2. Package the extension
3. Remove any existing installation
4. Install fresh
5. Auto-reload the extension (if GNOME Shell is running)

For rapid iteration with live reload, just keep running `make deploy`.

## Development & Testing

### Testing Changes Without Disrupting Your Desktop

There are two ways to test extension changes during development:

#### Option 1: Alt+F2+r (X11 only)

On X11 sessions, restart GNOME Shell in-place:

```
Alt+F2, type "r", press Enter
```

This reloads the shell with your changes but **resets window positions**. Fast but disruptive.

#### Option 2: Make restart-shell (X11 only)

Restart the shell while preserving window positions:

```bash
make restart-shell
```

This saves window positions to `/tmp/gnome-shell-windows.state`, restarts the shell via dbus, waits 4 seconds, then restores all windows to their original positions.

Requires: `wmctrl` (`sudo apt install wmctrl`)

#### Option 2: Nested Shell (Recommended)

Run a separate GNOME Shell instance in a window:

```bash
make gnome-nested
```

This opens a nested GNOME Shell inside your desktop. Your actual session is untouched, so you keep your window layout. Close the nested shell window when done.

Requirements:
- Wayland session (default on most modern distros)
- The nested window opens immediately

#### Option 3: Toggling Extension

Disable/enable the extension without shell restart:

```bash
gnome-extensions disable sunrise-sunset@mutex.io
gnome-extensions enable sunrise-sunset@mutex.io
```

### Running Unit Tests

```bash
make test
```

Tests verify:
- Sunrise/sunset calculations match reference data from timeanddate.com
- Twilight ordering is correct (astronomical → nautical → civil → sunrise)
- Timezone detection works
- Edge cases (summer/winter solstice)

### Test Data

Reference times are from [timeanddate.com](https://www.timeanddate.com/sun/canada/vancouver). The algorithm uses the NOAA solar position equations with standard atmospheric refraction.

## Releases

Push a version tag to trigger a release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers CI to:
1. Build and package the extension
2. Create a GitHub Release with the zip attached
3. Upload to extensions.gnome.org (requires `EGO_TOKEN` secret)

## Installation Methods

### Method 1: Make Install

```bash
make ci
make install
gnome-extensions enable sunrise-sunset@mutex.io
```

### Method 2: Manual Install from Package

```bash
make ci
gnome-extensions install dist/sunrise-sunset@mutex.io.zip
gnome-extensions enable sunrise-sunset@mutex.io
```

### Method 3: GNOME Extensions Website

Install from [extensions.gnome.org](https://extensions.gnome.org) (once published).

## Configuration

Open extension preferences:

```bash
gnome-extensions prefs sunrise-sunset@mutex.io
```

Or through GNOME Settings > Extensions.

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Use Manual Location | Off | Override timezone-based detection |
| Latitude | 40.7128 | Decimal degrees for manual mode |
| Longitude | -74.006 | Decimal degrees for manual mode |

## How It Works

The extension uses the NOAA solar position algorithm to compute sun event times:

- **Sunrise/Sunset**: Sun center at -0.833 degrees below horizon
- **Civil Twilight**: Sun at -6 degrees below horizon
- **Nautical Twilight**: Sun at -12 degrees below horizon
- **Astronomical Twilight**: Sun at -18 degrees below horizon

Location is determined from the system timezone with a built-in database of major cities. Manual lat/lon override is available in preferences.

## Directory Structure

```
sunrise-sunset@mutex.io/
  metadata.json          # Extension metadata
  extension.js           # Main extension entry point
  prefs.js               # Preferences window
  stylesheet.css         # Panel and menu styling
  icons/
    sun-symbolic.svg     # Panel icon
  utils/
    sun_calculator.js    # NOAA solar position calculations
  schemas/
    org.gnome.shell.extensions.sunrise-sunset.gschema.xml
```

## Uninstall

```bash
make uninstall
```

Or manually:

```bash
rm -rf ~/.local/share/gnome-shell/extensions/sunrise-sunset@mutex.io
```

## License

MIT

## CI/CD

GitHub Actions runs on every push and PR. The workflow uses `make ci` for parity with local builds.

### Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `EGO_TOKEN` | No | API token for extensions.gnome.org uploads |

To create the token, go to [extensions.gnome.org/api/tokens](https://extensions.gnome.org/api/tokens/).

## Author

opensource@mutex.io
