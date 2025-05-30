import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Contact, { IContact } from '../models/contactModel';

export const identifyContact = async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body;
    console.log('Request body:', req.body); // Log to inspect input

    if (!email && !phoneNumber) {
      return res.status(400).json({ message: 'At least email or phoneNumber is required' });
    }

    // Step 1: Find matching contacts by email or phoneNumber
    const orConditions = [];
    if (email) orConditions.push({ email });
    if (phoneNumber) orConditions.push({ phoneNumber });

    const matchingContacts = await Contact.find(orConditions.length > 0 ? { $or: orConditions } : {});

    // Step 2: Collect all linked contacts (primary + secondary chain)
    const contactIds = new Set<string>();
    matchingContacts.forEach(c => {
      contactIds.add(c._id.toString());
      if (c.linkedId) contactIds.add(c.linkedId.toString());
    });

    const allContacts = await Contact.find({
      $or: [
        { _id: { $in: Array.from(contactIds) } },
        { linkedId: { $in: Array.from(contactIds) } },
      ],
    });

    // Step 3: If no contacts found, create new primary
    if (allContacts.length === 0) {
      console.log('Creating newizzer primary contact:', { email, phoneNumber, linkPrecedence: 'primary' });
      const newPrimary = await Contact.create({
        email: email || undefined,
        phoneNumber: phoneNumber || undefined,
        linkPrecedence: 'primary',
      });
      console.log('New primary contact created:', newPrimary);

      return res.status(200).json({
        contact: {
          primaryContactId: newPrimary._id,
          emails: [newPrimary.email].filter(Boolean),
          phoneNumbers: [newPrimary.phoneNumber].filter(Boolean),
          secondaryContactIds: [],
        },
      });
    }

    // Step 4: Determine oldest primary
    const primaryContacts = allContacts.filter(c => c.linkPrecedence === 'primary');
    const oldestPrimary = primaryContacts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

    // Step 5: Update other primaries to secondary pointing to oldest
    const updatePromises = allContacts.map(async (c) => {
      if (
        c._id.toString() !== oldestPrimary._id.toString() &&
        c.linkPrecedence === 'primary'
      ) {
        c.linkPrecedence = 'secondary';
        c.linkedId = oldestPrimary._id;
        await c.save();
      }
    });
    await Promise.all(updatePromises);

    // Step 6: Check if new info (email/phone) needs to be added
    const emailsSet = new Set(allContacts.map(c => c.email).filter(Boolean));
    const phonesSet = new Set(allContacts.map(c => c.phoneNumber).filter(Boolean));

    if ((email && !emailsSet.has(email)) || (phoneNumber && !phonesSet.has(phoneNumber))) {
      console.log('Creating new secondary contact:', { email, phoneNumber, linkPrecedence: 'secondary', linkedId: oldestPrimary._id });
      const newSecondary = await Contact.create({
        email: email || undefined,
        phoneNumber: phoneNumber || undefined,
        linkPrecedence: 'secondary',
        linkedId: oldestPrimary._id,
      });
      console.log('New secondary contact created:', newSecondary);
      allContacts.push(newSecondary);
      if (email) emailsSet.add(email);
      if (phoneNumber) phonesSet.add(phoneNumber);
    }

    // Step 7: Prepare response
    const secondaryContactIds = allContacts
      .filter(c => c.linkPrecedence === 'secondary')
      .map(c => c._id);

    const emails = [oldestPrimary.email, ...Array.from(emailsSet).filter(e => e !== oldestPrimary.email)].filter(Boolean);
    const phoneNumbers = [oldestPrimary.phoneNumber, ...Array.from(phonesSet).filter(p => p !== oldestPrimary.phoneNumber)].filter(Boolean);

    return res.status(200).json({
      contact: {
        primaryContactId: oldestPrimary._id,
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