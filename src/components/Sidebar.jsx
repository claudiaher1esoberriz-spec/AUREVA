import {
  MessageCircle, Plus, BookOpen, GraduationCap,
  BriefcaseBusiness, Heart, CalendarDays, Plane,
  Shirt, Lightbulb, Dumbbell, Settings, User,
  X, Trash2, ListChecks, Network, Mic
} from 'lucide-react'
import { AurevaMonogram } from './AurevaArt'

const NAV_ITEMS = [
  { id: 'recursos', label: 'Biblioteca', icon: BookOpen },
  { id: 'estudio', label: 'Estudio', icon: GraduationCap },
  { id: 'trabajo', label: 'Trabajo', icon: BriefcaseBusiness },
  { id: 'salud', label: 'Salud y bienestar', icon: Heart },
  { id: 'organizacion', label: 'Organización', icon: CalendarDays },
  { id: 'viajes', label: 'Viajes', icon: Plane },
  { id: 'estilo', label: 'Estilo de vida', icon: Shirt },
  { id: 'deporte', label: 'Deporte', icon: Dumbbell },
  { id: 'ideas', label: 'Ideas y proyectos', icon: Lightbulb }
]

export function Sidebar({
  activeNav, setActiveNav, mobileMenuOpen,
  setMobileMenuOpen, onNewChat, chats,
  activeChatId, onSelectChat, onDeleteChat, profileName
}) {
  const close = () => setMobileMenuOpen(false)

  return (
    <>
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={close} />
      )}

      <aside className={`aureva-sidebar fixed md:static inset-y-0 left-0 z-40 w-[255px] flex flex-col px-4 py-5 transition-transform duration-300 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>

        <div className="flex items-center justify-between px-2 mb-8">
          <button onClick={onNewChat} aria-label="Inicio">
            <AurevaMonogram />
          </button>
          <button className="md:hidden" onClick={close}>
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5">

          <nav className="space-y-1">
            <button onClick={() => { onNewChat(); close() }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl font-medium cursor-pointer"
              style={{ background: 'var(--bg-active-nav)', color: 'var(--text-main)' }}>
              <Plus size={19} /> Nuevo chat
            </button>

            <button onClick={() => { setActiveNav('chat'); close() }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer"
              style={{ color: 'var(--text-main)' }}>
              <MessageCircle size={18} /> Mis chats
            </button>

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <button key={item.id}
                  onClick={() => { setActiveNav(item.id); close() }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] cursor-pointer"
                  style={{
                    background: activeNav === item.id ? 'var(--bg-active-nav)' : 'transparent',
                    color: 'var(--text-main)'
                  }}>
                  <Icon size={18} strokeWidth={1.7}
                    style={{ color: 'var(--text-gold)' }} />
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="px-3 text-[11px] uppercase tracking-widest"
            style={{ color: 'var(--text-gold)' }}>
            Herramientas de estudio
          </div>

          <nav className="space-y-1">
            {[
              { id: 'test', label: 'Test', icon: ListChecks },
              { id: 'mapas', label: 'Mapas conceptuales', icon: Network },
              { id: 'podcast', label: 'Podcasts', icon: Mic }
            ].map((item) => {
              const Icon = item.icon
              return (
                <button key={item.id}
                  onClick={() => { setActiveNav(item.id); close() }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] cursor-pointer"
                  style={{ color: 'var(--text-soft)' }}>
                  <Icon size={17} /> {item.label}
                </button>
              )
            })}
          </nav>

          {chats?.length > 0 && (
            <div>
              <div className="px-3 mb-2 text-[11px] uppercase tracking-widest"
                style={{ color: 'var(--text-gold)' }}>
                Conversaciones recientes
              </div>
              {chats.map((chat) => (
                <div key={chat.id}
                  className="group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer"
                  style={{
                    background: chat.id === activeChatId ? 'var(--bg-active-nav)' : 'transparent',
                    color: 'var(--text-main)'
                  }}>
                  <button onClick={() => { onSelectChat(chat.id); close() }}
                    className="truncate text-left flex-1 text-[13px] cursor-pointer">
                    {chat.title}
                  </button>
                  <button onClick={() => onDeleteChat(chat.id)}
                    title="Eliminar conversación"
                    className="p-1 cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 mt-3 border-t space-y-1"
          style={{ borderColor: 'var(--border-gold)' }}>
          <button onClick={() => setActiveNav('ajustes')}
            className="w-full flex items-center gap-3 px-3 py-2 cursor-pointer"
            style={{ color: 'var(--text-main)' }}>
            <Settings size={18} /> Ajustes
          </button>
          <button onClick={() => setActiveNav('perfil')}
            className="w-full flex items-center gap-3 px-3 py-2 cursor-pointer"
            style={{ color: 'var(--text-main)' }}>
            <User size={18} /> {profileName || 'Claudia'}
          </button>
        </div>
      </aside>
    </>
  )
}
