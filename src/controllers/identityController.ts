import { Request, Response, NextFunction } from 'express';
import { Contact } from '../models/contactModel';
import { logger } from '../utils/logger';

interface IdentifyRequest {
  email?: string;
  phoneNumber?: string;
}

interface IdentifyResponse {
  contact: {
    primaryContatctId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

export const identifyContact = async (
  req: Request<{}, {}, IdentifyRequest>,
  res: Response<IdentifyResponse>,
  next: NextFunction
) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ contact: { error: 'Email or phoneNumber required' } } as any);
    }

    // Find contacts by email or phoneNumber
    const query = [];
    if (email) query.push({ email });
    if (phoneNumber) query.push({ phoneNumber });
    const contacts = await Contact.find({ $or: query, deletedAt: null }).sort({ createdAt: 1 });

    let primaryContact: any;
    let secondaryContacts: any[] = [];

    if (contacts.length === 0) {
      // Create new primary contact
      const newContact = new Contact({
        email,
        phoneNumber,
        linkPrecedence: 'primary',
      });
      await newContact.save();
      return res.status(200).json({
        contact: {
          primaryContatctId: newContact.id,
          emails: newContact.email ? [newContact.email] : [],
          phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
          secondaryContactIds: [],
        },
      });
    }

    // Identify primary contact (earliest created)
    primaryContact = contacts.find((c) => c.linkPrecedence === 'primary') || contacts[0];
    if (primaryContact.linkPrecedence !== 'primary') {
      primaryContact.linkPrecedence = 'primary';
      await primaryContact.save();
    }

    // Collect secondary contacts
    secondaryContacts = contacts.filter((c) => c.id !== primaryContact.id);

    // Check for new information
    const isNewInfo =
      (email && !contacts.some((c) => c.email === email)) ||
      (phoneNumber && !contacts.some((c) => c.phoneNumber === phoneNumber));

    if (isNewInfo) {
      const newSecondary = new Contact({
        email,
        phoneNumber,
        linkedId: primaryContact.id,
        linkPrecedence: 'secondary',
      });
      await newSecondary.save();
      secondaryContacts.push(newSecondary);
    }

    // Link other primaries to the oldest primary
    const otherPrimaries = contacts.filter(
      (c) => c.linkPrecedence === 'primary' && c.id !== primaryContact.id
    );
    for (const otherPrimary of otherPrimaries) {
      otherPrimary.linkPrecedence = 'secondary';
      otherPrimary.linkedId = primaryContact.id;
      otherPrimary.updatedAt = new Date();
      await otherPrimary.save();
      secondaryContacts.push(otherPrimary);
    }

    // Compile response
    const emails = Array.from(
      new Set(
        [primaryContact.email, ...secondaryContacts.map((c) => c.email)].filter((e) => e)
      )
    );
    const phoneNumbers = Array.from(
      new Set(
        [primaryContact.phoneNumber, ...secondaryContacts.map((c) => c.phoneNumber)].filter(
          (p) => p
        )
      )
    );
    const secondaryContactIds = secondaryContacts.map((c) => c.id);

    res.status(200).json({
      contact: {
        primaryContatctId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds,
      },
    });
  } catch (error) {
    logger.error('Error in identifyContact:', error);
    next(error);
  }
};