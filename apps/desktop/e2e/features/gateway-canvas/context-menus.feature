Feature: A right-click on the canvas raises the acts of what it landed on

  Every card and every cable is drawn by the flow library, so one menu stands
  around the stage and reads the press off whatever stood under it. The canvas
  behind the cards answers as well, and no press ever opens an empty menu.

  Background:
    Given an open gateway detail holding a composition

  Scenario: The canvas offers what a person can make and tidy
    When the person right-clicks the canvas behind the cards
    Then the canvas menu offers "Add a virtual model" and "Tidy the canvas"

  Scenario: A definition offers the target pick its own port offers
    When the person right-clicks the virtual model card
    Then the canvas menu offers "Pick a target" and "Delete virtual model…"

  Scenario: The gateway card offers the acts that run its composition
    When the person right-clicks the gateway card
    Then the canvas menu offers "Add a virtual model" and "Delete gateway…"

  Scenario: A binding cable offers the release the Delete press runs
    When the person right-clicks the binding cable
    Then the canvas menu carries "Release binding…"

  Scenario: Removing a definition from its own menu asks before it leaves
    Given a canvas menu raised on the virtual model card
    When the person takes "Delete virtual model…" off the canvas menu
    Then the removal question stands over the canvas

  Scenario: Dismissing the menu runs none of its acts
    Given a canvas menu raised on the virtual model card
    When the person dismisses the canvas menu
    Then the virtual model still stands on the canvas
