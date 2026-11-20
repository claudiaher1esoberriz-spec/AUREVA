import { privateStorage } from '../lib/privateStorage.js'
const STORAGE_KEY = 'aureva_study_plans_v1'

export function getStudyPlans() {
  try {
    const data = JSON.parse(privateStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function saveStudyPlans(plans) {
  try {
    privateStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
    return true
  } catch {
    return false
  }
}

export function generateStudySchedule({
  subject,
  topics,
  examDate,
  minutesPerDay
}) {
  const names = topics
    .split('\n')
    .map(topic => topic.trim())
    .filter(Boolean)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const exam = new Date(`${examDate}T00:00:00`)
  const days = Math.round((exam - today) / 86400000)

  if (!subject.trim()) throw new Error('Introduce una asignatura.')
  if (!names.length) throw new Error('Introduce al menos un tema.')
  if (!Number.isFinite(days) || days < 1) {
    throw new Error('Selecciona una fecha de examen futura.')
  }

  const dailyMinutes = Number(minutesPerDay)
  if (!Number.isFinite(dailyMinutes) || dailyMinutes < 15) {
    throw new Error('Introduce al menos 15 minutos diarios.')
  }

  const sessions = []

  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)

    const topicIndex = Math.min(
      Math.floor((i * names.length) / Math.max(1, days)),
      names.length - 1
    )

    sessions.push({
      date: [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
      ].join('-'),
      topic: names[topicIndex],
      minutes: dailyMinutes,
      type: i >= Math.floor(days * 0.8) ? 'Repaso y práctica' : 'Estudio'
    })
  }

  return {
    id: crypto.randomUUID(),
    subject: subject.trim(),
    topics: names,
    examDate,
    minutesPerDay: dailyMinutes,
    sessions,
    createdAt: new Date().toISOString()
  }
}
