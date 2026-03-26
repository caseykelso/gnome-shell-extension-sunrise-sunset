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

- GNOME Shell 45, 46, 47
- Ubuntu 24.04 LTS (GNOME 46)
- Fedora 39+ (GNOME 45+)

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
| `make uninstall` | Remove installed extension |
| `make clean` | Remove build artifacts |
| `make dist` | Same as `package` |
| `make check-deps` | Verify build dependencies |

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

## Author

opensource@mutex.io
