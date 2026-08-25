## MODIFIED Requirements

### Requirement: The menu bar keeps the platform's standard shape

The application menu MUST carry the platform's standard set in the standard order: the app menu on macOS, File, Edit, View, the route-scoped menus, Window, and Help. Window and Help MUST stand on every platform and on every route. Every onboarding item MUST live under View on every platform, because each one shows a surface rather than configuring the app. That covers the checklist toggle and the item that opens the setup wizard again. Inside View, Enter Full Screen MUST stand last.

While the setup wizard stands, the route-scoped menus and the item that opens a gateway MUST read as unavailable, so an armed accelerator never acts behind it.

#### Scenario: the checklist toggle lives under View on macOS

- When a person opens the menu bar on macOS
- Then View carries the onboarding checklist item
- And the app menu carries no checklist item

#### Scenario: the way back into setup lives under View

- When a person opens the menu bar
- Then View carries the item that opens the setup wizard again
- And it stands beside the onboarding checklist item

#### Scenario: the menu bar stands down behind the wizard

- Given the setup wizard holds the window
- When a person opens the menu bar
- Then the route-scoped menus read as unavailable
- And the item that opens a gateway reads as unavailable

#### Scenario: Help trails the menu bar on every route

- When a person stands on any surface
- Then the menu bar ends with a Help menu
