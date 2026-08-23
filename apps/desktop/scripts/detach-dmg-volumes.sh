#!/bin/sh
# Detach Recompose DMG volumes left mounted by electron-builder.
#
# electron-builder mounts each DMG while applying the window layout and
# background, then detaches it. An interrupted or failed build skips that
# detach, so the volume stays mounted. Two mounted volumes then hold two
# Recompose.app bundles sharing one bundle id, which sends LaunchServices
# into an endless binding re-evaluation: Finder pins a core indefinitely.
#
# Always exits 0 -- callers preserve the build's own exit code.

for v in /Volumes/Recompose*; do
  [ -d "$v" ] || continue
  echo "detaching leftover volume: $v"
  hdiutil detach "$v" -quiet || hdiutil detach "$v" -force -quiet || true
done

exit 0
