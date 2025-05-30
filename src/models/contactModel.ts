import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  _id: mongoose.Types.ObjectId;
  email?: string;
  phoneNumber?: string;
  linkPrecedence: 'primary' | 'secondary';
  linkedId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    id: { type: String, unique: true, sparse: true },
    email: { type: String },
    phoneNumber: { type: String },
    linkPrecedence: { type: String, enum: ['primary', 'secondary'], required: true },
    linkedId: { type: Schema.Types.ObjectId, ref: 'Contact' },
  },
  { timestamps: true }
);

export default mongoose.model<IContact>('Contact', ContactSchema);
