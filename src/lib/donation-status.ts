import { minutesUntil } from "@/lib/matching"

export type DonationStateInput = {
  status?: string | null
  expiry_time?: string | null
  food_requests?: { status?: string | null }[] | null
}

export function isExpired(donation: DonationStateInput, now: number = Date.now()): boolean {
  if (donation.status === "Expired") return true
  if (!donation.expiry_time) return false
  return minutesUntil(donation.expiry_time, now) <= 0
}

export function isOpenForRequests(donation: DonationStateInput, now: number = Date.now()): boolean {
  return donation.status === "Available" && !isExpired(donation, now)
}

export function donationDisplayStatus(donation: DonationStateInput, now: number = Date.now()): string {
  if (donation.status === "Completed") return "Delivered"
  if (isExpired(donation, now)) return "Expired"
  if (donation.status === "Claimed") return "Accepted"
  if (donation.food_requests?.some((request) => request.status === "pending")) return "Requested"
  return "Available"
}

export function isSettledStatus(displayStatus: string): boolean {
  return displayStatus === "Delivered" || displayStatus === "Expired"
}
