"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/components/providers/AuthProvider"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"

type RequestItem = {
  id: string
  food_id: string
  ngo_id: string
  status: string
  requested_at: string
  profiles: {
    id: string
    name: string | null
    email: string | null
    role: string | null
  } | null
  food_donations: {
    id: string
    title: string
    quantity: number
    food_type: string | null
    pickup_address: string | null
    status: string | null
    donor_id: string
  } | null
}

export default function RequestsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")

  const loadRequests = useCallback(async () => {
    if (!user || !profile) return
    try {
      setLoading(true)
      
      // Fetch all requests along with joined data
      const { data, error } = await supabase
        .from("food_requests")
        .select(`
          id,
          food_id,
          ngo_id,
          status,
          requested_at,
          profiles (
            id,
            name,
            email,
            role
          ),
          food_donations (
            id,
            title,
            quantity,
            food_type,
            pickup_address,
            status,
            donor_id
          )
        `)
        .order("requested_at", { ascending: false })

      if (error) throw error

      if (profile.role === "donor") {
        // Filter requests for food owned by this donor
        setRequests((data as unknown as RequestItem[]).filter(r => r.food_donations?.donor_id === user.id))
      } else {
        // Filter requests made by this NGO
        setRequests((data as unknown as RequestItem[]).filter(r => r.ngo_id === user.id))
      }
    } catch (error) {
      console.error("Error loading requests:", error)
    } finally {
      setLoading(false)
    }
  }, [user, profile])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRequests()
  }, [loadRequests])

  async function updateRequest(requestId: string, status: "accepted" | "rejected") {
    setUpdatingId(requestId)
    setMessage("")

    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || "Failed to update request.")
        return
      }

      setMessage(
        status === "accepted"
          ? "Food request accepted successfully!"
          : "Food request rejected successfully!"
      )

      await loadRequests()
    } catch (error) {
      console.error("Update request error:", error)
      setMessage("Something went wrong. Please try again.")
    } finally {
      setUpdatingId(null)
    }
  }

  if (authLoading || loading) {
    return <main className="p-8">Loading requests...</main>
  }
  
  if (!profile) return <main className="p-8">Please log in.</main>

  const isDonor = profile.role === "donor"

  return (
    <main className="p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            {isDonor ? "Incoming Requests" : "My Requests"}
          </h1>
          <p className="mt-2 text-gray-600">
            {isDonor ? "NGOs requesting your donated food." : "Track the status of the food you have requested."}
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-lg bg-emerald-50 text-emerald-700 p-4 text-sm font-medium border border-emerald-200">
            {message}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold">
              No requests yet
            </h2>
            <p className="mt-2 text-gray-600">
              {isDonor ? "When an NGO requests your food, it will appear here." : "You haven't requested any food yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {requests.map((request) => (
              <div key={request.id} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Food Donation</p>
                    <h2 className="mt-1 text-xl font-semibold">
                      {request.food_donations?.title || "Unknown donation"}
                    </h2>
                  </div>
                  <Badge variant={request.status === 'accepted' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize px-3 py-1">
                    {request.status}
                  </Badge>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {isDonor && (
                    <>
                      <div>
                        <p className="text-sm text-gray-500">NGO</p>
                        <p className="font-medium">{request.profiles?.name || "Unknown NGO"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">NGO Email</p>
                        <p className="font-medium">{request.profiles?.email || "Not available"}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="font-medium">{request.food_donations?.quantity || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Food Type</p>
                    <p className="font-medium">{request.food_donations?.food_type || "Not provided"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-500">Pickup Address</p>
                    <p className="font-medium">{request.food_donations?.pickup_address || "Not provided"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-500">Requested At</p>
                    <p className="font-medium">{new Date(request.requested_at).toLocaleString()}</p>
                  </div>
                </div>

                {isDonor && request.status === "pending" && (
                  <div className="mt-6 flex gap-3 border-t pt-6">
                    <button
                      onClick={() => updateRequest(request.id, "accepted")}
                      disabled={updatingId === request.id}
                      className="flex-1 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
                    >
                      {updatingId === request.id ? "Updating..." : "Accept Request"}
                    </button>
                    <button
                      onClick={() => updateRequest(request.id, "rejected")}
                      disabled={updatingId === request.id}
                      className="flex-1 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive px-4 py-3 font-medium disabled:opacity-50 hover:bg-destructive/10"
                    >
                      Reject Request
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}