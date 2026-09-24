export type DonationStatus = 'Needs Match' | 'Matched' | 'Driver Assigned' | 'Pickup In Progress' | 'Delivered' | 'At Risk';

export interface Donation {
  id: string;
  donorName: string;
  foodType: string;
  category: string;
  quantity: number;
  unit: string;
  dietaryType?: string;
  preparedTime: string;
  safeUntilTime: string;
  status: DonationStatus;
  distance?: number; // km
  recipientId?: string;
  volunteerId?: string;
  matchScore?: number;
}

export interface Recipient {
  id: string;
  name: string;
  location: string; // "Lat, Long" or Address
  distance: number; // relative to current
  capacity: number; // total meals
  currentCapacity: number; // currently available
  foodPreferences: string[];
  status: 'Accepting' | 'Full' | 'Offline';
  lastDelivery?: string;
}

export interface Volunteer {
  id: string;
  name: string;
  rating: number;
  completedPickups: number;
  vehicle: string;
  status: 'Available' | 'On Pickup' | 'Offline';
  distance: number;
  currentAssignment?: string; // Donation ID
}

export interface AnalyticsData {
  mealsRescued: number;
  foodDiverted: number; // tonnes
  co2eAvoided: number; // kg
  successfulDeliveries: number;
  mealsRescuedTrend: number; // percentage
  activeDonations: number;
  pickupsInProgress: number;
  foodAtRisk: number;
}

export interface AIAnalysis {
  foodType: string;
  quantity: number;
  unit: string;
  dietaryType: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  safeUntil: string;
}
