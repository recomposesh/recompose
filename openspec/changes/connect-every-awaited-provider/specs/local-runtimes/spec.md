## MODIFIED Requirements

### Requirement: Detection comes before adding a local runtime

The Local Runtimes catalog MUST offer four connectable runtimes: Ollama, LM Studio, llama.cpp, and vLLM. It MUST also offer a Custom local server entry. No entry MUST stand under a Soon badge.

Picking a runtime MUST look for it at the port its own project documents and say what it found before the app stores anything. The look MUST ask the path that runtime's own project serves, never a path every model server answers. A different server holding the port then reads as another server rather than as the runtime a person picked.

A runtime that names where its version sits MUST report that version. A runtime that publishes none MUST still report that it answers, and the surface MUST print no version line for it. Any answer that fails the look MUST report as another server.

The person MAY point the look at another port, and the host MUST stay the loopback address the app mints. A runtime bound off the loopback host therefore reads as not running, and the app MUST NOT store a non-loopback address. Adding the account MUST store the address it answers at and MUST NOT ask for a credential.

Picking Custom local server MUST ask for a name and a port, because the app has no project to name it by and no port to assume. Its look MUST ask the one path every model server answers, and it MUST claim no version.

#### Scenario: a person adds a runtime the app documents

- Given LM Studio runs on this machine
- When a person picks LM Studio from the catalog
- Then the look reports it running at its documented port
- And adding it stores the address it answered at

#### Scenario: a runtime that publishes no version still reports that it answers

- Given LM Studio answers at its documented port
- When the look reports what it found
- Then it says the runtime is running
- And it prints no version line

#### Scenario: another server on the port reads as another server

- Given a different model server holds the port a runtime documents
- When a person picks that runtime
- Then the look reports another server answered
- And it doesn't report the runtime as running

#### Scenario: a person adds a server of their own

- Given a person picked Custom local server
- When they name it and give it a port that answers
- Then the look reports a server answering there
- And adding it stores the address and the name they gave it

#### Scenario: more than one server of a person's own may stand

- Given a connected Custom local server
- When a person adds another on a different port
- Then both stand as their own rows

### Requirement: A row reads the runtime's standing as an observation

A row MUST look again on every mount and on every check, and MUST carry no claim older than its own screen. A row for a documented runtime MUST read as the name that runtime's own project spells. A row for a server a person addressed themselves MUST read as the name they gave it.

#### Scenario: a documented runtime reads as its project spells it

- When the surface lists a connected llama.cpp
- Then the row reads as llama.cpp

#### Scenario: a server of a person's own reads as they named it

- When the surface lists a connected Custom local server
- Then the row reads as the name that person gave it
