# Groove Scribe — Arturo's fork

A personal fork of Groove Scribe (drum-groove notation editor). The engine
(playback, notation, MIDI, URL encoding) is considered **perfect and must not be
rewritten** — all work is UI/UX. Primary real-world use: build a groove → copy
the notation to clipboard → paste into Figma.

## The app: Ritmo (root `index.html`)

- **Ritmo** (root `index.html`, originally vibe-coded in Dia) is *the* app — a
  clean-slate shell wired onto the real Groove Scribe engine. All new work
  happens here. (It used to live in `prototypes/ritmo/`; promoted to the root.)
- **Legacy Groove Scribe** is kept at `legacy.html` for reference — the original
  app plus the light `sidebar`-branch restyle (`css/groove_writer_orange*`,
  `js/ui_sidebar.js`). Not actively developed.

## Path B architecture (ritmo-engine)

Ritmo keeps its own shell / grid / toolbar / state / Tone.js sequencer, but
**delegates notation, sound, and export to the engine** (`js/groove_utils.js`,
loaded untouched alongside `abc2svg-1.js` + `jsmidgen.js`). Bridge points, all in
the root `index.html`:

- **Notation**: `stateToGrooveUrl()` maps Ritmo's pattern → a Groove Scribe URL
  string, then `GU.getGrooveDataFromUrlString()` → `GU.createABCFromGrooveData()`
  → `GU.renderABCtoSVG().svg` into `#notArea`. Note-letter map mirrors the
  engine's `tablatureToABCNotationPerNote` (groove_utils.js:548).
- **Audio**: real Groove Scribe drum samples (`soundfont/NewDrumSamples/OGG/`)
  loaded into `Tone.Players`, triggered by Ritmo's sequencer (`SAMPLE_FILES`).
- **Playhead**: reuses the engine's `highlightNoteInABCSVGByIndex()` +
  `#abcNoteNum_<uid>_<N>` rects; `onStep` highlights `#sounding-steps-so-far`.
- **Export**: MIDI via `GU.create_MIDIURLFromGrooveData(gd,'general_MIDI')`;
  copy-PNG rasterizes the engine SVG to the clipboard.
- **Divisions**: `spm/spb` derive from `GU.calc_notes_per_measure` (triplets +
  time sigs accurate); toolbar Subdivision popover = note value × Straight/Triplets.
- **Controls**: tempo/time-sig/subdivision/metronome live in **toolbar popovers**
  (`.tb-ctrl > [data-pop] + .pop`, `wirePopovers()/syncControls()`), not the sidebar.
- **Permutations** (4/4 only): Ritmo's own port of the legacy generator
  (`groove_writer.js:1631–2330`, not loaded). `permSheet()` builds one section
  per ticked group from measure 1; notation via `GU.get_top_ABC_BoilerPlate` +
  `GU.create_ABC_from_snare_HH_kick_arrays`, MIDI via `GU.MIDI_from_HH_Snare_Kick_Arrays`.
  Playback goes through `buildPlayModel()` (`PM`): the grid normally, or the
  whole sheet at full resolution (32nds / 32nd triplets) when permutations are on.
- **Play = View**: `togglePlay()` switches to View on start (grid hidden,
  notation follows the playing line via `followNotation()` inside the
  scrollable `#notWrap`) and back to Edit on stop if it started there. The
  permutation sheet only renders in View; Edit shows the ostinato.
- **Phone toolbar (≤600px)**: Play · BPM · "4/4 · 1/16" (`#pop-groove`, which
  re-hosts the `#pb-ts/#pb-subdiv/#pb-met` bodies via `placeGrooveControls()`)
  · Copy · ⋯ (`#pop-tools`: stickings/permutations/toms/clear).
- **Layout**: the grid is ALWAYS one line (all measures side by side) and
  scrolls sideways inside `.grid-wrap`, with sticky row labels — never stack
  it (Arturo rejected a stacked phone grid). The notation DOES stack (1–2
  measures per line). On desktop the staff lines up with the grid
  (`gridGeom()`/`alignNotation()`: starts at the first cell, measure width =
  grid measure width); on a phone it fills the screen width. Long-press a
  cell = articulation menu.

**Do not edit the engine JS** (`groove_utils.js`, `groove_writer.js`) — the whole
premise is a new shell over the proven engine.

## Running / previewing

- Preview server: `python3 -m http.server 8765` (see `.claude/launch.json`).
- Ritmo: **http://localhost:8765/** (must be served over HTTP; `file://` breaks).
- Legacy: http://localhost:8765/legacy.html
- **Playback playhead & popover animations need a *visible* browser tab** — the
  automated preview runs the tab backgrounded, where `requestAnimationFrame`
  (and thus `Tone.Draw`/`onStep`) is paused. Verify animation in a real tab.

## Conventions

- **No all-caps UI copy** — Title/sentence case only.
- Legacy app caches hard: bump the `?v=N` query on `css/groove_writer_orange*`
  and `js/*` links in `legacy.html` when editing them (Ritmo has no `?v=`).
- `gh` CLI is not installed — push branches and open PRs via the GitHub web URL.

## Where the running plan lives

Session-to-session state (decisions, todos, next steps) is in Claude memory:
`memory/project_ui_refactor_plan.md` (+ `feedback_no_all_caps.md`).
