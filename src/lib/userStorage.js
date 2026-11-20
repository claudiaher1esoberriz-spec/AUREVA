import { supabase } from './supabase.js'

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return null
  }

  return data.user.id
}

export function userStorageKey(userId, key) {
  if (!userId) {
    throw new Error('Se necesita un usuario autenticado')
  }

  return `aureva_user_${userId}_${key}`
}
