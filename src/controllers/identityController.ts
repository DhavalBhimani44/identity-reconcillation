import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Contact, { IContact } from '../models/contactModel';

export const identifyContact = async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ message: 'At least email or phoneNumber is required' });
    }

    // Build dynamic OR conditions
    const orConditions = [];
    if (email) orConditions.push({ email });
    if (phoneNumber) orConditions.push({ phoneNumber });

    const matchingContacts: IContact[] = await Contact.find(
      orConditions.length > 0 ? { $or: orConditions } : {}
    );

    let allContacts: IContact[] = [...matchingContacts];
    let primaryContact: IContact;

    if (matchingContacts.length === 0) {
      // No existing contact → create new primary
      const newContact = await Contact.create({
        email,
        phoneNumber,
        linkPrecedence: 'primary',
      });

      return res.status(200).json({
        contact: {
          primaryContactId: newContact._id,
          emails: [newContact.email],
          phoneNumbers: [newContact.phoneNumber],
          secondaryContactIds: [],
        },
      });
    }

    // Check if we need to add new secondary contact (new info)
    const hasEmail = matchingContacts.some(c => c.email === email);
    const hasPhone = matchingContacts.some(c => c.phoneNumber === phoneNumber);

    if (!hasEmail || !hasPhone) {
      const primary = matchingContacts.find(c => c.linkPrecedence === 'primary') || matchingContacts[0];

      const newSecondary = await Contact.create({
        email,
        phoneNumber,
        linkPrecedence: 'secondary',
        linkedId: primary._id,
      });

      allContacts.push(newSecondary);
    }

    // Determine oldest primary contact
    primaryContact = allContacts
      .filter(c => c.linkPrecedence === 'primary')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

    // Ensure all others point to the primary
    const updatePromises = allContacts.map(async (contact) => {
      if (
        contact._id.toString() !== primaryContact._id.toString() &&
        contact.linkPrecedence === 'primary'
      ) {
        contact.linkPrecedence = 'secondary';
        contact.linkedId = primaryContact._id;
        await contact.save();
      }
    });

    await Promise.all(updatePromises);

    // Consolidate response data
    const emails = Array.from(new Set(allContacts.map(c => c.email).filter(Boolean)));
    const phoneNumbers = Array.from(new Set(allContacts.map(c => c.phoneNumber).filter(Boolean)));
    const secondaryContactIds = allContacts
      .filter(c => c.linkPrecedence === 'secondary')
      .map(c => c._id);

    return res.status(200).json({
      contact: {
        primaryContactId: primaryContact._id,
        emails,
        phoneNumbers,
        secondaryContactIds,
      },
    });
  } catch (error) {
    console.error('Error in identifyContact:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
