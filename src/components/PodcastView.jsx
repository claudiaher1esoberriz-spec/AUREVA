import { useState } from 'react'
import { Mic, Sparkles, BookOpen, Loader2, Play, Volume2 } from 'lucide-react'
import { askOnce } from '../services/openrouter'
import { searchResources } from '../services/library'

export default function PodcastView({ apiKey, modelId, resources = [] }) {
  const [topic, setTopic] = useState('')
  const [useNotes, setUseNotes] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [podcastData, setPodcastData] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const activeDocs = resources.filter((r) => r.active !== false)

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!topic.trim() && !(useNotes && activeDocs.length > 0)) {
      setError('Escribe un tema o activa tus apuntes en Recursos.')
      return
    }
    setLoading(true)
    setError('')
    setPodcastData(null)
    setIsPlaying(false)

    try {
      const query = topic.trim() || activeDocs.map((d) => d.title).join(' ')
      const excerpts = useNotes ? searchResources(query, resources, 8) : []
      const contextBlock = excerpts.length
        ? `\n\nBásate PRIORITARIAMENTE en estos apuntes de Claudia:\n${excerpts.map((c, i) => `[${i + 1}. ${c.title}]\n${c.text}`).join('\n\n')}`
        : ''

      const systemPrompt = `Eres AUREVA, un profesor experto y dinámico de Medicina locutando un podcast clínico de alto nivel para Claudia.
Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin \`\`\`json, sin texto extra) con la siguiente estructura:
{
  "title": "Título pegadizo y clínico del episodio",
  "duration": "aprox. 5 min",
  "hosts": ["Dr. Mateo (Cardiólogo)", "Claudia (Residente / Estudiante)"],
  "script": [
    {
      "speaker": "Dr. Mateo",
      "text": "Texto dialogado, dinámico y riguroso explicando la fisiopatología..."
    },
    {
      "speaker": "Claudia",
      "text": "Pregunta clínica clave o aportación..."
    }
  ]
}`

      const userPrompt = `Genera un guion de podcast médico conversacional, riguroso y entretenido sobre: "${topic.trim() || 'los temas principales de los apuntes adjuntos'}".${contextBlock}`

      const raw = await askOnce({ apiKey, modelId, systemPrompt, userPrompt })
      const cleaned = raw.replace(/```json|```/gi, '').trim()
      const start = cleaned.indexOf('{')
      const end = cleaned.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error('El modelo no devolvió un formato de podcast válido. Inténtalo de nuevo.')

      const parsed = JSON.parse(cleaned.slice(start, end + 1))
      if (!parsed || !parsed.script) throw new Error('Estructura de podcast incorrecta.')
      setPodcastData(parsed)
    } catch (err) {
      setError(err.message || 'Error generando el podcast.')
    } finally {
      setLoading(false)
    }
  }

  const handleSpeak = () => {
    if (!podcastData || !podcastData.script) return
    if ('speechSynthesis' in window) {
      if (isPlaying) {
        window.speechSynthesis.cancel()
        setIsPlaying(false)
        return
      }
      window.speechSynthesis.cancel()
      const fullText = podcastData.script.map((s) => `${s.speaker}: ${s.text}`).join('. ')
      const utterance = new SpeechSynthesisUtterance(fullText)
      utterance.lang = 'es-ES'
      utterance.rate = 1.05
      utterance.onend = () => setIsPlaying(false)
      utterance.onerror = () => setIsPlaying(false)
      window.speechSynthesis.speak(utterance)
      setIsPlaying(true)
    } else {
      alert('Tu navegador no soporta la síntesis de voz por audio.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6 pb-28 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center aureva-card">
          <Mic size={20} style={{ color: 'var(--text-gold)' }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>Podcast Médico · Audio & Guiones</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>Convierte tus apuntes y casos clínicos en episodios de audio conversacionales</p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="aureva-card rounded-3xl p-5 space-y-4">
        <div>
          <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--text-gold)' }}>
            Tema o caso clínico para el episodio
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ej: Cardiopatías congénitas, Fisiología respiratoria, Neurología vascular..."
            className="aureva-pill w-full rounded-2xl px-4 py-2.5 text-[14px] outline-none"
            style={{ color: 'var(--text-main)' }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => setUseNotes((v) => !v)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium cursor-pointer"
            style={{
              border: '1px solid var(--border-gold)',
              color: useNotes && activeDocs.length ? 'var(--text-gold)' : 'var(--text-soft)',
            }}
          >
            <BookOpen size={14} />
            <span>
              {activeDocs.length > 0
                ? `${useNotes ? 'Usando' : 'Ignorar'} apuntes (${activeDocs.length} activos)`
                : 'Sin apuntes activos'}
            </span>
          </button>

          <button
            type="submit"
            disabled={loading}
            className="aureva-gold-btn px-5 py-2.5 rounded-full text-[13.5px] font-medium inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>{loading ? 'Grabando episodio...' : 'Generar Podcast'}</span>
          </button>
        </div>

        {error && (
          <div className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-2.5">
            {error}
          </div>
        )}
      </form>

      {podcastData && (
        <div className="space-y-6">
          <div className="aureva-card rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ background: 'rgba(212, 175, 55, 0.05)' }}>
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[11.5px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full" style={{ color: 'var(--text-gold)', border: '1px solid var(--border-gold)' }}>
                {podcastData.duration} · {podcastData.hosts?.join(' y ')}
              </span>
              <h2 className="text-xl font-bold pt-1" style={{ color: 'var(--text-main)' }}>{podcastData.title}</h2>
            </div>
            <button
              type="button"
              onClick={handleSpeak}
              className="aureva-gold-btn px-6 py-3 rounded-full text-[14px] font-medium inline-flex items-center gap-2 cursor-pointer shrink-0"
            >
              {isPlaying ? <Volume2 size={18} className="animate-pulse" /> : <Play size={18} />}
              <span>{isPlaying ? 'Pausar audio' : 'Escuchar audio'}</span>
            </button>
          </div>

          <div className="aureva-card rounded-3xl p-6 space-y-4">
            <h3 className="text-[14px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-gold)' }}>Guion del episodio</h3>
            <div className="space-y-4 pt-1">
              {podcastData.script?.map((turn, tIdx) => (
                <div key={tIdx} className="space-y-1 bg-black/10 rounded-2xl p-4">
                  <div className="text-[13px] font-bold" style={{ color: 'var(--text-gold)' }}>{turn.speaker}</div>
                  <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-main)' }}>{turn.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
