"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Package, Building2, Leaf, AlertTriangle } from "lucide-react"
import { CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart as RechartsLineChart } from "recharts"
import { supabase } from "@/lib/supabase"
import { computeImpact, KG_PER_MEAL, CO2E_KG_PER_KG_FOOD, type Impact } from "@/lib/impact"

export function AnalyticsClient() {
  const [impact, setImpact] = useState<Impact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [donationsResponse, requestsResponse, pickupsResponse] = await Promise.all([
        supabase.from("food_donations").select("id, quantity, status, expiry_time, created_at"),
        supabase.from("food_requests").select("id, food_id"),
        supabase.from("pickups").select("request_id, status, completed_at"),
      ])

      const failure = donationsResponse.error ?? requestsResponse.error ?? pickupsResponse.error
      if (failure) {
        setError(failure.message)
        setLoading(false)
        return
      }

      setImpact(
        computeImpact(
          donationsResponse.data ?? [],
          requestsResponse.data ?? [],
          pickupsResponse.data ?? []
        )
      )
      setLoading(false)
    }

    load()
  }, [])

  if (loading) return <div className="p-8">Loading analytics...</div>
  if (error) return <div className="p-8 text-destructive">{error}</div>
  if (!impact) return null

  const hasDeliveries = impact.successfulDeliveries > 0

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Impact Analytics</h2>
        <p className="text-muted-foreground">
          Every figure below is calculated from completed deliveries in the database.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-border/50 bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Meals rescued</CardTitle>
            <Package className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              {impact.mealsRescued.toLocaleString()}
            </div>
            <p className="text-xs mt-1 text-emerald-600 font-medium">All time</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Food diverted</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {impact.foodDivertedTonnes} <span className="text-xl text-muted-foreground">tonnes</span>
            </div>
            <p className="text-xs mt-1 text-muted-foreground">At {KG_PER_MEAL} kg per meal</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CO₂e avoided</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(impact.co2eAvoidedKg / 1000).toFixed(2)} <span className="text-xl text-muted-foreground">tonnes</span>
            </div>
            <p className="text-xs mt-1 text-muted-foreground">At {CO2E_KG_PER_KG_FOOD} kg CO₂e per kg</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Successful deliveries</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{impact.successfulDeliveries}</div>
            <p className="text-xs mt-1 text-muted-foreground">{impact.pickupsInProgress} in progress</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Meals Rescued Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {hasDeliveries ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={impact.monthly} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} dx={-10} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="meals"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6 }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <Package className="h-10 w-10 mb-3" />
                  <p className="font-medium">No completed deliveries yet</p>
                  <p className="text-sm">The chart fills in as volunteers finish their runs.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Network Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <p className="text-lg leading-relaxed text-foreground font-medium">
              Foodlink has rescued{" "}
              <span className="text-primary font-bold">{impact.mealsRescued.toLocaleString()} meals</span>{" "}
              across {impact.successfulDeliveries} completed{" "}
              {impact.successfulDeliveries === 1 ? "delivery" : "deliveries"}.
            </p>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Right now</h4>

              <div className="flex justify-between items-center text-sm">
                <span>Donations available</span>
                <span className="font-bold">{impact.activeDonations}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Pickups in progress</span>
                <span className="font-bold">{impact.pickupsInProgress}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Expiring within 2h
                </span>
                <span className={`font-bold ${impact.foodAtRisk > 0 ? "text-destructive" : ""}`}>
                  {impact.foodAtRisk}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
