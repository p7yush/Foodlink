import fs from 'fs/promises';
import path from 'path';
import { AnalyticsData, Donation, Recipient, Volunteer } from '../types';

const DB_PATH = path.join(process.cwd(), 'src', 'lib', 'db.json');

type DatabaseSchema = {
  analytics: AnalyticsData;
  donations: Donation[];
  recipients: Recipient[];
  volunteers: Volunteer[];
};

export async function readDB(): Promise<DatabaseSchema> {
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data) as DatabaseSchema;
}

export async function writeDB(data: DatabaseSchema): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Analytics
export async function getAnalytics(): Promise<AnalyticsData> {
  const db = await readDB();
  return db.analytics;
}

// Donations
export async function getDonations(): Promise<Donation[]> {
  const db = await readDB();
  return db.donations;
}

export async function getDonation(id: string): Promise<Donation | undefined> {
  const db = await readDB();
  return db.donations.find(d => d.id === id);
}

export async function addDonation(donation: Donation): Promise<void> {
  const db = await readDB();
  db.donations.push(donation);
  await writeDB(db);
}

export async function updateDonation(id: string, updates: Partial<Donation>): Promise<void> {
  const db = await readDB();
  const index = db.donations.findIndex(d => d.id === id);
  if (index !== -1) {
    db.donations[index] = { ...db.donations[index], ...updates };
    await writeDB(db);
  }
}

export async function deleteDonation(id: string): Promise<void> {
  const db = await readDB();
  db.donations = db.donations.filter(d => d.id !== id);
  await writeDB(db);
}

// Recipients
export async function getRecipients(): Promise<Recipient[]> {
  const db = await readDB();
  return db.recipients;
}

export async function updateRecipient(id: string, updates: Partial<Recipient>): Promise<void> {
  const db = await readDB();
  const index = db.recipients.findIndex(r => r.id === id);
  if (index !== -1) {
    db.recipients[index] = { ...db.recipients[index], ...updates };
    await writeDB(db);
  }
}

// Volunteers
export async function getVolunteers(): Promise<Volunteer[]> {
  const db = await readDB();
  return db.volunteers;
}

export async function updateVolunteer(id: string, updates: Partial<Volunteer>): Promise<void> {
  const db = await readDB();
  const index = db.volunteers.findIndex(v => v.id === id);
  if (index !== -1) {
    db.volunteers[index] = { ...db.volunteers[index], ...updates };
    await writeDB(db);
  }
}
