Feature: The Help menu

  Three items answer from every screen: the guide, the config folder,
  and an issue report. The folder item speaks the settings screen's
  words and lands in the settings screen's place.

  Scenario: Recompose Help opens the published site
    When the person picks Recompose Help from the Help menu
    Then the browser opens the recompose site

  Scenario: Reporting an issue lands on the new-issue page
    When the person picks the issue report from the Help menu
    Then the browser opens the repository's new-issue page

  Scenario: The folder item lands where the settings screen lands
    When the person picks the config folder item from the Help menu
    Then the operating system opens the folder that holds recompose data

  Scenario: The folder item speaks the settings screen's words
    Then the Help menu's config folder item reads the same words as the settings screen's reveal action
