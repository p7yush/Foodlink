import { calculateDistance, estimateTravelTime } from "./utils"

export type DonationLike = {
  id: string
  title: string
  quantity: number
  food_type: string | null
  expiry_time: string
  latitude: number | null
  longitude: number | null
  pickup_address: string | null
}

export type RecipientLike = {
  id: string
  name: string
  organization: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  capacity: number
  food_preferences: string[]
  status: string
}

export type MatchCandidate = {
  recipient: RecipientLike
  distanceKm: number | null
  travelMinutes: number | null
  minutesUntilExpiry: number
  score: number
  reasons: string[]
}

export type Rejection = {
  recipient: RecipientLike
  reason: string
}

export type MatchResult = {
  candidates: MatchCandidate[]
  rejected: Rejection[]
}

export function minutesUntil(isoTime: string, now: number): number {
  return Math.round((new Date(isoTime).getTime() - now) / 60000)
}

export function formatCountdown(minutes: number): string {
  if (minutes <= 0) return "Expired"
  if (minutes < 60) return `${minutes}m left`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h left` : `${hours}h ${rest}m left`
}

/**
 * Ranks recipients for one donation. Every candidate must clear the hard
 * feasibility gates first; only then is a score used to order them. A recipient
 * that cannot physically receive the food is never shown as a weak match.
 */
export function rankRecipients(
  donation: DonationLike,
  recipients: RecipientLike[],
  now: number = Date.now()
): MatchResult {
  const minutesLeft = minutesUntil(donation.expiry_time, now)
  const candidates: MatchCandidate[] = []
  const rejected: Rejection[] = []

  for (const recipient of recipients) {
    if (recipient.status === "offline") {
      rejected.push({ recipient, reason: "Not accepting deliveries right now" })
      continue
    }

    if (recipient.capacity < donation.quantity) {
      rejected.push({
        recipient,
        reason: `Capacity ${recipient.capacity} is below ${donation.quantity} meals`,
      })
      continue
    }

    const preferences = recipient.food_preferences ?? []
    if (preferences.length > 0 && donation.food_type && !preferences.includes(donation.food_type)) {
      rejected.push({ recipient, reason: `Does not accept ${donation.food_type}` })
      continue
    }

    const hasCoordinates =
      donation.latitude != null &&
      donation.longitude != null &&
      recipient.latitude != null &&
      recipient.longitude != null

    let distanceKm: number | null = null
    let travelMinutes: number | null = null

    if (hasCoordinates) {
      distanceKm = calculateDistance(
        donation.latitude as number,
        donation.longitude as number,
        recipient.latitude as number,
        recipient.longitude as number
      )
      travelMinutes = estimateTravelTime(distanceKm)

      if (travelMinutes > minutesLeft) {
        rejected.push({
          recipient,
          reason: `Needs ${travelMinutes} min but food is safe for ${Math.max(minutesLeft, 0)} min`,
        })
        continue
      }
    }

    const reasons: string[] = []

    // Proximity carries the most weight: shorter trips mean less spoilage risk.
    let score = 0
    if (distanceKm == null) {
      score += 20
      reasons.push("Distance unknown, no coordinates on file")
    } else {
      score += Math.max(0, 50 - distanceKm * 2)
      reasons.push(`${distanceKm.toFixed(1)} km away, about ${travelMinutes} min`)
    }

    // Reward a comfortable margin between arrival and the safe-until time.
    const slack = travelMinutes == null ? 0.5 : 1 - travelMinutes / Math.max(minutesLeft, 1)
    score += Math.max(0, Math.min(1, slack)) * 30
    if (travelMinutes != null) {
      reasons.push(`Arrives with ${minutesLeft - travelMinutes} min to spare`)
    }

    // Prefer a recipient that can absorb the load without dwarfing it.
    const fit = donation.quantity / Math.max(recipient.capacity, 1)
    score += Math.max(0, Math.min(1, fit)) * 20
    reasons.push(`Capacity for ${recipient.capacity} meals`)

    if (preferences.length > 0 && donation.food_type) {
      reasons.push(`Accepts ${donation.food_type}`)
    }

    candidates.push({
      recipient,
      distanceKm,
      travelMinutes,
      minutesUntilExpiry: minutesLeft,
      score: Math.round(Math.min(100, score)),
      reasons,
    })
  }

  candidates.sort((a, b) => b.score - a.score || a.recipient.name.localeCompare(b.recipient.name))
  return { candidates, rejected }
}
