import { useState, useRef } from 'react'
import { Upload, FileText, Trash2, CheckSquare, Square, Plus, Sparkles } from 'lucide-react'
import { extractTextFromFile, chunkText } from '../services/library'

export function ResourcesView({ resources, onAdd, onToggle, onDelete, onGoChat }) {
  const [busy, setBusy] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteText, setNoteText] = useState('')
  const fileRef = useRef(null)

  const handleFiles = async (files) => {
    if (!files?.length) return
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        const { text, pages } = await extractTextFromFile(file)
        if (!text) continue
        await onAdd({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: file.name,
          pages,
          chunks: chunkText(text),
          active: true,
          createdAt: Date.now(),
        })
      }
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSaveNote = async (e) => {
    e.preventDefault()
    if (!noteText.trim()) return
    await onAdd({
      id: `${Date.now()}`,
      title: noteTitle.trim() || 'Nota rápida',
      pages: 1,
      chunks: chunkText(noteText),
      active: true,
      createdAt: Date.now(),
    })
    setNoteTitle(''); setNoteText(''); setNoteOpen(false)
  }

  const activeCount = resources.filter((r) => r.active !== false).length

  return (
    <div className="max-w-3xl w-full mx-auto pt-4 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-luxury text-[28px] font-semibold aureva-gold-text leading-tight">Tus Recursos</h2>
          <p className="text-[13.5px]" style={{ color: 'var(--text-soft)' }}>
            Sube PDFs o apuntes sin límite. Los activos ({activeCount}) se usan automáticamente al preguntarme.
          </p>
        </div>
        {resources.length > 0 && (
          <button onClick={onGoChat} className="aureva-gold-btn px-4 py-2 rounded-full text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer">
            <Sparkles size={14} /> Estudiar en el Chat
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="aureva-card rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 cursor-pointer">
          <Upload size={22} style={{ color: 'var(--text-gold)' }} />
          <span className="text-[14px] font-medium" style={{ color: 'var(--text-main)' }}>
            {busy ? 'Leyendo PDFs...' : 'Subir PDFs o archivos (.pdf, .txt)'}
          </span>
          <span className="text-[12px]" style={{ color: 'var(--text-soft)' }}>Puedes elegir varios a la vez</span>
        </button>
        <input ref={fileRef} type="file" multiple accept=".pdf,.txt,.md" className="hidden" onChange={(e) => handleFiles(e.target.files)} />

        <button onClick={() => setNoteOpen(!noteOpen)} className="aureva-card rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 cursor-pointer">
          <Plus size={22} style={{ color: 'var(--text-gold)' }} />
          <span className="text-[14px] font-medium" style={{ color: 'var(--text-main)' }}>Pegar apuntes o texto</span>
          <span className="text-[12px]" style={{ color: 'var(--text-soft)' }}>Ideal para copiar diapositivas o temas</span>
        </button>
      </div>

      {noteOpen && (
        <form onSubmit={handleSaveNote} className="aureva-card rounded-2xl p-4 space-y-3">
          <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Título (ej. Tema 4 - Insuficiencia Cardíaca)" className="aureva-pill w-full rounded-xl px-3.5 py-2 text-[13.5px] outline-none" style={{ color: 'var(--text-main)' }} />
          <textarea rows={4} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Pega aquí tus apuntes..." className="aureva-pill w-full rounded-xl px-3.5 py-2 text-[13.5px] outline-none resize-y" style={{ color: 'var(--text-main)' }} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setNoteOpen(false)} className="px-3 py-1.5 text-[13px] cursor-pointer" style={{ color: 'var(--text-soft)' }}>Cancelar</button>
            <button type="submit" className="aureva-gold-btn px-4 py-1.5 rounded-full text-[13px] font-medium cursor-pointer">Guardar apunte</button>
          </div>
        </form>
      )}

      <div className="space-y-2.5">
        {resources.map((doc) => {
          const isOn = doc.active !== false
          return (
            <div key={doc.id} className="aureva-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
              <button onClick={() => onToggle(doc)} className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer">
                {isOn ? <CheckSquare size={18} style={{ color: 'var(--text-gold)' }} /> : <Square size={18} style={{ color: 'var(--text-soft)' }} />}
                <FileText size={17} style={{ color: 'var(--text-gold)' }} className="shrink-0" />
                <div className="min-w-0">
                  <div className="text-[14px] font-medium truncate" style={{ color: 'var(--text-main)' }}>{doc.title}</div>
                  <div className="text-[11.5px]" style={{ color: 'var(--text-soft)' }}>{doc.pages} pág. · {doc.chunks?.length || 0} bloques listos</div>
                </div>
              </button>
              <button onClick={() => onDelete(doc.id)} className="p-2 rounded-lg hover:text-red-400 cursor-pointer" style={{ color: 'var(--text-soft)' }} title="Borrar">
                <Trash2 size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
