import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Volume2, Square } from 'lucide-react'

export default function VoiceControls({ apiKey, modelId, askOnce }) {
  const [status, setStatus] = useState('Pulsa el micrófono para hablar con AUREVA.')
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [answer, setAnswer] = useState('')
  const recognitionRef = useRef(null)
  const aliveRef = useRef(true)
  const busyRef = useRef(false)
  const historyRef = useRef([])

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      recognitionRef.current?.abort()
      window.speechSynthesis?.cancel()
    }
  }, [])

  const speak = (text) => {
    if (!('speechSynthesis' in window)) {
      setStatus('Respuesta recibida. Este navegador no permite leerla en voz alta.')
      return
    }
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`]/g, ''))
    utterance.lang = 'es-ES'
    utterance.rate = 1
    const voices = window.speechSynthesis.getVoices()
    const spanish = voices.find(v => v.lang?.toLowerCase().startsWith('es') && /female|mónica|paulina|helena|lucía|marisol/i.test(v.name))
      || voices.find(v => v.lang?.toLowerCase().startsWith('es'))
    if (spanish) utterance.voice = spanish
    utterance.onstart = () => { if (aliveRef.current) setStatus('AUREVA está hablando…') }
    utterance.onend = () => { if (aliveRef.current) setStatus('Pulsa el micrófono para continuar.') }
    utterance.onerror = () => { if (aliveRef.current) setStatus('Respuesta recibida. No se pudo reproducir el audio.') }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const startListening = () => {
    if (busyRef.current) return
    if (!apiKey) {
      setStatus('Primero añade tu API Key en Ajustes de AUREVA.')
      return
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      setStatus('El reconocimiento de voz no está disponible en este navegador. Prueba Chrome.')
      return
    }
    window.speechSynthesis?.cancel()
    const recognition = new Recognition()
    recognition.lang = 'es-ES'
    recognition.interimResults = false
    recognition.continuous = false
    recognitionRef.current = recognition
    recognition.onstart = () => {
      if (!aliveRef.current) return
      setListening(true)
      setStatus('Te escucho… Habla ahora.')
    }
    recognition.onerror = (event) => {
      if (!aliveRef.current) return
      setListening(false)
      const messages = {
        'not-allowed': 'Permite el acceso al micrófono en Chrome.',
        'no-speech': 'No he oído nada. Vuelve a pulsar el micrófono.',
        'network': 'No se pudo conectar al reconocimiento de voz.'
      }
      setStatus(messages[event.error] || 'No se pudo reconocer tu voz. Inténtalo de nuevo.')
    }
    recognition.onend = () => { if (aliveRef.current) setListening(false) }
    recognition.onresult = async (event) => {
      const question = event.results?.[0]?.[0]?.transcript?.trim()
      if (!question || !aliveRef.current) return
      setListening(false)
      setTranscript(question)
      setAnswer('')
      setBusy(true)
      busyRef.current = true
      setStatus('AUREVA está pensando…')
      try {
        const recent = historyRef.current.slice(-6)
        const context = recent.map(m => `${m.role === 'user' ? 'Usuario' : 'AUREVA'}: ${m.text}`).join('\n')
        const reply = await askOnce({
          apiKey,
          modelId,
          systemPrompt: 'Eres AUREVA AI, una asistente cercana, precisa y natural. Responde en español para una conversación hablada. Sé breve, clara y evita Markdown. Mantén el contexto de la conversación.',
          userPrompt: `${context ? 'Conversación anterior:\n' + context + '\n\n' : ''}Usuario: ${question}`
        })
        if (!aliveRef.current) return
        historyRef.current = [...recent, { role: 'user', text: question }, { role: 'assistant', text: reply }]
        setAnswer(reply)
        speak(reply)
      } catch (error) {
        if (aliveRef.current) setStatus(error?.message || 'No se pudo obtener una respuesta.')
      } finally {
        busyRef.current = false
        if (aliveRef.current) setBusy(false)
      }
    }
    try { recognition.start() }
    catch { setStatus('No se pudo iniciar el micrófono. Vuelve a intentarlo.') }
  }

  const stop = () => {
    recognitionRef.current?.abort()
    window.speechSynthesis?.cancel()
    setListening(false)
    setStatus('Pulsa el micrófono para continuar.')
  }

  return (
    <div className="mt-1">
      <p className="text-sm mb-4" style={{ color: '#D6C4A5' }} aria-live="polite">{status}</p>
      {transcript && <p className="text-xs mb-2" style={{ color: '#B9B9B9' }}>Tú: {transcript}</p>}
      {answer && <p className="text-sm mb-5 max-h-32 overflow-y-auto" style={{ color: '#EAD4A9' }}>AUREVA: {answer}</p>}
      <div className="flex items-center justify-center gap-5">
        <button type="button" disabled={busy} onClick={listening ? stop : startListening}
          aria-label={listening ? 'Detener micrófono' : 'Hablar con AUREVA'}
          className="w-16 h-16 rounded-full flex items-center justify-center disabled:opacity-50"
          style={{ background: '#DCC18C', color: '#171717' }}>
          {listening ? <MicOff size={27} /> : <Mic size={27} />}
        </button>
        <button type="button" onClick={stop} aria-label="Detener voz"
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ border: '1px solid #6E5937', color: '#EAD4A9' }}><Square size={18} /></button>
        <Volume2 size={21} color="#DCC18C" aria-hidden="true" />
      </div>
    </div>
  )
}
