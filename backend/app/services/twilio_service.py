import os
import requests
from dotenv import load_dotenv

load_dotenv()

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "+14155238886") # Default Twilio Sandbox Number

def send_whatsapp_message(to_phone: str, message_body: str) -> dict:
    """
    Sends an outbound WhatsApp message using Twilio WhatsApp API.
    If credentials are missing, logs message and returns simulated status.
    """
    formatted_to = to_phone if to_phone.startswith("whatsapp:") else f"whatsapp:{to_phone}"
    formatted_from = TWILIO_WHATSAPP_NUMBER if TWILIO_WHATSAPP_NUMBER.startswith("whatsapp:") else f"whatsapp:{TWILIO_WHATSAPP_NUMBER}"

    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
            data = {
                "From": formatted_from,
                "To": formatted_to,
                "Body": message_body
            }
            res = requests.post(url, data=data, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN), timeout=5)
            if res.status_code in [200, 201]:
                res_data = res.json()
                return {
                    "status": "sent",
                    "twilio_sid": res_data.get("sid"),
                    "mode": "twilio_api"
                }
            else:
                print(f"[TwilioService] Error response: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"[TwilioService] Exception during message send: {e}")

    # Fallback simulated response for local development / missing keys
    print(f"[TwilioService Sandbox] Mock WhatsApp sent to {formatted_to}: '{message_body}'")
    return {
        "status": "sent_simulated",
        "twilio_sid": f"SM_MOCK_{os.urandom(4).hex()}",
        "mode": "simulated_sandbox"
    }
