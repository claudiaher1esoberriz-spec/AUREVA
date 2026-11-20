import { supabase } from '../lib/supabase.js'

export async function getCloudChats() {
  const { data: { user }, error: authError } =
    await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Debes iniciar sesión')
  }

  const { data, error } = await supabase
    .from('chats')
    .select('local_id, title, messages, created_at, updated_at')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || [])
    .filter(chat => chat.local_id != null)
    .map(chat => ({
      id: /^\d+$/.test(chat.local_id)
        ? Number(chat.local_id)
        : chat.local_id,
      title: chat.title || 'Nueva conversación',
      messages: chat.messages || [],
      updated_at: chat.updated_at
    }))
}

export async function saveCloudChat(
  chat,
  expectedUpdatedAt = chat.updated_at ?? null
) {
  const { data: { user }, error: authError } =
    await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Debes iniciar sesión')
  }

  const { data, error } = await supabase.rpc(
    'save_chat_safely',
    {
      p_local_id: String(chat.id),
      p_title: chat.title || 'Nueva conversación',
      p_messages: chat.messages || [],
      p_expected_updated_at: expectedUpdatedAt
    }
  )

  if (error) throw error

  return data
}

export async function deleteCloudChat(chatId) {
  const { data: { user }, error: authError } =
    await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Debes iniciar sesión')
  }

  const { error } = await supabase
    .from('chats')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('local_id', String(chatId))

  if (error) throw error
}


// Combina los chats durante la primera sincronización.
// Si hay un identificador repetido, conserva la versión local.
export function mergeChatsForInitialSync(localChats, cloudChats) {
  const cloudById = new Map(
    cloudChats.map(chat => [String(chat.id), chat])
  )

  const merged = new Map()

  for (const chat of cloudChats) {
    merged.set(String(chat.id), chat)
  }

  for (const chat of localChats) {
    const id = String(chat.id)
    const cloudVersion = cloudById.get(id)

    if (!cloudVersion) {
      merged.set(id, chat)
      continue
    }

    const identical =
      chat.title === cloudVersion.title &&
      JSON.stringify(chat.messages) ===
      JSON.stringify(cloudVersion.messages)

    if (identical) continue

    const conflictContent = JSON.stringify({
      title: chat.title,
      messages: chat.messages
    })

    let conflictHash = 2166136261
    for (let i = 0; i < conflictContent.length; i++) {
      conflictHash ^= conflictContent.charCodeAt(i)
      conflictHash = Math.imul(conflictHash, 16777619)
    }

    const conflictId =
      `conflicto-${id}-${(conflictHash >>> 0).toString(16)}`

    merged.set(conflictId, {
      ...chat,
      id: conflictId,
      title: `${chat.title || 'Conversación'} (copia en conflicto)`,
      conflictOf: id
    })
  }

  return Array.from(merged.values())
}


// Recupera el estado de los chats, incluidos los eliminados.
export async function getCloudChatStates() {
  const { data: { user }, error: authError } =
    await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Debes iniciar sesión')
  }

  const { data, error } = await supabase
    .from('chats')
    .select('local_id, updated_at, deleted_at')
    .eq('user_id', user.id)

  if (error) throw error

  return data || []
}


// Prepara la sincronización inicial sin escribir en Supabase.
export async function prepareInitialChatSync(localChats) {
  const [cloudChats, cloudStates] = await Promise.all([
    getCloudChats(),
    getCloudChatStates()
  ])

  const deletedIds = new Set(
    cloudStates
      .filter(chat => chat.deleted_at)
      .map(chat => String(chat.local_id))
  )

  const activeLocalChats = localChats.filter(
    chat => !deletedIds.has(String(chat.id))
  )

  return mergeChatsForInitialSync(activeLocalChats, cloudChats)
}
