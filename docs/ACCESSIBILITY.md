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

The UI suite checks the initial empty room and explicitly fictional demo, keyboard
skip/focus/return, all five status presentations through the existing component
suite, actual Pixi selection, reduced motion, forced colors, narrow layouts at
1440/390/320 pixels, touch emulation, and axe WCAG 2 A/AA plus 2.1 AA. It rejects
horizontal overflow, uncaught page errors, and external HTTP requests. Screenshots
are saved under ignored `test-results/browser/`.

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
