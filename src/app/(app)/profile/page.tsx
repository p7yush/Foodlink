"use client"

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react"
import { useAuth } from "@/components/providers/AuthProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import ProfileLocationPicker from "@/components/profile/ProfileLocationPicker"
import {
  passwordChangeErrorMessage,
  validatePasswordChange,
  verifyCurrentPasswordAndChange,
} from "@/lib/change-password"
import { getProfileImageUrl } from "@/lib/profile-image"
import { isValidCoordinates, type ProfileLocation } from "@/lib/profile-location"
import { createPasswordChangeAuthClient, supabase } from "@/lib/supabase"

type Role = "volunteer" | "donor" | "ngo"
type NotificationPreferences = Record<string, boolean>

type ProfileRow = {
  id: string
  name: string
  email: string
  role: Role
  organization: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  latitude: number | null
  longitude: number | null
  capacity: number | null
  daily_capacity: number | null
  food_preferences: string[] | null
  vehicle: string | null
  profile_image_path: string | null
  description: string | null
  website: string | null
  contact_person: string | null
  contact_phone: string | null
  pickup_address: string | null
  pickup_instructions: string | null
  operating_hours: string | null
  is_available: boolean | null
  preferred_pickup_radius_km: number | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  notification_preferences: NotificationPreferences | null
}

