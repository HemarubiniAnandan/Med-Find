import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const stockSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    pharmacy_id: { type: Number, required: true, index: true },
    medicine_id: { type: Number, required: true, index: true },
    batch_id: { type: String, required: true, default: 'BATCH-001', trim: true },
    quantity: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true, default: 0.0 },
    expiry_date: { type: String, required: true, default: '2026-12-31' },
    last_updated: { type: Date, default: Date.now }
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

stockSchema.pre('save', async function (next) {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence('stockId');
  }
  next();
});

export const Stock = mongoose.model('Stock', stockSchema);
