"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirectTo =
    searchParams.get("redirect") || "/dashboard"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("donor")

  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSignup(
    e: React.FormEvent
  ) {
    e.preventDefault()

    setLoading(true)
    setMessage("")

    if (password.length < 6) {
      setMessage(
        "Password must be at least 6 characters long."
      )
      setLoading(false)
      return
    }

    try {
      const {
        data: { user },
        error: signupError,
      } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signupError) {
        setMessage(signupError.message)
        setLoading(false)
        return
      }

      if (!user) {
        setMessage(
          "Account could not be created. Please try again."
        )
        setLoading(false)
        return
      }

      const { error: profileError } =
        await supabase
          .from("profiles")
          .insert([
            {
              id: user.id,
              name,
              email,
              role,
            },
          ])

      if (profileError) {
        console.error(
          "PROFILE CREATION ERROR:",
          profileError
        )

        setMessage(
          "Account was created, but your profile could not be saved: " +
            profileError.message
        )

        setLoading(false)
        return
      }

      setMessage(
        "Account created successfully!"
      )

      setTimeout(() => {
        router.push(redirectTo)
      }, 800)
    } catch (error) {
      console.error(
        "SIGNUP ERROR:",
        error
      )

      setMessage(
        "Something went wrong. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            Create your Foodlink account
          </h1>

          <p className="mt-2 text-gray-600">
            Join the food rescue network
          </p>
        </div>

        <form
          onSubmit={handleSignup}
          className="mt-8 space-y-5"
        >
          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Full Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Your full name"
              required
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="At least 6 characters"
              required
              minLength={6}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
            />
          </div>

          {/* Account Type */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Account Type
            </label>

            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value)
              }
              className="w-full rounded-lg border bg-white px-4 py-3 outline-none focus:ring-2"
            >
              <option value="donor">
                Donor
              </option>

              <option value="ngo">
                NGO
              </option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>

          {/* Message */}
          {message && (
            <p className="rounded-lg bg-gray-100 p-3 text-sm">
              {message}
            </p>
          )}
        </form>

        {/* Login */}
        <div className="mt-6 border-t pt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?
          </p>

          <Link
            href={`/login?redirect=${encodeURIComponent(
              redirectTo
            )}`}
            className="mt-2 inline-block font-medium text-black underline"
          >
            Login
          </Link>
        </div>

        {/* Home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            ← Back to Foodlink
          </Link>
        </div>
      </div>
    </main>
  )
}