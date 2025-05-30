import { Schema, model, Document } from 'mongoose';

interface IContact extends Document {
  id: number; 
  phoneNumber?: string; 
  email?: string; 
  linkedId?: number; 
  linkPrecedence: 'primary' | 'secondary'; 
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const contactSchema = new Schema<IContact>(
  {
    id: {
      type: Number,
      required: true,
      unique: true, // Ensure unique custom ID
    },
    phoneNumber: {
      type: String,
      sparse: true, // Allows multiple null values
      index: true, // Index for faster queries
    },
    email: {
      type: String,
      sparse: true, // Allows multiple null values
      index: true, // Index for faster queries
    },
    linkedId: {
      type: Number,
      sparse: true, // Allows null for primary contacts
    },
    linkPrecedence: {
      type: String,
      enum: ['primary', 'secondary'],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    deletedAt: {
      type: Date,
      sparse: true, // Allows null for non-deleted records
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
  }
);

contactSchema.pre('save', async function (next) {
  if (this.isNew && !this.id) {
    try {
      const lastContact = await Contact.findOne().sort({ id: -1 });
      this.id = lastContact ? lastContact.id + 1 : 1;
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

contactSchema.index({ email: 1, phoneNumber: 1 }, { sparse: true });

export const Contact = model<IContact>('Contact', contactSchema);