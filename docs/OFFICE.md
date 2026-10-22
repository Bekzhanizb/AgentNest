# Pixel office

Status: implemented presentation preview with an explicit **Demo Mode**. There is
no AI runtime, provider connection, database, real task, or approval action here.
Agents and Settings remain Coming soon. Tasks is a separate experimental
[real local notes run](DESKTOP_NOTES.md), without any office characters or activity.
A separate [Node CLI proof](OLLAMA_PROOF.md) now emits real runtime events, but
none is connected to this desktop view. Its models and SDKs are never loaded here.

## Explore

Run `npm ci`, `npm run dev`, then open Office. The default room has four desks,
a lounge, coffee nook, plants, three windows with light, and a door. It contains
no characters or activity until you select **Enter Demo Mode**.

Demo Mode displays four fictional characters, Ada, Milo, June, and Sol, with
individual appearance, name, role, desk, task, and history. The session banner,
canvas watermark, character badges, inspector, and screen-reader announcements
identify the data as fictional. There is no real approval button. Exit Demo Mode
removes every character, history entry, selection, and playback timer.

The six-event timeline is fixed, with no random numbers, clock-derived results,
network calls, or persistence. Next advances one event. Play advances every two
seconds only after an explicit click; Pause, Reset, and Exit stop playback. At the
end it stops rather than inventing more work. Hidden windows pause playback.
Idle, working, awaiting approval, completed, and failed are display states of
fictional events; none establishes that a task actually ran.

## Controls and accessibility

| Action | Pointer / touch | Keyboard |
| --- | --- | --- |
| Select character | Click sprite or roster entry | Tab to roster, Enter or Space |
| Move among roster entries | Select an entry | Arrow keys, Home, End |
| Clear selection | Close inspector or click empty room | Escape in viewport; Close inspector restores roster focus |
| Pan | Drag room or use arrow buttons | Focus viewport, then arrow keys |
| Zoom | Plus / minus buttons | Focus viewport, then + / − |
| Reset camera | Fit office | Home or 0 in viewport |

Zoom is bounded to 65–250%; pan stays bounded inside the scene. Every canvas
interaction has a labeled native DOM control. The canvas is decorative to assistive
technology; the roster and inspector expose the same state with text, symbols,
selection state, and event history. Color is supplementary. The inspector stacks
below the office at narrow widths; no drawer or focus trap is required. A skip
link moves to the workspace. View character details focuses the inspector; Escape
inside it returns to the roster. Forced colors preserve selection and focus;
coarse-pointer controls use larger targets. The warm paper-and-forest palette
frames the original artwork without obscuring demo labels. See the
[accessibility review](ACCESSIBILITY.md) for automated and open manual checks.

Ambient motion starts off and is optional: a slow light pulse and one-pixel
breathing at a maximum 12 FPS. System reduced-motion disables it, including when
the preference changes while the app is open. Hidden windows stop animation.
The animation ticker cannot change agent status. Textual demo playback is separate
and always has Pause. No flashing, walking, task-progress animation, or autonomous
activity is shown. Graphics failure offers Retry while leaving all text controls
and the inspector usable.

## Boundaries

```text
explicit Demo controls → fixed AgentEvents → pure core projection → AgentViewModel
                                                                  ├─ React roster / inspector
                                                                  └─ office-scene (PixiJS)
```

- `packages/core/src/agent-view.ts` owns the typed event union, appearance tokens,
  status labels, immutable projection, ordering checks, and bounded history.
  Demo and future runtime origins cannot be mixed in one projection.
- `renderer/src/office/demo.ts` is the only source of fictional events. Nothing
  subscribes to a real provider, IPC stream, storage adapter, or model.
- `packages/office-scene` consumes snapshots and reports hit-test IDs. It has no
  React, Electron, Node, provider, database, event-dispatch, or network dependency.
- React owns selection, camera, responsive panels, demo playback, and motion
  preference. ESLint rejects provider/storage/Node imports and network globals
  in office presentation code. The production CSP also denies connections.

A future runtime must validate external events at its application boundary before
projecting them. The current TypeScript types are not an untrusted-input decoder,
and the `runtime` origin is a contract for future work, not an implemented feed.
Creating real agents remains subject to the [roadmap](../ROADMAP.md).

## Artwork and dependencies

All room, furniture, light, character sprites, and tiny bitmap glyphs are drawn
from original rectangle instructions in `packages/office-scene/src/art.ts` and
`character.ts`. React portraits and Pixi sprites share those same character
rectangles; portraits do not import PixiJS. Interface icons and the empty-state
plant are original inline SVG, with no new asset or icon dependency.
There are no downloaded sprites, image files, font files, generated third-party
images, or asset service requests. System fonts are used for the surrounding UI.
The repository's existing [LICENSE](../LICENSE) and copyright notice are preserved;
no third-party artwork attribution or new copyright owner is invented.

PixiJS **8.22.0** is an MIT-licensed runtime dependency, pinned in the root lockfile.
Its official `pixi.js/unsafe-eval` entry has a misleading name: it installs static
CSP-safe replacements for dynamic shader/uniform code generation. It does not
require an `unsafe-eval` CSP allowance. Production CSP, sandbox, preload, and IPC
are unchanged; the Electron smoke still proves dynamic evaluation is denied.
`@axe-core/playwright` **4.14.0** is an MPL-2.0 development-only accessibility checker,
not a bundled office asset. Dependency notices remain in installed packages;
distribution notice collection is part of future packaging work.

## Verification and limits

Vitest covers all five status presentations, immutable projection, source/order
rejection, deterministic replay, empty states, inspector, keyboard focus, reduced
motion, explicit playback, pause/reset, and cleanup. Component tests replace the
GPU canvas with an explicitly named test double; they do not prove Pixi rendering.

The Electron smoke separately requires an actual Pixi-ready canvas, checks sprite
selection, drag, camera keyboard controls, fictional statuses and history, reduced
motion, an axe WCAG A/AA scan, and no external HTTP requests. It retains sandbox,
bridge, CSP, and popup checks. Axe runs in its single-window legacy mode because
AgentNest denies extra windows; the app has no cross-origin frames. Screenshots
are written under ignored `test-results/`.

Browser preview checks at 1440, 390, and 320 pixels exercise responsive layout and
axe independently. They are not a substitute for the secure Electron smoke.
A browser without preload correctly shows an unavailable app-information bridge;
the office itself still works. See [recorded checks](VERIFICATION.md).

WebGL is required for the pixel view. Without it, use the text roster and inspector.
Automated scans do not establish full accessibility conformance: manual screen-reader,
high-contrast, touch hardware, and a wider GPU matrix still need review. PixiJS
8.22.0's bitmap-font declarations conflict with exact optional properties; only
the renderer and scene configurations skip dependency declaration checking. All
project source retains strict, exact-optional, and unchecked-index checks. Core,
Electron, provider, and storage declaration checking remains enabled. Track the
upstream declaration fix before removing this scoped exception; no engine upgrade
was made to hide it.
