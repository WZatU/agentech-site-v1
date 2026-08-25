from agentech import Agentech

# Start upright once. Ordinary walking actions reuse the standing state.
Agentech.stand()
Agentech.squat()
Agentech.stand()

# Paired standing translations: visible in video and approximately reversible.
# These are open-loop velocity/time requests, not exact distance guarantees.
Agentech.forward(speed_mps=1.50, duration_s=0.80)
Agentech.backward(speed_mps=1.50, duration_s=0.80)
Agentech.lateral_left(speed_mps=0.45, duration_s=1.00)
Agentech.lateral_right(speed_mps=0.45, duration_s=1.00)

Agentech.diagonal(angle_deg=45, speed_mps=0.50, duration_s=1.00)
Agentech.diagonal(angle_deg=-135, speed_mps=0.50, duration_s=1.00)

# Low-gait motions are enlarged by roughly 2-3x from Session 38 while staying
# within the published squat-motion limits.
Agentech.squat_forward(speed_mps=0.20, duration_s=0.75)
Agentech.squat_backward(speed_mps=0.20, duration_s=0.75)
Agentech.squat_lateral(
    direction="left",
    speed_mps=0.20,
    duration_s=0.75,
)
Agentech.squat_lateral(
    direction="right",
    speed_mps=0.20,
    duration_s=0.75,
)
Agentech.squat_diagonal(
    angle_deg=45,
    speed_mps=0.30,
    duration_s=0.75,
)
Agentech.squat_diagonal(
    angle_deg=-135,
    speed_mps=0.30,
    duration_s=0.75,
)
Agentech.squat_turn(angle_deg=30)
Agentech.squat_turn(angle_deg=-30)

Agentech.stand()
Agentech.turn(angle_deg=90, turn_rate_deg_s=60)
Agentech.turn(angle_deg=-90, turn_rate_deg_s=60)

# +/-0.25 rad is about +/-14.3 degrees: clearly visible while retaining
# margin to the smaller positive/negative hardware endpoint on every axis.
Agentech.yaw(speed_rad_s=0.30, position_rad=0.25)
Agentech.yaw(speed_rad_s=0.30, position_rad=-0.25)
Agentech.pitch(speed_rad_s=0.30, position_rad=0.25)
Agentech.pitch(speed_rad_s=0.30, position_rad=-0.25)
Agentech.roll(speed_rad_s=0.30, position_rad=0.25)
Agentech.roll(speed_rad_s=0.30, position_rad=-0.25)

Agentech.stay(duration_s=1.00)
Agentech.get_battery_status()
Agentech.sit()
