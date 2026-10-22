import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const feedbackSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    patient_id: { type: Number, required: true, index: true },
    pharmacy_id: { type: Number, default: null, index: true },
    rating: { type: Number, required: true, default: 5 },
    comment: { type: String, required: true },
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

feedbackSchema.pre('save', async function (next) {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence('feedbackId');
  }
  next();
});

export const Feedback = mongoose.model('Feedback', feedbackSchema);
