Feature: The site serves as files

  Nothing on either surface needs a request answered at runtime. A plain static
  file server standing over the emitted directory is the whole deployment, so
  the build has to leave a document behind for every page it publishes.

  Scenario: every published page answers without a runtime behind it
    Given the emitted directory is served by a plain static file server
    When a visitor opens a page the site publishes
    Then it answers with its own document

  Scenario: a documentation page nobody linked to still gets emitted
    Given a documentation page exists in the content source
    When the site builds
    Then the emitted directory holds a document for that page

  Scenario: the build leaves no server behind
    When the site builds
    Then the emitted directory holds no server function
