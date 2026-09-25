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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Volunteers
          </h2>
          <p className="text-muted-foreground mt-1">Registered drivers and their live assignments.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-4 border-r border-border/50">
            <p className="text-2xl font-bold">{online.length}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active</p>
          </div>
          <div className="text-center px-4 border-r border-border/50">
            <p className="text-2xl font-bold text-emerald-600">{available}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Available</p>
          </div>
          <div className="text-center px-4">
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
