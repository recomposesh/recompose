## ADDED Requirements

### Requirement: A first session opens the setup wizard, and only a first session

The app MUST hold the setup wizard over the whole window when a profile has never finished it
and has never dismissed it. Every other launch MUST fall straight into the canvas, because a
person who already runs a gateway has nothing left for the wizard to ask.

Finishing the wizard and dismissing it MUST both record the same standing, so neither one
returns on the next launch. The View menu MUST carry a way back in, and taking it MUST open the
wizard again on a profile that already stands finished. Reopening MUST NOT clear any record the
profile already holds, because reopening is a way to look rather than a way to reset.

The wizard MUST NOT store where a person stood inside it. It MUST derive the step it opens on
from what the profile already holds. A profile carrying a gateway and a virtual model MUST open
on the step that waits for the first request. Every other profile MUST open on the welcome step.
That derivation MUST run once per opening. Deleting a virtual model while the wizard stands MUST
NOT throw the person back to an earlier step.

#### Scenario: a profile that has never seen the wizard

- Given a profile that has never finished the setup wizard and has never dismissed it
- When the app launches
- Then the setup wizard holds the whole window
- And it stands on the welcome step

#### Scenario: a profile that dismissed the wizard

- Given a person dismissed the setup wizard
- When the app launches again
- Then the canvas opens with no wizard over it

#### Scenario: the View menu opens the wizard again

- Given a profile that already finished the setup wizard
- When the person takes the View menu's way back into setup
- Then the setup wizard holds the whole window again
- And every record the profile held before still stands

#### Scenario: a profile that closed the app before its first request

- Given a profile carrying a gateway and a virtual model that has never served a request
- And that profile has neither finished nor dismissed the setup wizard
- When the app launches
- Then the setup wizard opens on the step that waits for the first request

#### Scenario: the graph changes while the wizard stands

- Given the wizard stands on the step that waits for the first request
- When the profile loses the virtual model behind it
- Then the wizard stays on the step that waits for the first request

### Requirement: The wizard carries its own standing, apart from the checklist

The stored settings MUST carry a field of their own for whether a profile has finished or
dismissed the setup wizard. That field MUST NOT be the one that shows and hides the get-started
checklist. A person who leaves the wizard early is the person the checklist coaches through the
same journey on the canvas.

Dismissing the wizard MUST leave the checklist showing. A settings document an older build wrote
MUST migrate forward with the new field standing at its default. Migrating a document that
already carries the field MUST leave it alone.

Nothing MUST write a step name, a step index, or a progress count to disk.

#### Scenario: dismissing the wizard leaves the checklist

- Given the get-started checklist stands on the canvas
- When a person dismisses the setup wizard
- Then the checklist still stands on the canvas

#### Scenario: a settings document from an older build

- Given a stored settings document an older build wrote
- When the app loads it
- Then it carries the wizard's standing at its default
- And loading the migrated document again leaves that standing unchanged

#### Scenario: the stored document holds no step

- Given a person walks the wizard from the welcome step to the step that waits
- When a reader opens the stored settings document
- Then it holds no step name, no step index, and no progress count

### Requirement: The wizard stands over the canvas rather than taking a route

The wizard MUST render over whichever route stands, and the app MUST NOT hold a route of its
own for it. Nothing MUST redirect a route on the wizard's standing, because a redirect whose
target re-reads the same standing loops.

Opening the app on any route while the wizard stands MUST leave that route underneath, so the
wizard resolving lands the person on it rather than on a default. The wizard's presence MUST NOT
reach the address or its search parameters.

#### Scenario: the route underneath survives the wizard

- Given the app opens on the usage route with the setup wizard over it
- When the wizard resolves
- Then the usage route stands

### Requirement: The wizard never dismisses itself by accident

Dismissing setup records a standing that never returns on its own, so only a control a person
took on purpose MUST record it. Pressing Escape MUST NOT record the dismissal, and pressing
outside the wizard MUST NOT record it either.

The wizard MUST carry a visible dismissal control that a keyboard reaches. Everything behind the
wizard MUST stand inert, so a Tab press from the wizard's last control lands back inside it.

The wizard MUST NOT swallow the window's own chrome. The platform window controls MUST stay
visible and operable, and the window MUST stay draggable by its chrome. Every control the wizard
puts over a draggable region MUST answer a click.

#### Scenario: Escape leaves the standing alone

- Given the setup wizard stands on the welcome step
- When the person presses Escape
- Then the wizard still stands
- And the stored settings document keeps every value it held

#### Scenario: tab stays inside the wizard

- Given the setup wizard stands over the canvas
- When the person tabs past the wizard's last control
- Then focus lands back inside the wizard rather than on a canvas node

