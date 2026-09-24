import { getAnalytics } from "@/lib/db"
import { AnalyticsClient } from "./AnalyticsClient"

export default async function AnalyticsPage() {
  const mockAnalytics = await getAnalytics()
  
  return <AnalyticsClient mockAnalytics={mockAnalytics} />
}
