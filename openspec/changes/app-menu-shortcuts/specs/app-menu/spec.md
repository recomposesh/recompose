# app-menu Specification

## ADDED Requirements

### Requirement: The menu bar keeps the platform's standard shape

The application menu MUST carry the platform's standard set in the standard order: the app menu on macOS, File, Edit, View, the route-scoped menus, Window, and Help. Window and Help MUST stand on every platform and on every route. The onboarding checklist item MUST live under View on every platform, because it shows and hides a surface rather than configuring the app.

#### Scenario: the checklist toggle lives under View on macOS

- When a person opens the menu bar on macOS
- Then View carries the onboarding checklist item
- And the app menu carries no checklist item

#### Scenario: Help trails the menu bar on every route

- When a person stands on any surface
- Then the menu bar ends with a Help menu

### Requirement: A Help menu answers from every screen

The Help menu MUST hold recompose Help, a keyboard shortcut reference, the config folder, and an issue report. The help item and the shortcut reference MUST open the published guide in the person's browser. The issue item MUST open the repository's new-issue page in the person's browser. The config folder item MUST reveal the same folder the settings surface reveals, under the same file-manager label. On macOS the menu MUST carry the system `help` role, so the menu search field works.

#### Scenario: a person reports an issue from the menu

- When a person picks the issue report from the Help menu
- Then the browser opens the repository's new-issue page

#### Scenario: a person reveals the config folder from the menu

- When a person picks the config folder item from the Help menu
- Then the file manager reveals the folder the settings surface reveals

### Requirement: The View menu walks the app

The View menu MUST carry one navigation item per top-level surface, gateways, providers, and usage, under the plain number accelerators in that order. A pick MUST land inside the standing main window. It MUST reach its surface even when no window stands open, because the tray keeps the app alive after the last window closes. The gateways pick MUST land where the app's own home landing would: the last-looked-at gateway, or the empty state when none stands.

#### Scenario: a person walks to providers by accelerator

- When a person presses the providers navigation accelerator
- Then the main window lands on the providers surface

#### Scenario: a navigation pick answers with no window open

- When the tray shows, no window stands open, and a person picks usage from the View menu
- Then a main window opens standing on the usage surface

### Requirement: The View menu toggles the standing surfaces

The View menu MUST toggle the sidebar and the inspector under their own accelerators. Each tick MUST read state the renderer reports back, so the tick reads what the person sees. An item whose surface the standing route lacks MUST render as unavailable rather than disappear.

#### Scenario: the sidebar tick reads what the person sees

- Given a person hid the sidebar from its on-screen toggle
- When the person opens the View menu
- Then the sidebar item's tick reads off

#### Scenario: the inspector item stays unavailable off the canvas

- When a person opens the View menu on the providers surface
- Then the inspector item shows as unavailable rather than missing

### Requirement: The Gateway menu drives the standing gateway

While a gateway detail stands, the Gateway menu MUST offer start, stop, and restart under accelerators, each enabled by the gateway's state the way the tray submenu already is. The menu MUST offer copying the base URL, renaming, and deleting. Deleting MUST pass through the same confirmation the canvas offers, and renaming MUST land the person in the same rename affordance the canvas offers.

#### Scenario: a person starts the standing gateway from the menu

- Given the standing gateway stays still
- When the person picks start from the Gateway menu
- Then the gateway serves and the menu's stop and restart items enable

#### Scenario: deleting from the menu still asks first

- When a person picks delete from the Gateway menu
- Then the same confirmation the canvas offers appears
- And nothing leaves until the person answers

### Requirement: The zoom group separates resetting from fitting

The Gateway menu's zoom group MUST offer zooming in, zooming out, returning to 100%, and fitting the whole composition as four distinct items. Returning to 100% MUST sit on the plain reset accelerator and fitting MUST sit beside it under the shifted variant, because everywhere else the plain reset accelerator means actual size. Tidy MUST carry its own accelerator.

#### Scenario: the plain reset accelerator lands on 100%

- Given a person zoomed the canvas away from 100%
- When the person presses the plain reset accelerator
- Then the canvas stands at 100%

#### Scenario: the shifted variant fits the composition

- When a person presses the shifted reset accelerator
- Then the canvas fits the whole composition in view

### Requirement: The menu never advertises a dead keystroke

Every accelerator the menu prints MUST fire in a packaged build. The reload row's keystroke MUST reload the surface in a packaged build rather than dying against a window input guard.

#### Scenario: the printed reload keystroke reloads

- When a person presses the keystroke the reload row prints in a packaged build
- Then the surface reloads

### Requirement: The Dock reaches every gateway

On macOS the Dock menu MUST list every stored gateway, each carrying the same start, stop, and restart submenu the menu bar extra carries. Every entry MUST show whether it's available rather than disappearing. The Dock menu MUST follow gateway state without asking a person to reopen it.

#### Scenario: a person stops a gateway from the Dock

- When a person chooses stop in a running gateway's Dock submenu
- Then the gateway stops and its submenu offers start
