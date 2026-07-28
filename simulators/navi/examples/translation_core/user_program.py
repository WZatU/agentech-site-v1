from agentech import Agentech
import time


Agentech.use("navi", host="192.168.4.65")

speed = 0.2 + 0.1
duration = 1 + 1

Agentech.stand()
Agentech.forward(speed_mps=speed, duration_s=duration)
time.sleep(0.5)
Agentech.turn(angle_deg=45)
status = Agentech.get_status()
Agentech.stop()
