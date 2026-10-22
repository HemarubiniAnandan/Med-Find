import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const chatMessageSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    patient_id: { type: Number, required: true, index: true },
    pharmacy_id: { type: Number, required: true, index: true },
    message: { type: String, required: true },
    direction: { type: String, required: true, enum: ['outbound', 'inbound'], default: 'outbound' },
    twilio_sid: { type: String, default: null },
    timestamp: { type: Date, default: Date.now }
  },
  {
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

chatMessageSchema.pre('save', async function (next) {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence('chatMessageId');
  }
  next();
});

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
