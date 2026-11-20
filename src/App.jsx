import { getModelName } from './services/modelRouter'
import { chooseSmartModel } from './services/modelRouter'
import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sun, Moon, SquarePen, ChevronDown, Plus, Send, Mic, Menu, Check, X, BookOpen, GraduationCap, FileText, Layers, Network, ListChecks, Headphones, Sparkles } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { ChatHome } from './components/ChatHome'
import { SettingsModal } from './components/SettingsModal'
import { ProfileModal } from './components/ProfileModal'
import { ResourcesView } from './components/ResourcesView'
import QuizView from './components/QuizView'
import FlashcardsView from './components/FlashcardsView'
import MapView from './components/MapView'
import PodcastView from './components/PodcastView'
import ImageCreatorView from './components/ImageCreatorView'
import { streamChat } from './services/openrouter'
import { addMemory } from './services/memory'
import { getAllResources, saveResource, removeResource, searchResources, extractTextFromFile, chunkText } from './services/library'

const MODELS = [
  { id: 'aureva/smart', label: 'AUREVA Inteligente', tag: 'Automático' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron 3 Ultra', tag: 'Potente' },
  { id: 'nvidia/nemotron-3.5-super-vl:free', label: 'Nemotron 3.5 Super VL', tag: 'Imágenes' },
  { id: 'baidu/ernie-5.5-flash-preview:free', label: 'ERNIE 5.5 Flash', tag: 'Resúmenes' },
  { id: 'nvidia/nemotron-3.5-lightning:free', label: 'Nemotron Lightning', tag: 'Rápido' },
  { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B', tag: 'Razonamiento' },
  { id: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B', tag: 'Equilibrado' },
  { id: 'inclusionai/ling-3.2-flash:free', label: 'Ling 3.2 Flash', tag: 'Multimodal' },
  { id: 'particle/particle-1:free', label: 'Particle-1', tag: 'Programación' },
  { id: 'openrouter/free', label: 'Auto (Gratis)', tag: 'Automático' },
]

export default function App() {
    
  const [theme, setTheme] = useState(() => localStorage.getItem('aureva_theme') || 'light')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('aureva_key') || '')
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('aureva_profile') || 'null') || { name: 'Claudia', tagline: 'Tu espacio para aprender, crear y avanzar.' })
  const [chats, setChats] = useState(() => JSON.parse(localStorage.getItem('aureva_chats') || '[]'))
  const [resources, setResources] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [activeNav, setActiveNav] = useState('chat')
  const [selectedModel, setSelectedModel] = useState(MODELS[0])
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [action, setAction] = useState('Resumir un texto')
  const [depth, setDepth] = useState('Medio')
  const [studyMode, setStudyMode] = useState(false)

  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [input, setInput] = useState('')
  const [attachedImage, setAttachedImage] = useState(null)
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const endRef = useRef(null)
  const fileInputRef = useRef(null)

  const messages = chats.find((c) => c.id === activeChatId)?.messages || []
  const activeResCount = resources.filter((r) => r.active !== false).length

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('aureva_theme', theme) }, [theme])
  useEffect(() => { try { localStorage.setItem('aureva_chats', JSON.stringify(chats)) } catch {} }, [chats])
  useEffect(() => { getAllResources().then(setResources).catch(() => {}) }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length, isLoading])

  const flashNotice = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 3000) }

  const handleNav = (id) => {
    setMobileMenuOpen(false)
    if (id === 'ajustes') { setSettingsOpen(true); return }
    if (id === 'perfil') { setProfileOpen(true); return }
    const personal = {
      estudio: 'Ayúdame a estudiar: ',
      trabajo: 'Necesito ayuda con mi trabajo: ',
      salud: 'Quiero consultar algo sobre salud y bienestar: ',
      organizacion: 'Ayúdame a organizar: ',
      viajes: 'Ayúdame a planificar un viaje: ',
      estilo: 'Quiero consejos de estilo: ',
      deporte: 'Ayúdame con mi actividad deportiva: ',
      ideas: 'Quiero desarrollar una idea: '
    }
    if (personal[id]) {
      setActiveNav('chat')
      setActiveChatId(null)
      setInput(personal[id])
      return
    }
    setActiveNav(id)
    if (id !== 'recursos' && id !== 'test' && id !== 'mapas' && id !== 'podcast' && id !== 'tarjetas') setActiveChatId(null)
  }

  const handlePlusFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setAttachedImage(reader.result)
      reader.readAsDataURL(file)
      return
    }
    flashNotice('Leyendo documento...')
    const { text, pages } = await extractTextFromFile(file)
    if (!text) { flashNotice('No se pudo leer texto del archivo'); return }
    const doc = { id: `${Date.now()}`, title: file.name, pages, chunks: chunkText(text), active: true, createdAt: Date.now() }
    await saveResource(doc)
    setResources((prev) => [doc, ...prev])
    flashNotice(`✨ ${file.name} guardado en Recursos`)
  }

  const handleSend = async () => {
    const text = input.trim()
    if ((!text && !attachedImage) || isLoading) return

    const memoryMatch = text.match(
      /^(?:aureva[,,:]?\s*)?(?:por favor[, ]+)?recuerda que\s+(.+)$/i
    )

    if (memoryMatch && !attachedImage) {
      const memoryText = memoryMatch[1].trim()
      if (memoryText) {
        addMemory(memoryText)
        setInput('')
        flashNotice('Recuerdo guardado en tu memoria personal')
        return
      }
    }

    if (!apiKey) { setSettingsOpen(true); return }
    setActiveNav('chat')
    const chatId = activeChatId || Date.now()
    const userMsg = { id: Date.now(), role: 'user', content: text || 'Analiza esta imagen por favor.', image: attachedImage }
    const botId = Date.now() + 1
    const rawHistory = [...messages, userMsg]
    const apiMessages = rawHistory.map((m) => m.image
      ? { role: m.role, content: [{ type: 'text', text: m.content }, { type: 'image_url', image_url: { url: m.image } }] }
      : { role: m.role, content: m.content })

    setChats((prev) => {
      const exists = prev.some((c) => c.id === chatId)
      if (!exists) return [{ id: chatId, title: (text || 'Imagen').slice(0, 34), messages: [userMsg, { id: botId, role: 'assistant', content: '' }] }, ...prev]
      return prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, userMsg, { id: botId, role: 'assistant', content: '' }] } : c))
    })
    setActiveChatId(chatId); setInput(''); setAttachedImage(null); setIsLoading(true)

    const requestedModelId = selectedModel.id === 'aureva/smart'
      ? chooseSmartModel(text, rawHistory.some(m => m.image), messages)
      : selectedModel.id

    const updateBot = (content) => setChats((prev) => prev.map((c) => (
      c.id === chatId
        ? {
            ...c,
            messages: c.messages.map((m) =>
              m.id === botId
                ? { ...m, content, requestedModelId }
                : m
            )
          }
        : c
    )))
    try {
      const contextExcerpts = searchResources(text, resources, 6)
            await streamChat({
        apiKey,
        modelId: requestedModelId,
        messages: apiMessages,
        contextExcerpts,
        hasImages: rawHistory.some((m) => m.image),
        action,
        depth,
        onToken: updateBot
      })

    } catch (err) {
      updateBot(`⚠️ ${err.message}`)
    } finally { setIsLoading(false) }
  }

  const handleRegenerate = async () => {
    if (isLoading || !apiKey || !activeChatId) return

    const chat = chats.find(c => c.id === activeChatId)
    if (!chat) return

    const history = [...chat.messages]
    const last = history[history.length - 1]

    if (!last || last.role !== 'assistant') return

    const previous = history.slice(0, -1)
    const lastUser = [...previous].reverse().find(m => m.role === 'user')
    if (!lastUser) return

    const apiMessages = previous.map(m => m.image
      ? {
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            { type: 'image_url', image_url: { url: m.image } }
          ]
        }
      : { role: m.role, content: m.content }
    )

    const hasImages = previous.some(m => m.image)
    const requestedModelId = selectedModel.id === 'aureva/smart'
      ? chooseSmartModel(lastUser.content, hasImages, previous.slice(0, -1))
      : selectedModel.id

    const chatId = activeChatId
    const botId = last.id

    const updateBot = (content) => setChats(prev => prev.map(c =>
      c.id === chatId
        ? {
            ...c,
            messages: c.messages.map(m =>
              m.id === botId
                ? { ...m, content, requestedModelId }
                : m
            )
          }
        : c
    ))

    setIsLoading(true)
    updateBot('')

    try {
      const contextExcerpts = searchResources(lastUser.content, resources, 6)

      await streamChat({
        apiKey,
        modelId: requestedModelId,
        messages: apiMessages,
        contextExcerpts,
        hasImages,
        onToken: updateBot
      })
    } catch (err) {
      updateBot(`⚠️ ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditAndRegenerate = async (messageId, newText) => {
    if (isLoading || !apiKey || !activeChatId) {
      if (!apiKey) setSettingsOpen(true)
      return
    }

    const value = newText.trim()
    if (!value) return

    const chat = chats.find(c => c.id === activeChatId)
    if (!chat) return

    const index = chat.messages.findIndex(m => m.id === messageId)
    if (index === -1 || chat.messages[index].role !== 'user') return

    const updatedHistory = chat.messages.slice(0, index + 1).map(m =>
      m.id === messageId ? { ...m, content: value } : m
    )

    const botId = crypto.randomUUID()
    const chatId = activeChatId
    const lastUser = updatedHistory[updatedHistory.length - 1]
    const hasImages = updatedHistory.some(m => m.image)

    const requestedModelId = selectedModel.id === 'aureva/smart'
      ? chooseSmartModel(
          value,
          hasImages,
          updatedHistory.slice(0, -1)
        )
      : selectedModel.id

    const apiMessages = updatedHistory.map(m => m.image
      ? {
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            { type: 'image_url', image_url: { url: m.image } }
          ]
        }
      : { role: m.role, content: m.content }
    )

    setChats(prev => prev.map(c =>
      c.id === chatId
        ? {
            ...c,
            messages: [
              ...updatedHistory,
              {
                id: botId,
                role: 'assistant',
                content: '',
                requestedModelId
              }
            ]
          }
        : c
    ))

    setEditingMessageId(null)
    setEditingText('')
    setIsLoading(true)

    const updateBot = (content) => setChats(prev => prev.map(c =>
      c.id === chatId
        ? {
            ...c,
            messages: c.messages.map(m =>
              m.id === botId
                ? { ...m, content, requestedModelId }
                : m
            )
          }
        : c
    ))

    try {
      const contextExcerpts = searchResources(value, resources, 6)

      await streamChat({
        apiKey,
        modelId: requestedModelId,
        messages: apiMessages,
        contextExcerpts,
        hasImages,
        onToken: updateBot
      })
    } catch (err) {
      updateBot(`⚠️ ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="aureva-canvas flex h-screen w-full overflow-hidden">
      <Sidebar activeNav={activeNav} setActiveNav={handleNav} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} onNewChat={() => { setActiveChatId(null); setActiveNav('chat') }} chats={chats} activeChatId={activeChatId} onSelectChat={(id) => { setActiveChatId(id); setActiveNav('chat') }} onDeleteChat={(id) => { setChats((p) => p.filter((c) => c.id !== id)); if (id === activeChatId) setActiveChatId(null) }} profileName={profile.name} />
      <main className="relative flex-1 flex flex-col h-full overflow-hidden">
        <header className="relative z-20 flex items-center justify-between px-4 md:px-7 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 rounded-xl aureva-pill cursor-pointer" style={{ color: 'var(--text-main)' }}><Menu size={18} /></button>
            <span className="font-luxury text-[22px] tracking-[0.14em] font-semibold aureva-gold-text">AUREVA</span>
            {activeResCount > 0 && (
              <button onClick={() => setActiveNav('recursos')} className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] aureva-pill cursor-pointer" style={{ color: 'var(--text-gold)' }}>
                <BookOpen size={12} /> {activeResCount} {activeResCount === 1 ? 'apunte' : 'apuntes'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <button onClick={() => setModelMenuOpen(!modelMenuOpen)} className="aureva-pill flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium cursor-pointer" style={{ color: 'var(--text-main)' }}>
                <span className="hidden sm:inline" style={{ color: 'var(--text-soft)' }}>Modelo:</span>
                <span className="truncate max-w-[130px] sm:max-w-none">{selectedModel.label}</span>
                <ChevronDown size={14} style={{ color: 'var(--text-gold)' }} />
              </button>
              {modelMenuOpen && (
                <div className="aureva-card absolute right-0 mt-2 w-64 rounded-2xl p-1.5 z-50" onMouseLeave={() => setModelMenuOpen(false)}>
                  {MODELS.map((m) => (
                    <button key={m.id} onClick={() => { setSelectedModel(m); setModelMenuOpen(false) }} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[13px] cursor-pointer" style={{ backgroundColor: selectedModel.id === m.id ? 'var(--bg-active-nav)' : 'transparent', color: 'var(--text-main)' }}>
                      <div><div className="font-medium">{m.label}</div><div className="text-[11px]" style={{ color: 'var(--text-gold)' }}>{m.tag}</div></div>
                      {selectedModel.id === m.id && <Check size={15} style={{ color: 'var(--text-gold)' }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="aureva-pill p-2 rounded-full cursor-pointer" style={{ color: 'var(--text-gold)' }}>{theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}</button>
            <button onClick={() => { setActiveChatId(null); setActiveNav('chat') }} className="aureva-pill p-2 rounded-full cursor-pointer" style={{ color: 'var(--text-main)' }}><SquarePen size={16} /></button>
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto px-4 md:px-8 pb-36 flex flex-col">
          {activeNav === 'recursos' ? (
            <ResourcesView
              resources={resources}
              onAdd={async (doc) => { await saveResource(doc); setResources((p) => [doc, ...p]) }}
              onToggle={async (doc) => { const u = { ...doc, active: doc.active === false }; await saveResource(u); setResources((p) => p.map((r) => (r.id === u.id ? u : r))) }}
              onDelete={async (id) => { await removeResource(id); setResources((p) => p.filter((r) => r.id !== id)) }}
              onGoChat={() => setActiveNav('chat')}
            />
          ) : activeNav === 'test' ? (
            <QuizView apiKey={apiKey} modelId={selectedModel.id} resources={resources} />
          ) : activeNav === 'tarjetas' ? (
            <FlashcardsView apiKey={apiKey} modelId={selectedModel.id} resources={resources} />
          ) : activeNav === 'mapas' ? (
            <MapView apiKey={apiKey} modelId={selectedModel.id} resources={resources} />
          ) : activeNav === 'imagenes' ? (
  <ImageCreatorView />
) : activeNav === 'podcast' ? (
            <PodcastView apiKey={apiKey} modelId={selectedModel.id} resources={resources} />
          ) : messages.length === 0 ? (
            <ChatHome onSelectPrompt={(p) => setInput(p)} profile={profile} />
          ) : (
            <div className="max-w-3xl w-full mx-auto pt-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] md:max-w-[80%] rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed ${msg.role === 'user' ? 'aureva-gold-btn text-white' : 'aureva-card'}`} style={msg.role === 'assistant' ? { color: 'var(--text-main)' } : undefined}>
                    {msg.image && <img src={msg.image} alt="adjunto" className="max-h-56 rounded-xl mb-2" />}
                    {msg.role === 'user' ? (
                      <div>
                        {editingMessageId === msg.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full min-w-[220px] rounded-xl p-3 text-sm outline-none"
                              style={{
                                background: 'var(--bg-main, #ffffff)',
                                color: 'var(--text-main)'
                              }}
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMessageId(null)
                                  setEditingText('')
                                }}
                                className="text-xs underline cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const value = editingText.trim()
                                  if (!value || isLoading) return

                                  handleEditAndRegenerate(msg.id, value)
                                }}
                                className="text-xs font-semibold underline cursor-pointer"
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => {
                                setEditingMessageId(msg.id)
                                setEditingText(msg.content)
                              }}
                              className="mt-2 text-xs underline cursor-pointer opacity-80"
                            >
                              Editar
                            </button>
                          </div>
                        )}
                      </div>
                    ) : msg.content ? (
                      <div className="[&_p]:mb-2 last:[&_p]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_h3]:font-luxury [&_h3]:text-[20px] [&_h3]:font-semibold [&_strong]:font-semibold">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    ) : <span className="text-[13px] italic" style={{ color: 'var(--text-gold)' }}>Pensando...</span>}
                    {msg.role === 'assistant' &&
                      msg.id === messages[messages.length - 1]?.id &&
                      msg.content &&
                      !isLoading && (
                        <button
                          type="button"
                          onClick={handleRegenerate}
                          className="mt-3 text-[12px] cursor-pointer flex items-center gap-1.5"
                          style={{ color: 'var(--text-gold)' }}
                          title="Generar otra respuesta"
                        >
                          <span>↻</span>
                          <span>Regenerar respuesta</span>
                        </button>
                      )}
                    {msg.role === 'assistant' && msg.requestedModelId && (
                      <div
                        className="mt-3 pt-2 text-[11px] flex items-center gap-1.5"
                        style={{
                          color: 'var(--text-gold)',
                          borderTop: '1px solid var(--border-soft, rgba(180,150,90,0.15))'
                        }}
                      >
                        <span>✦</span>
                        <span>
                          Modelo solicitado: {getModelName(msg.requestedModelId)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 px-4 md:px-8 pb-5 pt-2 pointer-events-none">
          <div className="max-w-3xl mx-auto space-y-2">
            {notice && <div className="pointer-events-auto inline-block px-3 py-1 rounded-full text-[12px] aureva-pill" style={{ color: 'var(--text-gold)' }}>{notice}</div>}
            {attachedImage && (
              <div className="pointer-events-auto relative inline-block aureva-card p-1.5 rounded-2xl">
                <img src={attachedImage} alt="preview" className="h-16 rounded-xl" />
                <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 aureva-gold-btn w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"><X size={12} /></button>
              </div>
)}
<form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="aureva-composer pointer-events-auto rounded-full flex items-center gap-2 px-3 py-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} title="Subir PDF, apunte o imagen" className="p-2 rounded-full cursor-pointer" style={{ color: 'var(--text-soft)' }}><Plus size={19} /></button>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.md" className="hidden" onChange={handlePlusFile} />
              <div className="relative shrink-0">
                <button
                  type="button"
                  aria-label="Abrir modo de estudio"
                  aria-expanded={studyMode}
                  onClick={() => setStudyMode((open) => !open)}
                  className="aureva-pill flex items-center gap-1.5 rounded-full px-2.5 py-2 text-[12px] font-medium cursor-pointer"
                  style={{ color: 'var(--text-gold)' }}
                >
                  <GraduationCap size={16} />
                  <span className="hidden sm:inline">Estudiar</span>
                  <ChevronDown size={13} className={studyMode ? 'rotate-180' : ''} />
                </button>
                {studyMode && (
                  <div className="aureva-card absolute bottom-full left-0 mb-3 w-[min(310px,calc(100vw-38px))] rounded-2xl p-2 shadow-xl z-50"
                    style={{ color: 'var(--text-main)' }}>
                    <div className="px-3 py-2 text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-gold)' }}>
                      Modo de estudio
                    </div>
                    {[
                      { label: 'Resumir un texto', icon: FileText },
                      { label: 'Explicar un tema', icon: BookOpen },
                      { label: 'Crear un test', icon: ListChecks },
                      { label: 'Crear tarjetas', icon: Layers },
                      { label: 'Crear un esquema', icon: Network },
                      { label: 'Extraer conceptos clave', icon: Sparkles }
                    ].map(({ label, icon: Icon }) => (
                      <button key={label} type="button"
                        onClick={() => { if (label === 'Crear tarjetas') { handleNav('tarjetas') } else { setAction(label); setActiveNav('chat') } setStudyMode(false) }}
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] cursor-pointer"
                        style={{ background: action === label ? 'var(--bg-active-nav)' : 'transparent' }}>
                        <Icon size={16} style={{ color: 'var(--text-gold)' }} />
                        <span className="flex-1">{label}</span>
                        {action === label && <Check size={14} style={{ color: 'var(--text-gold)' }} />}
                      </button>
                    ))}
                    <div className="mx-2 my-2" style={{ borderTop: '1px solid var(--border-soft, rgba(180,150,90,0.15))' }} />
                    <label className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                      <span>Profundidad</span>
                      <select aria-label="Profundidad" value={depth} onChange={(e) => setDepth(e.target.value)}
                        className="aureva-pill rounded-lg px-2 py-1.5 text-[12px] cursor-pointer"
                        style={{ color: 'var(--text-gold)' }}>
                        <option>Sencillo</option><option>Medio</option><option>Detallado</option>
                      </select>
                    </label>
                    <div className="mx-2 my-2" style={{ borderTop: '1px solid var(--border-soft, rgba(180,150,90,0.15))' }} />
                    <div className="px-3 py-1 text-[11px] uppercase tracking-widest" style={{ color: 'var(--text-gold)' }}>
                      Herramientas
                    </div>
                    {[
                      { id: 'test', label: 'Test interactivos', icon: ListChecks },
                      { id: 'tarjetas', label: 'Tarjetas interactivas', icon: Layers },
                      { id: 'mapas', label: 'Mapas conceptuales', icon: Network },
                      { id: 'podcast', label: 'Podcasts', icon: Headphones }
                    ].map(({ id, label, icon: Icon }) => (
                      <button key={id} type="button" onClick={() => { handleNav(id); setStudyMode(false) }}
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] cursor-pointer">
                        <Icon size={16} style={{ color: 'var(--text-gold)' }} />{label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pregunta lo que necesites..." className="flex-1 bg-transparent outline-none text-[14.5px] px-1" style={{ color: 'var(--text-main)' }} />
              <button type="button" className="p-2 rounded-full cursor-pointer" style={{ color: 'var(--text-soft)' }}><Mic size={18} /></button>
              <button type="submit" disabled={isLoading} className="aureva-gold-btn w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer"><Send size={15} /></button>
            </form>
          </div>
        </div>
      </main>
      {settingsOpen && <SettingsModal apiKey={apiKey} onSave={(k) => { setApiKey(k); localStorage.setItem('aureva_key', k) }} onClose={() => setSettingsOpen(false)} />}
      {profileOpen && <ProfileModal profile={profile} stats={{ chats: chats.length, resources: resources.length }} onSave={(p) => { setProfile(p); localStorage.setItem('aureva_profile', JSON.stringify(p)) }} onClose={() => setProfileOpen(false)} />}
    </div>
  )
}



