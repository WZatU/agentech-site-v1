# Remove Navi Photo Actions

## Objective

Remove seven camera/photo-related actions from the public Agentech SDK and the Navi SDK Library website while retaining `raise_camera()` as a supported public action.

## Public actions to remove

- `prepare_camera()`
- `camera_stand_3s()`
- `take_photo()`
- `photo_wave_hand()`
- `before_take_photo_fast()`
- `after_take_photo_1_fast()`
- `after_take_photo_2_fast()`

`raise_camera()` remains public and keeps its newly recaptured MuJoCo preview.

## SDK changes

Remove the seven public wrapper methods from `agentech/robots/navi/api.py`. Remove their public documentation and public API tests. Keep the corresponding original firmware names and IDs in the internal audited action catalog so the project retains an accurate record of Navi's vendor SDK without exposing unsupported public methods.

Direct public calls to the removed methods will no longer be valid. No compatibility aliases or deprecation shims will be added.

## Website changes

Remove the seven actions from the Navi public SDK reference data, action count, consistency expectations, simulator-preview map, and rendered action cards. Delete their generated MuJoCo videos, metrics, and compact motion profiles from the website workspace. Keep `raise_camera()` and its preview unchanged.

## Generated and capture data

Delete website-facing generated assets only for the seven removed actions. Raw robot captures in the SDK output directory are diagnostic artifacts and are not part of the public API; they may remain locally unless they are tracked or published.

## Verification

- SDK tests confirm the seven wrapper methods are absent and `raise_camera()` remains available.
- Website consistency tests confirm none of the seven names appear in the Navi public reference and `raise_camera()` remains present.
- The local Navi SDK Library page loads successfully and its action-card count decreases by seven.
- Browser verification confirms the seven cards are absent and the `raise_camera()` card and MuJoCo preview remain visible.
- Git diffs are reviewed separately in both repositories so unrelated local work is not included.