type ProfileDraft = {
  name: string
  phone: string
  address: string
  city: string
  state: string
  pincode: string
  latitude: string
  longitude: string
  organization: string
  description: string
  website: string
  contact_person: string
  contact_phone: string
  pickup_address: string
  pickup_instructions: string
  operating_hours: string
  daily_capacity: string
  food_preferences: string
  vehicle: string
  is_available: boolean
  preferred_pickup_radius_km: string
  emergency_contact_name: string
  emergency_contact_phone: string
  notification_preferences: NotificationPreferences
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const NOTIFICATION_OPTIONS: Record<Role, { key: string; label: string }[]> = {
  volunteer: [
    { key: "new_pickup_requests", label: "New pickup requests" },
    { key: "pickup_accepted", label: "Pickup accepted" },
    { key: "pickup_status_changes", label: "Pickup status changes" },
    { key: "delivery_reminders", label: "Delivery reminders" },
  ],
  donor: [
    { key: "pickup_accepted", label: "Pickup accepted" },
    { key: "volunteer_approaching", label: "Volunteer approaching" },
    { key: "food_handoff", label: "Food handoff" },
    { key: "donation_status", label: "Donation status" },
  ],
  ngo: [
    { key: "new_food_request", label: "New food request" },
    { key: "pickup_delivery_updates", label: "Pickup and delivery updates" },
    { key: "recipient_confirmation", label: "Recipient confirmation" },
  ],
}

function textOrEmpty(value: string | null | undefined) {
  return value ?? ""
}

function makeDraft(profile: ProfileRow): ProfileDraft {
  return {
    name: profile.name ?? "",
    phone: textOrEmpty(profile.phone),
    address: textOrEmpty(profile.address),
    city: textOrEmpty(profile.city),
    state: textOrEmpty(profile.state),
    pincode: textOrEmpty(profile.pincode),
    latitude: profile.latitude == null ? "" : String(profile.latitude),
    longitude: profile.longitude == null ? "" : String(profile.longitude),
    organization: textOrEmpty(profile.organization),
    description: textOrEmpty(profile.description),
    website: textOrEmpty(profile.website),
    contact_person: textOrEmpty(profile.contact_person),
    contact_phone: textOrEmpty(profile.contact_phone),
    pickup_address: profile.pickup_address || profile.address || "",
    pickup_instructions: textOrEmpty(profile.pickup_instructions),
    operating_hours: textOrEmpty(profile.operating_hours),
    daily_capacity: profile.daily_capacity == null ? "" : String(profile.daily_capacity),
    food_preferences: (profile.food_preferences ?? []).join(", "),
    vehicle: textOrEmpty(profile.vehicle),
    is_available: profile.is_available ?? true,
    preferred_pickup_radius_km: String(profile.preferred_pickup_radius_km ?? 10),
    emergency_contact_name: textOrEmpty(profile.emergency_contact_name),
    emergency_contact_phone: textOrEmpty(profile.emergency_contact_phone),
    notification_preferences: Object.fromEntries(
      NOTIFICATION_OPTIONS[profile.role].map(({ key }) => [
        key,
        profile.notification_preferences?.[key] ?? false,
      ]),
    ),
  }
}

function hasCoordinates(draft: ProfileDraft) {
  return draft.latitude.trim() !== "" && draft.longitude.trim() !== ""
}

function completionFor(profile: ProfileRow, draft: ProfileDraft) {
  const locationSet = hasCoordinates(draft) || Boolean(draft.city.trim() && draft.state.trim())
  const roleChecks = profile.role === "volunteer"
    ? [
        ["Full name", Boolean(draft.name.trim())],
        ["Phone", Boolean(draft.phone.trim())],
        ["Location or address", Boolean(draft.address.trim() || locationSet)],
      ] as const
    : profile.role === "donor"
      ? [
          ["Full name", Boolean(draft.name.trim())],
          ["Phone", Boolean(draft.phone.trim())],
          ["Pickup location", Boolean(draft.pickup_address.trim() || draft.address.trim() || locationSet)],
        ] as const
      : [
          ["NGO name", Boolean(draft.organization.trim())],
          ["Address", Boolean(draft.address.trim())],
          ["Contact person", Boolean(draft.contact_person.trim())],
          ["Location", Boolean(locationSet)],
        ] as const
  const completeCount = roleChecks.filter(([, complete]) => complete).length
  return {
    percent: Math.round((completeCount / roleChecks.length) * 100),
    missing: roleChecks.filter(([, complete]) => !complete).map(([label]) => label),
  }
}

function phoneError(value: string, label: string) {
  if (!value.trim()) return null
  const digits = value.replace(/\D/g, "")
  if (!/^[+0-9().\s-]+$/.test(value) || digits.length < 7 || digits.length > 15) {
    return `${label} must contain 7 to 15 digits.`
  }
  return null
}

function validateDraft(draft: ProfileDraft, role: Role) {
  if (draft.name.trim().length < 2 || draft.name.trim().length > 100) {
    return "Enter a name between 2 and 100 characters."
  }
  if (!draft.phone.trim()) return "Add a phone number so partners can contact you."
  const mainPhoneError = phoneError(draft.phone, "Phone number")
  if (mainPhoneError) return mainPhoneError
  const emergencyPhoneError = phoneError(draft.emergency_contact_phone, "Emergency contact phone")
  if (emergencyPhoneError) return emergencyPhoneError
  const contactPhoneError = phoneError(draft.contact_phone, "Contact phone")
  if (contactPhoneError) return contactPhoneError

  if (draft.pincode.trim() && !/^\d{6}$/.test(draft.pincode.trim())) {
    return "Pincode must contain 6 digits."
  }
  if (draft.address.length > 500 || draft.pickup_address.length > 500) {
    return "Addresses must be 500 characters or fewer."
  }
  if (draft.pickup_instructions.length > 1000) return "Pickup instructions must be 1,000 characters or fewer."
  if (draft.description.length > 2000) return "Description must be 2,000 characters or fewer."
  if (draft.organization.trim().length > 150) return "Organization name must be 150 characters or fewer."
  if (draft.contact_person.trim().length > 120) return "Contact person must be 120 characters or fewer."
  if (draft.operating_hours.length > 300) return "Operating hours must be 300 characters or fewer."
  if (role === "ngo" && !draft.organization.trim()) return "Enter your NGO name."

  if ((draft.latitude.trim() === "") !== (draft.longitude.trim() === "")) {
    return "Choose a valid location using address search, the map, or current location."
  }
  if (hasCoordinates(draft)) {
    const latitude = Number(draft.latitude)
    const longitude = Number(draft.longitude)
    if (!isValidCoordinates(latitude, longitude)) {
      return "Choose a valid location using address search, the map, or current location."
    }
  }

  if (draft.website.trim()) {
    if (draft.website.length > 255) return "Website URL must be 255 characters or fewer."
    try {
      const website = new URL(draft.website)
      if (website.protocol !== "http:" && website.protocol !== "https:") throw new Error("protocol")
    } catch {
      return "Enter a complete website URL starting with https://."
    }
  }

  if (role === "volunteer") {
    const radius = Number(draft.preferred_pickup_radius_km)
    if (!Number.isInteger(radius) || radius < 1 || radius > 200) {
      return "Preferred pickup radius must be between 1 and 200 km."
    }
  }
  if (role === "ngo" && draft.daily_capacity.trim()) {
    const capacity = Number(draft.daily_capacity)
    if (!Number.isInteger(capacity) || capacity < 0 || capacity > 1_000_000) {
      return "Daily food capacity must be a whole number between 0 and 1,000,000."
    }
  }
  if (draft.food_preferences.length > 500) return "Food categories must be 500 characters or fewer."
  return null
}

function cleaned(value: string) {
  return value.trim() || null
}

export default function ProfilePage() {
  const { user, profile: authProfile, loading: authLoading, refreshProfile, logout } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [draft, setDraft] = useState<ProfileDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locationResolving, setLocationResolving] = useState(false)
  const [locationNeedsReview, setLocationNeedsReview] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [saveMessage, setSaveMessage] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const photoPreviewRef = useRef<string | null>(null)
  const [photoMessage, setPhotoMessage] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordMessage, setPasswordMessage] = useState("")
  const [loggingOut, setLoggingOut] = useState(false)
  const userId = user?.id

  useEffect(() => () => {
    if (photoPreviewRef.current) URL.revokeObjectURL(photoPreviewRef.current)
  }, [])

  useEffect(() => {
    let active = true

    async function loadProfile() {
      if (authLoading) return
      if (!userId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setLoadError("")
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()

      if (!active) return
      if (error || !data) {
        setLoadError(error?.message || "Your profile record could not be found.")
        setProfile(null)
        setDraft(null)
      } else {
        const loadedProfile = data as ProfileRow
        setProfile(loadedProfile)
        setDraft(makeDraft(loadedProfile))
      }
      setLoading(false)
    }

    void loadProfile()
    return () => { active = false }
  }, [userId, authLoading])

  const completion = useMemo(
    () => profile && draft ? completionFor(profile, draft) : null,
    [profile, draft],
  )
  const avatarUrl = photoPreview || (removeImage ? null : getProfileImageUrl(profile?.profile_image_path))
  const role = profile?.role ?? authProfile?.role ?? null

  function updateDraft<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((previous) => previous ? { ...previous, [key]: value } : previous)
  }

  function clearPhotoPreview() {
    if (photoPreviewRef.current) URL.revokeObjectURL(photoPreviewRef.current)
    photoPreviewRef.current = null
    setPhotoPreview(null)
  }

  function beginEditing() {
    if (!profile) return
    setDraft(makeDraft(profile))
    setSelectedImage(null)
    clearPhotoPreview()
    setRemoveImage(false)
    setEditing(true)
    setLocationResolving(false)
    setLocationNeedsReview(false)
    setSaveError("")
    setSaveMessage("")
    setPhotoMessage("")
  }

  function cancelEditing() {
    if (profile) setDraft(makeDraft(profile))
    setSelectedImage(null)
    clearPhotoPreview()
    setRemoveImage(false)
    setEditing(false)
    setLocationResolving(false)
    setLocationNeedsReview(false)
    setSaveError("")
    setSaveMessage("")
    setPhotoMessage("")
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setPhotoMessage("Choose a JPEG, PNG, or WebP image.")
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setPhotoMessage("Profile images must be 5 MB or smaller.")
      return
    }
    setPhotoMessage("")
    if (photoPreviewRef.current) URL.revokeObjectURL(photoPreviewRef.current)
    photoPreviewRef.current = URL.createObjectURL(file)
    setPhotoPreview(photoPreviewRef.current)
    setSelectedImage(file)
    setRemoveImage(false)
  }

  function profileLocationChanged(location: ProfileLocation) {
    setDraft((previous) => previous ? {
      ...previous,
      address: location.address,
      city: location.city,
      state: location.state,
      pincode: location.pincode,
      latitude: location.latitude === null ? "" : String(location.latitude),
      longitude: location.longitude === null ? "" : String(location.longitude),
      ...(profile?.role === "donor" ? { pickup_address: location.address } : {}),
    } : previous)
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !profile || !draft) return

    if (locationResolving || locationNeedsReview) {
      setSaveError(locationResolving
        ? "Wait for the selected location address to finish loading."
        : "Enter or select a readable address for the selected coordinates before saving.")
      setSaveMessage("")
      return
    }

    const validationError = validateDraft(draft, profile.role)
    if (validationError) {
      setSaveError(validationError)
      setSaveMessage("")
      return
    }

    setSaving(true)
    setSaveError("")
    setSaveMessage("")
    let uploadedPath: string | null = null
    let profileSaved = false
    const oldImagePath = profile.profile_image_path

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session || session.user.id !== user.id) {
        throw new Error("Your session has expired. Sign in again to save your profile.")
      }

      if (selectedImage) {
        const extension = selectedImage.type === "image/jpeg" ? "jpg" : selectedImage.type.split("/")[1]
        uploadedPath = `${user.id}/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage
          .from("foodlink-profile-images")
          .upload(uploadedPath, selectedImage, {
            cacheControl: "3600",
            contentType: selectedImage.type,
            upsert: false,
          })
        if (uploadError) throw uploadError
      }

      const parseCoordinate = (value: string) => value.trim() === "" ? null : Number(value)
      const foodPreferences = draft.food_preferences
        .split(",")
        .map((category) => category.trim())
        .filter(Boolean)
        .slice(0, 20)

      const updates: Record<string, unknown> = {
        name: draft.name.trim(),
        phone: cleaned(draft.phone),
        address: cleaned(draft.address),
        city: cleaned(draft.city),
        state: cleaned(draft.state),
        pincode: cleaned(draft.pincode),
        latitude: parseCoordinate(draft.latitude),
        longitude: parseCoordinate(draft.longitude),
        notification_preferences: draft.notification_preferences,
      }

      if (profile.role === "volunteer") {
        Object.assign(updates, {
          is_available: draft.is_available,
          preferred_pickup_radius_km: Number(draft.preferred_pickup_radius_km),
          food_preferences: foodPreferences,
          vehicle: cleaned(draft.vehicle),
          emergency_contact_name: cleaned(draft.emergency_contact_name),
          emergency_contact_phone: cleaned(draft.emergency_contact_phone),
        })
      } else if (profile.role === "donor") {
        Object.assign(updates, {
          organization: cleaned(draft.organization),
          pickup_address: cleaned(draft.pickup_address),
          pickup_instructions: cleaned(draft.pickup_instructions),
          contact_person: cleaned(draft.contact_person),
        })
      } else {
        Object.assign(updates, {
          organization: cleaned(draft.organization),
          description: cleaned(draft.description),
          website: cleaned(draft.website),
          contact_person: cleaned(draft.contact_person),
          contact_phone: cleaned(draft.contact_phone),
          food_preferences: foodPreferences,
          daily_capacity: draft.daily_capacity.trim() ? Number(draft.daily_capacity) : null,
          operating_hours: cleaned(draft.operating_hours),
          pickup_instructions: cleaned(draft.pickup_instructions),
        })
      }

      if (uploadedPath) updates.profile_image_path = uploadedPath
      else if (removeImage) updates.profile_image_path = null

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select("*")
        .single()
      if (error) throw error
      profileSaved = true

      const updatedProfile = data as ProfileRow
      setProfile(updatedProfile)
      setDraft(makeDraft(updatedProfile))
      setSelectedImage(null)
      clearPhotoPreview()
      setRemoveImage(false)
      setEditing(false)
      await refreshProfile()

      let cleanupFailed = false
      if ((uploadedPath || removeImage) && oldImagePath) {
        const { error: removeError } = await supabase.storage
          .from("foodlink-profile-images")
          .remove([oldImagePath])
        cleanupFailed = Boolean(removeError)
      }
      setSaveMessage(cleanupFailed
        ? "Profile saved. The previous photo could not be removed."
        : "Your profile changes have been saved.")
    } catch (error) {
      if (uploadedPath && !profileSaved) {
        await supabase.storage.from("foodlink-profile-images").remove([uploadedPath])
      }
      setSaveError(profileSaved
        ? "Your profile was saved, but part of the photo cleanup could not be completed."
        : error instanceof Error ? error.message : "Could not save your profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user?.email) {
      setPasswordError("Your account email could not be loaded.")
      return
    }
    const validationError = validatePasswordChange(currentPassword, newPassword, confirmPassword)
    if (validationError) {
      setPasswordError(validationError)
      return
    }

    setPasswordSaving(true)
    setPasswordError("")
    setPasswordMessage("")
    try {
      const result = await verifyCurrentPasswordAndChange(
        createPasswordChangeAuthClient(),
        user.id,
        user.email,
        currentPassword,
        newPassword,
      )
      if (result.status === "verification-failed") {
        setPasswordError(passwordChangeErrorMessage(result.error, "verification"))
      } else if (result.status === "verification-incomplete") {
        setPasswordError("Supabase could not establish a valid sign-in session. Please sign in again.")
      } else if (result.status === "account-mismatch") {
        setPasswordError("Your sign-in account changed. Please sign in again before changing your password.")
      } else if (result.status === "session-changed") {
        setPasswordError("Your verified sign-in session changed. Please try again.")
      } else if (result.status === "update-failed") {
        setPasswordError(passwordChangeErrorMessage(result.error, "update"))
      } else {
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setPasswordMessage("Your password has been changed.")
      }
    } catch {
      setPasswordError("Could not change the password. Check your connection and try again.")
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    await logout()
  }

  if (authLoading || loading) {
    return <div className="mx-auto flex min-h-[50vh] max-w-5xl items-center justify-center text-muted-foreground" role="status">Loading your profile…</div>
  }
  if (!user) {
    return <div className="mx-auto max-w-3xl p-6 text-center">Please <Link className="underline" href="/login">sign in</Link> to view your profile.</div>
  }
  if (loadError || !profile || !draft || !role) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-destructive/30 bg-destructive/5 p-6" role="alert">
        <h1 className="font-semibold">We couldn’t load your profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">{loadError || "Your account role is unavailable."}</p>
      </div>
    )
  }

  const categoryLabel = role === "volunteer" ? "Preferred food categories" : "Food categories accepted"
  const pageName = role === "ngo" ? profile.organization || draft.organization || "NGO profile" : draft.name || "Your profile"
  const locationTitle = role === "donor" ? "Pickup location" : role === "ngo" ? "NGO location" : "Profile location"
  const pickerAddress = role === "donor" ? draft.pickup_address || draft.address : draft.address
  const profileLocation: ProfileLocation = {
    address: pickerAddress,
    city: draft.city,
    state: draft.state,
    pincode: draft.pincode,
    latitude: draft.latitude.trim() ? Number(draft.latitude) : null,
    longitude: draft.longitude.trim() ? Number(draft.longitude) : null,
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">Account</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Profile &amp; Settings</h1>
          <p className="mt-2 text-muted-foreground">Keep your contact and pickup information up to date.</p>
        </div>
        {!editing && (
          <Button type="button" onClick={beginEditing} className="w-full sm:w-auto">Edit Profile</Button>
        )}
      </div>

      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-2xl font-semibold uppercase text-primary ring-4 ring-background">
            {avatarUrl
              ? <div role="img" aria-label={`Profile photo for ${pageName}`} className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${avatarUrl.replaceAll('"', '%22')}")` }} />
              : profile.role === "ngo"
                ? <span>{(draft.organization || "N").slice(0, 1)}</span>
                : <span>{(draft.name || "U").slice(0, 1)}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold">{pageName}</h2>
              <Badge variant="secondary" className="capitalize">{role}</Badge>
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{profile.email || user.email}</p>
            <p className="mt-1 text-sm text-muted-foreground">{draft.city || draft.address || "Add your location details"}</p>
          </div>
          {completion && (
            <div className="w-full sm:w-56">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Profile completion</span>
                <span className="tabular-nums text-muted-foreground">{completion.percent}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion.percent}>
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion.percent}%` }} />
              </div>
              {completion.missing.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">Still needed: {completion.missing.join(", ")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={saveProfile} className="space-y-6" noValidate>
        <Card id="personal-information" className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Personal information</CardTitle>
            <CardDescription>Contact details shared with your Foodlink partners.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xl font-semibold uppercase text-primary">
                {avatarUrl
                  ? <div role="img" aria-label={`Profile photo for ${pageName}`} className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${avatarUrl.replaceAll('"', '%22')}")` }} />
                  : <span>{(draft.name || draft.organization || "U").slice(0, 1)}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Label htmlFor="profile-photo" className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted ${!editing || saving ? "pointer-events-none opacity-50" : ""}`}>
                  <Camera className="h-4 w-4" /> Upload or replace photo
                </Label>
                <input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImageChange} disabled={!editing || saving} aria-label="Upload profile photo" />
                {(profile.profile_image_path || selectedImage) && (
                  <Button type="button" variant="outline" size="sm" disabled={!editing || saving} onClick={() => { setSelectedImage(null); clearPhotoPreview(); setRemoveImage(true); setPhotoMessage("") }}>
                    <Trash2 className="mr-2 h-4 w-4" /> Remove photo
                  </Button>
                )}
                <p className="basis-full text-xs text-muted-foreground">JPEG, PNG, or WebP. Maximum 5 MB.</p>
                {photoMessage && <p className="basis-full text-sm text-destructive" role="alert">{photoMessage}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="full-name">{role === "ngo" ? "Account holder name" : role === "donor" ? "Full name / donor display name" : "Full name"}</Label>
                <Input id="full-name" autoComplete="name" maxLength={100} value={draft.name} disabled={!editing || saving} onChange={(event) => updateDraft("name", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account-email">Account email</Label>
                <Input id="account-email" type="email" autoComplete="email" value={user.email || profile.email || ""} readOnly disabled aria-describedby="email-help" />
                <p id="email-help" className="text-xs text-muted-foreground">Email changes are managed by Supabase Auth and are not available in this profile form.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" autoComplete="tel" maxLength={24} value={draft.phone} disabled={!editing || saving} onChange={(event) => updateDraft("phone", event.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {role === "volunteer" && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Volunteer details</CardTitle>
              <CardDescription>Set your pickup preferences and emergency contact.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <label className="flex items-start gap-3 rounded-lg border p-4">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={draft.is_available} disabled={!editing || saving} onChange={(event) => updateDraft("is_available", event.target.checked)} />
                <span><span className="block text-sm font-medium">Available for pickups</span><span className="mt-1 block text-xs text-muted-foreground">Unavailable volunteers cannot accept new pickups. Active pickups and live GPS tracking continue as before.</span></span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="pickup-radius">Preferred pickup radius (km)</Label>
                  <Input id="pickup-radius" type="number" min={1} max={200} step={1} value={draft.preferred_pickup_radius_km} disabled={!editing || saving} onChange={(event) => updateDraft("preferred_pickup_radius_km", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vehicle">Vehicle / transport</Label>
                  <Input id="vehicle" maxLength={80} list="vehicle-options" value={draft.vehicle} disabled={!editing || saving} onChange={(event) => updateDraft("vehicle", event.target.value)} placeholder="e.g. Bicycle, motorcycle, car" />
                  <datalist id="vehicle-options"><option value="Bicycle" /><option value="Motorcycle" /><option value="Car" /><option value="Van" /><option value="Walking" /></datalist>
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="food-preferences">{categoryLabel}</Label>
                  <Input id="food-preferences" maxLength={500} value={draft.food_preferences} disabled={!editing || saving} onChange={(event) => updateDraft("food_preferences", event.target.value)} placeholder="Cooked, Packaged, Fresh produce" />
                  <p className="text-xs text-muted-foreground">Separate categories with commas.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emergency-name">Emergency contact name</Label>
                  <Input id="emergency-name" maxLength={120} value={draft.emergency_contact_name} disabled={!editing || saving} onChange={(event) => updateDraft("emergency_contact_name", event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emergency-phone">Emergency contact phone</Label>
                  <Input id="emergency-phone" type="tel" maxLength={24} value={draft.emergency_contact_phone} disabled={!editing || saving} onChange={(event) => updateDraft("emergency_contact_phone", event.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {role === "donor" && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Donor and pickup details</CardTitle>
              <CardDescription>Your public name and the default location used when coordinating donations.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="organization">Organization / business name</Label>
                <Input id="organization" maxLength={150} value={draft.organization} disabled={!editing || saving} onChange={(event) => updateDraft("organization", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-person">Pickup contact person</Label>
                <Input id="contact-person" maxLength={120} value={draft.contact_person} disabled={!editing || saving} onChange={(event) => updateDraft("contact_person", event.target.value)} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="pickup-instructions">Pickup instructions</Label>
                <Textarea id="pickup-instructions" maxLength={1000} value={draft.pickup_instructions} disabled={!editing || saving} onChange={(event) => updateDraft("pickup_instructions", event.target.value)} className="min-h-24" placeholder="Entrance, loading area, or handoff notes" />
              </div>
            </CardContent>
          </Card>
        )}

        {role === "ngo" && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> NGO details</CardTitle>
              <CardDescription>Information recipients and volunteers use to coordinate deliveries.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="ngo-name">NGO name</Label>
                <Input id="ngo-name" maxLength={150} value={draft.organization} disabled={!editing || saving} onChange={(event) => updateDraft("organization", event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-person">Contact person</Label>
                <Input id="contact-person" maxLength={120} value={draft.contact_person} disabled={!editing || saving} onChange={(event) => updateDraft("contact_person", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-phone">Contact / emergency phone</Label>
                <Input id="contact-phone" type="tel" maxLength={24} value={draft.contact_phone} disabled={!editing || saving} onChange={(event) => updateDraft("contact_phone", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" type="url" maxLength={255} value={draft.website} disabled={!editing || saving} onChange={(event) => updateDraft("website", event.target.value)} placeholder="https://example.org" />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" maxLength={2000} value={draft.description} disabled={!editing || saving} onChange={(event) => updateDraft("description", event.target.value)} className="min-h-24" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="daily-capacity">Maximum daily food capacity (meals)</Label>
                <Input id="daily-capacity" type="number" min={0} max={1000000} step={1} value={draft.daily_capacity} disabled={!editing || saving} onChange={(event) => updateDraft("daily_capacity", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="operating-hours">Operating hours</Label>
                <Input id="operating-hours" maxLength={300} value={draft.operating_hours} disabled={!editing || saving} onChange={(event) => updateDraft("operating_hours", event.target.value)} placeholder="e.g. Mon–Sat, 9:00 AM–6:00 PM" />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="food-preferences">{categoryLabel}</Label>
                <Input id="food-preferences" maxLength={500} value={draft.food_preferences} disabled={!editing || saving} onChange={(event) => updateDraft("food_preferences", event.target.value)} placeholder="Cooked, Packaged, Fresh produce" />
                <p className="text-xs text-muted-foreground">Separate categories with commas.</p>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="pickup-instructions">Receiving / pickup instructions</Label>
                <Textarea id="pickup-instructions" maxLength={1000} value={draft.pickup_instructions} disabled={!editing || saving} onChange={(event) => updateDraft("pickup_instructions", event.target.value)} className="min-h-24" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> {locationTitle}</CardTitle>
            <CardDescription>
              {role === "volunteer"
                ? "This is your profile location. Active pickup GPS is saved separately for each pickup."
                : role === "donor"
                  ? "This default pickup location is saved with your donor profile and used to start new pickup coordination."
                  : "This saved NGO location is used as a destination for map and delivery coordination."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileLocationPicker
              location={profileLocation}
              disabled={!editing || saving}
              addressLabel={role === "donor" ? "Default pickup address" : role === "ngo" ? "NGO address" : "Profile address"}
              addressHelpText={role === "donor" ? "New donation pickups use this starting address. A donation can still have its own pickup address." : undefined}
              needsAddressReview={locationNeedsReview}
              onChange={profileLocationChanged}
              onResolvingChange={setLocationResolving}
              onAddressReviewChange={setLocationNeedsReview}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notification preferences</CardTitle>
            <CardDescription>Choose the alerts you would like Foodlink to send in the future.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {NOTIFICATION_OPTIONS[role].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={draft.notification_preferences[key] ?? false}
                    disabled={!editing || saving}
                    onChange={(event) => updateDraft("notification_preferences", { ...draft.notification_preferences, [key]: event.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">These preferences are saved to your profile. Foodlink does not currently send notification alerts.</p>
          </CardContent>
        </Card>

        {editing && (
          <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={cancelEditing} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || locationResolving || locationNeedsReview}>
              {saving ? "Saving changes…" : locationResolving ? "Verifying location…" : locationNeedsReview ? "Enter or select an address" : "Save Changes"}
            </Button>
          </div>
        )}
        {saveError && <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{saveError}</p>}
        {saveMessage && <p className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-800" role="status"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{saveMessage}</p>}
      </form>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-primary" /> Account &amp; security</CardTitle>
          <CardDescription>Manage your Foodlink sign-in and account access.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-medium">Account email</p><p className="mt-1 break-all text-sm text-muted-foreground">{user.email || profile.email}</p></div>
            <Badge variant="outline" className="w-fit">Supabase Auth</Badge>
          </div>

          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <h3 className="font-semibold">Change password</h3>
              <p className="mt-1 text-sm text-muted-foreground">Confirm your current password, then choose a new one.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input id="current-password" type={showPasswords ? "text" : "password"} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={passwordSaving} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type={showPasswords ? "text" : "password"} autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={passwordSaving} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" type={showPasswords ? "text" : "password"} autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={passwordSaving} />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} /> Show passwords
              </label>
              <Button type="submit" variant="outline" disabled={passwordSaving}>{passwordSaving ? "Updating password…" : "Change Password"}</Button>
            </div>
            <p className="text-xs text-muted-foreground">Use at least 8 characters, including a letter and a number.</p>
            {passwordError && <p className="text-sm text-destructive" role="alert">{passwordError}</p>}
            {passwordMessage && <p className="text-sm text-emerald-700" role="status">{passwordMessage}</p>}
          </form>

          <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sign out of this Foodlink account on this device.</p>
            </div>
            <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={loggingOut} onClick={() => void handleLogout()}>{loggingOut ? "Signing out…" : "Log out"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
