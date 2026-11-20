import { useEffect, useState } from 'react'
import {
  BookOpen, Brain, ClipboardCheck, CalendarDays,
  FolderOpen, ArrowRight, Plus, Clock, Trash2,
  GraduationCap, CheckCircle2
} from 'lucide-react'
import {
  getStudyPlans,
  saveStudyPlans,
  generateStudySchedule
} from '../services/studyPlanner'

const sections = [
  {
    title: 'APRENDER',
    description: 'Resúmenes, explicaciones y mapas conceptuales.',
    icon: BookOpen,
    actions: [
      { label: 'Mis apuntes', id: 'recursos' },
        { label: 'Resúmenes y explicaciones', id: 'aprender' },
      { label: 'Mapas conceptuales', id: 'mapas' }
    ]
  },
  {
    title: 'MEMORIZAR',
    description: 'Entrena tu memoria y comprueba lo aprendido.',
    icon: Brain,
    actions: [
      { label: 'Flashcards', id: 'tarjetas' },
      { label: 'Test interactivos', id: 'test' }
    ]
  },
  {
    title: 'EXAMEN FINAL',
    description: 'Comprueba si estás preparado para el examen.',
    icon: ClipboardCheck,
    actions: [
      { label: 'Practicar examen', id: 'test' }
    ]
  }
]

export function StudyDashboard({ onNavigate }) {
  const [plans, setPlans] = useState([])
  const [subject, setSubject] = useState('')
  const [topics, setTopics] = useState('')
  const [examDate, setExamDate] = useState('')
  const [minutes, setMinutes] = useState('60')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    setPlans(getStudyPlans())
  }, [])

  function createPlan(e) {
    e.preventDefault()
    setError('')

    try {
      const plan = generateStudySchedule({
        subject,
        topics,
        examDate,
        minutesPerDay: minutes
      })

      const updated = [...plans, plan]

      if (!saveStudyPlans(updated)) {
        throw new Error('No se pudo guardar el plan.')
      }

      setPlans(updated)
      setSubject('')
      setTopics('')
      setExamDate('')
      setMinutes('60')
      setExpanded(plan.id)
    } catch (err) {
      setError(err.message)
    }
  }

  function deletePlan(id) {
    const updated = plans.filter(p => p.id !== id)
    saveStudyPlans(updated)
    setPlans(updated)
  }

  return (
    <div className="max-w-5xl w-full mx-auto py-8 space-y-8"
      style={{ color: 'var(--text-main)' }}>

      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <GraduationCap size={30}
            style={{ color: 'var(--text-gold)' }} />
          <h1 className="text-3xl font-semibold">MODO ESTUDIO</h1>
        </div>
        <p className="text-sm opacity-75">
          Tu espacio personal para aprender, memorizar y preparar tus exámenes.
        </p>
      </header>

      <section className="aureva-card rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <CalendarDays size={24}
            style={{ color: 'var(--text-gold)' }} />
          <div>
            <h2 className="text-xl font-semibold">Mi plan de estudio</h2>
            <p className="text-sm opacity-70">
              Organiza tus asignaturas y prepara tu próximo examen.
            </p>
          </div>
        </div>

        <form onSubmit={createPlan} className="space-y-4">

          <div className="space-y-2">
            <label className="text-sm font-medium">Asignatura</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Ej. Biología celular"
              className="w-full rounded-xl p-3 outline-none"
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-gold)',
                color: 'var(--text-main)'
              }}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Temas que entran en el examen
            </label>
            <textarea
              value={topics}
              onChange={e => setTopics(e.target.value)}
              rows={6}
              placeholder={'Introduce un tema por línea:\nTema 1. Introducción\nTema 2. La célula\nTema 3. Membrana plasmática'}
              className="w-full rounded-xl p-3 outline-none resize-y"
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-gold)',
                color: 'var(--text-main)'
              }}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Fecha del examen
              </label>
              <input
                type="date"
                value={examDate}
                min={new Date().toLocaleDateString('en-CA')}
                onChange={e => setExamDate(e.target.value)}
                className="w-full rounded-xl p-3"
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-gold)',
                  color: 'var(--text-main)'
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Tiempo diario disponible
              </label>
              <select
                value={minutes}
                onChange={e => setMinutes(e.target.value)}
                className="w-full rounded-xl p-3"
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-gold)',
                  color: 'var(--text-main)'
                }}
              >
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
                <option value="90">1 hora y media</option>
                <option value="120">2 horas</option>
                <option value="180">3 horas</option>
                <option value="240">4 horas</option>
              </select>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-500">{error}</p>
          )}

          <button
            type="submit"
            className="aureva-gold-btn rounded-xl px-5 py-3 flex items-center gap-2"
          >
            <Plus size={18} />
            Crear mi plan de estudio
          </button>
        </form>
      </section>

      {plans.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Mis planes guardados</h2>

          {plans.map(plan => (
            <div key={plan.id}
              className="aureva-card rounded-2xl p-5 space-y-4">

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setExpanded(
                    expanded === plan.id ? null : plan.id
                  )}
                  className="text-left flex-1"
                >
                  <h3 className="font-semibold">{plan.subject}</h3>
                  <p className="text-sm opacity-70">
                    {plan.topics.length} temas · Examen: {plan.examDate}
                  </p>
                </button>

                <button
                  onClick={() => deletePlan(plan.id)}
                  title="Eliminar plan"
                  className="p-2"
                >
                  <Trash2 size={17} />
                </button>
              </div>

              {expanded === plan.id && (
                <div className="space-y-3">
                  {plan.sessions.map((session, i) => (
                    <div key={i}
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{ background: 'var(--bg-main)' }}>
                      <CalendarDays size={18}
                        style={{ color: 'var(--text-gold)' }} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {session.date}
                        </p>
                        <p className="text-sm opacity-75">
                          {session.topic}
                        </p>
                        <p className="text-xs opacity-60">
                          {session.type}
                        </p>
                      </div>
                      <span className="text-xs">
                        {session.minutes} min
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {sections.map(({ title, description, icon: Icon, actions }) => (
          <div key={title}
            className="aureva-card rounded-2xl p-5 space-y-5">
            <Icon size={27}
              style={{ color: 'var(--text-gold)' }} />
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm opacity-75">{description}</p>

            <div className="space-y-2">
              {actions.map(({ label, id }) => (
                <button
                  key={label}
                  onClick={() => onNavigate(id)}
                  className="aureva-pill w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm"
                >
                  {label}
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onNavigate('recursos')}
        className="aureva-pill flex items-center gap-3 rounded-xl px-5 py-3"
      >
        <FolderOpen size={19} />
        Abrir mi biblioteca de apuntes
      </button>
    </div>
  )
}
