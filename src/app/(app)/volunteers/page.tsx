import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getVolunteers } from "@/lib/db"
import { Users, Star, Car } from "lucide-react"

export default async function VolunteersPage() {
  const mockVolunteers = await getVolunteers()
  
  const activeNow = mockVolunteers.filter(v => v.status !== 'Offline').length
  const onPickup = mockVolunteers.filter(v => v.status === 'On Pickup').length
  const available = mockVolunteers.filter(v => v.status === 'Available').length

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Volunteers
          </h2>
          <p className="text-muted-foreground mt-1">Manage driver fleet and track live assignments.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-4 border-r border-border/50">
            <p className="text-2xl font-bold">{activeNow}</p>
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
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockVolunteers.map(volunteer => (
                <TableRow key={volunteer.id} className="cursor-pointer hover:bg-muted/40 transition-colors">
                  <TableCell className="font-semibold">{volunteer.name}</TableCell>
                  <TableCell>
                    {volunteer.status === 'Available' && <Badge variant="success">Available</Badge>}
                    {volunteer.status === 'On Pickup' && <Badge variant="secondary" className="bg-blue-100 text-blue-700">On Pickup</Badge>}
                    {volunteer.status === 'Offline' && <Badge variant="outline" className="text-muted-foreground">Offline</Badge>}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Car className="h-4 w-4" /> {volunteer.vehicle}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{volunteer.distance} km</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 font-medium">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> {volunteer.rating}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{volunteer.completedPickups}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-8 text-primary">View Profile</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
