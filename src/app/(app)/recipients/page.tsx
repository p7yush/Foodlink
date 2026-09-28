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
    <div className="mx-auto flex h-full w-full min-w-0 max-w-7xl flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Shelters &amp; NGOs
          </h2>
          <p className="text-muted-foreground mt-1">Partner organizations registered on Foodlink.</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:gap-4">
          <div className="min-w-0 border-r border-border/50 px-2 text-center sm:px-4">
            <p className="text-2xl font-bold">{active}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active</p>
          </div>
          <div className="min-w-0 px-2 text-center sm:px-4">
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
            <>
            <div className="space-y-3 p-3 lg:hidden">
              {recipients.map((recipient) => {
                const mine = requests.filter((request) => request.ngo_id === recipient.id)
                const accepted = mine.filter((request) => request.status === "accepted").length
                const preferences = recipient.food_preferences ?? []
                return (
                  <article key={recipient.id} className="min-w-0 rounded-lg border bg-background p-4">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <h3 className="min-w-0 break-words font-semibold">{recipient.organization ?? recipient.name}</h3>
                      {recipient.status === "active" && <Badge variant="success">Accepting</Badge>}
                      {recipient.status === "full" && <Badge variant="destructive">Full</Badge>}
                      {recipient.status === "offline" && <Badge variant="outline">Offline</Badge>}
                    </div>
                    <p className="mt-3 flex min-w-0 items-start gap-2 break-words text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 break-words">{recipient.address ?? "Not provided"}</span>
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-xs text-muted-foreground">Capacity</dt><dd className="font-medium">{recipient.capacity} meals</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Requests</dt><dd className="break-words">{mine.length} total, {accepted} accepted</dd></div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {preferences.length === 0 ? <span className="text-xs text-muted-foreground">Anything</span> : preferences.slice(0, 2).map((preference) => (
                        <Badge key={preference} variant="secondary" className="max-w-full break-words text-[10px]">{preference}</Badge>
                      ))}
                      {preferences.length > 2 && <span className="text-xs text-muted-foreground">+{preferences.length - 2}</span>}
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="hidden min-w-0 overflow-auto lg:block">
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
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
