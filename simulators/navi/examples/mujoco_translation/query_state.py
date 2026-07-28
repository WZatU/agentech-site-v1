from agentech import Agentech

Agentech.stand()
status = Agentech.get_status()
body = Agentech.body_status()
joints = Agentech.joint_states()
battery = Agentech.get_battery_status()
diagnostics = Agentech.diagnose()
