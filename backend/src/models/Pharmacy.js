import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const pharmacySchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    user_id: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true, trim: true },
    address: { type: String, required: true },
    city: { type: String, required: true, default: 'Bengaluru' },
    pincode: { type: String, required: true, default: '560001' },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    phone: { type: String, required: true },
    whatsapp_number: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
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

pharmacySchema.pre('save', async function (next) {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence('pharmacyId');
  }
  next();
});

export const Pharmacy = mongoose.model('Pharmacy', pharmacySchema);
