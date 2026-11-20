import { useState } from 'react'
import { searchResources } from '../services/library'
import {
	BookOpen,
	ChevronLeft,
	ChevronRight,
	Loader2,
	RotateCcw,
	Sparkles,
} from 'lucide-react'

export default function FlashcardsView({ apiKey, modelId, activeDocs = [], askOnce }) {
	const [topic, setTopic] = useState('')
	const [count, setCount] = useState(10)
	const [useNotes, setUseNotes] = useState(true)
	const [cards, setCards] = useState([])
	const [index, setIndex] = useState(0)
	const [flipped, setFlipped] = useState(false)
	const [known, setKnown] = useState({})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	async function generateCards(event) {
		event.preventDefault()
		setError('')
		setLoading(true)

		const excerpts = useNotes
      ? (topic.trim()
          ? searchResources(topic.trim(), activeDocs, 12)
          : activeDocs.flatMap(doc =>
              (doc.chunks || []).map(text => ({
                title: doc.title,
                text
              }))
            ).slice(0, 12))
      : []

    const notesText = excerpts
      .map(item => `[${item.title}]\\n${item.text}`)
      .join('\\n\\n')

    const notes = notesText
      ? `\\n\\nApuntes seleccionados de la biblioteca:\\n${notesText}`
      : ''

		try {
			if (typeof askOnce !== 'function') throw new Error('No se pudo conectar con el servicio de generación.')
			const raw = await askOnce({
				apiKey,
				modelId,
				systemPrompt: `Eres un profesor experto en técnicas de estudio para cualquier asignatura. Genera exactamente ${count} tarjetas de estudio, con preguntas claras y respuestas rigurosas pero breves. Responde EXCLUSIVAMENTE con un array JSON válido. Cada elemento debe tener las propiedades "front" y "back", ambas cadenas de texto. Sin markdown ni explicaciones externas. No inventes datos que no aparezcan en los apuntes cuando se hayan aportado.`,
				userPrompt: `Crea ${count} tarjetas para estudiar: ${topic.trim() || 'los conceptos principales de mis apuntes'}.${notes}`,
			})
			const clean = raw.replace(/```(?:json)?/gi, '').trim()
			const start = clean.indexOf('[')
			const end = clean.lastIndexOf(']')
			if (start < 0 || end < start) throw new Error('La IA no devolvió tarjetas válidas. Inténtalo otra vez.')
			const parsed = JSON.parse(clean.slice(start, end + 1))
			if (!Array.isArray(parsed) || !parsed.length || parsed.some((card) => typeof card.front !== 'string' || typeof card.back !== 'string')) {
				throw new Error('El formato de las tarjetas no es válido. Inténtalo otra vez.')
			}
			setCards(parsed)
			setIndex(0)
			setFlipped(false)
			setKnown({})
		} catch (err) {
			setError(err.message || 'No se pudieron generar las tarjetas.')
		} finally {
			setLoading(false)
		}
	}

	function goTo(next) {
		setIndex(next)
		setFlipped(false)
	}

	const reviewed = Object.keys(known).length
	const mastered = Object.values(known).filter(Boolean).length

	return (
		<div className="max-w-3xl mx-auto px-4 md:px-6 pt-6 pb-28 space-y-6">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 rounded-2xl aureva-card flex items-center justify-center">
					<BookOpen size={20} style={{ color: 'var(--text-gold)' }} />
				</div>
				<div>
					<h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>Tarjetas de estudio</h1>
					<p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>Memoriza y repasa cualquier asignatura con tarjetas interactivas</p>
				</div>
			</div>

			<form onSubmit={generateCards} className="aureva-card rounded-3xl p-5 space-y-4">
				<div>
					<label className="block text-[13px] mb-2" style={{ color: 'var(--text-gold)' }}>Tema o asignatura</label>
					<input
						value={topic}
						onChange={(e) => setTopic(e.target.value)}
						placeholder="Ej.: Verbos en inglés, fórmulas de física, historia..."
						className="aureva-pill w-full rounded-2xl px-4 py-3 outline-none"
						style={{ color: 'var(--text-main)' }}
					/>
				</div>
				<div className="flex flex-wrap items-center gap-3 justify-between">
					<div className="flex gap-2 items-center">
						<span className="text-sm" style={{ color: 'var(--text-soft)' }}>Tarjetas:</span>
						{[5, 10, 20].map((n) => (
							<button key={n} type="button" onClick={() => setCount(n)}
								className="rounded-full px-3 py-1 text-sm"
								style={{ background: count === n ? 'var(--text-gold)' : 'transparent', color: count === n ? '#12100e' : 'var(--text-soft)', border: '1px solid var(--border-gold)' }}>
								{n}
							</button>
						))}
					</div>
					<button type="button" onClick={() => setUseNotes((v) => !v)} className="rounded-full px-3 py-1.5 text-xs"
						style={{ border: '1px solid var(--border-gold)', color: 'var(--text-gold)' }}>
						{useNotes ? '✓ ' : ''}Usar apuntes ({activeDocs.length})
					</button>
				</div>
				{error && <p className="text-red-400 text-sm">{error}</p>}
				<div className="flex justify-end">
					<button type="submit" disabled={loading} className="aureva-gold-btn rounded-full px-5 py-2.5 flex items-center gap-2 disabled:opacity-60">
						{loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
						{loading ? 'Generando tarjetas...' : 'Generar tarjetas'}
					</button>
				</div>
			</form>

			{cards.length > 0 && (
				<div className="space-y-4">
					<div className="flex justify-between text-sm" style={{ color: 'var(--text-soft)' }}>
						<span>Tarjeta {index + 1} de {cards.length}</span>
						<span>Aprendidas: {mastered} · Revisadas: {reviewed}</span>
					</div>
					<button type="button" onClick={() => setFlipped((v) => !v)}
						className="aureva-card rounded-3xl w-full min-h-64 p-8 flex flex-col items-center justify-center text-center gap-5 cursor-pointer"
						style={{ border: '1px solid var(--border-gold)' }}>
						<span className="uppercase tracking-wider text-xs" style={{ color: 'var(--text-gold)' }}>
							{flipped ? 'Respuesta' : 'Pregunta'}
						</span>
						<span className="text-lg font-medium leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-main)' }}>
							{flipped ? cards[index].back : cards[index].front}
						</span>
						<span className="text-xs" style={{ color: 'var(--text-soft)' }}>Pulsa la tarjeta para darle la vuelta</span>
					</button>
					<div className="flex flex-wrap gap-2 justify-center">
						<button type="button" onClick={() => setKnown((prev) => ({ ...prev, [index]: false }))}
							className="aureva-pill rounded-full px-4 py-2 text-sm" style={{ color: 'var(--text-main)' }}>Repasar otra vez</button>
						<button type="button" onClick={() => setKnown((prev) => ({ ...prev, [index]: true }))}
							className="aureva-gold-btn rounded-full px-4 py-2 text-sm">Ya me la sé</button>
					</div>
					<div className="flex items-center justify-between">
						<button type="button" disabled={index === 0} onClick={() => goTo(index - 1)}
							className="aureva-pill rounded-full px-4 py-2 flex gap-2 items-center disabled:opacity-40" style={{ color: 'var(--text-main)' }}>
							<ChevronLeft size={16} /> Anterior
						</button>
						<button type="button" onClick={() => { setKnown({}); goTo(0) }} className="flex gap-2 items-center text-sm" style={{ color: 'var(--text-gold)' }}>
							<RotateCcw size={15} /> Reiniciar
						</button>
						<button type="button" disabled={index === cards.length - 1} onClick={() => goTo(index + 1)}
							className="aureva-pill rounded-full px-4 py-2 flex gap-2 items-center disabled:opacity-40" style={{ color: 'var(--text-main)' }}>
							Siguiente <ChevronRight size={16} />
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
