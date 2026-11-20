const MODELS = {
  fast: 'nvidia/nemotron-3.5-lightning:free',
  study: 'google/gemma-4-26b-a4b-it:free',
  reasoning: 'google/gemma-4-31b-it:free',
  code: 'particle/particle-1:free',
  vision: 'nvidia/nemotron-3.5-super-vl:free',
}

const RULES = [
  {
    type: 'code',
    model: MODELS.code,
    pattern: /\b(javascript|typescript|python|react|vite|html|css|programar|código|depurar|debug|npm|terminal)\b/i,
  },
  {
    type: 'reasoning',
    model: MODELS.reasoning,
    pattern: /\b(ecuación|integral|derivada|demostración|matemáticas|álgebra|razonamiento|lógica|calcula)\b/i,
  },
  {
    type: 'study',
    model: MODELS.study,
    pattern: /\b(examen|apuntes|estudiar|biología|medicina|química|física|historia|filosofía|mitosis|resumen|explícame)\b/i,
  },
]

export function chooseSmartModel(message, hasImages = false, history = []) {
  if (hasImages) return MODELS.vision

  const current = String(message || '')

  // Primero analiza la pregunta actual.
  for (const rule of RULES) {
    if (rule.pattern.test(current)) {
      return rule.model
    }
  }

  // Si parece una continuación, consulta el contexto reciente.
  const isFollowUp =
    /^(y |pero |entonces |por qué|cómo |cuál |qué pasa|continúa|sigue|otra vez|no entiendo)/i
      .test(current.trim())

  if (isFollowUp) {
    const previous = history
      .filter(item => item.role === 'user')
      .slice(-3)
      .map(item =>
        typeof item.content === 'string' ? item.content : ''
      )
      .join(' ')

    for (const rule of RULES) {
      if (rule.pattern.test(previous)) {
        return rule.model
      }
    }
  }

  return MODELS.fast
}


export function getModelName(modelId) {
  const names = {
    'nvidia/nemotron-3.5-lightning:free': 'Nemotron Lightning',
    'google/gemma-4-26b-a4b-it:free': 'Gemma 4 26B',
    'google/gemma-4-31b-it:free': 'Gemma 4 31B',
    'particle/particle-1:free': 'Particle-1',
    'nvidia/nemotron-3.5-super-vl:free': 'Nemotron 3.5 Super VL',
  }

  return names[modelId] || modelId
}
