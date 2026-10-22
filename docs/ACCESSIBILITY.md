# Office accessibility review

The office is a presentation preview. **Demo Mode is fictional** and never calls
a provider or database. These checks cover the UI; they cannot establish AI or
runtime readiness. See [office controls](OFFICE.md#controls-and-accessibility).

## Implemented support

- A first-focus Skip to workspace link moves focus to the main landmark without
  changing the trusted Electron URL or weakening IPC origin checks.
- Native navigation and camera buttons have accessible names and visible focus.
  Roster entries expose selection, role, status text, and a distinct status symbol.
- View character details moves focus to the inspector. Escape in the inspector
  clears selection and returns focus to the selected roster entry. There is no
  focus trap or modal drawer. The inspector stacks below the scene when narrow.
- The canvas and procedural SVG portraits are decorative to screen readers.
  All state, task text, and event history are available as ordinary DOM content.
- Motion starts off, honors live changes to system reduced-motion, and pauses in
  hidden windows. Demo playback needs an explicit Play and offers Pause.
- System forced colors retain borders, selection outline/checkmark, controls,
  labels, and focus. Important state is never conveyed only through color.
- Narrow-screen and coarse-pointer controls have at least 44-pixel targets.
  Selecting a sprite is optional; roster and camera buttons provide alternatives
  to precision pointing and dragging.

## Repeatable automated review

From a fresh clone, using PowerShell or another supported terminal:

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npx playwright install chromium
npm run test:ui
```

Electron smoke uses Electron's own browser and retains its sandbox. The additional
UI suite uses the pinned Playwright Chromium against production assets through a
loopback-only Vite preview. Its software WebGL flags apply only to that browser
preview. It does not change Electron's sandbox, production CSP, IPC, or permissions.
No new runtime or development dependency was introduced for this polish.

The subsequent Node-only Ollama proof adds backend dependencies; none is loaded
by the renderer, scene or this browser review.

The four-scenario UI suite checks the initial empty room and explicitly fictional demo, keyboard
skip/focus/return, all five status presentations through the existing component
suite, actual Pixi selection, reduced motion, forced colors, narrow layouts at
1440/390/320 pixels, touch emulation, and axe WCAG 2 A/AA plus 2.1 AA. It rejects
horizontal overflow, uncaught page errors, and external HTTP requests. Screenshots
are saved under ignored `test-results/browser/`.

## Review performed on 2026-10-22

Environment: managed Debian 13 x64, system Chromium 154.0.8037.57, production
renderer built from this feature branch. The browser suite passed all four
scenarios. A visual review of its 1440- and 320-pixel screenshots confirmed a
readable room, persistent fictional-session labels, selected-character outline,
textual status, and a stacked inspector with no essential content clipped.
This is a screenshot review, not a manual assistive-technology test.

The added keyboard-only scenario uses Tab and Enter from the initial empty screen
to enter Demo Mode, select Ada, open the inspector, Escape back to Ada, enable
ambient motion, and leave the demo. It also changes reduced-motion live and checks
that motion becomes disabled/off. Browser reflow at 640/320 CSS pixels represents
the layout widths of 200%/400% zoom from 1280 pixels; it is **not** actual browser
zoom or Windows text scaling. Axe found zero WCAG 2 A/AA and 2.1 AA violations in
the scanned empty, demo, narrow and forced-color states. Automated checks do not
establish full conformance.

To use an already installed Chromium instead of a Playwright download, set
`AGENTNEST_BROWSER_EXECUTABLE` to its full path for the test command. This is a
browser-only test option, not an application setting. Normal Windows CI uses the
pinned Playwright browser. A browser preview correctly reports that Electron app
information is unavailable; that does not prevent office interaction.

## Manual review still required

Automated browser emulation is not NVDA or a physical device. The following manual
gates remain **open**. Do not mark them passed from an axe result or a screenshot.

| Gate | Procedure | Expected result | Status |
| --- | --- | --- | --- |
| NVDA on Windows | Start built Electron with NVDA; use Tab and heading/landmark navigation | Skip link, main navigation, session mode, roster, and inspector are reachable; decorative canvas/portraits add no noise | Open |
| NVDA selection/history | Enter Demo Mode, select Ada; advance events; open details; Escape | Fictional origin, selected character/status, task and history are understandable; focus returns to Ada | Open |
| NVDA playback | Play, pause, reset, exit | Announcements stay understandable, playback can stop, fictional data disappears on exit | Open |
| Windows contrast themes | Enable a system contrast theme; repeat selection/navigation | Selection, focus, status text, buttons and errors remain distinguishable | Open |
| Zoom and text size | Review at 200%/400% browser zoom and Windows text scaling | Content reflows; controls/history remain reachable; no clipped essential text or focus trap | Open |
| Physical touch | Use a Windows touchscreen; select roster, open details, zoom and reset without dragging | Buttons activate reliably and pages remain scrollable outside the pan surface | Open |
| Hardware reduced motion | Change the OS preference while ambient motion is enabled | Cosmetic motion stops and cannot be enabled until the preference allows it | Open |

Record date, tested commit, OS, Electron/browser, assistive technology/device,
steps, result, and any issue link for each manual run. Public evidence should use
only the fictional demo, with no private prompts, credentials, or local notes.

A fuller GPU, macOS, ARM, and assistive-technology matrix remains future work.
The [verification record](VERIFICATION.md) distinguishes actual commands from these
open gates; no full accessibility conformance claim is made.

## Experimental Tasks follow-up

The separate [desktop notes screen](DESKTOP_NOTES.md) uses native buttons, a
labeled model field, an explicit permission checkbox, textual phase announcements,
inert generated text and an ordinary DOM event/source history. No canvas interaction
is required. Navigation exposes a return-to-run control while actual work is active.
Model output cannot insert HTML or automatically open links/files.

The production-browser suite now has five scenarios. Its Tasks case checks the
browser-without-Electron boundary, disabled native/run operations, no fabricated
activity, reflow at 1440/390/320 CSS pixels and axe WCAG 2 A/AA plus 2.1 AA. The
320-pixel Tasks screenshot was visually reviewed. These checks passed locally;
they are not assistive-technology tests. The opt-in actual Electron/provider test
also scans the completed real result, using public fixture notes only.

Add these cases to the still-open manual matrix: native folder and final permission
dialog focus/cancellation; filenames/model/permission readout; Run/Cancel and phase announcements;
navigation away/back during a call; reading sources and generated text; Clear and
reload. Confirm NVDA does not announce every event as a live update or lose focus.
Actual Windows contrast/text scaling, true zoom, physical touch and OS motion
preferences remain open. No manual gate is closed by the new automated checks.