#### Scenario: the wizard's top controls answer a click

- Given the setup wizard stands over the window's draggable chrome
- When the person clicks the dismissal control
- Then the wizard records the dismissal

### Requirement: The wizard asks which harnesses a person works with

The harness step MUST offer every harness the connect catalog stands, under the catalog's own
four headings and in the catalog's order. A person MUST be able to pick more than one, and the
step MUST NOT detect a harness on their behalf.

The step MUST refuse to continue while nothing stands picked. Once something stands picked, the
control that continues MUST report how many.

#### Scenario: nothing picked

- Given the harness step stands with nothing picked
- Then the control that continues refuses

#### Scenario: two harnesses picked

- Given the harness step stands
- When the person picks two harnesses
- Then the control that continues reports two harnesses

### Requirement: The wizard asks where models come from, and detection fills what it can

The source step MUST offer every provider the catalog stands, under the four headings the
providers surface uses, reading each entry as the catalog's own offer title.

The step MUST look at the machine before it draws. A Claude plan the machine already signs into
and a local runtime already answering MUST arrive already listed, each carrying what identifies
it. Marking a listed source MUST connect that account there and then, so the step that reports
setup jobs finds the work already done. Clearing a mark MUST leave the row and its identity
standing while the count drops.

The step MUST refuse to continue while no source stands marked, which is what keeps a later step
from composing a virtual model with nothing behind it.

Picking a provider from the catalog MUST open that provider's own connect sheet. Connecting
through it MUST add a row to the marked list and raise the count.

The line under the heading MUST report what the look at the machine found, and it MUST read
correctly when the look found nothing.

#### Scenario: the machine already signs into a Claude plan

- Given the machine holds a Claude plan and a local runtime answering
- When the source step draws
- Then both stand listed and marked
- And the control that continues reports two sources

#### Scenario: the look finds nothing

- Given the machine holds no plan and no runtime answering
- When the source step draws
- Then nothing stands listed
- And the control that continues refuses

#### Scenario: connecting a provider from the catalog

- Given the source step stands with two sources marked
- When the person connects an aggregator through its own sheet
- Then a third row stands marked
- And the control that continues reports three sources

### Requirement: The wizard composes one virtual model behind a round-robin router

The compose step MUST show what it will build before it builds it: the gateway, one virtual
model, a round-robin router, and the targets the router deals between.

The virtual model MUST take a fixed name. That name MUST carry the `claude-` prefix when the
person picked Claude Code among their harnesses, so the harness that discovers models by name
finds it.

The router MUST stand behind the virtual model whatever the person picked, including where only
one target stands behind it. The step MUST pick each target's model without asking, and it MUST
pick the same model every time for the same listing, never at random. It MUST NOT reach for a
provider's smallest model where the provider offers a larger one.

#### Scenario: two sources picked

- Given the person marked a subscription and a local runtime
- When the compose step draws
- Then it shows a round-robin router dealing between one model from each

#### Scenario: one source picked

- Given the person marked a single source
- When the compose step draws
- Then it shows a round-robin router with that source behind it

#### Scenario: the same listing picks the same model

- Given a provider that lists the same models on two runs
- When the compose step picks a target model on each run
- Then it picks the same model both times

#### Scenario: Claude Code among the harnesses

- Given the person picked Claude Code on the harness step
- When the compose step draws
- Then the virtual model's name carries the `claude-` prefix

### Requirement: The wizard reports every setup job, and a refused job offers a retry

The step that builds MUST report each job as its own row: the accounts it connected, the gateway
it opens, and the virtual model it composes. A finished job MUST read as finished, the running
job MUST read as running, and a job that hasn't started MUST read as waiting.

A job that refuses MUST say so on its own row and MUST carry the reason it refused. The rows
under it MUST stay waiting rather than running. The step MUST offer a way to try again, and it
MUST NOT lose what earlier jobs already built.

The step MUST report the gateway's real address rather than a fixed one, because the port it
opens on is the port that stood free.

#### Scenario: every job finishes

- Given the compose step handed over its work
- When every job finishes
- Then each row reads as finished
- And the step offers the way on to pointing the harnesses

#### Scenario: the gateway refuses to open

- Given the step is opening the gateway
- When the gateway refuses
- Then its row carries the reason
- And the row under it still reads as waiting
- And the step offers a way to try again

#### Scenario: trying again keeps what stood

- Given a job refused after two jobs finished
- When the person tries again
- Then the two finished jobs stay finished

### Requirement: The wizard hands over the commands for every picked harness

The step that points harnesses MUST carry one entry per harness the person picked, each reading
the connect facts that harness already publishes. The first entry MUST stand open and the rest
MUST stand closed.

