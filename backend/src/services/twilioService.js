import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886';

export const sendWhatsAppMessage = async (toPhone, messageBody) => {
  const formattedTo = toPhone.startsWith('whatsapp:') ? toPhone : `whatsapp:${toPhone}`;
  const formattedFrom = TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
    ? TWILIO_WHATSAPP_NUMBER
    : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;

  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const params = new URLSearchParams();
      params.append('From', formattedFrom);
      params.append('To', formattedTo);
      params.append('Body', messageBody);

      const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      const res = await axios.post(url, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${auth}`
        },
        timeout: 5000
      });

      if (res.status === 200 || res.status === 201) {
        return {
          status: 'sent',
          twilio_sid: res.data?.sid,
          mode: 'twilio_api'
        };
      }
    } catch (e) {
      console.warn(`[TwilioService] Exception during message send: ${e.message}`);
    }
  }

  // Fallback simulated response for local development / testing
  const mockSid = `SM_MOCK_${crypto.randomBytes(4).toString('hex')}`;
  console.log(`[TwilioService Sandbox] Mock WhatsApp sent to ${formattedTo}: '${messageBody}'`);
  return {
    status: 'sent_simulated',
    twilio_sid: mockSid,
    mode: 'simulated_sandbox'
  };
};
