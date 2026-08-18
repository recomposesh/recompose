---
title: 'Settings'
description: 'Every setting, its default, and what it changes.'
---

Settings is one scrollable page, and every change applies the moment you make it: no Save button exists. Everything lands in `~/.recompose/settings.json`. This page lists the complete surface.

## General

**Launch at login**. Switch, off by default. `Opens recompose when you sign in.` The switch reads and writes the OS login item, so it always reflects what the OS holds. The row is absent on Linux, where no portable login-item mechanism exists, and a development build renders it inert.

**Show in menu bar**. Switch, off by default. `Keeps recompose running after the last window closes.` Turning it on adds the [menu bar icon](/docs/operate/menu-bar-and-dock) immediately, and changes what closing the last window means on Windows and Linux.

## Server

**Bind address**. Text field, `127.0.0.1` by default. `Defaults to this machine. Use 0.0.0.0 or another host to serve other devices.` Enter commits, Escape reverts, and changing it while gateways run raises the `Restart running gateways?` dialog. [Serving other devices](/docs/operate/serving-other-devices) covers the consequences.

**Start gateways on launch**. Switch, off by default. `Starts every gateway when recompose opens. When off, gateways return as you left them.` Off means recompose remembers which gateways were serving at quit and restores exactly that set.

## Appearance

**Theme**. Segmented control: **System**, **Light**, **Dark**, with System the default. `Follows the system appearance unless you pick one.`

## Data

**Config folder**. An action row whose button speaks the platform's language: **Reveal in Finder** on macOS, **Show in Explorer** on Windows, **Open folder** on Linux. It opens `~/.recompose`, which [Data on disk](/docs/operate/data-on-disk) maps file by file.

**Usage retention**. Segmented control: **7 days**, **30 days**, **90 days**, with 30 the default. It sets how long recompose keeps [usage history](/docs/operate/usage-and-spend). Widening applies instantly. Shortening deletes older history for good, so it holds behind a dialog, `Delete older usage history?`, whose body says `Usage older than 7 days is deleted permanently and cannot be recovered.`

## What has no setting

Updates run on their own: recompose checks hourly, downloads in the background, and offers a **Restart to update** card in the sidebar when one is ready. [Installation](/docs/get-started/install) covers which install methods self-update. Gateway ports are per gateway, set in each gateway's inspector rather than here. And no telemetry setting exists because no telemetry exists to toggle.
