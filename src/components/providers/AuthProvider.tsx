"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { type User } from "@supabase/supabase-js"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Profile = {
  id: string
  name: string
  email: string
  role: "donor" | "ngo" | "volunteer"
  profile_image_path: string | null
  latitude: number | null
  longitude: number | null
  is_available: boolean | null
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          setUser(null)
          setProfile(null)
          return
        }

        setUser(session.user)
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
        setProfile(data as Profile)
      } catch (error) {
        console.error("Error loading auth:", error)
      } finally {
        setLoading(false)
      }
    }

    void loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
        setProfile(data as Profile)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const publicAuthRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"]
    const isPublicAuthRoute = publicAuthRoutes.some((route) => pathname.startsWith(route))
    if (!loading && !user && pathname !== "/" && !isPublicAuthRoute) {
      router.push("/login?redirect=" + encodeURIComponent(pathname))
    }
  }, [user, loading, pathname, router])

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
    if (!error && data) setProfile(data as Profile)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
