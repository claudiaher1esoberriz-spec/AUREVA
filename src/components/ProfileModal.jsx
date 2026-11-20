import { useState } from 'react'
import { X, Sparkles, MessageSquare, FolderOpen, Check } from 'lucide-react'

export function ProfileModal({ profile, stats, onSave, onClose }) {
  const [name, setName] = useState(profile.name || 'Claudia')
  const [tagline, setTagline] = useState(profile.tagline || 'Tu espacio para aprender, crear y avanzar.')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ name: name.trim() || 'Claudia', tagline: tagline.trim() || 'Tu espacio para aprender, crear y avanzar.' })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="aureva-card w-full max-w-md rounded-3xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full cursor-pointer" style={{ color: 'var(--text-soft)' }}>
          <X size={18} />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <div className="aureva-gold-btn w-12 h-12 rounded-full flex items-center justify-center font-luxury text-[24px] font-semibold">
            {(name || 'C')[0].toUpperCase()}
          </div>
          <div>
            <h2 className="font-luxury text-[24px] font-semibold leading-tight" style={{ color: 'var(--text-main)' }}>
              {name || 'Claudia'}
            </h2>
            <p className="text-[12.5px] flex items-center gap-1" style={{ color: 'var(--text-gold)' }}>
              <Sparkles size={12} /> Espacio Personal & Medicina
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="aureva-pill rounded-2xl p-3 text-center">
            <MessageSquare size={16} className="mx-auto mb-1" style={{ color: 'var(--text-gold)' }} />
            <div className="text-[18px] font-semibold" style={{ color: 'var(--text-main)' }}>{stats.chats}</div>
            <div className="text-[11.5px]" style={{ color: 'var(--text-soft)' }}>Chats guardados</div>
          </div>
          <div className="aureva-pill rounded-2xl p-3 text-center">
            <FolderOpen size={16} className="mx-auto mb-1" style={{ color: 'var(--text-gold)' }} />
            <div className="text-[18px] font-semibold" style={{ color: 'var(--text-main)' }}>{stats.resources}</div>
            <div className="text-[11.5px]" style={{ color: 'var(--text-soft)' }}>Apuntes subidos</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text-gold)' }}>¿Cómo te saludo?</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="aureva-pill w-full rounded-2xl px-3.5 py-2 text-[13.5px] outline-none" style={{ color: 'var(--text-main)' }} />
          </div>
          <div>
            <label className="block text-[12px] font-medium mb-1" style={{ color: 'var(--text-gold)' }}>Tu frase de bienvenida</label>
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="aureva-pill w-full rounded-2xl px-3.5 py-2 text-[13.5px] outline-none" style={{ color: 'var(--text-main)' }} />
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" className="aureva-gold-btn px-5 py-2 rounded-full text-[13.5px] font-medium inline-flex items-center gap-1.5 cursor-pointer">
              <Check size={15} /> Guardar perfil
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
