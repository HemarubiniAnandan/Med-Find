import express from 'express';
import { Pharmacy } from '../models/Pharmacy.js';
import { User } from '../models/User.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendWhatsAppMessage } from '../services/twilioService.js';

const router = express.Router();

// POST /api/chat/send
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { pharmacy_id, message } = req.body;
    if (!pharmacy_id || !message) {
      return res.status(400).json({ detail: 'pharmacy_id and message are required' });
    }

    const pharmId = parseInt(pharmacy_id, 10);
    const pharmacy = await Pharmacy.findOne({ id: pharmId });
    if (!pharmacy) {
      return res.status(404).json({ detail: 'Pharmacy not found' });
    }

    const direction = req.user.role === 'patient' ? 'outbound' : 'inbound';
    const recipientPhone =
      req.user.role === 'patient'
        ? pharmacy.whatsapp_number
        : req.user.phone || '+919876543210';

    const twilioRes = await sendWhatsAppMessage(recipientPhone, message);

    const chatMsg = new ChatMessage({
      patient_id: req.user.role === 'patient' ? req.user.id : 1,
      pharmacy_id: pharmacy.id,
      message,
      direction,
      twilio_sid: twilioRes.twilio_sid,
      timestamp: new Date()
    });
    await chatMsg.save();

    return res.status(200).json({
      id: chatMsg.id,
      patient_id: chatMsg.patient_id,
      pharmacy_id: chatMsg.pharmacy_id,
      message: chatMsg.message,
      direction: chatMsg.direction,
      twilio_sid: chatMsg.twilio_sid,
      timestamp: chatMsg.timestamp
    });
  } catch (err) {
    console.error('Send chat error:', err);
    return res.status(500).json({ detail: 'Internal server error sending message' });
  }
});

// GET /api/chat/thread
router.get('/thread', authenticateToken, async (req, res) => {
  try {
    let pharmId = parseInt(req.query.pharmacy_id, 10);
    let patientId = null;

    if (req.user.role === 'patient') {
      patientId = req.user.id;
    } else {
      const pharmacy = await Pharmacy.findOne({ user_id: req.user.id });
      if (!pharmacy) {
        return res.status(404).json({ detail: 'Pharmacy profile not found' });
      }
      pharmId = pharmacy.id;
    }

    const filter = { pharmacy_id: pharmId };
    if (patientId) {
      filter.patient_id = patientId;
    }

    const messages = await ChatMessage.find(filter).sort({ timestamp: 1 });

    const result = messages.map((m) => ({
      id: m.id,
      patient_id: m.patient_id,
      pharmacy_id: m.pharmacy_id,
      message: m.message,
      direction: m.direction,
      twilio_sid: m.twilio_sid,
      timestamp: m.timestamp
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error('Get chat thread error:', err);
    return res.status(500).json({ detail: 'Internal server error fetching thread' });
  }
});

// POST /api/chat/webhook (Twilio incoming WhatsApp webhook)
router.post('/webhook', async (req, res) => {
  try {
    const fromNumber = req.body.From || '';
    const body = req.body.Body || '';
    const messageSid = req.body.MessageSid || null;

    const cleanPhone = fromNumber.replace('whatsapp:', '').trim();

    const pharmacy = await Pharmacy.findOne({
      $or: [{ phone: cleanPhone }, { whatsapp_number: cleanPhone }]
    });
    const patientUser = await User.findOne({ phone: cleanPhone });

    let direction = 'outbound';
    let patientId = 1;
    let pharmacyId = 1;

    if (pharmacy) {
      const lastMsg = await ChatMessage.findOne({ pharmacy_id: pharmacy.id }).sort({ timestamp: -1 });
      patientId = lastMsg ? lastMsg.patient_id : 1;
      direction = 'inbound';
      pharmacyId = pharmacy.id;
    } else if (patientUser) {
      direction = 'outbound';
      patientId = patientUser.id;
      pharmacyId = 1;
    }

    const newMsg = new ChatMessage({
      patient_id: patientId,
      pharmacy_id: pharmacyId,
      message: body,
      direction,
      twilio_sid: messageSid,
      timestamp: new Date()
    });
    await newMsg.save();

    return res.status(200).json({ status: 'success', message: 'Inbound webhook processed' });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ detail: 'Error processing webhook' });
  }
});

export default router;
