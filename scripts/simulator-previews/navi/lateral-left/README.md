# Navi lateral-left simulation

Local review source for Navi `Agentech.lateral_left()`.

- Sequence: stand 0.75 seconds, move left 3 seconds, stop 1.5 seconds.
- Preview tuning: 1.30 Hz cadence, 0.090 m lateral step, 0.045 m swing-foot clearance, and 0.006 m lean offset.
- Direction fix: the stance feet travel right relative to the body so the body translates left.
- Measured body displacement during the three-second motion: 0.181 m left with 0.0616 rad maximum roll and 0.0871 rad maximum yaw.
- Camera: fixed 90-degree side profile.
- Control: 12 leg torque actuators only; no root-position assistance.
- Asset: `public/assets/products/agentech-library/simulator-previews/navi/lateral-left/navi-lateral-left.mp4`

Keep this change local until the Navi movement set is approved.
