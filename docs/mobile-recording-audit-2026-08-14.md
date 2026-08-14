# Mobile recording parity audit — 2026-08-14

Source: the 3:37 Android recording supplied for the Smoke Stack Pitmaster Companion and the consolidated Giant Update 0.03 directive.

## Corrected discrepancies

| Recording finding | Correction |
|---|---|
| Android launcher showed Capacitor's blue default icon and a truncated “Smoke Stack Pitma…” label. | Added real 192px, 512px, maskable, Apple-touch, and native source icons based on the web brand; shortened the native launcher label to “Smoke Stack.” |
| Six small navigation controls were squeezed into the phone header and remained above every long page. | Added a fixed five-destination mobile shell: Home, Cook, CharGPT, Equipment, More. Logs, Analytics, Planner, Account, Sync, and Settings are available through More. Desktop retains its direct navigation. |
| The smoker overview and “Use Smoke Stack on every device” card repeated above unrelated workflows. | Limited global overview, active-cook command center, and installation/share actions to Home. Logs, Analytics, Planner, Cook, Equipment, and CharGPT now open directly into their workflow. |
| Settings used a horizontally scrolling desktop category strip and squeezed controls beside long descriptions. | Rebuilt mobile Settings as a full-screen category list followed by a sticky back/title detail screen. Controls stack on narrow widths and keep 44px touch targets. |
| Long tables, selectors, and controls could exceed the phone width. | Added mobile input sizing, horizontal containment, safe table scrolling, dialog width constraints, bottom-safe-area spacing, and a fixed-navigation content inset. |
| Version labels conflicted (`0.02A`, `0.0.2A`, `0.03`, and `v2.4`). | Added one generated release manifest sourced from `package.json` and the Git commit. User-facing app, splash, device registration, update UI, and manifest now share that release metadata. The app remains `0.02A` until the 0.03 release gate passes. |
| “Master Web” controls mixed app updates with account-data reconciliation and offered a dangerous force-align operation. | Replaced the card and compatibility service with Release & Client Version Status. Available actions are Check for update, Refresh application, and Clear local build cache. None reads, merges, or overwrites user records. |
| Local/AI-generated code patches could be labeled “Applied Live.” | Removed client execution of stored patches. The compatibility runner can only check reviewed deployment metadata. |
| Normal mobile feature updates required rebuilding/reinstalling a wrapper. | The installed PWA now checks the deployed `version.json` on launch, focus, connectivity recovery, and every 15 minutes. Safe screens refresh automatically; an unsaved New Cook form defers refresh and shows an update action. |

## Release boundary

The supplied update document is a phased program and explicitly forbids displaying 0.03A before all authorized implementation, test, gate, and release steps pass. This parity repair therefore does not falsely claim that the complete Giant Update 0.03 program has shipped.

The current supported no-manual-feature-update mobile form is the installed PWA. An already installed Capacitor APK must be replaced once to change its baked-in launcher asset. Future Google Play packaging should use a verified Trusted Web Activity (or a normal store-reviewed native release); signing-key-dependent Digital Asset Links cannot be fabricated in source control.
