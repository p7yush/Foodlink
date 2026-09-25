"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Donation = {
  id: string
  title: string
  description: string | null
  quantity: number
  food_type: string | null
  expiry_time: string | null
  pickup_address: string | null
  status: string | null
  created_at: string
}

export default function DonationDetailsPage() {
  const params = useParams()
  const id = params.id as string

  const [donation, setDonation] = useState<Donation | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [message, setMessage] = useState("")
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    async function loadDonation() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLoadError("Please log in to view this donation.")
          return
        }

        const response = await fetch(`/api/donations/${id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const result = await response.json()

        if (response.ok) {
          setDonation(result.donation)
        } else {
          setLoadError(result.error || "Could not load this donation.")
        }
      } catch (error) {
        console.error("Error loading donation:", error)
        setLoadError("Could not load this donation. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadDonation()
    }
  }, [id])

  async function handleRequestFood() {
    setRequesting(true)
    setMessage("")

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user

      if (!user) {
        setMessage("Please log in as an NGO before requesting food.")
        return
      }

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({
          food_id: id,
          ngo_id: user.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || "Failed to request food.")
        return
      }

      setMessage("Food request submitted successfully!")
    } catch (error) {
      console.error("Request food error:", error)
      setMessage("Something went wrong. Please try again.")
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <main className="p-8">
        <p>Loading donation...</p>
      </main>
    )
  }

  if (!donation) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Donation not found</h1>
        <p className="mt-2 text-gray-600">
          {loadError || "We could not find this donation."}
        </p>
      </main>
    )
  }

  return (
    <main className="p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm text-gray-500">Donation ID</p>

          <h1 className="text-3xl font-bold">{donation.title}</h1>

          <p className="mt-2 text-sm text-gray-500">
            {donation.id}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Donation Details
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-sm text-gray-500">
                Description
              </p>

              <p className="font-medium">
                {donation.description || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Quantity
              </p>

              <p className="font-medium">
                {donation.quantity}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Food Type
              </p>

              <p className="font-medium">
                {donation.food_type || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Pickup Address
              </p>

              <p className="font-medium">
                {donation.pickup_address || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Status
              </p>

              <p className="font-medium capitalize">
                {donation.status || "available"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Expiry Time
              </p>

              <p className="font-medium">
                {donation.expiry_time || "Not set"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Created At
              </p>

              <p className="font-medium">
                {new Date(donation.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <button
              onClick={handleRequestFood}
              disabled={requesting}
              className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {requesting ? "Requesting..." : "Request Food"}
            </button>

            {message && (
              <p className="mt-4 rounded-lg bg-gray-100 p-3 text-sm">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
