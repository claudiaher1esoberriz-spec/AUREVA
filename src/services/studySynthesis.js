import { privateStorage } from '../lib/privateStorage.js'
import { askOnce } from './openrouter'

const MAX_INPUT = 12000
const MAX_REQUESTS = 5
const PREFIX = 'aureva_study_synthesis_v1_'

function hashText(text) {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

function load(key) {
  try {
    return JSON.parse(privateStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

function save(key, value) {
  try {
    privateStorage.setItem(key, JSON.stringify(value))
  } catch {
    throw new Error(
      'No hay espacio para guardar la síntesis. ' +
      'El progreso anterior permanece disponible.'
    )
  }
}

function splitText(text, maxLength = MAX_INPUT) {
  const parts = []
  for (let i = 0; i < text.length; i += maxLength) {
    parts.push(text.slice(i, i + maxLength))
  }
  return parts
}

function groupNotes(notes) {
  const pieces = []

  for (const note of notes) {
    const text = `[Documento: ${note.document}]\n${note.content}`
    pieces.push(...splitText(text))
  }

  const groups = []
  let current = ''

  for (const piece of pieces) {
    if (current && current.length + piece.length + 2 > MAX_INPUT) {
      groups.push(current)
      current = ''
    }
    current += (current ? '\n\n' : '') + piece
  }

  if (current) groups.push(current)
  return groups
}

export async function synthesizeStudyNotes({
  notes,
  mode,
  topic,
  instruction,
  apiKey,
  modelId,
  onProgress,
  maxRequests = MAX_REQUESTS
}) {
  if (!notes?.length) {
    throw new Error('No hay notas para sintetizar.')
  }

  const identity = JSON.stringify({ notes, mode, topic, instruction })
  const key = PREFIX + hashText(identity)

  let state = load(key)

  if (!state || !Array.isArray(state.items)) {
    state = {
      items: groupNotes(notes),
      nextItems: [],
      index: 0,
      round: 0,
      finished: false,
      result: ''
    }
    save(key, state)
  }

  let requests = 0

  while (!state.finished && requests < maxRequests) {
    if (state.items.length === 1 && state.index === 0) {
      const response = await askOnce({
        apiKey,
        modelId,
        systemPrompt: `Eres el tutor académico de AUREVA.
Utiliza únicamente la información proporcionada.
No inventes datos.
Respeta la terminología de los apuntes.
Responde en español y Markdown.`,
        userPrompt: `TAREA: ${instruction}
TEMA: ${topic || 'Contenido general'}

NOTAS DE ESTUDIO:
${state.items[0]}`
      })

      if (!String(response || '').trim()) {
        throw new Error('El modelo ha devuelto una respuesta vacía.')
      }

      state.result = String(response)
      state.finished = true
      save(key, state)
      requests++
      break
    }

    if (state.index >= state.items.length) {
      state.items = groupNotes(
        state.nextItems.map(content => ({
          document: 'Síntesis intermedia',
          content
        }))
      )
      state.nextItems = []
      state.index = 0
      state.round++
      save(key, state)
      continue
    }

    const current = state.items[state.index]

    const response = await askOnce({
      apiKey,
      modelId,
      systemPrompt: `Eres el sintetizador académico de AUREVA.
Resume únicamente la información recibida.
Conserva definiciones, relaciones, clasificaciones y datos relevantes.
No inventes contenido.
No afirmes que has leído otros fragmentos.
Responde en español y Markdown.`,
      userPrompt: `TEMA: ${topic || 'Contenido general'}

Resume estas notas conservando el máximo detalle útil para estudiar:

${current}`
    })

    if (!String(response || '').trim()) {
      throw new Error('El modelo ha devuelto una respuesta vacía.')
    }

    state.nextItems.push(String(response))
    state.index++
    requests++
    save(key, state)

    onProgress?.({
      round: state.round + 1,
      completed: state.index,
      total: state.items.length
    })
  }

  return {
    finished: state.finished,
    result: state.result,
    round: state.round + 1,
    completed: state.index,
    total: state.items.length,
    progressKey: key
  }
}
