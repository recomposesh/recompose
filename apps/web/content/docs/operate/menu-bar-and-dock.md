---
title: 'Menu bar and Dock'
description: 'Menus, shortcuts, the tray, and what quitting means.'
---

recompose ships a platform-shaped menu bar, a macOS Dock menu, and an optional menu bar icon. Shortcuts below read as macOS keys, and Ctrl stands in for Cmd on Windows and Linux.

## The menus

**File** holds `New Gateway…` (Cmd+N). Settings opens with Cmd+, from the app menu on macOS and from File elsewhere.

**View** switches screens and panels:

| Item                      | Shortcut     |
| ------------------------- | ------------ |
| Gateways                  | Cmd+1        |
| Providers                 | Cmd+2        |
| Usage                     | Cmd+3        |
| Show Sidebar              | Cmd+B        |
| Show Inspector            | Option+Cmd+B |
| Show Onboarding Checklist |              |

**Gateway** appears while a gateway's detail page is open:

| Item                             | Shortcut              |
| -------------------------------- | --------------------- |
| Start Gateway                    | Cmd+Return            |
| Stop Gateway                     | Cmd+.                 |
| Restart Gateway                  | Shift+Cmd+Return      |
| Copy Base URL                    |                       |
| Zoom In / Zoom Out / Actual Size | Cmd+= / Cmd+- / Cmd+0 |
| Zoom to Fit                      | Shift+Cmd+0           |
| Tidy Up                          | Option+Cmd+T          |
| Show Logs                        | Control+`             |
| Delete Gateway                   |                       |

**Usage** appears on the Usage page: window presets `Last Hour` through `This Month` on Option+Cmd+1 through 6, `Custom Range…`, a `Metric` submenu, `Show Data Table` (Cmd+Shift+T), and `Refresh Usage` (Option+Cmd+R).

**Help** opens `Recompose Help`, reveals the config folder, and files `Report an Issue…` on GitHub.

A few keys live on the elements rather than the menus. Backspace or Delete removes the canvas selection, Escape cancels a cable drag, and the request log's list takes Up, Down, and Cmd+C. recompose registers no OS-global shortcuts, so nothing fires while the app is in the background.

## Dock menu

On macOS, right-click the Dock icon for every stored gateway as a **Start / Stop / Restart** submenu, plus `New Gateway…` and `Settings…`. With nothing stored yet it reads `No gateways yet`. The menu repaints live as gateways start and stop.

## The menu bar icon

The **Show in menu bar** setting adds a tray icon with the same per-gateway lifecycle submenus, plus `Open recompose`, `Settings…`, and `Quit recompose`. The icon is static: it signals presence, not activity.

## Closing against quitting

On macOS, closing the last window never quits: the app and every serving gateway keep running, and a Dock click brings the window back. On Windows and Linux, closing the last window quits unless the menu bar icon is on.

Quitting stops everything, gateways included. recompose remembers which gateways were serving and, unless **Start gateways on launch** says otherwise, restores exactly that set next time.
