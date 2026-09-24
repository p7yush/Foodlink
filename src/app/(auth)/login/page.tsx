"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirectTo =
    searchParams.get("redirect") || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(
    e: React.FormEvent
  ) {
    e.preventDefault()

    setLoading(true)
    setMessage("")

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Login successful!")

      setTimeout(() => {
        router.push(redirectTo)
      }, 500)
    }

    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            Foodlink
          </h1>

          <p className="mt-2 text-gray-600">
            Login to your Foodlink account
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="mt-8 space-y-5"
        >
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
              placeholder="Your password"
              required
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>

          {message && (
            <p className="rounded-lg bg-gray-100 p-3 text-sm">
              {message}
            </p>
          )}
        </form>

        {/* Create Account */}
        <div className="mt-6 border-t pt-6 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have a Foodlink account?
          </p>

          <Link
            href={`/signup?redirect=${encodeURIComponent(
              redirectTo
            )}`}
            className="mt-2 inline-block font-medium text-black underline"
          >
            Create an account
          </Link>
        </div>

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