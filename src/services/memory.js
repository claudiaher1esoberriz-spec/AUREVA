const MEMORY_KEY = 'aureva_personal_memory'

export function getMemory() {
  try {
    return JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]')
  } catch {
    return []
  }
}

export function addMemory(text) {
  const memories = getMemory()
  const value = text.trim()
  if (!value) return memories

  const updated = [
    ...memories,
    { id: crypto.randomUUID(), text: value }
  ]

  localStorage.setItem(MEMORY_KEY, JSON.stringify(updated))
  return updated
}

export function deleteMemory(id) {
  const updated = getMemory().filter(item => item.id !== id)
  localStorage.setItem(MEMORY_KEY, JSON.stringify(updated))
  return updated
}

export function clearMemory() {
  localStorage.removeItem(MEMORY_KEY)
}
