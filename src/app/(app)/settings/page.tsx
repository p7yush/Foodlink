import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings as SettingsIcon } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto h-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" /> Settings
        </h2>
        <p className="text-muted-foreground mt-1">Manage your organization profile and matching preferences.</p>
      </div>

      <div className="grid gap-6">
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Organization Profile</CardTitle>
            <CardDescription>Update your facility details and contact information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input id="orgName" defaultValue="Operations HQ" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input id="contactEmail" type="email" defaultValue="ops@foodflow.org" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Primary Address</Label>
              <Input id="address" defaultValue="120 Innovation Way, Suite 400" />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Matching Preferences</CardTitle>
            <CardDescription>Configure how the AI routes your surplus food.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="maxRadius">Maximum Delivery Radius (km)</Label>
              <Input id="maxRadius" type="number" defaultValue="15" className="sm:max-w-[200px]" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="priority">Matching Priority</Label>
              <select id="priority" className="flex h-10 w-full sm:max-w-[300px] rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option>Distance (Closest first)</option>
                <option>Urgency (Expiring soonest first)</option>
                <option>Capacity (Most available first)</option>
              </select>
            </div>
            <Button variant="outline">Update Preferences</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
