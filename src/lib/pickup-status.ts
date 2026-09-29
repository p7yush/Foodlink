export type PickupStatus =
  | 'assigned'
  | 'en_route_to_donor'
  | 'arrived_at_donor'
  | 'collected'
  | 'en_route_to_ngo'
  | 'arrived_at_ngo'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export function getPickupDisplayStatus(status: string): string {
  switch (status) {
    case 'assigned':
      return 'Accepted';
    case 'en_route_to_donor':
    case 'arrived_at_donor':
      return 'En Route to Donor';
    case 'collected':
      return 'Donor Handoff';
    case 'en_route_to_ngo':
    case 'arrived_at_ngo':
      return 'En Route to NGO';
    case 'delivered':
    case 'completed':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}
