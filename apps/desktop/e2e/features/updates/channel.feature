Feature: An update arrives through the channel that installed the app

  The app updates itself only where it owns the install. A deb belongs to the
  system package tool, so that copy never checks and never offers a control.
  An AppImage belongs to nobody else, so it updates itself.

  Scenario: A package tool owns a deb install
    Given a copy a package tool installed from a deb
    When the app starts
    Then the app runs no update check of its own
    And the interface offers no update control

  @update-feed @update-checks-fast @appimage-install
  Scenario: An AppImage updates itself
    Given a copy running as a Linux AppImage
    When the newer version reaches the release feed
    Then the app downloads the newer version
