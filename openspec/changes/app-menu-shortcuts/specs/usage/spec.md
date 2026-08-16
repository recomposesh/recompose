# usage Specification

## MODIFIED Requirements

### Requirement: A route-scoped Usage menu drives the explorer

While the usage surface stands, the application menu MUST carry a Usage menu. The menu holds every range the address accepts, a metric submenu naming the series the chart draws, a checkbox item for the chart's data table, and a Refresh item. The ranges sit under Option-modified number accelerators, so the plain numbers stay on walking the app. A custom-range pick MUST land the explorer with its calendar open. Refresh takes its own accelerator and leaves the renderer reload untouched. Menu picks MUST reach the page over the `usage:command` event and travel the same search the on-screen controls write. The page MUST report the data table's standing back over `system:usage-table`, so the tick reads what the person sees.

#### Scenario: a menu pick moves the same address a press would

- Given the explorer stands on the last 24 hours
- When the person picks Last 7 Days from the Usage menu
- Then the address reads the same search the on-screen range control would write

#### Scenario: the menu lists every range the address accepts

- When the person opens the Usage menu
- Then the range group names every ledger range, the custom window included

#### Scenario: a range accelerator carries the Option modifier

- When the person presses the Option-modified accelerator for the second range
- Then the explorer moves to that range and the plain number keeps walking the app

#### Scenario: the metric submenu names only what the chart draws

- When the person opens the metric submenu
- Then it names exactly the series the chart offers

#### Scenario: the data table tick reads what the person sees

- When the person picks Show Data Table from the menu
- Then the twin opens and the menu tick reads on
