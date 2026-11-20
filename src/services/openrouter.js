import { getMemory } from './memory'
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const FALLBACK_FREE = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'baidu/ernie-5.5-flash-preview:free',
  'nvidia/nemotron-3.5-lightning:free',
  'openrouter/free',
]

const VISION_FREE = [
  'nvidia/nemotron-3.5-super-vl:free',
  'inclusionai/ling-3.2-flash:free',
  'google/gemma-4-31b-it:free',
]

const BASE_PROMPT = `Eres AUREVA, la asistente personal y académica de Medicina de Claudia.
Eres brillante, clara, cercana y elegante (como Claude): explicas el porqué fisiopatológico en Medicina con rigor, y ayudas con naturalidad en cualquier tema personal. Usa formato limpio con títulos cortos, listas y negritas.`

const getCandidates = (modelId, hasImages) =>
  [...new Set((hasImages ? VISION_FREE : [modelId, ...FALLBACK_FREE]).filter((m) => m?.endsWith(':free') || m === 'openrouter/free'))]

export async function streamChat({ apiKey, modelId, messages, contextExcerpts = [], hasImages = false, onToken }) {
  if (!apiKey?.trim()) throw new Error('Falta tu API Key de OpenRouter. Añádela en Ajustes.')
  let systemContent = BASE_PROMPT

  const memories = getMemory()

  if (memories.length > 0) {
    const memoryText = memories
      .map(item => '- ' + item.text)
      .join('\n')

    systemContent += '\n\nMEMORIA PERSONAL DE CLAUDIA:\n' +
      memoryText +
      '\n\nUtiliza estas preferencias cuando sean relevantes. No las menciones innecesariamente.'
  }
  if (contextExcerpts.length > 0) {
    const snippets = contextExcerpts.map((c, i) => `[Fuente ${i + 1}: ${c.title}]\n${c.text}`).join('\n\n')
    systemContent += `\n\nUsa PRIORITARIAMENTE estos apuntes de Claudia para responder y cita de qué archivo sale cada dato:\n\n${snippets}`
  }

  let lastError = 'No se pudo conectar con OpenRouter.'
  for (const model of getCandidates(modelId, hasImages)) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.origin, 'X-Title': 'AUREVA' },
      body: JSON.stringify({ model, stream: true, messages: [{ role: 'system', content: systemContent }, ...messages] }),
    })
    if (res.status === 401) throw new Error('Tu API Key no es válida. Revísala en Ajustes.')
    if (!res.ok) { lastError = `Modelo ${model} ocupado (${res.status})`; continue }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let text = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return { text, modelUsed: model }
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content || ''
          if (delta) { text += delta; onToken(text, model) }
        } catch {}
      }
    }
    return { text, modelUsed: model }
  }
  throw new Error(lastError)
}

export async function askOnce({ apiKey, modelId, systemPrompt, userPrompt }) {
  if (!apiKey?.trim()) throw new Error('Falta tu API Key de OpenRouter. Añádela en Ajustes.')
  let lastError = 'No se pudo generar la respuesta.'
  for (const model of getCandidates(modelId, false)) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.origin, 'X-Title': 'AUREVA' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }),
    })
    if (res.status === 401) throw new Error('Tu API Key no es válida. Revísala en Ajustes.')
    if (!res.ok) { lastError = `Modelo ocupado (${res.status})`; continue }
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (content) return content
  }
  throw new Error(lastError)
}
