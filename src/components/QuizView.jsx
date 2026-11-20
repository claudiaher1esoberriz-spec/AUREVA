import { useState } from 'react'
import { GraduationCap, Sparkles, CheckCircle2, XCircle, RotateCcw, BookOpen, Loader2, ArrowRight } from 'lucide-react'
import { askOnce } from '../services/openrouter'
import { searchResources } from '../services/library'

export default function QuizView({ apiKey, modelId, resources = [] }) {
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(5)
  const [useNotes, setUseNotes] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [finished, setFinished] = useState(false)

  const activeDocs = resources.filter((r) => r.active !== false)

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!topic.trim() && !(useNotes && activeDocs.length > 0)) {
      setError('Escribe un tema médico o activa tus apuntes en Recursos.')
      return
    }
    setLoading(true)
    setError('')
    setQuestions([])
    setAnswers({})
    setFinished(false)

    try {
      const query = topic.trim() || activeDocs.map((d) => d.title).join(' ')
      const excerpts = useNotes ? searchResources(query, resources, 8) : []
      const contextBlock = excerpts.length
        ? `\n\nBásate PRIORITARIAMENTE en estos apuntes de Claudia:\n${excerpts.map((c, i) => `[${i + 1}. ${c.title}]\n${c.text}`).join('\n\n')}`
        : ''

      const systemPrompt = `Eres un profesor experto de Medicina preparando preguntas tipo examen MIR para Claudia.
Responde ÚNICAMENTE con un array JSON válido (sin markdown, sin \`\`\`json, sin texto extra) con exactamente ${count} preguntas.
Formato estricto de cada objeto:
{
  "question": "Enunciado clínico o conceptual claro",
  "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
  "correctIndex": 0,
  "explanation": "Explicación fisiopatológica rigurosa de por qué esa opción es la correcta y por qué fallan las demás.",
  "source": "Nombre del apunte si procede o 'Conocimiento médico MIR'"
}`

      const userPrompt = `Genera ${count} preguntas tipo test MIR (4 opciones, 1 correcta) sobre: "${topic.trim() || 'los temas principales de los apuntes adjuntos'}".${contextBlock}`

      const raw = await askOnce({ apiKey, modelId, systemPrompt, userPrompt })
      const cleaned = raw.replace(/```json|```/gi, '').trim()
      const start = cleaned.indexOf('[')
      const end = cleaned.lastIndexOf(']')
      if (start === -1 || end === -1) throw new Error('El modelo no devolvió un formato de test válido. Inténtalo de nuevo.')

      const parsed = JSON.parse(cleaned.slice(start, end + 1))
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('No se generaron preguntas.')
      setQuestions(parsed)
    } catch (err) {
      setError(err.message || 'Error generando el test.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (qIdx, optIdx) => {
    if (answers[qIdx] !== undefined) return
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
  }

  const answeredCount = Object.keys(answers).length
  const correctCount = questions.reduce((acc, q, idx) => acc + (answers[idx] === q.correctIndex ? 1 : 0), 0)
  const scoreOver10 = questions.length ? ((correctCount / questions.length) * 10).toFixed(1) : '0.0'

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6 pb-28 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center aureva-card">
          <GraduationCap size={20} style={{ color: 'var(--text-gold)' }} />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>Simulador Tipo Test · Estilo MIR</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>Practica casos clínicos y conceptos con corrección fisiopatológica al instante</p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="aureva-card rounded-3xl p-5 space-y-4">
        <div>
          <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--text-gold)' }}>
            Tema, asignatura o caso clínico
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ej: Insuficiencia cardíaca, antibióticos betalactámicos, glomerulonefritis..."
            className="aureva-pill w-full rounded-2xl px-4 py-2.5 text-[14px] outline-none"
            style={{ color: 'var(--text-main)' }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px]" style={{ color: 'var(--text-soft)' }}>Preguntas:</span>
            {[3, 5, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className="px-3 py-1 rounded-full text-[12.5px] font-medium cursor-pointer transition"
                style={{
                  background: count === n ? 'var(--text-gold)' : 'transparent',
                  color: count === n ? '#12100e' : 'var(--text-soft)',
                  border: '1px solid var(--border-gold)',
                }}
              >
                {n}
              </button>
            ))}
          </div>

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
        </div>

        {error && (
          <div className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-2.5">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="aureva-gold-btn px-5 py-2.5 rounded-full text-[13.5px] font-medium inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>{loading ? 'Redactando examen...' : 'Generar Test'}</span>
          </button>
        </div>
      </form>

      {questions.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between px-1 text-[13px]" style={{ color: 'var(--text-soft)' }}>
            <span>Respondidas: <strong style={{ color: 'var(--text-main)' }}>{answeredCount}/{questions.length}</strong></span>
            <span>Aciertos: <strong style={{ color: 'var(--text-gold)' }}>{correctCount}</strong></span>
          </div>

          {questions.map((q, qIdx) => {
            const chosen = answers[qIdx]
            const isAnswered = chosen !== undefined

            return (
              <div key={qIdx} className="aureva-card rounded-3xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[12px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full" style={{ color: 'var(--text-gold)', border: '1px solid var(--border-gold)' }}>
                    Pregunta {qIdx + 1}
                  </span>
                  {q.source && (
                    <span className="text-[11.5px] truncate max-w-[220px]" style={{ color: 'var(--text-soft)' }}>
                      {q.source}
                    </span>
                  )}
                </div>

                <p className="text-[15px] font-medium leading-relaxed" style={{ color: 'var(--text-main)' }}>
                  {q.question}
                </p>

                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const letter = ['A', 'B', 'C', 'D'][optIdx] || String(optIdx + 1)
                    const isCorrect = optIdx === q.correctIndex
                    const isSelected = chosen === optIdx

                    let borderColor = 'var(--border-gold)'
                    let bg = 'transparent'
                    if (isAnswered) {
                      if (isCorrect) {
                        borderColor = '#22c55e'
                        bg = 'rgba(34, 197, 94, 0.12)'
                      } else if (isSelected) {
                        borderColor = '#ef4444'
                        bg = 'rgba(239, 68, 68, 0.12)'
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => handleSelect(qIdx, optIdx)}
                        className="w-full text-left rounded-2xl px-4 py-3 text-[14px] flex items-center justify-between gap-3 transition cursor-pointer disabled:cursor-default"
                        style={{ border: `1px solid ${borderColor}`, background: bg, color: 'var(--text-main)' }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-semibold shrink-0" style={{ color: 'var(--text-gold)' }}>{letter}.</span>
                          <span>{opt}</span>
                        </div>
                        {isAnswered && isCorrect && <CheckCircle2 size={18} className="text-green-400 shrink-0" />}
                        {isAnswered && isSelected && !isCorrect && <XCircle size={18} className="text-red-400 shrink-0" />}
                      </button>
                    )
                  })}
                </div>

                {isAnswered && (
                  <div className="rounded-2xl p-4 text-[13.5px] leading-relaxed space-y-1" style={{ background: 'rgba(212, 175, 55, 0.07)', border: '1px solid var(--border-gold)' }}>
                    <div className="font-semibold" style={{ color: chosen === q.correctIndex ? '#4ade80' : '#f87171' }}>
                      {chosen === q.correctIndex ? '¡Correcto!' : `Incorrecto · La correcta es la ${['A', 'B', 'C', 'D'][q.correctIndex]}`}
                    </div>
                    <p style={{ color: 'var(--text-main)' }}>{q.explanation}</p>
                  </div>
                )}
              </div>
            )
          })}

          {answeredCount === questions.length && !finished && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setFinished(true)}
                className="aureva-gold-btn px-6 py-2.5 rounded-full text-[14px] font-medium inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Ver resultado final</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {finished && (
            <div className="aureva-card rounded-3xl p-6 text-center space-y-3">
              <div className="text-[12.5px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-gold)' }}>
                Resultado del simulacro
              </div>
              <div className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
                {scoreOver10} <span className="text-base font-normal" style={{ color: 'var(--text-soft)' }}>/ 10</span>
              </div>
              <p className="text-[13.5px]" style={{ color: 'var(--text-soft)' }}>
                Has acertado <strong style={{ color: 'var(--text-main)' }}>{correctCount} de {questions.length}</strong> preguntas.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="aureva-pill px-5 py-2 rounded-full text-[13px] font-medium inline-flex items-center gap-2 cursor-pointer"
                  style={{ color: 'var(--text-gold)' }}
                >
                  <RotateCcw size={14} />
                  <span>Generar otro test</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
