import {
  GraduationCap, BriefcaseBusiness, Heart,
  CalendarDays, Plane, Shirt, Dumbbell, Lightbulb
} from 'lucide-react'
import { AurevaPulseLogo, GoldenSilkWaves } from './AurevaArt'

const cards = [
  { title: 'Estudio', icon: GraduationCap, prompt: 'Ayúdame a estudiar: ' },
  { title: 'Trabajo', icon: BriefcaseBusiness, prompt: 'Ayúdame con un tema de trabajo: ' },
  { title: 'Salud', icon: Heart, prompt: 'Quiero consultar algo sobre salud y bienestar: ' },
  { title: 'Organización', icon: CalendarDays, prompt: 'Ayúdame a organizar: ' },
  { title: 'Viajes', icon: Plane, prompt: 'Ayúdame a planificar un viaje: ' },
  { title: 'Estilo', icon: Shirt, prompt: 'Quiero consejos de estilo: ' },
  { title: 'Deporte', icon: Dumbbell, prompt: 'Ayúdame con mi actividad deportiva: ' },
  { title: 'Ideas', icon: Lightbulb, prompt: 'Ayúdame a desarrollar una idea: ' }
]

export function ChatHome({ onSelectPrompt, profile }) {
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center w-full mx-auto py-8 px-2">
      <GoldenSilkWaves />

      <div className="relative z-10 text-center mb-10">
        <div className="flex justify-center">
          <AurevaPulseLogo />
        </div>

        <div className="w-48 h-px mx-auto my-6"
          style={{ background: 'var(--border-gold-strong)' }} />

        <h1 className="font-luxury italic text-[48px] md:text-[70px] leading-tight aureva-gold-text">
          Hola, {profile?.name || 'Claudia'}
        </h1>

        <p className="text-[16px] md:text-[19px] mt-2"
          style={{ color: 'var(--text-main)' }}>
          ¿En qué puedo ayudarte hoy?
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 w-full max-w-6xl">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.title}
              onClick={() => onSelectPrompt(card.prompt)}
              className="aureva-card rounded-[22px] min-h-[115px] px-3 py-5 flex flex-col items-center justify-center gap-3 cursor-pointer"
            >
              <Icon size={29} strokeWidth={1.5}
                style={{ color: 'var(--text-gold)' }} />
              <span className="text-[12px] md:text-[13px] font-medium"
                style={{ color: 'var(--text-main)' }}>
                {card.title}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
