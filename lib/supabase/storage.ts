import { createClient } from './client'

export async function uploadPropertyImage(
  file: File,
  userId: string
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('property-images')
    .upload(path, file)

  if (error) throw error

  const { data } = supabase.storage
    .from('property-images')
    .getPublicUrl(path)

  return data.publicUrl
}

export async function uploadProfileAvatar(
  file: File,
  userId: string
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('profile-avatars')
    .upload(path, file)

  if (error) throw error

  const { data } = supabase.storage
    .from('profile-avatars')
    .getPublicUrl(path)

  return data.publicUrl
}
