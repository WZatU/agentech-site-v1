from agentech import Agentech

Agentech.stand()
Agentech.squat()
Agentech.squat_forward(speed_mps=0.20, duration_s=0.75)
Agentech.squat_backward(speed_mps=0.20, duration_s=0.75)
Agentech.squat_lateral(
    direction="left",
    speed_mps=0.20,
    duration_s=0.75,
)
Agentech.squat_diagonal(
    angle_deg=45,
    speed_mps=0.30,
    duration_s=0.75,
)
Agentech.squat_turn(angle_deg=30)
Agentech.sit()
Agentech.emergency_stop()
