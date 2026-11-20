import { getMemory, addMemory, deleteMemory } from '../services/memory'
import { useEffect, useRef, useState } from 'react'
import { X, Mic, Volume2, Sparkles } from 'lucide-react'

// AUREVA_REACTIVE_MESH_V1
function GoldenMesh({ activityRef, audioLevelRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let raf = 0
    let width = 0
    let height = 0
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const project = (lat, lon, time, energy) => {
      const wobble = 1 + .10 * Math.sin(5 * lon + time * 1.1) * Math.cos(4 * lat - time * .7)
        + .065 * Math.sin(7 * lat + 3 * lon + time * .8)
      const radius = Math.min(width, height) * .325 * wobble * (1 + energy * .24)
      const x = Math.cos(lat) * Math.cos(lon)
      const y = Math.sin(lat)
      const z = Math.cos(lat) * Math.sin(lon)
      const rotation = time * .12
      const xx = x * Math.cos(rotation) - z * Math.sin(rotation)
      const zz = x * Math.sin(rotation) + z * Math.cos(rotation)
      const perspective = 2.7 / (2.7 - zz * .32)
      return { x: width / 2 + xx * radius * perspective,
        y: height / 2 + y * radius * perspective,
        z: zz }
    }
    let smoothLevel = 0
    const draw = () => {
      const time = reducedMotion ? 0 : frame / 60
      const activity = activityRef.current
      let targetLevel = 0
      if (activity === 'listening') {
        targetLevel = Math.min(1, audioLevelRef.current * 5)
      } else if (activity === 'speaking') {
        // SpeechSynthesis no expone muestras de audio: pulso visual sincronizado.
        targetLevel = .30 + .19 * Math.sin(time * 9) ** 2 + .10 * Math.sin(time * 17) ** 2
      }
      smoothLevel += (targetLevel - smoothLevel) * .17
      const energy = reducedMotion ? 0 : smoothLevel
      ctx.clearRect(0, 0, width, height)
      const glow = ctx.createRadialGradient(width / 2, height / 2, 5, width / 2, height / 2, width * .45)
      glow.addColorStop(0, `rgba(210,155,72,${.13 + energy * .23})`)
      glow.addColorStop(1, 'rgba(210,155,72,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)

      // Longitude and latitude curves produce a deforming wireframe sphere.
      const drawCurve = (points) => {
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1], b = points[i]
          const opacity = .20 + .58 * ((a.z + b.z + 2) / 4)
          ctx.strokeStyle = `rgba(245,204,137,${opacity})`
          ctx.lineWidth = .65 + .35 * ((a.z + b.z + 2) / 4)
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
      for (let i = 1; i < 35; i++) {
        const lat = -Math.PI / 2 + i * Math.PI / 35
        const points = []
        for (let j = 0; j <= 150; j++) points.push(project(lat, j * Math.PI * 2 / 150, time, energy))
        drawCurve(points)
      }
      for (let i = 0; i < 58; i++) {
        const lon = i * Math.PI * 2 / 58
        const points = []
        for (let j = 0; j <= 80; j++) points.push(project(-Math.PI / 2 + j * Math.PI / 80, lon, time, energy))
        drawCurve(points)
      }
      for (let i = 0; i < 240; i++) {
        const angle = i * 2.399963
        const spread = Math.sqrt((i + .5) / 240)
        const orbit = Math.min(width, height) * (.32 + .13 * spread) * (1 + energy * .16)
        const x = width / 2 + Math.cos(angle + time * .08) * orbit
        const y = height / 2 + Math.sin(angle + time * .08) * orbit * .88
        ctx.beginPath()
        ctx.arc(x, y, i % 9 === 0 ? 1.35 : .7, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,219,155,${.25 + (i % 5) * .12})`
        ctx.fill()
      }
      if (!reducedMotion) { frame++; raf = requestAnimationFrame(draw) }
    }
    draw()
    return () => { cancelAnimationFrame(raf); observer.disconnect() }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" aria-label="Malla de ondas doradas animadas" role="img" />
}

// AUREVA_CONTINUOUS_V1
// AUREVA_VOICE_CHOOSER_V1
// AUREVA_UNIFIED_MEMORY_V1
export default function VoiceMode({ onClose, apiKey, modelId, askOnce, initialHistory = [], onTurnComplete }) {
  const [status, setStatus] = useState('Pulsa el micrófono para hablar')
  const [usedVoiceModel, setUsedVoiceModel] = useState(null)
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [muted, setMuted] = useState(false)
  const [continuous, setContinuous] = useState(false)
  const [availableVoices, setAvailableVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState('')
  const [transcript, setTranscript] = useState('')
  const [answer, setAnswer] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const recognitionRef = useRef(null)
  const aliveRef = useRef(true)
  const busyRef = useRef(false)
  const mutedRef = useRef(false)
  const continuousRef = useRef(false)
  const speakingRef = useRef(false)
  const listeningRef = useRef(false)
  const historyRef = useRef(initialHistory.map(m => ({ role: m.role, content: m.content })).slice(-12))
  const startRef = useRef(null)
  const generationRef = useRef(0)
  const audioLevelRef = useRef(0)
  const activityRef = useRef('idle')
  activityRef.current = listening ? 'listening' : speaking ? 'speaking' : 'idle'

  // Medición local del volumen del micrófono, solo durante la escucha.
  useEffect(() => {
    if (!listening || !navigator.mediaDevices?.getUserMedia) {
      audioLevelRef.current = 0
      return
    }
    let cancelled = false
    let stream = null
    let context = null
    let raf = 0
    const begin = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        context = new (window.AudioContext || window.webkitAudioContext)()
        const source = context.createMediaStreamSource(stream)
        const analyser = context.createAnalyser()
        analyser.fftSize = 1024
        source.connect(analyser)
        const data = new Uint8Array(analyser.fftSize)
        const measure = () => {
          if (cancelled) return
          analyser.getByteTimeDomainData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) {
            const value = (data[i] - 128) / 128
            sum += value * value
          }
          audioLevelRef.current = Math.sqrt(sum / data.length)
          raf = requestAnimationFrame(measure)
        }
        measure()
      } catch (error) {
        // Si Chrome no permite una segunda captura, el reconocimiento sigue funcionando.
        audioLevelRef.current = 0
      }
    }
    begin()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      audioLevelRef.current = 0
      stream?.getTracks().forEach(t => t.stop())
      context?.close().catch(() => {})
    }
  }, [listening])

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const updateVoices = () => {
      const spanish = window.speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith('es'))
      setAvailableVoices(spanish)
      setSelectedVoice(prev => {
        if (prev && spanish.some(v => v.voiceURI === prev)) return prev
        const preferred = spanish.find(v => /paulina|mónica|monica|helena|lucia|lucía|premium|natural/i.test(v.name)) || spanish[0]
        return preferred?.voiceURI || ''
      })
    }
    updateVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', updateVoices)
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', updateVoices)
  }, [])

  const previewVoice = () => {
    if (!('speechSynthesis' in window) || continuousRef.current || busyRef.current || listeningRef.current || speakingRef.current) return
    window.speechSynthesis.cancel()
    const sample = new SpeechSynthesisUtterance('Hola, soy AUREVA. Estoy aquí para ayudarte. ¿De qué te apetece hablar hoy?')
    sample.lang = 'es-ES'
    sample.rate = 0.97
    sample.pitch = 1.03
    sample.voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === selectedVoice) || null
    sample.onstart = () => { if (aliveRef.current) setStatus('Escuchando vista previa de la voz...') }
    sample.onend = () => { if (aliveRef.current) setStatus('Voz preparada · Pulsa el micrófono') }
    sample.onerror = () => { if (aliveRef.current) setStatus('No se pudo reproducir la vista previa') }
    window.speechSynthesis.speak(sample)
  }

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      continuousRef.current = false
      generationRef.current += 1
      recognitionRef.current?.abort()
      window.speechSynthesis?.cancel()
    }
  }, [])

  const resumeIfNeeded = () => {
    if (aliveRef.current && continuousRef.current && !busyRef.current && !speakingRef.current && !listeningRef.current) {
      startRef.current?.()
    }
  }

  const speak = (text) => {
    if (!('speechSynthesis' in window) || mutedRef.current || !text.trim()) {
      setStatus('Respuesta lista')
      resumeIfNeeded()
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`_]/g, ''))
    utterance.lang = 'es-ES'
    utterance.rate = 0.97
    utterance.pitch = 1.03
    const voices = window.speechSynthesis.getVoices()
    const spanish = voices.filter(v => v.lang.toLowerCase().startsWith('es'))
    utterance.voice = spanish.find(v => v.voiceURI === selectedVoice) || spanish.find(v => /premium|natural|paulina|mónica|monica|helena|lucia/i.test(v.name)) || spanish[0] || null
    speakingRef.current = true
    setSpeaking(true)
    utterance.onstart = () => { if (aliveRef.current) setStatus('AUREVA está hablando...') }
    const finish = () => {
      speakingRef.current = false
      if (aliveRef.current) setSpeaking(false)
      if (aliveRef.current) {
        setStatus(continuousRef.current ? 'Preparando micrófono...' : 'Pulsa el micrófono para continuar')
        resumeIfNeeded()
      }
    }
    utterance.onend = finish
    utterance.onerror = finish
    window.speechSynthesis.speak(utterance)
  }

  // AUREVA_VOICE_MEMORY_COMMANDS_V1
  const processVoiceMemoryCommand = (spoken) => {
    const normalized = (value) => value.toLocaleLowerCase('es').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[¿?¡!.,;:]+/g, ' ')
      .replace(/\s+/g, ' ').trim()
    const clean = spoken.trim().replace(/[.!?]+$/, '').trim()
    const request = clean.replace(/^(?:aureva\s*[,;:]?\s*)?(?:por favor\s+)?/i, '').trim()
    const query = normalized(request)
    let answer = null
    const saveMatch = request.match(/^recuerda que\s+(.+)$/i)
    if (saveMatch) {
      const detail = saveMatch[1].trim()
      const existing = getMemory().some(m => normalized(m.text) === normalized(detail))
      if (existing) answer = 'Eso ya lo tenía guardado en mi memoria.'
      else {
        addMemory(detail)
        answer = 'He guardado ese recuerdo.'
      }
    } else if (/^(?:que recuerdas de mi|dime que recuerdas de mi|cuales son tus recuerdos|muestrame mis recuerdos|que tienes guardado en (?:tu )?memoria)$/.test(query)) {
      const items = getMemory()
      answer = items.length
        ? 'Esto es lo que recuerdo: ' + items.map(m => m.text).join('. ') + '.'
        : 'Todavía no tengo recuerdos personales guardados.'
    } else {
      const forgetMatch = request.match(/^olvida (?:que\s+)?(.+)$/i)
      if (forgetMatch) {
        const wanted = normalized(forgetMatch[1])
        const items = getMemory()
        // Solo borrar coincidencias inequívocas; nunca borrar todos por accidente.
        const exact = items.filter(m => normalized(m.text) === wanted)
        const matches = exact.length ? exact : items.filter(m => normalized(m.text).includes(wanted))
        if (matches.length === 1) {
          deleteMemory(matches[0].id)
          answer = 'He eliminado ese recuerdo de mi memoria personal.'
        } else if (!matches.length) {
          answer = 'No encuentro ese recuerdo. Puedes preguntarme qué recuerdo de ti.'
        } else {
          answer = 'Hay varios recuerdos parecidos. Dime la frase exacta para eliminar solo uno.'
        }
      }
    }
    return answer
  }

  const sendQuestion = async (question) => {
    if (!question.trim() || busyRef.current || !aliveRef.current) return
    if (!apiKey || typeof askOnce !== 'function') {
      setStatus('Configura tu clave de OpenRouter en Ajustes')
      continuousRef.current = false
      setContinuous(false)
      return
    }
    busyRef.current = true
    setBusy(true)
    setStatus('AUREVA está pensando...')
    setUsedVoiceModel(null)
    setTranscript(question)
    setAnswer('')
    const memoryReply = processVoiceMemoryCommand(question)
    if (memoryReply !== null) {
      const conversation = [...historyRef.current, { role: 'user', content: question }]
      historyRef.current = [...conversation, { role: 'assistant', content: memoryReply }].slice(-12)
      onTurnComplete?.(question, memoryReply)
      setAnswer(memoryReply)
      speak(memoryReply)
      return
    }
    const generation = generationRef.current
    let responseText = null
    try {
      const conversation = [...historyRef.current, { role: 'user', content: question }]
      const response = await askOnce({
        apiKey,
        modelId,
        systemPrompt: 'Eres AUREVA AI, una asistente conversacional cercana, inteligente y elegante. Responde en español natural y de forma breve porque tus respuestas se leerán en voz alta. Evita Markdown, tablas y listas largas. Historial reciente:\n' + historyRef.current.map(m => `${m.role}: ${m.content}`).join('\n'),
        userPrompt: question,
        onModel: (used) => { if (aliveRef.current && generation === generationRef.current) setUsedVoiceModel(used) }
      })
      if (!aliveRef.current || generation !== generationRef.current) return
      responseText = typeof response === 'string' ? response : String(response ?? '')
      historyRef.current = [...conversation, { role: 'assistant', content: responseText }].slice(-12)
        // Compartir el turno completado con el chat persistente.
        if (responseText.trim()) onTurnComplete?.(question, responseText)
      setAnswer(responseText)
    } catch (error) {
      if (aliveRef.current && generation === generationRef.current) {
        setStatus('Error: ' + (error?.message || 'No se pudo conectar'))
        continuousRef.current = false
        setContinuous(false)
      }
    } finally {
      busyRef.current = false
      if (aliveRef.current && generation === generationRef.current) {
        setBusy(false)
        if (responseText !== null) speak(responseText)
      }
    }
  }

  const startListening = () => {
    if (!aliveRef.current || busyRef.current || speakingRef.current || listeningRef.current) return
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      continuousRef.current = false
      setContinuous(false)
      setStatus('Este navegador no admite reconocimiento de voz. Prueba Chrome.')
      return
    }
    const recognition = new Recognition()
    recognitionRef.current = recognition
    recognition.lang = 'es-ES'
    recognition.interimResults = true
    recognition.continuous = false
    let finalText = ''
    let hadError = false
    recognition.onstart = () => {
      listeningRef.current = true
      if (aliveRef.current) { setListening(true); setStatus('Te escucho...') }
    }
    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const words = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += words + ' '
        else interim += words
      }
      if (aliveRef.current) setTranscript((finalText + interim).trim())
    }
    recognition.onerror = (event) => {
      hadError = true
      if (aliveRef.current) {
        continuousRef.current = false
        setContinuous(false)
        setStatus('Micrófono: ' + (event.error === 'not-allowed' ? 'permite el acceso en Chrome' : event.error))
      }
    }
    recognition.onend = () => {
      listeningRef.current = false
      if (!aliveRef.current) return
      setListening(false)
      if (recognitionRef.current === recognition) recognitionRef.current = null
      if (hadError) return
      if (finalText.trim()) sendQuestion(finalText.trim())
      else {
        continuousRef.current = false
        setContinuous(false)
        setStatus('No he oído nada. Pulsa el micrófono para intentarlo otra vez.')
      }
    }
    try { recognition.start() }
    catch (error) {
      recognitionRef.current = null
      continuousRef.current = false
      setContinuous(false)
      setStatus('No se pudo iniciar el micrófono: ' + error.message)
    }
  }
  startRef.current = startListening

  const toggleMicrophone = () => {
    if (listeningRef.current) {
      continuousRef.current = false
      setContinuous(false)
      recognitionRef.current?.stop()
    } else if (!busyRef.current && !speakingRef.current) {
      startListening()
    }
  }

  const toggleContinuous = () => {
    const next = !continuousRef.current
    continuousRef.current = next
    setContinuous(next)
    if (next) {
      if (!listeningRef.current && !busyRef.current && !speakingRef.current) startListening()
      else setStatus('Conversación continua activada')
    } else {
      if (listeningRef.current) recognitionRef.current?.abort()
      setStatus('Conversación continua desactivada')
    }
  }

  const toggleMute = () => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    if (next) {
      window.speechSynthesis?.cancel()
      speakingRef.current = false
      setSpeaking(false)
      setStatus('Audio desactivado')
      resumeIfNeeded()
    } else setStatus('Audio activado')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Modo voz de AUREVA">
      <div className="relative w-full max-w-xl mx-4 rounded-[32px] px-5 py-7 md:p-9 text-center" style={{ background: '#101114', border: '1px solid rgba(222,181,112,.22)' }}>
        <button type="button" onClick={onClose} aria-label="Cerrar modo voz" className="absolute top-5 right-5 p-2 rounded-full" style={{ color: '#E8C78B' }}><X size={22} /></button>
        <div className="flex items-center justify-center gap-2" style={{ color: '#EAD4A9' }}><Sparkles size={19} /><span className="font-semibold tracking-wider">AUREVA AI</span></div>
        <div className="w-full aspect-square max-w-[410px] mx-auto my-2"><GoldenMesh activityRef={activityRef} audioLevelRef={audioLevelRef} /></div>
        <h2 className="text-xl font-medium" style={{ color: '#F0DCB4' }}>Modo voz de AUREVA</h2>
        <p className="text-sm mt-2 mb-2" aria-live="polite" style={{ color: '#CDBA98' }}>{status}</p>
        {usedVoiceModel && <p className="text-xs mb-3" style={{ color: '#E8C78B' }}>✦ Modelo que respondió: {usedVoiceModel}</p>}
        {transcript && <p className="text-sm mb-2 max-h-16 overflow-auto" style={{ color: '#EAD4A9' }}>Tú: {transcript}</p>}
        {answer && <p className="text-sm mb-4 max-h-24 overflow-auto" style={{ color: '#B8B8B8' }}>AUREVA: {answer}</p>}
        <div className="mb-5 flex flex-col items-center gap-2">
          <label htmlFor="aureva-voice-select" className="text-sm" style={{ color: '#EAD4A9' }}>Voz de AUREVA</label>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <select id="aureva-voice-select" value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} disabled={!availableVoices.length} className="max-w-[245px] rounded-xl px-3 py-2 text-sm" style={{ background: '#242328', color: '#F0DCB4', border: '1px solid rgba(222,181,112,.4)' }}>
              {!availableVoices.length && <option value="">Voces en español no disponibles</option>}
              {availableVoices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}</option>)}
            </select>
            <button type="button" onClick={previewVoice} disabled={!availableVoices.length || continuous || listening || busy} className="rounded-xl px-3 py-2 text-sm disabled:opacity-40" style={{ color: '#171717', background: '#DCC18C' }}>Escuchar prueba</button>
          </div>
          <span className="text-xs" style={{ color: '#999' }}>Desactiva la conversación continua para probar voces.</span>
        </div>
        <label className="flex items-center justify-center gap-3 text-sm mb-5 cursor-pointer" style={{ color: '#EAD4A9' }}>
          <input type="checkbox" checked={continuous} onChange={toggleContinuous} className="accent-amber-300" />
          Conversación continua {continuous ? '· Activada' : '· Desactivada'}
        </label>
        <div className="flex items-center justify-center gap-7">
          <button type="button" onClick={toggleMute} aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'} className="p-3 rounded-full" style={{ color: muted ? '#777' : '#DCC18C' }}><Volume2 size={22} /></button>
          <button type="button" onClick={toggleMicrophone} disabled={busy || speakingRef.current} aria-label={listening ? 'Terminar de hablar' : 'Hablar con AUREVA'} className="w-16 h-16 rounded-full flex items-center justify-center disabled:opacity-50" style={{ background: listening ? '#F1D29B' : '#DCC18C', color: '#171717', boxShadow: listening ? '0 0 32px rgba(234,190,116,.6)' : 'none' }}><Mic size={27} /></button>
          <button type="button" onClick={onClose} aria-label="Salir del modo voz" className="p-3 rounded-full" style={{ color: '#DCC18C' }}><X size={22} /></button>
        </div>
      </div>
    </div>
  )
}
