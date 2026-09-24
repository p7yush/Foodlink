import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getRecipients } from "@/lib/db"
import { Building2, MapPin } from "lucide-react"

export default async function RecipientsPage() {
  const mockRecipients = await getRecipients()
  
  const activeRecipients = mockRecipients.filter(r => r.status !== 'Offline').length
  const totalCapacity = mockRecipients.reduce((acc, r) => acc + (r.capacity - r.currentCapacity), 0)

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Shelters & NGOs
          </h2>
          <p className="text-muted-foreground mt-1">Manage partner organizations and monitor live capacity.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center px-4 border-r border-border/50">
            <p className="text-2xl font-bold">{activeRecipients}</p>
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
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Preferences</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRecipients.map(recipient => {
                const percentFull = (recipient.currentCapacity / recipient.capacity) * 100
                return (
                  <TableRow key={recipient.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-semibold">{recipient.name}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {recipient.location}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 min-w-[120px]">
                        <div className="flex justify-between text-xs font-medium">
                          <span>{recipient.currentCapacity}</span>
                          <span className="text-muted-foreground">{recipient.capacity}</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${percentFull > 90 ? 'bg-destructive' : 'bg-primary'}`} 
                            style={{ width: `${percentFull}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {recipient.foodPreferences.slice(0, 2).map(pref => (
                          <Badge key={pref} variant="secondary" className="text-[10px] px-1.5 py-0">{pref}</Badge>
                        ))}
                        {recipient.foodPreferences.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{recipient.foodPreferences.length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {recipient.status === 'Accepting' && <Badge variant="success">Accepting</Badge>}
                      {recipient.status === 'Full' && <Badge variant="destructive">Full</Badge>}
                      {recipient.status === 'Offline' && <Badge variant="outline" className="text-muted-foreground">Offline</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8">Edit</Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
