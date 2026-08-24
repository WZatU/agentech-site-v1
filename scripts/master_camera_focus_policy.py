def select_active_front(subscription_counts, priority):
    for camera_id in priority:
        if subscription_counts.get(camera_id, 0) > 0:
            return camera_id
    return None


def should_forward_rgbd(subscription_count):
    return subscription_count > 0
