import { privateStorage } from '../lib/privateStorage.js'
import { askOnce } from './openrouter'

const BLOCK_SIZE = 6500
const STORAGE_PREFIX = 'aureva_study_progress_v1_'

function makeBlocks(documents) {
  const blocks = []

  for (const doc of documents) {
    const chunks = doc.chunks || []

    for (let index = 0; index < chunks.length; index++) {
      const text = String(chunks[index] || '')

      for (let offset = 0; offset < text.length; offset += BLOCK_SIZE) {
        blocks.push({
          documentId: doc.id,
          documentTitle: doc.title,
          chunkIndex: index,
          text: text.slice(offset, offset + BLOCK_SIZE)
        })
      }
    }
  }

  return blocks
}

function getStorageKey(documents, mode, topic) {
  const identity = JSON.stringify({
    documents: documents.map(doc => ({
      id: doc.id,
      chunks: doc.chunks
    })),
    mode,
    topic
  })

  let hash = 2166136261

  for (let i = 0; i < identity.length; i++) {
    hash ^= identity.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return STORAGE_PREFIX + (hash >>> 0).toString(16)
}

function readProgress(key) {
  try {
    const data = JSON.parse(privateStorage.getItem(key) || 'null')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function writeProgress(key, progress) {
  try {
    privateStorage.setItem(key, JSON.stringify(progress))
    return true
  } catch {
    return false
  }
}

export async function processStudyDocuments({
  documents,
  mode,
  topic = '',
  apiKey,
  modelId,
  onProgress,
  maxNewBlocks = 5
}) {
  if (!documents?.length) {
    throw new Error('Selecciona al menos un documento.')
  }

  const blocks = makeBlocks(documents)

  if (!blocks.length) {
    throw new Error('Los documentos no contienen texto procesable.')
  }

  const key = getStorageKey(documents, mode, topic)
  const previous = readProgress(key)

  const notes = previous.length <= blocks.length
    ? previous.slice()
    : []

  const stopAt = Math.min(blocks.length, notes.length + maxNewBlocks)

  for (let index = notes.length; index < stopAt; index++) {
    const block = blocks[index]

    onProgress?.({
      completed: index,
      total: blocks.length,
      document: block.documentTitle
    })

    const response = await askOnce({
      apiKey,
      modelId,
      systemPrompt: `Eres el motor de lectura académica de AUREVA.
Analiza únicamente el texto recibido.
Extrae los conceptos, definiciones, relaciones y datos importantes.
No inventes información.
Conserva la terminología original.
No elimines detalles importantes para estudiar.
Responde en español y Markdown.`,
      userPrompt: `DOCUMENTO: ${block.documentTitle}
FRAGMENTO: ${index + 1} de ${blocks.length}
TEMA: ${topic || 'Contenido general'}
TIPO DE MATERIAL FINAL: ${mode}

TEXTO:
${block.text}

Genera notas de estudio fieles a este fragmento.`
    })

    notes.push({
      document: block.documentTitle,
      content: String(response || '')
    })

    if (!writeProgress(key, notes)) {
      throw new Error(
        'No hay espacio para guardar el progreso. ' +
        'No se realizarán más peticiones hasta resolverlo.'
      )
    }

    onProgress?.({
      completed: notes.length,
      total: blocks.length,
      document: block.documentTitle
    })
  }

  return {
    notes,
    completed: notes.length,
    totalBlocks: blocks.length,
    finished: notes.length === blocks.length,
    progressKey: key
  }
}

export function clearStudyProgress(progressKey) {
  if (progressKey) {
    privateStorage.removeItem(progressKey)
  }
}
