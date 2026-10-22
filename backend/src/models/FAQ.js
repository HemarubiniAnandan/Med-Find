import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const faqSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: { type: String, required: true, default: 'General' },
    order_index: { type: Number, default: 0 }
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

faqSchema.pre('save', async function (next) {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence('faqId');
  }
  next();
});

export const FAQ = mongoose.model('FAQ', faqSchema);
