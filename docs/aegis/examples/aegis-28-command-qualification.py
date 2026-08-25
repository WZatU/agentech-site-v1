from agentech import Agentech

Agentech.stand()
Agentech.squat()
Agentech.stand()

Agentech.forward(speed_mps=0.20, duration_s=1.0)
Agentech.backward(speed_mps=0.20, duration_s=1.0)
Agentech.lateral_left(speed_mps=0.15, duration_s=1.0)
Agentech.lateral_right(speed_mps=0.15, duration_s=1.0)

Agentech.diagonal(angle_deg=45, speed_mps=0.20, duration_s=1.0)
Agentech.diagonal(angle_deg=-135, speed_mps=0.20, duration_s=1.0)

Agentech.squat_forward(speed_mps=0.10, duration_s=0.50)
Agentech.squat_backward(speed_mps=0.10, duration_s=0.50)
Agentech.squat_lateral(
    direction="left",
    speed_mps=0.10,
    duration_s=0.50,
)
Agentech.squat_lateral(
    direction="right",
    speed_mps=0.10,
    duration_s=0.50,
)
Agentech.squat_diagonal(
    angle_deg=45,
    speed_mps=0.15,
    duration_s=0.50,
)
Agentech.squat_diagonal(
    angle_deg=-135,
    speed_mps=0.15,
    duration_s=0.50,
)
Agentech.squat_turn(angle_deg=10)
Agentech.squat_turn(angle_deg=-10)

Agentech.stand()
Agentech.turn(angle_deg=10, turn_rate_deg_s=10)
Agentech.turn(angle_deg=-10, turn_rate_deg_s=10)

Agentech.yaw(speed_rad_s=0.20, position_rad=0.10)
Agentech.yaw(speed_rad_s=0.20, position_rad=-0.10)
Agentech.pitch(speed_rad_s=0.20, position_rad=0.10)
Agentech.pitch(speed_rad_s=0.20, position_rad=-0.10)
Agentech.roll(speed_rad_s=0.20, position_rad=0.10)
Agentech.roll(speed_rad_s=0.20, position_rad=-0.10)

Agentech.stay(duration_s=0.50)
Agentech.sit()
