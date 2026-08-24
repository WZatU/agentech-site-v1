def should_process_frame(pause_without_subscribers, subscription_count):
    return not pause_without_subscribers or subscription_count > 0
