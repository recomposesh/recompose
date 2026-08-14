## ADDED Requirements

### Requirement: The public site serves as files

The landing page and the documentation MUST build to static files that a content delivery
network serves. No published route MUST reach for a server function when a person requests it.
A site that answers from a runtime can go down while its host stays up.

The build MUST emit a document for every route the site publishes, and serving the emitted
directory over static hosting alone MUST answer every one of them. Documentation search MUST
run in the browser against an index the build wrote, never against a search service.

#### Scenario: the emitted directory answers every route

- Given the site build has run
- When static hosting serves the emitted directory with no application runtime behind it
- Then every published route answers with its own document
- And the documentation search returns results

#### Scenario: a route never reaches for a server

- When the site build runs
- Then no published route registers a server function

### Requirement: One application holds both public surfaces

The landing page and the documentation MUST ship from a single application in the repository.
One build MUST produce both, and one deployment MUST publish both, so a person crossing from
the landing page to the documentation stays inside the same site.

That application MUST NOT import from the desktop application, and it MUST carry its own
palette. Nothing outside it MUST have to change for it to build.

#### Scenario: a person crosses from the landing page to the documentation

- Given a person is reading the landing page
- When they follow the link to the documentation
- Then the documentation opens inside the same site, carrying the same brand and typeface

#### Scenario: the site builds without the desktop application

- When the site build runs
- Then it completes without building the desktop application

### Requirement: The hero reveals the scene under the pointer

The landing page MUST open on a hero that starts dark and reveals its scene along the path a
person's pointer takes. The revealed light MUST fade behind the pointer rather than staying
lit, so the scene answers movement rather than accumulating it.

The hero MUST show its scene before the loop has loaded, because a hero that starts blank
teaches the person there is nothing to reveal.

A person who asks the operating system for reduced motion MUST get a still hero. The loop MUST
NOT play for them, and the reveal MUST stay, because the reveal answers their own movement.

#### Scenario: a person moves the pointer across the hero

- Given a person has opened the landing page
- When they move the pointer across the hero
- Then the scene lights along the path the pointer took
- And the light behind the pointer fades back into the dark

#### Scenario: the hero has something to reveal before the loop arrives

- Given the loop hasn't finished loading
- When a person moves the pointer across the hero
- Then the reveal shows the scene's first frame

#### Scenario: a reduced-motion preference stills the hero

- Given the operating system asks for reduced motion
- When a person opens the landing page
- Then the hero holds a still frame and the loop never plays
- And moving the pointer still reveals the scene
