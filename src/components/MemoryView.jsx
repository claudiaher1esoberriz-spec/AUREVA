import { useState } from 'react'
import { Brain, Plus, Trash2 } from 'lucide-react'
import { getMemory, addMemory, deleteMemory, clearMemory } from '../services/memory'

export function MemoryView() {
  const [memories, setMemories] = useState(getMemory)
  const [input, setInput] = useState('')

  const save = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    setMemories(addMemory(input))
    setInput('')
  }

  return (
    <div className="max-w-2xl w-full mx-auto py-10">
      <div className="flex items-center gap-3 mb-3">
        <Brain size={28} style={{ color: 'var(--text-gold)' }} />
        <h1 className="font-luxury text-4xl aureva-gold-text">
          Memoria personal
        </h1>
      </div>

      <p className="mb-8 text-sm" style={{ color: 'var(--text-soft)' }}>
        Guarda las preferencias que quieras que AUREVA tenga en cuenta
        en tus próximas conversaciones.
      </p>

      <form onSubmit={save} className="aureva-card rounded-2xl p-4 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej.: Prefiero respuestas cortas y directas"
          className="flex-1 min-w-0 bg-transparent outline-none text-sm"
          style={{ color: 'var(--text-main)' }}
        />
        <button type="submit" className="aureva-gold-btn rounded-xl p-3"
          aria-label="Guardar recuerdo">
          <Plus size={18} />
        </button>
      </form>

      <div className="mt-7 space-y-3">
        {memories.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
            Todavía no has guardado ningún recuerdo.
          </p>
        )}

        {memories.map((memory) => (
          <div key={memory.id}
            className="aureva-card rounded-xl p-4 flex items-center justify-between gap-4">
            <p className="text-sm break-words min-w-0"
              style={{ color: 'var(--text-main)' }}>
              {memory.text}
            </p>
            <button
              onClick={() => setMemories(deleteMemory(memory.id))}
              aria-label="Eliminar recuerdo"
              className="shrink-0 cursor-pointer"
              style={{ color: 'var(--text-gold)' }}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {memories.length > 0 && (
        <button
          onClick={() => {
            if (window.confirm('¿Eliminar todos los recuerdos?')) {
              clearMemory()
              setMemories([])
            }
          }}
          className="mt-7 text-sm underline cursor-pointer"
          style={{ color: 'var(--text-soft)' }}>
          Borrar toda la memoria
        </button>
      )}

      <p className="mt-8 text-xs" style={{ color: 'var(--text-soft)' }}>
        Los recuerdos se guardan en este navegador y se envían a OpenRouter
        cuando haces una consulta. No guardes contraseñas ni datos sensibles.
      </p>
    </div>
  )
}
