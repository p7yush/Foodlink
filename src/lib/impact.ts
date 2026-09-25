// A rescued meal is treated as 0.4 kg of food, and avoiding a kilogram of food
// waste avoids about 2.5 kg of CO2e. Both are rounded public figures, kept here
// as named constants so the analytics page never hard-codes a result.
export const KG_PER_MEAL = 0.4
export const CO2E_KG_PER_KG_FOOD = 2.5

export type DonationRow = {
  id: string
  quantity: number
  status: string
  expiry_time: string
  created_at: string
}

export type RequestRow = { id: string; food_id: string }

export type PickupRow = { request_id: string; status: string; completed_at: string | null }

export type MonthlyPoint = { month: string; meals: number; co2: number }

export type Impact = {
  mealsRescued: number
  foodDivertedTonnes: number
  co2eAvoidedKg: number
  successfulDeliveries: number
  activeDonations: number
  pickupsInProgress: number
  foodAtRisk: number
  monthly: MonthlyPoint[]
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** Donations expiring within this window are flagged as at risk. */
const AT_RISK_MINUTES = 120

export function computeImpact(
  donations: DonationRow[],
  requests: RequestRow[],
  pickups: PickupRow[],
  now: number = Date.now()
): Impact {
  const quantityByDonation = new Map(donations.map((donation) => [donation.id, donation.quantity]))
  const donationIdByRequest = new Map(requests.map((request) => [request.id, request.food_id]))

  const completed = pickups.filter((pickup) => pickup.status === "completed")

  let mealsRescued = 0
  for (const pickup of completed) {
    const donationId = donationIdByRequest.get(pickup.request_id)
    if (donationId) mealsRescued += quantityByDonation.get(donationId) ?? 0
  }

  const foodKg = mealsRescued * KG_PER_MEAL

  const available = donations.filter((donation) => donation.status === "Available")
  const atRisk = available.filter((donation) => {
    const minutesLeft = (new Date(donation.expiry_time).getTime() - now) / 60000
    return minutesLeft > 0 && minutesLeft <= AT_RISK_MINUTES
  })

  return {
    mealsRescued,
    foodDivertedTonnes: Number((foodKg / 1000).toFixed(2)),
    co2eAvoidedKg: Math.round(foodKg * CO2E_KG_PER_KG_FOOD),
    successfulDeliveries: completed.length,
    activeDonations: available.length,
    pickupsInProgress: pickups.filter((pickup) => pickup.status !== "completed").length,
    foodAtRisk: atRisk.length,
    monthly: monthlySeries(completed, donationIdByRequest, quantityByDonation, now),
  }
}

function monthlySeries(
  completed: PickupRow[],
  donationIdByRequest: Map<string, string>,
  quantityByDonation: Map<string, number>,
  now: number
): MonthlyPoint[] {
  const buckets: MonthlyPoint[] = []
  const index = new Map<string, MonthlyPoint>()
  const reference = new Date(now)

  // Six trailing months, oldest first, so the chart has a stable x axis even
  // before any deliveries exist.
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(reference.getFullYear(), reference.getMonth() - offset, 1)
    const point: MonthlyPoint = { month: MONTH_LABELS[date.getMonth()], meals: 0, co2: 0 }
    buckets.push(point)
    index.set(`${date.getFullYear()}-${date.getMonth()}`, point)
  }

  for (const pickup of completed) {
    if (!pickup.completed_at) continue
    const when = new Date(pickup.completed_at)
    const point = index.get(`${when.getFullYear()}-${when.getMonth()}`)
    if (!point) continue

    const donationId = donationIdByRequest.get(pickup.request_id)
    const meals = donationId ? quantityByDonation.get(donationId) ?? 0 : 0
    point.meals += meals
    point.co2 += Math.round(meals * KG_PER_MEAL * CO2E_KG_PER_KG_FOOD)
  }

  return buckets
}
