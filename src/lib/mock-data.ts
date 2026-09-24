import { AnalyticsData, Donation, Recipient, Volunteer } from '../types';

export const mockDonations: Donation[] = [
  {
    id: 'FD-1048',
    donorName: 'Fresh Farms Cafe',
    foodType: 'Vegetarian Meals',
    category: 'Prepared Food',
    quantity: 45,
    unit: 'meals',
    dietaryType: 'Vegetarian',
    preparedTime: '12:30 PM',
    safeUntilTime: '3:30 PM',
    status: 'Needs Match',
    distance: 2.4,
  },
  {
    id: 'FD-1047',
    donorName: 'Downtown Bakery',
    foodType: 'Assorted Bread & Pastries',
    category: 'Baked Goods',
    quantity: 120,
    unit: 'items',
    preparedTime: '6:00 AM',
    safeUntilTime: 'Tomorrow 10:00 AM',
    status: 'Matched',
    distance: 1.2,
    recipientId: 'REC-002',
  },
  {
    id: 'FD-1046',
    donorName: 'Corporate Cafeteria A',
    foodType: 'Sandwiches & Salads',
    category: 'Prepared Food',
    quantity: 65,
    unit: 'meals',
    preparedTime: '1:00 PM',
    safeUntilTime: '5:00 PM',
    status: 'Pickup In Progress',
    distance: 3.8,
    recipientId: 'REC-001',
    volunteerId: 'VOL-001',
  },
  {
    id: 'FD-1045',
    donorName: 'Green Bowl',
    foodType: 'Organic Soup',
    category: 'Prepared Food',
    quantity: 30,
    unit: 'liters',
    preparedTime: '11:00 AM',
    safeUntilTime: '4:00 PM',
    status: 'At Risk',
    distance: 5.1,
  },
  {
    id: 'FD-1044',
    donorName: 'Pizza Heaven',
    foodType: 'Cheese Pizzas',
    category: 'Prepared Food',
    quantity: 15,
    unit: 'pies',
    preparedTime: '10:00 PM',
    safeUntilTime: '1:00 AM',
    status: 'Delivered',
    distance: 2.0,
    recipientId: 'REC-003',
    volunteerId: 'VOL-002',
  }
];

export const mockRecipients: Recipient[] = [
  {
    id: 'REC-001',
    name: 'Hope Shelter',
    location: '124 Main St, Downtown',
    distance: 2.4,
    capacity: 100,
    currentCapacity: 60,
    foodPreferences: ['Vegetarian', 'Non-veg', 'Halal'],
    status: 'Accepting',
    lastDelivery: '2 hours ago'
  },
  {
    id: 'REC-002',
    name: 'Community Food Bank',
    location: '890 West Ave',
    distance: 1.2,
    capacity: 500,
    currentCapacity: 350,
    foodPreferences: ['Non-perishable', 'Baked Goods', 'Produce'],
    status: 'Accepting',
    lastDelivery: 'Yesterday'
  },
  {
    id: 'REC-003',
    name: 'Safe Haven Mission',
    location: '45 North Blvd',
    distance: 3.5,
    capacity: 150,
    currentCapacity: 10,
    foodPreferences: ['Hot Meals', 'Vegetarian'],
    status: 'Full',
    lastDelivery: '30 mins ago'
  }
];

export const mockVolunteers: Volunteer[] = [
  {
    id: 'VOL-001',
    name: 'Aarav Mehta',
    rating: 4.9,
    completedPickups: 126,
    vehicle: 'Hatchback',
    status: 'On Pickup',
    distance: 1.8,
    currentAssignment: 'FD-1046'
  },
  {
    id: 'VOL-002',
    name: 'Sarah Chen',
    rating: 4.8,
    completedPickups: 84,
    vehicle: 'SUV',
    status: 'Available',
    distance: 0.5,
  },
  {
    id: 'VOL-003',
    name: 'Marcus Johnson',
    rating: 5.0,
    completedPickups: 210,
    vehicle: 'Cargo Van',
    status: 'Offline',
    distance: 4.2,
  },
  {
    id: 'VOL-004',
    name: 'Elena Rodriguez',
    rating: 4.7,
    completedPickups: 42,
    vehicle: 'Sedan',
    status: 'Available',
    distance: 3.1,
  }
];

export const mockAnalytics: AnalyticsData = {
  mealsRescued: 12480,
  foodDiverted: 4.2,
  co2eAvoided: 11500,
  successfulDeliveries: 842,
  mealsRescuedTrend: 12.4,
  activeDonations: 8,
  pickupsInProgress: 5,
  foodAtRisk: 3,
};
