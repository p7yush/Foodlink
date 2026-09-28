"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { Users, Car } from "lucide-react"

type Volunteer = {
  id: string
  name: string
  vehicle: string | null
  address: string | null
  status: string
}

type Pickup = { volunteer_id: string; status: string }

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
  const [pickups, setPickups] = useState<Pickup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [profilesResponse, pickupsResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, vehicle, address, status")
          .eq("role", "volunteer")
          .order("name"),
        supabase.from("pickups").select("volunteer_id, status"),
      ])

      if (profilesResponse.error) {
        setError(profilesResponse.error.message)
        setLoading(false)
        return
      }

      setVolunteers((profilesResponse.data ?? []) as Volunteer[])
      setPickups((pickupsResponse.data ?? []) as Pickup[])
      setLoading(false)
    }

    load()
  }, [])

  if (loading) return <div className="p-8">Loading volunteers...</div>
  if (error) return <div className="p-8 text-destructive">{error}</div>

  // A volunteer counts as on a run while they hold any pickup that is not closed.
  const activeRunsBy = (id: string) =>
    pickups.filter((pickup) => pickup.volunteer_id === id && pickup.status !== "completed").length
  const completedBy = (id: string) =>
    pickups.filter((pickup) => pickup.volunteer_id === id && pickup.status === "completed").length

  const online = volunteers.filter((volunteer) => volunteer.status !== "offline")
  const onPickup = online.filter((volunteer) => activeRunsBy(volunteer.id) > 0).length
  const available = online.length - onPickup

  return (
    <div className="mx-auto flex h-full w-full min-w-0 max-w-7xl flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Volunteers
          </h2>
          <p className="text-muted-foreground mt-1">Registered drivers and their live assignments.</p>
        </div>
        <div className="grid w-full grid-cols-3 gap-1 sm:w-auto sm:flex sm:gap-4">
          <div className="min-w-0 border-r border-border/50 px-1 text-center sm:px-4">
            <p className="text-2xl font-bold">{online.length}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active</p>
          </div>
          <div className="min-w-0 border-r border-border/50 px-1 text-center sm:px-4">
            <p className="text-2xl font-bold text-emerald-600">{available}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Available</p>
          </div>
          <div className="min-w-0 px-1 text-center sm:px-4">
            <p className="text-2xl font-bold text-blue-600">{onPickup}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">On Pickup</p>
          </div>
        </div>
      </div>

      <Card className="shadow-sm border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {volunteers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No volunteer accounts yet. Sign up with the volunteer role to appear here.
            </div>
          ) : (
            <>
            <div className="space-y-3 p-3 lg:hidden">
              {volunteers.map((volunteer) => {
                const active = activeRunsBy(volunteer.id)
                const completed = completedBy(volunteer.id)
                const offline = volunteer.status === "offline"
                return (
                  <article key={volunteer.id} className="min-w-0 rounded-lg border bg-background p-4">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <h3 className="min-w-0 break-words font-semibold">{volunteer.name}</h3>
                      {offline ? <Badge variant="outline">Offline</Badge> : active > 0 ? <Badge variant="secondary" className="shrink-0 bg-blue-100 text-blue-700">On Pickup</Badge> : <Badge variant="success" className="shrink-0">Available</Badge>}
                    </div>
                    <p className="mt-3 flex min-w-0 items-start gap-2 break-words text-sm text-muted-foreground">
                      <Car className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 break-words">{volunteer.vehicle ?? "Not specified"}</span>
                    </p>
                    <p className="mt-2 break-words text-sm text-muted-foreground">Based near: {volunteer.address ?? "Not provided"}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                      <div><dt className="text-xs text-muted-foreground">Active runs</dt><dd className="font-medium">{active}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Completed</dt><dd className="font-medium">{completed}</dd></div>
                    </dl>
                  </article>
                )
              })}
            </div>

            <div className="hidden min-w-0 overflow-auto lg:block">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Based near</TableHead>
                  <TableHead>Active runs</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {volunteers.map((volunteer) => {
                  const active = activeRunsBy(volunteer.id)
                  const offline = volunteer.status === "offline"

                  return (
                    <TableRow key={volunteer.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-semibold">{volunteer.name}</TableCell>
                      <TableCell>
                        {offline ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            Offline
                          </Badge>
                        ) : active > 0 ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            On Pickup
                          </Badge>
                        ) : (
                          <Badge variant="success">Available</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Car className="h-4 w-4 shrink-0" /> {volunteer.vehicle ?? "Not specified"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {volunteer.address ?? "Not provided"}
                      </TableCell>
                      <TableCell className="font-medium">{active}</TableCell>
                      <TableCell className="font-medium">{completedBy(volunteer.id)}</TableCell>
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
