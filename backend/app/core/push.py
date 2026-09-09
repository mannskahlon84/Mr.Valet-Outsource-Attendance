import traceback
def send_push_notification(token: str, message: str, extra=None):
    try:
        from exponent_server_sdk import PushClient, PushMessage
        response = PushClient().publish(
            PushMessage(to=token, body=message, data=extra)
        )
        return response
    except Exception as e:
        print("Push failed", traceback.format_exc())
        return None
