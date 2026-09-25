"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { Building2, MapPin } from "lucide-react"

type Recipient = {
  id: string
  name: string
  organization: string | null
  address: string | null
  capacity: number
  food_preferences: string[]
  status: string
}

type RequestRow = { ngo_id: string; status: string }

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [profilesResponse, requestsResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, organization, address, capacity, food_preferences, status")
          .eq("role", "ngo")
          .order("name"),
        supabase.from("food_requests").select("ngo_id, status"),
      ])

      if (profilesResponse.error) {
        setError(profilesResponse.error.message)
        setLoading(false)
        return
      }

      setRecipients((profilesResponse.data ?? []) as Recipient[])
      setRequests((requestsResponse.data ?? []) as RequestRow[])
      setLoading(false)
    }

    load()
  }, [])

  if (loading) return <div className="p-8">Loading recipients...</div>
  if (error) return <div className="p-8 text-destructive">{error}</div>

  const active = recipients.filter((recipient) => recipient.status !== "offline").length
  const totalCapacity = recipients
    .filter((recipient) => recipient.status === "active")
    .reduce((sum, recipient) => sum + recipient.capacity, 0)

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Shelters &amp; NGOs
          </h2>
          <p className="text-muted-foreground mt-1">Partner organizations registered on Foodlink.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-4 border-r border-border/50">
            <p className="text-2xl font-bold">{active}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active</p>
          </div>
          <div className="text-center px-4">
            <p className="text-2xl font-bold text-emerald-600">{totalCapacity}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Meals Capacity</p>
          </div>
        </div>
      </div>

      <Card className="shadow-sm border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {recipients.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No NGO accounts yet. Sign up with the NGO role to appear here.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Accepts</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient) => {
                  const mine = requests.filter((request) => request.ngo_id === recipient.id)
                  const accepted = mine.filter((request) => request.status === "accepted").length
                  const preferences = recipient.food_preferences ?? []

                  return (
                    <TableRow key={recipient.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-semibold">
                        {recipient.organization ?? recipient.name}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" /> {recipient.address ?? "Not provided"}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{recipient.capacity} meals</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {preferences.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Anything</span>
                          ) : (
                            preferences.slice(0, 2).map((preference) => (
                              <Badge key={preference} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {preference}
                              </Badge>
                            ))
                          )}
                          {preferences.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{preferences.length - 2}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {mine.length} total, {accepted} accepted
                      </TableCell>
                      <TableCell>
                        {recipient.status === "active" && <Badge variant="success">Accepting</Badge>}
                        {recipient.status === "full" && <Badge variant="destructive">Full</Badge>}
                        {recipient.status === "offline" && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Offline
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
