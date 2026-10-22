import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const medicineSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true, index: true, trim: true },
    generic_name: { type: String, required: true, index: true, trim: true },
    category: { type: String, required: true, index: true, trim: true },
    manufacturer: { type: String, default: '' },
    dosage_form: { type: String, default: 'Tablet' }
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

medicineSchema.pre('save', async function (next) {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence('medicineId');
  }
  next();
});

export const Medicine = mongoose.model('Medicine', medicineSchema);
