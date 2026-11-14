import { ApiError, type Run, type RunInput, type api } from './api'

// Loaded only by Vite's development preview. It never calls the real API.
let runs: Run[] = [
  {
    id: 'preview-running',
    name: 'Динамическое ценообразование',
    description:
      'Проверяем, как изменение цены билета влияет на загрузку рейса и итоговую выручку.',
    status: 'RUNNING',
    createdAt: '2026-11-14T12:00:00Z',
  },
  {
    id: 'preview-draft',
    name: 'Новая программа лояльности',
    description: 'Сравнение условий участия для новых и постоянных пассажиров.',
    status: 'DRAFT',
    createdAt: '2026-11-14T11:00:00Z',
  },
  {
    id: 'preview-paused',
    name: 'Сезонный спрос на дальнемагистральные перелёты',
    description:
      'Оценка сезонного спроса. Длинное имя также показывает затухание текста в списке.',
    status: 'PAUSED',
    createdAt: '2026-11-14T10:00:00Z',
  },
  {
    id: 'preview-finished',
    name: 'Раннее бронирование',
    description: 'Проверка гипотезы о скидках при покупке билета заранее.',
    status: 'FINISHED',
    createdAt: '2026-11-14T09:00:00Z',
  },
  {
    id: 'preview-cancelled',
    name: 'Дополнительный вечерний рейс',
    description: 'Оценка загрузки при добавлении ещё одного вечернего вылета.',
    status: 'CANCELLED',
    createdAt: '2026-11-14T08:00:00Z',
  },
  {
    id: 'preview-failed',
    name: 'Пересадочные маршруты',
    description: 'Сценарий с ошибкой для просмотра оформления этого статуса.',
    status: 'FAILED',
    createdAt: '2026-11-14T07:00:00Z',
  },
]

function find(id: string): Run {
  const run = runs.find((item) => item.id === id)
  if (!run) throw new ApiError(404, 'Прогон не найден.')
  return run
}

export const previewApi: typeof api = {
  async all(signal?: AbortSignal) {
    signal?.throwIfAborted()
    return structuredClone(runs)
  },
  async get(id: string, signal?: AbortSignal) {
    signal?.throwIfAborted()
    return structuredClone(find(id))
  },
  async create(input: RunInput) {
    const run: Run = {
      ...input,
      id: crypto.randomUUID(),
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    }
    runs.unshift(run)
    return structuredClone(run)
  },
  async update(id: string, input: RunInput) {
    const run = find(id)
    Object.assign(run, input)
    return structuredClone(run)
  },
  async delete(id: string) {
    find(id)
    runs = runs.filter((item) => item.id !== id)
  },
}
