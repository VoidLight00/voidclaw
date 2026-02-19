# Code Signing Policy

EasyClaw uses free code signing provided by [SignPath Foundation](https://signpath.org).

## Signed Artifacts

- **Windows**: NSIS installer (`.exe`) is signed with an EV code signing certificate issued by SignPath Foundation.
- **macOS**: DMG installer is signed and notarized through Apple Developer Program.

## Build & Signing Process

Windows installers are built and signed through the following process:

1. A GitHub Release triggers the `Build & Release` workflow.
2. The Windows job builds an unsigned installer using `electron-builder`.
3. The unsigned artifact is submitted to [SignPath](https://signpath.io) for signing.
4. SignPath verifies the artifact was built from the source repository by an authorized CI pipeline.
5. The signed installer is uploaded to the GitHub Release.

All builds are reproducible from the public source code. No binary artifacts are signed outside of the CI pipeline.

## Team Roles

| Role | GitHub Username |
|------|----------------|
| Author / Approver | [@ybgwon96](https://github.com/ybgwon96) |

## Privacy

EasyClaw does not collect, transmit, or store any personal data. The application runs entirely on the user's local machine. No telemetry, analytics, or tracking of any kind is included.

## License

This project is licensed under the [MIT License](LICENSE).
