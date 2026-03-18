'use client'

import {
  IconCircleCheck,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PlanBadge } from '@/components/common/plan-badge'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getInitials } from '@/lib/utils'
import { getPasswordPolicyErrorMessage } from '@/lib/supabase/auth-errors'

interface ProfileData {
  name: string
  email: string
  phone: string
  bio: string
  profileImage: string
}

export default function EditProfilePage() {
  const { user, supabase, refreshUser } = useSupabase()

  const [profile, setProfile] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    bio: '',
    profileImage: '',
  })
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingPw, setIsSavingPw] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name,
        email: user.email,
        phone: user.phone,
        bio: user.bio ?? '',
        profileImage: user.profileImage ?? '',
      })
    }
  }, [user])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setIsSaving(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          bio: profile.bio,
          profileImage: profile.profileImage,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSuccessMsg('Profile updated successfully!')
      await refreshUser()
    } catch {
      setErrorMsg('Failed to save profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.')
      return
    }
    setIsSavingPw(true)
    setErrorMsg('')
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (error) throw error
      setSuccessMsg('Password changed successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to change password.'
      setErrorMsg(getPasswordPolicyErrorMessage(message))
    } finally {
      setIsSavingPw(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-2xl font-semibold text-[#181411] mb-8 tracking-wide">
        Edit Profile
      </h2>

      {successMsg && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <IconCircleCheck className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      {/* Profile form */}
      <form
        onSubmit={(e) => void handleSaveProfile(e)}
        className="space-y-6 mb-10"
      >
        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6">
          <h3 className="font-display text-lg font-semibold text-[#181411] mb-5">
            Personal Information
          </h3>

          {/* Profile image */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative h-16 w-16 rounded-full overflow-hidden ring-2 ring-[#fa6b05]/15">
              {profile.profileImage ? (
                <Image
                  src={profile.profileImage}
                  alt={profile.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="h-full w-full bg-[#fef0e6] flex items-center justify-center text-[#fa6b05] font-bold font-display text-xl">
                  {getInitials(profile.name || 'U')}
                </div>
              )}
            </div>
            <div className="flex-1">
              <Label>Profile Image URL</Label>
              <Input
                placeholder="https://example.com/your-photo.jpg"
                value={profile.profileImage}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, profileImage: e.target.value }))
                }
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={profile.name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={profile.email}
                disabled
                className="opacity-60 cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                type="tel"
                placeholder="+961 3 000 000"
                value={profile.phone}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="edit-bio">Bio</Label>
              <textarea
                id="edit-bio"
                rows={4}
                placeholder="Tell buyers and renters a bit about yourself..."
                value={profile.bio}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, bio: e.target.value }))
                }
                className="flex w-full rounded-lg border border-[rgba(34,24,18,0.14)] bg-white px-3 py-2 text-sm text-[#181411] placeholder:text-[#8b8178] focus:outline-none focus:ring-2 focus:ring-[#fa6b05]/30 focus:border-[#fa6b05] transition-colors resize-none"
              />
            </div>
          </div>

          <Button type="submit" className="mt-5 gap-2" disabled={isSaving}>
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Saving...
              </span>
            ) : (
              <>
                <IconDeviceFloppy className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={(e) => void handleChangePassword(e)} className="mb-10">
        <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6">
          <h3 className="font-display text-lg font-semibold text-[#181411] mb-5">
            Change Password
          </h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-3 text-[#8b8178] hover:text-[#5f554d]"
                >
                  {showNewPw ? (
                    <IconEyeOff className="h-4 w-4" />
                  ) : (
                    <IconEye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
            <Button type="submit" variant="secondary" disabled={isSavingPw}>
              {isSavingPw ? 'Saving...' : 'Change Password'}
            </Button>
          </div>
        </div>
      </form>

      {/* Plan section */}
      <div className="rounded-[20px] bg-white border border-[rgba(34,24,18,0.08)] shadow-[0_6px_20px_rgba(24,20,17,0.06)] p-6">
        <h3 className="font-display text-lg font-semibold text-[#181411] mb-4">
          Current Plan
        </h3>
        <div className="flex items-center justify-between">
          <PlanBadge plan={user.plan} />
          <Button asChild variant="outline" size="sm">
            <Link href="/pricing">Upgrade Plan</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
