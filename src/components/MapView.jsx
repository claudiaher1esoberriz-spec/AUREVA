import { useState } from 'react'
import { GitCommit, Sparkles, BookOpen, Loader2, Network } from 'lucide-react'
import { askOnce } from '../services/openrouter'
import { searchResources } from '../services/library'

export default function MapView({ apiKey, modelId, resources = [] }) {
  const [topic, setTopic] = useState('')
  const [useNotes, setUseNotes] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mapData, setMapData] = useState(null)

  const activeDocs = resources.filter((r) => r.active !== false)

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!topic.trim() && !(useNotes && activeDocs.length > 0)) {
      setError('Escribe un tema o activa tus apuntes en Recursos.')
      return
    }
    setLoading(true)
    setError('')
    setMapData(null)

    try {
      const query = topic.trim() || activeDocs.map((d) => d.title).join(' ')
      const excerpts = useNotes ? searchResources(query, resources, 8) : []
      const contextBlock = excerpts.length
        ? `\n\nBásate PRIORITARIAMENTE en estos apuntes de Claudia:\n${excerpts.map((c, i) => `[${i + 1}. ${c.title}]\n${c.text}`).join('\n\n')}`
        : ''

      const systemPrompt = `Eres un profesor experto de Medicina diseñando mapas conceptuales estructurados para Claudia.
Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin \`\`\`json, sin texto extra) con la siguiente estructura:
{
  "title": "Título claro del mapa conceptual",
  "centralConcept": "Concepto o patología nuclear",
  "branches": [
    {
      "category": "Nombre de la categoría principal (ej: Etiología, Clínica, Diagnóstico, Tratamiento)",
      "items": [
        {
          "title": "Subconcepto clave",
          "details": ["Detalle fisiopatológico 1", "Detalle 2"]
        }
      ]
    }
  ]
}`

      const userPrompt = `Genera un mapa conceptual médico detallado y riguroso sobre: "${topic.trim() || 'los temas principales de los apuntes adjuntos'}".${contextBlock}`

      const raw = await askOnce({ apiKey, modelId, systemPrompt, userPrompt })
      const cleaned = raw.replace(/```json|```/gi, '').trim()
      const start = cleaned.indexOf('{')
      const end = cleaned.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error('El modelo no devolvió un formato de mapa válido. Inténtalo de nuevo.')

      const parsed = JSON.parse(cleaned.slice(start, end + 1))
      if (!parsed || !parsed.branches) throw new Error('Estructura de mapa incorrecta.')
      setMapData(parsed)
    } catch (err) {
      setError(err.message || 'Error generando el mapa conceptual.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6 pb-28 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center aureva-card">
          <Network size={20} style={{ color: 'var(--text-gold)' }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>Mapas Conceptuales · Fisiopatología</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>Estructura visual por categorías para relacionar conceptos clave y apuntes</p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="aureva-card rounded-3xl p-5 space-y-4">
        <div>
          <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--text-gold)' }}>
            Tema o patología para esquematizar
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ej: Shock séptico, Fisiología renal, Farmacología del SNA..."
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
            <span>{loading ? 'Construyendo mapa...' : 'Generar Mapa'}</span>
          </button>
        </div>

        {error && (
          <div className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-2.5">
            {error}
          </div>
        )}
      </form>

      {mapData && (
        <div className="space-y-6">
          <div className="aureva-card rounded-3xl p-6 text-center space-y-2" style={{ background: 'rgba(212, 175, 55, 0.05)' }}>
            <span className="text-[12px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full" style={{ color: 'var(--text-gold)', border: '1px solid var(--border-gold)' }}>
              Esquema central
            </span>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>{mapData.title}</h2>
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-gold)' }}>Núcleo: {mapData.centralConcept}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mapData.branches?.map((branch, bIdx) => (
              <div key={bIdx} className="aureva-card rounded-3xl p-5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--border-gold)' }}>
                  <GitCommit size={17} style={{ color: 'var(--text-gold)' }} />
                  <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-main)' }}>{branch.category}</h3>
                </div>

                <div className="space-y-3 pt-1">
                  {branch.items?.map((item, iIdx) => (
                    <div key={iIdx} className="space-y-1 bg-black/10 rounded-2xl p-3">
                      <div className="text-[13.5px] font-semibold" style={{ color: 'var(--text-main)' }}>• {item.title}</div>
                      {item.details?.map((det, dIdx) => (
                        <div key={dIdx} className="text-[12.5px] pl-3" style={{ color: 'var(--text-soft)' }}>
                          - {det}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
