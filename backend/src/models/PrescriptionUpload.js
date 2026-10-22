import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const prescriptionUploadSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    patient_id: { type: Number, required: true, index: true },
    pharmacy_id: { type: Number, required: true, index: true },
    image_url: { type: String, required: true },
    status: { type: String, required: true, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    notes: { type: String, default: null },
    ocr_parsed_data: { type: String, default: null },
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

prescriptionUploadSchema.pre('save', async function (next) {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence('prescriptionId');
  }
  next();
});

export const PrescriptionUpload = mongoose.model('PrescriptionUpload', prescriptionUploadSchema);
