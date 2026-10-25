# Ideas (not planned, not to be built)

Things the user has mentioned or that came up. **Do not build any of them** unless a phase of the plans says so or the
user asks. They are here so decisions made now do not close the door.

## Kept in mind

- **iPad companion.** The user wants an iPad project that complements the desktop app. That will need a way to share
  data (a backend or a local-network link) and was deliberately left out. Today's hooks: UUID v7 ids, `created_at` /
  `updated_at`, models shaped like the web's, repositories behind interfaces, mutations only through services.
- **A backend, later.** If it is needed, it will be a new decision. Nothing in this repo should assume it exists.
- **The Bible.** Restored by explicit user request as [phase 12](12-bible/README.md), with a locally imported RVR1960 XML. Other translations and bundled text remain out of scope.
- **Audio output device selection** per use (room speakers vs the TV): `HTMLMediaElement.setSinkId` for local audio;
  the YouTube iframe does not allow it.
- **Auto-update** with a release feed, and **code signing**.
- **Moving the Iris folder** from the UI (copy, then switch `homeDir`).
- **Restore wizard** for database snapshots.
- **Remote control** from a phone on the local network.

## Explicitly dropped

- Sign-in, accounts, teams and modules.
- Linking TVs by code and projecting to a TV browser.
- Cloud storage and its quota.
- Syncing between machines.
