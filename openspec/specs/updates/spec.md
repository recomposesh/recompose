# updates Specification

## Purpose

TBD - created by archiving change automatic-updates. Update Purpose after archive.

## Requirements

### Requirement: An update arrives through the channel that installed the app

The app MUST take an update only from the channel that installed it. On Linux the app MUST update
itself for an AppImage alone, and it MUST leave a deb install to the system package tool.

A channel another tool owns counts as no failure. The app MUST report no error for it, and it MUST
offer no control that promises an update it never performs.

#### Scenario: a package tool owns a Linux install

- Given a package tool installed this copy from a deb
- When the app starts
- Then the app runs no update check of its own
- And the interface offers no update control

#### Scenario: an AppImage updates itself

- Given a person runs the Linux AppImage
- When a newer version reaches the release feed
- Then the app downloads it

### Requirement: A downloaded update waits for the person

The app MUST download an update in the background, and it MUST leave the person's work alone. It
MUST NOT restart on its own, and it MUST open no window and no dialog when a download finishes.

Once a download finishes, the interface MUST carry a standing affordance that names the waiting
version and restarts the app when the person chooses it. That affordance MUST outlive navigation
between pages.

#### Scenario: a download finishes while a person works

- Given a person is working in the app
- When an update finishes downloading
- Then the app keeps running and takes no window focus
- And a standing affordance names the waiting version

#### Scenario: the person chooses the restart

- Given an update finished downloading
- When the person chooses to restart
- Then the app installs the update and reopens on the new version

#### Scenario: the affordance outlives navigation

- Given an update finished downloading
- When the person moves to another page
- Then the affordance still names the waiting version

### Requirement: A check the app runs on its own stays out of the way

An update check the app runs on its own MUST leave the app running, and it MUST raise no dialog. It
MUST report neither its outcome nor its failure to any window. The failure MUST reach the log with
its reason and the feed it tried, so a maintainer can read what happened.

The app MUST check once at launch and MUST repeat the check on an interval after that.

#### Scenario: the release feed refuses a check

- Given the release feed answers with an error
- When the app checks for an update
- Then the app keeps running and raises no dialog
- And the log carries the reason and the feed address

#### Scenario: the app checks at launch

- Given a channel the app updates itself
- When the app starts
- Then it checks the release feed once

#### Scenario: the app keeps checking

- Given the app has run past its launch check
- When the interval elapses
- Then it checks the release feed again

#### Scenario: a check nobody asked for keeps its answer

- Given the app checks the release feed on its own
- When the feed answers
- Then no window hears the outcome

### Requirement: A check a person asked for answers back

The app MUST offer a control that checks the release feed when a person chooses it. Where another
tool owns the channel, the app MUST offer no such control.

A check a person asked for MUST report its outcome to that person, a refusal included, and it MUST
report it in the interface rather than in a dialog. While such a check stands, the control MUST
start no second check.

#### Scenario: nothing newer waits

- Given the release feed carries no version newer than the running one
- When the person checks for updates
- Then the app names the running version as the newest

#### Scenario: the feed refuses the check the person asked for

- Given the release feed answers with an error
- When the person checks for updates
- Then the app names the reason to the person
- And the app keeps running and raises no dialog

#### Scenario: a second ask while one stands

- Given a check the person asked for hasn't answered yet
- When the person chooses the control again
- Then the app runs no second check

#### Scenario: a channel another tool owns offers no check

- Given a package tool installed this copy from a deb
- When the person looks for the update control
- Then the app offers none
