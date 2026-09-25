"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import {
  formatCountdown,
  minutesUntil,
  rankRecipients,
  type DonationLike,
  type MatchResult,
  type RecipientLike,
} from "@/lib/matching"
import { ArrowRight, Check, Network, AlertCircle, X } from "lucide-react"

type Row = { donation: DonationLike; result: MatchResult; minutesLeft: number }

export default function MatchesPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [donationsResponse, recipientsResponse] = await Promise.all([
        supabase
          .from("food_donations")
          .select("id, title, quantity, food_type, expiry_time, latitude, longitude, pickup_address")
          .eq("status", "Available")
          .order("expiry_time", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, name, organization, address, latitude, longitude, capacity, food_preferences, status")
          .eq("role", "ngo"),
      ])

      if (donationsResponse.error || recipientsResponse.error) {
        setError(donationsResponse.error?.message ?? recipientsResponse.error?.message ?? "Failed to load")
        setLoading(false)
        return
      }

      const donations = (donationsResponse.data ?? []) as DonationLike[]
      const recipients = (recipientsResponse.data ?? []) as RecipientLike[]
      const now = Date.now()

      setRows(
        donations.map((donation) => ({
          donation,
          result: rankRecipients(donation, recipients, now),
          minutesLeft: minutesUntil(donation.expiry_time, now),
        }))
      )
      setLoading(false)
    }

    load()
  }, [])

  if (loading) return <div className="p-8">Finding matches...</div>
  if (error) return <div className="p-8 text-destructive">{error}</div>

  const unmatched = rows.length

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" /> Matching Center
          </h2>
          <p className="text-muted-foreground mt-1">
            Every available donation is scored against each NGO on distance, remaining safe time,
            capacity and accepted food types.
          </p>
        </div>
      </div>

      {unmatched === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-muted/10">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">No donations waiting</h3>
          <p className="text-muted-foreground">Every donation has been claimed or delivered.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 px-1">
              Unmatched Donations <Badge variant="secondary" className="bg-muted">{unmatched}</Badge>
            </h3>

            <div className="flex flex-col gap-4">
              {rows.map(({ donation, minutesLeft }) => (
                <Card key={donation.id} className="shadow-sm border-border/50">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h4 className="font-bold">
                          {donation.quantity} × {donation.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">{donation.pickup_address ?? "No address"}</p>
                      </div>
                      <Badge variant={minutesLeft < 60 ? "destructive" : "outline"} className="shrink-0">
                        {formatCountdown(minutesLeft)}
                      </Badge>
                    </div>
                    {donation.food_type && (
                      <div className="text-sm flex flex-wrap gap-2 text-muted-foreground">
                        <span className="bg-muted px-2 py-0.5 rounded text-xs">{donation.food_type}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 px-1">
              <span className="relative flex h-3 w-3 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Recommended Matches
            </h3>

            <div className="flex flex-col gap-4">
              {rows.map(({ donation, result }) => {
                const best = result.candidates[0]

                if (!best) {
                  return (
                    <Card key={`none-${donation.id}`} className="shadow-sm border-destructive/30">
                      <CardContent className="p-4 flex flex-col gap-2">
                        <p className="font-semibold text-sm">
                          No feasible recipient for {donation.title}
                        </p>
                        {result.rejected.slice(0, 3).map((entry) => (
                          <p
                            key={entry.recipient.id}
                            className="text-xs text-muted-foreground flex items-center gap-2"
                          >
                            <X className="h-3 w-3 text-destructive shrink-0" />
                            {entry.recipient.organization ?? entry.recipient.name}: {entry.reason}
                          </p>
                        ))}
                      </CardContent>
                    </Card>
                  )
                }

                return (
                  <Card
                    key={`match-${donation.id}`}
                    className="shadow-sm border-emerald-500/30 overflow-hidden relative"
                  >
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 rounded-bl-lg text-xs font-bold tracking-wider z-10">
                      {best.score}% MATCH
                    </div>
                    <CardContent className="p-0 flex flex-col">
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 border-b border-border/50 bg-emerald-500/5">
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">From</p>
                          <p className="font-bold truncate">
                            {donation.quantity} × {donation.title}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">{donation.pickup_address ?? "No address"}</p>
                        </div>
                        <ArrowRight className="hidden sm:block text-muted-foreground h-5 w-5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">To</p>
                          <p className="font-bold truncate">
                            {best.recipient.organization ?? best.recipient.name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {best.recipient.address ?? "No address"}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-background flex flex-col gap-4">
                        <div className="grid sm:grid-cols-2 gap-y-2 text-sm">
                          {best.reasons.map((reason) => (
                            <div key={reason} className="flex items-center gap-2 text-muted-foreground">
                              <Check className="h-4 w-4 text-emerald-500 shrink-0" /> {reason}
                            </div>
                          ))}
                        </div>

                        {result.candidates.length > 1 && (
                          <p className="text-xs text-muted-foreground">
                            {result.candidates.length - 1} other feasible{" "}
                            {result.candidates.length === 2 ? "recipient" : "recipients"}, next best{" "}
                            {result.candidates[1].score}%
                          </p>
                        )}

                        <div className="flex gap-2 w-full pt-2">
                          <Link href={`/donations/${donation.id}`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
