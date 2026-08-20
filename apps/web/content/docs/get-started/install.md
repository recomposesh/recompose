---
title: 'Installation'
icon: Download
description: 'Get recompose onto your machine.'
---

recompose is a free, open-source desktop app for macOS, Windows, and Linux. Every download starts at [recompose.sh/download](/download).

## macOS

recompose runs on macOS 12 Monterey or later, on Apple Silicon and Intel.

### Download

1. Download the build for your Mac: [Apple Silicon](/download/mac-arm64) or [Intel](/download/mac-x64).
2. Open the dmg and drag Recompose into Applications.
3. Open Recompose. macOS asks once about an app downloaded from the internet: click **Open**.

### Homebrew

```sh
brew install --cask recomposesh/tap/recompose
```

The app updates itself, so a plain `brew upgrade` leaves it alone. Pass `--greedy` when you want Homebrew to move it forward instead.

## Windows

recompose runs on 64-bit Windows 10 or later. Download the [installer](/download/windows) and run it.

### If Windows warns you

Windows shows "Windows protected your PC" the first time you run the installer. Click **More info**, then **Run anyway**.

## Linux

recompose ships as an AppImage for any modern 64-bit distribution and as a deb for Debian and Ubuntu.

### AppImage

Download the [AppImage](/download/linux-appimage), then make it runnable:

```sh
chmod +x Recompose-*.AppImage
./Recompose-*.AppImage
```

### Debian and Ubuntu

Download the [deb package](/download/linux-deb), then install it:

```sh
sudo apt install ./Recompose_*.deb
```

## Updates

recompose checks for a new version at launch and every hour after that, downloads it in the background, and installs it when you quit. A card in the app offers a restart when an update sits ready.

- On macOS, the app updates itself when it runs from the Applications folder.
- On Linux, the AppImage updates itself and the deb waits for you: install the newer package when one lands.
- On Windows, run the newer installer yourself until the signed installer arrives.

## Confirm it works

Open recompose. An empty canvas with the Get started checklist means the install landed. Continue with the [Quickstart](/docs/get-started/quickstart).
