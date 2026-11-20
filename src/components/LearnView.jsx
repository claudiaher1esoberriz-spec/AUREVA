import { privateStorage } from '../lib/privateStorage.js'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { BookOpen, Sparkles, Loader2, Copy } from 'lucide-react'
import { askOnce } from '../services/openrouter'
import { searchResources } from '../services/library'
import { processStudyDocuments } from '../services/studyProcessor'
import { synthesizeStudyNotes } from '../services/studySynthesis'

const MODES = [
  { id: 'resumen', label: 'Resumir apuntes' },
  { id: 'facil', label: 'Explicar fácil' },
  { id: 'profundo', label: 'Explicar en profundidad' },
  { id: 'esquema', label: 'Crear esquema' },
  { id: 'claves', label: 'Conceptos clave del examen' },
  { id: 'preguntas', label: 'Preguntas y respuestas' }
]

const INSTRUCTIONS = {
  resumen: 'Haz un resumen estructurado, claro y fiel al contenido proporcionado.',
  facil: 'Explica el contenido paso a paso con lenguaje sencillo y ejemplos solo si están sustentados por el material.',
  profundo: 'Explica con profundidad, conservando los términos técnicos y las relaciones entre conceptos.',
  esquema: 'Crea un esquema jerárquico con títulos, apartados y subapartados.',
  claves: 'Extrae los conceptos más importantes para estudiar, sin afirmar que conoces el examen real.',
  preguntas: 'Crea preguntas de repaso con sus respuestas basándote únicamente en el material.'
}

