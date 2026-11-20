import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

const DB_NAME = 'aureva_library_db'
const STORE = 'resources'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getAllResources() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result || []).sort((a, b) => b.createdAt - a.createdAt))
    req.onerror = () => reject(req.error)
  })
}

export async function saveResource(doc) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(doc)
    tx.oncomplete = () => resolve(doc)
    tx.onerror = () => reject(tx.error)
  })
}

export async function removeResource(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function extractTextFromFile(file) {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
    let full = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      full += content.items.map((it) => it.str).join(' ') + '\n\n'
    }
    return { text: full.trim(), pages: pdf.numPages }
  }
  const text = await file.text()
  return { text: text.trim(), pages: 1 }
}

export function chunkText(text, size = 1000) {
  const clean = text.replace(/\s+/g, ' ').trim()
  const chunks = []
  for (let i = 0; i < clean.length; i += size - 150) {
    chunks.push(clean.slice(i, i + size))
    if (i + size >= clean.length) break
  }
  return chunks
}

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function searchResources(query, resources, maxChunks = 6) {
  const active = resources.filter((r) => r.active !== false && r.chunks?.length)
  if (!active.length) return []
  const words = norm(query).split(/[^a-z0-9]+/).filter((w) => w.length > 2)
  const scored = []
  active.forEach((doc) => {
    doc.chunks.forEach((text, idx) => {
      const hay = norm(doc.title + ' ' + text)
      const score = words.reduce((acc, w) => acc + (hay.includes(w) ? 1 : 0), 0)
      scored.push({ title: doc.title, text, score, idx })
    })
  })
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx)
  return scored.slice(0, maxChunks)
}
