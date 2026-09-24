import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getDonations } from "@/lib/db"
import { StatusBadge } from "@/app/(app)/dashboard/page"
import { Plus, Search, Filter } from "lucide-react"
import Link from "next/link"

export default async function DonationsPage() {
  const mockDonations = await getDonations()
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Donations</h2>
          <p className="text-muted-foreground">Track surplus food from posting to delivery.</p>
        </div>
        <Link href="/donations/new">
          <Button className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> New Donation
          </Button>
        </Link>
      </div>

      <Card className="flex-1 shadow-sm border-border/50 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto w-full pb-2 sm:pb-0 hide-scrollbar">
            <Badge variant="secondary" className="px-3 py-1 cursor-pointer hover:bg-secondary/80 text-sm whitespace-nowrap">All</Badge>
            <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted text-sm whitespace-nowrap text-muted-foreground">Needs Match</Badge>
            <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted text-sm whitespace-nowrap text-muted-foreground">Matched</Badge>
            <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted text-sm whitespace-nowrap text-muted-foreground">Pickup</Badge>
            <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted text-sm whitespace-nowrap text-muted-foreground">Delivered</Badge>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search ID or donor..." className="pl-8 h-9" />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
        <CardContent className="p-0 overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-sm">
              <TableRow>
                <TableHead className="w-[100px]">Donation</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead>Food Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockDonations.map((donation) => (
                <TableRow key={donation.id} className="cursor-pointer hover:bg-muted/40 transition-colors">
                  <TableCell className="font-medium text-primary">
                    <Link href={`/donations/${donation.id}`} className="hover:underline">
                      {donation.id}
                    </Link>
                  </TableCell>
                  <TableCell>{donation.donorName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{donation.foodType}</span>
                      <span className="text-xs text-muted-foreground">{donation.category}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{donation.quantity} {donation.unit}</TableCell>
                  <TableCell>
                    <span className={donation.status === 'At Risk' ? 'text-destructive font-medium' : ''}>
                      {donation.safeUntilTime}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={donation.status} />
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
