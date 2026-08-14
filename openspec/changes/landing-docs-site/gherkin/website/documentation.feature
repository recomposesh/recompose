Feature: The documentation answers from the same site

  A person who arrives at the landing page and wants to read further stays
  inside one site, and the search that helps them find a page runs in their
  own browser.

  Scenario: a visitor crosses from the landing page to the documentation
    Given a visitor is reading the landing page
    When they follow the link to the documentation
    Then the introduction page opens inside the same site

  Scenario: a reader finds a page by a word only the documentation holds
    Given a reader is on the introduction page
    When they search for "virtual model"
    Then the results name the page that explains it

  Scenario: a path the site never published meets the not-found page
    Given a visitor has the address of a page the site never published
    When they open it
    Then the site's own not-found page answers