Every address, token, and model name in those commands MUST read from what the wizard just
built, never from a fixed example.

The step MUST NOT check whether a harness connected. Moving on MUST rest on the person saying
they ran the line.

#### Scenario: two harnesses picked

- Given the person picked two harnesses
- When the step that points harnesses draws
- Then it carries an entry for each
- And the first stands open

#### Scenario: the commands carry the built gateway

- Given the wizard opened a gateway on a port the machine had free
- When the step that points harnesses draws
- Then the commands carry that port and that virtual model's name

### Requirement: The wizard waits for a request the gateway served

The waiting step MUST report the gateway's address and MUST say which harnesses can reach it. It
MUST offer a way back to the commands.

The wizard MUST finish on a request a gateway recorded as served. A request recorded as failed
MUST leave the wizard waiting. A request still live MUST leave the wizard waiting, because a
request that hasn't answered hasn't served anyone yet.

A connected account MUST NOT finish the wizard on its own. The app can store a credential that a
provider still turns away the first time a client spends it.

A request the app made on a person's behalf MUST NOT finish the wizard. Only a request a client
sent through a gateway counts.

The waiting step's standing MUST reach assistive technology without the person moving focus to
it.

#### Scenario: a served request finishes the wizard

- Given the wizard stands on the waiting step
- When a gateway serves a request and records it as served
- Then the wizard resolves into the canvas

#### Scenario: a failed request leaves the wizard waiting

- Given the wizard stands on the waiting step
- When a gateway records a request as failed
- Then the wizard stays on the waiting step

#### Scenario: a live request leaves the wizard waiting

- Given the wizard stands on the waiting step
- When a gateway records a request as live and nothing else follows
- Then the wizard stays on the waiting step

#### Scenario: a live request that turns served

- Given a gateway recorded a request as live while the wizard waits
- When that same request ends and the gateway records it as served
- Then the wizard resolves into the canvas

#### Scenario: connecting an account never finishes the wizard

- Given the wizard stands on the waiting step
- When a person connects another account
- Then the wizard stays on the waiting step

### Requirement: The wizard resolves into the canvas it built

When the wizard finishes, it MUST give the window back to the canvas, and the graph the wizard
built MUST stand on that canvas.

The wizard MUST record its standing as finished. A settings write that fails MUST NOT hold the
person on the waiting step. The wizard MUST resolve for the session it stands in, and the next
launch MUST open on the waiting step again, because nothing recorded that it finished.

The wizard MUST leave focus somewhere it named rather than wherever the canvas happens to put
it. Under a reduced-motion preference the celebration MUST NOT animate, and the wizard MUST
still resolve.

#### Scenario: the built graph stands on the canvas

- Given the wizard built a gateway, a virtual model, and a router over two targets
- When a served request resolves the wizard
- Then those five cards stand on the canvas

#### Scenario: the settings write fails

- Given the wizard stands on the waiting step
- And the settings file refuses a write
- When a gateway records a request as served
- Then the wizard resolves into the canvas
- And the next launch opens the wizard on the waiting step

#### Scenario: a person who asked for less motion

- Given a person whose system asks for reduced motion
- When a served request resolves the wizard
- Then nothing animates
- And the canvas stands

### Requirement: The first-request record follows the served outcome, never the spend grant

The record that a profile has served its first request MUST rest on the outcome a gateway wrote
down for that request. A spend grant resolving MUST NOT set it, because a grant only says a
request reached a target. The target can still turn it away.

The record MUST take at most one write per profile, and two requests served at once MUST NOT
write twice.

#### Scenario: a request that reached a target and got turned away

- Given a profile that has never served a request
- When a spend grant resolves and the target answers with a refusal
- Then the profile still stands as having served no request

#### Scenario: a request the target answered

- Given a profile that has never served a request
- When a gateway records a request as served
- Then the profile stands as having served its first request

#### Scenario: two requests served at once

- Given a profile that has never served a request
- When two gateways record a served request at the same moment
- Then the profile takes one write

### Requirement: The checklist coaches the same journey on the canvas

The get-started checklist MUST stand four steps: opening a gateway, connecting a provider,
composing a virtual model, and serving the first request. Each step MUST read its standing from
what the profile holds rather than from a memory of its own, so the checklist can never disagree
with the app.

The checklist MUST stand on a profile that dismissed the wizard, and it MUST report every step
the wizard already finished as finished.

#### Scenario: the wizard finished the journey

- Given the wizard built a gateway and a virtual model and a served request resolved it
- When the checklist draws
- Then all four steps read as finished

#### Scenario: a person who dismissed the wizard at the welcome step

- Given a person dismissed the setup wizard before building anything
- When the checklist draws
- Then it stands on opening a gateway
