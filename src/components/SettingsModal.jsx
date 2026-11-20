import { useState } from 'react'
import { X, KeyRound, Eye, EyeOff, CheckCircle2, ExternalLink } from 'lucide-react'

export function SettingsModal({ apiKey, onSave, onClose }) {
  const [draft, setDraft] = useState(apiKey || '')
  const [show, setShow] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(draft.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="aureva-card w-full max-w-md rounded-3xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full cursor-pointer"
          style={{ color: 'var(--text-soft)' }}
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <KeyRound size={20} style={{ color: 'var(--text-gold)' }} />
          <h2 className="font-luxury text-[24px] font-semibold" style={{ color: 'var(--text-main)' }}>
            Ajustes de AUREVA
          </h2>
        </div>

        <p className="text-[13px] mb-5 leading-relaxed" style={{ color: 'var(--text-soft)' }}>
          Tu clave gratuita de OpenRouter se guarda solo en tu navegador. AUREVA bloquea cualquier modelo de pago automáticamente.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-gold)' }}>
              OpenRouter API Key (Gratis)
            </label>
            <div className="aureva-pill rounded-2xl flex items-center px-3.5 py-2.5 gap-2">
              <input
                type={show ? 'text' : 'password'}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="sk-or-v1-..."
                className="flex-1 bg-transparent outline-none text-[13.5px]"
                style={{ color: 'var(--text-main)' }}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="p-1 cursor-pointer"
                style={{ color: 'var(--text-soft)' }}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium hover:underline"
              style={{ color: 'var(--text-gold)' }}
            >
              <span>Conseguir clave gratis</span>
              <ExternalLink size={13} />
            </a>

            <button
              type="submit"
              className="aureva-gold-btn px-5 py-2 rounded-full text-[13.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>Guardar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
