import mongoose, { Schema, Document } from 'mongoose';

export interface IDeal extends Document {
  title: string;
  country: string;
  value: string;
  status: string;
  type: string;
  impact: string;
  description: string;
  strategicIntent: string;
  whyIndiaNeedsThis: string;
  keyItems: string[];
  date: string;
  // Auto-fetch fields
  reviewStatus: 'approved' | 'pending' | 'rejected';
  sourceUrl?: string;
  sourceTitle?: string;
  fetchedAt?: Date;
  createdAt?: Date;
}

const DealSchema = new Schema<IDeal>({
  title:            { type: String, required: true },
  country:          { type: String, required: true },
  value:            { type: String, default: '0' },
  status:           { type: String, default: 'Proposed' },
  type:             { type: String, default: 'Trade' },
  impact:           { type: String, default: 'Medium Impact' },
  description:      { type: String, default: '' },
  strategicIntent:  { type: String, default: '' },
  whyIndiaNeedsThis:{ type: String, default: '' },
  keyItems:         [{ type: String }],
  date:             { type: String, default: '' },
  // Auto-fetch fields
  reviewStatus:     { type: String, enum: ['approved', 'pending', 'rejected'], default: 'approved' },
  sourceUrl:        { type: String, default: '' },
  sourceTitle:      { type: String, default: '' },
  fetchedAt:        { type: Date },
  createdAt:        { type: Date, default: Date.now },
});

// Prevent duplicate deals by title
DealSchema.index({ title: 1 }, { unique: true });

export default mongoose.models.Deal || mongoose.model<IDeal>('Deal', DealSchema);