export default function LearnView({ apiKey, modelId, resources = [] }) {
  const docs = resources.filter(
    doc => doc.active !== false && doc.chunks?.length
  )

  const [docIds, setDocIds] = useState([])
  const [mode, setMode] = useState('resumen')
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [analysisType, setAnalysisType] = useState('rapido')
  const [progress, setProgress] = useState(null)

  const [savedMaterials, setSavedMaterials] = useState(() => {
    try {
      const data = JSON.parse(
        privateStorage.getItem('aureva_study_materials') || '[]'
      )
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  })

  function saveMaterial() {
    if (!result.trim()) return

    const item = {
      id: crypto.randomUUID(),
      title: `${MODES.find(m => m.id === mode)?.label || 'Material'} — ${selectedDocs.map(doc => doc.title).join(', ') || 'Apuntes'}`,
      content: result,
      date: new Date().toISOString()
    }

    const updated = [item, ...savedMaterials]
    try {
      privateStorage.setItem(
        'aureva_study_materials',
        JSON.stringify(updated)
      )
      setSavedMaterials(updated)
      setNotice('Material guardado correctamente.')
    } catch {
      setError('No se pudo guardar. Comprueba el espacio disponible.')
    }
  }

  function deleteMaterial(id) {
    const updated = savedMaterials.filter(item => item.id !== id)

    try {
      privateStorage.setItem(
        'aureva_study_materials',
        JSON.stringify(updated)
      )
      setSavedMaterials(updated)
    } catch {
      setError('No se pudo eliminar el material.')
    }
  }

  const selectedDocs = docs.filter(doc => docIds.includes(doc.id))

  function toggleDocument(id) {
    setDocIds(previous =>
      previous.includes(id)
        ? previous.filter(item => item !== id)
        : [...previous, id]
    )
  }

  async function generate(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (analysisType === 'completo') {
      await generateComplete()
      return
    }
    setProgress(null)
    setResult('')

    if (!selectedDocs.length) {
      setError('Selecciona al menos un documento activo.')
      return
    }

    if (!apiKey) {
      setError('Configura primero tu clave de OpenRouter en Ajustes.')
      return
    }

    const allChunks = selectedDocs.flatMap(doc =>
      (doc.chunks || []).map(text => ({
        title: doc.title,
        text
      }))
    )
    let excerpts = []

    if (topic.trim()) {
      excerpts = searchResources(topic.trim(), selectedDocs, 12)
      const terms = topic.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .split(/[^a-z0-9]+/)
        .filter(word => word.length > 2)

      excerpts = excerpts.filter(item => {
        const normalized = item.text.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        return terms.some(word => normalized.includes(word))
      })

      if (!excerpts.length) {
        setError('No he encontrado ese tema en el texto extraído del documento.')
        return
      }
    } else {
      const indexes = new Set()
      const total = allChunks.length
      const count = Math.min(12, total)

      for (let i = 0; i < count; i++) {
        indexes.add(
          count === 1 ? 0 : Math.round(i * (total - 1) / (count - 1))
        )
      }

      excerpts = [...indexes].map(index => allChunks[index])
    }

    const MAX_CHARS = 14000
    let remaining = MAX_CHARS
    const context = excerpts.map(item => {
      if (remaining <= 0) return ''
      const source = `[Documento: ${item.title}]\n`
      if (remaining <= source.length) return ''
      const text = item.text.slice(0, remaining - source.length)
      remaining -= source.length + text.length
      return source + text
    }).filter(Boolean).join('\n\n---\n\n')

    const partial = allChunks.length > excerpts.length ||
      excerpts.reduce((sum, item) => sum + item.text.length, 0) > MAX_CHARS

    setLoading(true)

    try {
      const response = await askOnce({
        apiKey,
        modelId,
        systemPrompt: `Eres el tutor de estudio de AUREVA.
Trabaja exclusivamente con los fragmentos del documento proporcionados.
No inventes información ni completes lagunas con conocimientos externos.
Si algo no aparece en el material, indícalo.
Conserva los conceptos y la terminología de los apuntes.
No afirmes haber leído páginas que no se han proporcionado.
Responde en español y utiliza Markdown.`,
        userPrompt: `DOCUMENTOS: ${selectedDocs.map(doc => doc.title).join(', ')}

TAREA: ${INSTRUCTIONS[mode]}

TEMA ESPECÍFICO: ${topic.trim() || 'Contenido general'}

IMPORTANTE: ${partial
  ? 'Se proporcionan fragmentos seleccionados, no el documento completo.'
  : 'Se proporciona el texto disponible del documento.'}

FRAGMENTOS:
${context}`
      })

      setResult(response)
      if (partial) {
        setNotice(
          'Resultado basado en fragmentos seleccionados. No equivale a analizar el PDF completo.'
        )
      }
    } catch (err) {
      setError(err.message || 'No se pudo generar el contenido.')
    } finally {
      setLoading(false)
    }
  }

  async function generateComplete() {
    if (!selectedDocs.length) {
      setError('Selecciona al menos un documento.')
      return
    }

    if (!apiKey) {
      setError('Configura tu clave de OpenRouter.')
      return
    }

    setLoading(true)
    setResult('')

    try {
      const data = await processStudyDocuments({
        documents: selectedDocs,
        mode,
        topic: topic.trim(),
        apiKey,
        modelId,
        maxNewBlocks: 5,
        onProgress: setProgress
      })

      if (!data.finished) {
        setNotice(
          `Procesados ${data.completed} de ${data.totalBlocks} bloques. ` +
          'Pulsa Continuar análisis para seguir.'
        )
        return
      }

      const synthesis = await synthesizeStudyNotes({
        notes: data.notes,
        mode,
        topic: topic.trim(),
        instruction: INSTRUCTIONS[mode],
        apiKey,
        modelId,
        maxRequests: 5,
        onProgress: value => {
          setNotice(
            `Síntesis: etapa ${value.round}, ` +
            `${value.completed} de ${value.total} grupos.`
          )
        }
      })

      if (!synthesis.finished) {
        setNotice(
          'Síntesis en curso. Pulsa Continuar análisis para seguir ' +
          'sin repetir los bloques ya procesados.'
        )
        return
      }

      setResult(synthesis.result)
      setNotice(
        'Síntesis finalizada a partir de las notas procesadas.'
      )
    } catch (err) {
      setError(err.message || 'No se pudo completar el análisis.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6 pb-28 space-y-6">
      <header className="flex items-center gap-3">
        <BookOpen size={28} style={{ color: 'var(--text-gold)' }} />
        <div>
          <h1 className="text-2xl font-semibold"
            style={{ color: 'var(--text-main)' }}>
            APRENDER
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
            Aprende y repasa utilizando tus propios apuntes.
          </p>
        </div>
      </header>

      <form onSubmit={generate}
        className="aureva-card rounded-3xl p-5 space-y-5">

        <div className="space-y-2">
          <label className="text-sm font-medium"
            style={{ color: 'var(--text-gold)' }}>
            Tipo de análisis
          </label>

          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2">
              <input type="radio"
                checked={analysisType === 'rapido'}
                onChange={() => setAnalysisType('rapido')} />
              Rápido
            </label>
            <label className="flex items-center gap-2">
              <input type="radio"
                checked={analysisType === 'completo'}
                onChange={() => setAnalysisType('completo')} />
              Completo por bloques
            </label>
          </div>

          <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
            El análisis completo procesa hasta cinco bloques nuevos por ejecución.
            Puedes continuar después.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium"
            style={{ color: 'var(--text-gold)' }}>
            Selecciona tus apuntes
          </label>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {docs.map(doc => (
              <label
                key={doc.id}
                className="aureva-pill flex items-center gap-3 rounded-xl p-3 cursor-pointer"
                style={{ color: 'var(--text-main)' }}
              >
                <input
                  type="checkbox"
                  checked={docIds.includes(doc.id)}
                  onChange={() => toggleDocument(doc.id)}
                />
                <span className="text-sm">{doc.title}</span>
              </label>
            ))}
          </div>

          <p className="text-xs" style={{ color: 'var(--text-soft)' }}>
            {selectedDocs.length} documento(s) seleccionado(s).
            Solo se utilizarán los documentos marcados.
          </p>

          {!docs.length && (
            <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
              Primero sube y activa tus apuntes en Recursos.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium"
            style={{ color: 'var(--text-gold)' }}>
            ¿Qué quieres hacer?
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODES.map(item => (
              <button key={item.id} type="button"
                onClick={() => setMode(item.id)}
                className="rounded-xl p-3 text-left text-sm cursor-pointer"
                style={{
                  border: '1px solid var(--border-gold)',
                  color: mode === item.id
                    ? 'var(--text-gold)'
                    : 'var(--text-main)',
                  background: mode === item.id
                    ? 'rgba(212,175,55,0.10)'
                    : 'transparent'
                }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium"
            style={{ color: 'var(--text-gold)' }}>
            Tema específico (opcional)
          </label>

          <input value={topic}
            onChange={event => setTopic(event.target.value)}
            placeholder="Ej.: membrana plasmática, mitosis..."
            className="aureva-pill w-full rounded-xl p-3 outline-none"
            style={{ color: 'var(--text-main)' }} />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-400">{error}</p>
        )}

        {progress && analysisType === 'completo' && (
          <div className="space-y-2">
            <p className="text-sm" style={{ color: 'var(--text-main)' }}>
              Bloques procesados: {progress.completed} / {progress.total}
            </p>
            <progress
              className="w-full"
              max={progress.total || 1}
              value={progress.completed}
            />
          </div>
        )}

        {notice && !result && (
          <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
            {notice}
          </p>
        )}

        <button type="submit"
          disabled={loading || !selectedDocs.length}
          className="aureva-gold-btn rounded-full px-5 py-3 flex items-center gap-2 disabled:opacity-50">
          {loading
            ? <Loader2 size={18} className="animate-spin" />
            : <Sparkles size={18} />}
          {loading
              ? 'Procesando...'
              : analysisType === 'completo' && progress?.completed < progress?.total
                ? 'Continuar análisis'
                : 'Generar'}
        </button>
      </form>

      {result && (
        <section className="aureva-card rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold"
              style={{ color: 'var(--text-main)' }}>
              Tu material de estudio
            </h2>

            <button type="button"
              onClick={() => navigator.clipboard.writeText(result)}
              className="flex items-center gap-2 text-sm"
              style={{ color: 'var(--text-gold)' }}>
              <Copy size={16} /> Copiar
            </button>
          </div>

          {notice && (
            <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
              {notice}
            </p>
          )}

          <div className="prose max-w-none"
            style={{ color: 'var(--text-main)' }}>
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>

          <button
            type="button"
            onClick={saveMaterial}
            className="aureva-gold-btn rounded-full px-5 py-3"
          >
            Guardar en Mis materiales
          </button>
        </section>
      )}

      <section className="aureva-card rounded-3xl p-5 space-y-4">
        <h2
          className="text-xl font-semibold"
          style={{ color: 'var(--text-main)' }}
        >
          Mis materiales de estudio
        </h2>

        {!savedMaterials.length && (
          <p
            className="text-sm"
            style={{ color: 'var(--text-soft)' }}
          >
            Todavía no has guardado ningún material.
          </p>
        )}

        {savedMaterials.map(item => (
          <article
            key={item.id}
            className="aureva-pill rounded-2xl p-4 space-y-3"
          >
            <h3
              className="font-medium"
              style={{ color: 'var(--text-main)' }}
            >
              {item.title}
            </h3>

            <p
              className="text-xs"
              style={{ color: 'var(--text-soft)' }}
            >
              {new Date(item.date).toLocaleString('es-ES')}
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setResult(item.content)
                  setNotice('Material guardado abierto.')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                style={{ color: 'var(--text-gold)' }}
              >
                Abrir
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Eliminar este material?')) {
                    deleteMaterial(item.id)
                  }
                }}
                className="text-red-400"
              >
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
