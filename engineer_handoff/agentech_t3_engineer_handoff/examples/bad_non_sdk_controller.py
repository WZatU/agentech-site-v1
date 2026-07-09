import time


def controller(observation):
    time.sleep(1)
    return [0.0] * observation["actuator_count"]
