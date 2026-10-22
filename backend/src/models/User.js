import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    hashed_password: { type: String, required: true },
    role: { type: String, required: true, enum: ['patient', 'pharmacy'], default: 'patient' },
    full_name: { type: String, default: '' },
    phone: { type: String, default: '' },
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

userSchema.pre('save', async function (next) {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence('userId');
  }
  next();
});

export const User = mongoose.model('User', userSchema);
