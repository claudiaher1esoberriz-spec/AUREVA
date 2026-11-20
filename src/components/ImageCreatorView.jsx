import { useState } from 'react'
import { ImagePlus, Download, LoaderCircle } from 'lucide-react'

export default function ImageCreatorView() {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function create(e) {
    e.preventDefault()
    setError('')
    setResult(null)

    if (!prompt.trim()) {
      setError('Por favor, introduce una descripción.')
      return
    }

    setBusy(true)

    try {
      const encodedPrompt = encodeURIComponent(prompt)
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&model=flux&nologo=true`

      setResult({
        url: pollinationsUrl,
        model: 'flux (Pollinations)'
      })
    } catch (err) {
      setError(err.message || 'No se pudo crear la imagen.')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!result) return

    try {
      const response = await fetch(result.url)
      if (!response.ok) throw new Error('No se pudo descargar la imagen.')

      const blob = await response.blob()
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.href = url
      link.download = `AUREVA-imagen.${blob.type.includes('jpeg') ? 'jpg' : blob.type.includes('webp') ? 'webp' : 'png'}`

      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError('No se pudo descargar automáticamente. Prueba a mantener pulsada la imagen para guardarla.')
    }
  }

  return (
    <section className="w-full max-w-3xl mx-auto py-8 space-y-6" style={{ color: 'var(--text-main)' }}>
      <div className="flex items-center gap-3">
        <ImagePlus style={{ color: 'var(--text-gold)' }} size={28} />
        <h1 className="text-2xl font-semibold">Crear imágenes</h1>
      </div>

      <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
        Describe tu idea. AUREVA genera imágenes con FLUX mediante Pollinations, sin verificación y de forma gratuita.
      </p>

      <form onSubmit={create} className="aureva-card rounded-2xl p-5 space-y-4">
        <label htmlFor="image-prompt" className="block font-medium">
          ¿Qué imagen quieres crear?
        </label>

        <textarea
          id="image-prompt"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Ejemplo: Un Ferrari negro de noche, estilo fotografía realista..."
          className="w-full rounded-xl p-3 outline-none resize-y"
          style={{
            background: 'var(--bg-main)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-gold)'
          }}
        />

        <button
          type="submit"
          disabled={busy || !prompt.trim()}
          className="aureva-gold-btn rounded-xl px-5 py-3 flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          {busy ? 'Generando...' : 'Generar imagen'}
        </button>
      </form>

      {error && <p role="alert" className="aureva-card rounded-xl p-4 text-sm">{error}</p>}

      {result && (
        <div className="aureva-card rounded-2xl p-4 space-y-3">
          <img src={result.url} alt={prompt} className="w-full rounded-xl object-contain max-h-[600px]" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs" style={{ color: 'var(--text-soft)' }}>
              Modelo: {result.model}
            </span>
            <button type="button" onClick={save} className="aureva-gold-btn rounded-xl px-4 py-2 flex gap-2 items-center">
              <Download size={17} />Guardar imagen
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Download, LoaderCircle } from 'lucide-react'
import { generateFreeImage } from '../services/imageGeneration'


export default function ImageCreatorView({ apiKey }) {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState('')
  const widgetContainer = useRef(null)
  const widgetId = useRef(null)

  useEffect(() => {
    let active = true
    let retry

    function initialize() {
      if (!active) return

      if (!window.turnstile) {
        retry = setTimeout(initialize, 200)
        return
      }

      if (widgetContainer.current && widgetId.current === null) {
        widgetId.current = window.turnstile.render(widgetContainer.current, {
          sitekey: SITE_KEY,
          callback: value => setToken(value),
          'expired-callback': () => setToken(''),
          'error-callback': () => setToken('')
        })
      }
    }

    const script = document.createElement('script')
    script.async = true
    script.onload = initialize
    script.onerror = () => {
      if (active) setError('No se pudo cargar la verificación de seguridad.')
    }

    if (window.turnstile) {
      initialize()
    } else {
      document.head.appendChild(script)
    }

    return () => {
      active = false
      clearTimeout(retry)

      if (widgetId.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetId.current) } catch {}
        widgetId.current = null
      }
    }
  }, [])

  async function create(e) {
    e.preventDefault()
    setError('')
    setResult(null)

    if (!token) {
      setError('Completa la verificación de seguridad antes de generar.')
      return
    }

    setBusy(true)

    try {
      setResult(await generateFreeImage(apiKey, prompt, token))
    } catch (err) {
      setError(err.message || 'No se pudo crear la imagen.')
    } finally {
      setBusy(false)
      setToken('')

      if (widgetId.current !== null && window.turnstile) {
        try { window.turnstile.reset(widgetId.current) } catch {}
      }
    }
  }

  async function save() {
    if (!result) return

    try {
      const response = await fetch(result.url)
      if (!response.ok) throw new Error('No se pudo descargar la imagen.')

      const blob = await response.blob()
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)

      link.href = url
      link.download = `AUREVA-imagen.${blob.type.includes('jpeg') ? 'jpg' : blob.type.includes('webp') ? 'webp' : 'png'}`

      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError('No se pudo descargar automáticamente. Prueba a mantener pulsada la imagen para guardarla.')
    }
  }

  return (
    <section className="w-full max-w-3xl mx-auto py-8 space-y-6" style={{ color: 'var(--text-main)' }}>
      <div className="flex items-center gap-3">
        <ImagePlus style={{ color: 'var(--text-gold)' }} size={28} />
        <h1 className="text-2xl font-semibold">Crear imágenes</h1>
      </div>

      <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
        Describe tu idea. AUREVA genera imágenes con FLUX.1 Schnell mediante Cloudflare, sujeto a un límite global de 50 imágenes diarias.
      </p>

      <form onSubmit={create} className="aureva-card rounded-2xl p-5 space-y-4">
        <label htmlFor="image-prompt" className="block font-medium">
          ¿Qué imagen quieres crear?
        </label>

        <textarea
          id="image-prompt"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Ejemplo: Un Ferrari negro de noche, estilo fotografía realista..."
          className="w-full rounded-xl p-3 outline-none resize-y"
          style={{
            background: 'var(--bg-main)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-gold)'
          }}
        />

        <div ref={widgetContainer} />

        <button
          type="submit"
          disabled={busy || !prompt.trim() || !token}
          className="aureva-gold-btn rounded-xl px-5 py-3 flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          {busy ? 'Generando...' : 'Generar imagen'}
        </button>
      </form>

      {error && <p role="alert" className="aureva-card rounded-xl p-4 text-sm">{error}</p>}

      {result && (
        <div className="aureva-card rounded-2xl p-4 space-y-3">
          <img src={result.url} alt={prompt} className="w-full rounded-xl object-contain max-h-[600px]" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs" style={{ color: 'var(--text-soft)' }}>
              Modelo: {result.model}
            </span>
            <button type="button" onClick={save} className="aureva-gold-btn rounded-xl px-4 py-2 flex gap-2 items-center">
              <Download size={17} />Guardar imagen
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
