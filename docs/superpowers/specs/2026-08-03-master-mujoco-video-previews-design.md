# Master MuJoCo Video Previews

Date: 2026-08-03

## Goal

Add the 27 supplied MuJoCo MP4 clips to the Master robot SDK reference so every public Master function has a simulation preview and every SDK-supported hand variant is selectable. The change applies only to the Master cards in **View SDK** and does not change the public SDK, Hardware Check, or live-run behavior.

## User experience

Each expanded Master function card includes a **MuJoCo Simulation** panel in the existing right-hand preview column.

- Functions without variants show their single matching clip.
- Functions whose `hand` parameter supports `left` and `right` show a two-button **Left / Right** selector.
- `heart`, whose public SDK additionally supports `both`, shows **Left / Right / Both**.
- The initial selection follows the function example, except `heart`, whose declared default and example are both `both`.
- The selected clip autoplays muted, loops, uses `playsInline`, exposes native controls, and uses `preload="metadata"`.
- Only an expanded card renders its preview, preserving the current `<details>`-based lazy UI behavior.
- Labels and accessible names identify the Master function and selected variant.

## Asset organization and mapping

Extract the MP4 files into:

`public/assets/products/agentech-library/simulator-previews/master/`

The application uses an explicit map keyed by the exact public SDK function name. Parameter variants are nested under their exact SDK values. No matching is performed from user-visible prose.

| SDK function | Variant | ZIP asset |
| --- | --- | --- |
| `wave` | `left` | `01_action_wave_left.mp4` |
| `wave` | `right` | `02_action_wave_right.mp4` |
| `blow_kiss` | `left` | `03_action_blow_kiss_left.mp4` |
| `blow_kiss` | `right` | `04_action_blow_kiss_right.mp4` |
| `raise_hand` | `left` | `05_action_raise_hand_left.mp4` |
| `raise_hand` | `right` | `06_action_raise_hand_right.mp4` |
| `salute` | `left` | `07_action_salute_left.mp4` |
| `salute` | `right` | `08_action_salute_right.mp4` |
| `heart` | `left` | `09_action_heart_left.mp4` |
| `heart` | `right` | `10_action_heart_right.mp4` |
| `heart` | `both` | `11_action_heart_both.mp4` |
| `handshake` | `left` | `12_action_handshake_left.mp4` |
| `handshake` | `right` | `13_action_handshake_right.mp4` |
| `high_five` | `left` | `14_action_high_five_left.mp4` |
| `high_five` | `right` | `15_action_high_five_right.mp4` |
| `clap` | fixed | `16_action_clap.mp4` |
| `cross_arms` | fixed | `17_action_cross_arms.mp4` |
| `chest_wave` | `left` | `18_action_chest_wave_left.mp4` |
| `chest_wave` | `right` | `19_action_chest_wave_right.mp4` |
| `hug` | fixed | `20_action_hug.mp4` |
| `cheer` | fixed | `21_action_cheer.mp4` |
| `wave_goodbye` | fixed | `22_action_wave_goodbye.mp4` |
| `raise_hands` | fixed | `23_action_raise_hands.mp4` |
| `bow` | fixed | `24_action_bow.mp4` |
| `scratch_head` | fixed | `25_action_scratch_head.mp4` |
| `status` | fixed | `26_sensor_status.mp4` |
| `action_catalog` | fixed | `27_sensor_action_catalog.mp4` |

## Component boundaries

The asset manifest is exported from a focused Master preview module. It owns function-to-variant mapping, default selection, and asset paths. A small `MasterSimulationPreview` client component owns only the active selector state and video rendering. `FocusedBrowseFunctionsSection` delegates to that component whenever `selectedRobot === "master"`; existing Aegis and Navi preview paths remain unchanged.

Keeping the manifest separate makes completeness testable without parsing JSX and prevents the large workbench component from becoming the source of truth for another robot's media inventory.

## Validation and failure behavior

Automated tests will assert:

1. Every one of the 18 public Master functions has a manifest entry.
2. Every declared `hand` value has exactly one clip, and fixed functions have exactly one fixed clip.
3. No unsupported selector appears, including a `right` option for `scratch_head`.
4. All 27 referenced MP4 files exist below the public asset directory and no supplied MP4 is left unmapped.
5. Default variants agree with examples and the declared `heart` default.

The UI does not silently substitute another action if an asset is absent. Development-time consistency checks fail with the missing function, variant, or file path. A browser verification will confirm Master selection, action expansion, variant switching, video URL changes, no error overlay, and no browser console errors.

## Scope boundaries

- Do not add new Master functions or parameters.
- Do not alter validation limits, live hardware behavior, or credit handling.
- Do not add a separate simulator runner; these are approved prerecorded MuJoCo previews.
- Do not change the Aegis or Navi preview behavior.
