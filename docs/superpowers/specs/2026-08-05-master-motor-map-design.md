# Master Motor Map

## Goal

Add an informational Master motor map to the EAIC Hub SDK Library. Customers can see each controllable joint on a front-facing Master image and inspect its name and manufacturer movement limits.

## Scope

- Display the map only when **Master** is selected in the SDK Library.
- Reuse the existing front-facing `ff-master-ultra.jpg` asset.
- Overlay 31 accessible interactive markers:
  - 14 arm joints (7 per arm)
  - 12 leg joints (6 per leg)
  - 3 waist joints
  - 2 head joints
- On hover, keyboard focus, or tap/click, show the friendly name, exact runtime joint key, group/J-number, and official manufacturer degree limits.
- Include a grouped limit table and a direct link to the AimDK X2 joint-name-and-limit documentation.
- Make clear that the display is reference information only and does not command Master.

## Data and Interaction Design

The existing `lib/master-robot-joint-reference.ts` remains the single source for the official groups, degree ranges, runtime joint keys, and source URL. A client-side map model adds display coordinates and joins each marker to its official and runtime records.

Each marker is a native button with a visible focus state, descriptive accessible label, and a popup detail panel. Markers sharing one physical articulation are offset slightly so all independent axes remain reachable. Pointer hover previews a marker; click/tap pins it until another marker is selected. Keyboard Tab and Enter/Space provide equivalent access.

## Layout

The Master Motor Map appears between the Master setup block and the command-category cards. It has three areas:

1. A labelled front-view robot image with numbered motor markers.
2. A selected-joint detail panel with the joint’s user-facing and runtime names plus limits in degrees and radians.
3. A grouped reference table for arms, legs, waist, and head, with the official source link.

On narrow screens the detail panel and table stack below the image; markers remain touch targets of at least 32px.

## Safety and Non-goals

This iteration has no angle sliders, trajectory editor, simulator authoring, or physical robot execution. It does not change the public SDK, router, simulator, or controller ownership. Manufacturer ranges are presented as reference limits, not as automatically safe trajectories.

## Verification

- A focused test verifies all 31 runtime joints have exactly one map marker and official limit entry.
- The existing TypeScript check passes.
- Local browser verification confirms the map appears only for Master and shows the selected joint details, source link, and visible keyboard focus.
