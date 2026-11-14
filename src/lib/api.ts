export type RunStatus =
  'DRAFT' | 'RUNNING' | 'PAUSED' | 'FINISHED' | 'CANCELLED' | 'FAILED'

export interface Run {
  id: string
  name: string
  description?: string | null
  status: RunStatus
  createdAt: string
  startedAt?: string
  finishedAt?: string
}

export interface RunInput {
  name: string
  description: string | null
}
interface ErrorResponse {
  message?: string
  fieldErrors?: { field: string; message: string }[]
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors: ErrorResponse['fieldErrors'] = [],
  ) {
    super(message)
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/core${path}`, {
      ...options,
      headers: { Accept: 'application/json', ...options.headers },
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(20_000)])
        : AbortSignal.timeout(20_000),
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ApiError(
      0,
      'Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.',
    )
  }
  if (!response.ok) {
    const body: ErrorResponse = await response.json().catch(() => ({}))
    const fallback =
      response.status === 404
        ? 'Прогон не найден.'
        : 'Не удалось выполнить запрос. Попробуйте ещё раз.'
    throw new ApiError(
      response.status,
      body.message || fallback,
      body.fieldErrors,
    )
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function json(
  method: string,
  input: { name: string; description?: string | null },
): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }
}

export const api = {
  all: (signal?: AbortSignal) => request<Run[]>('/run/all', { signal }),
  get: (id: string, signal?: AbortSignal) =>
    request<Run>(`/run/${encodeURIComponent(id)}`, { signal }),
  create: (input: RunInput) =>
    request<Run>(
      '/run',
      json('POST', {
        name: input.name,
        description: input.description ?? undefined,
      }),
    ),
  update: (id: string, input: RunInput) =>
    request<Run>(`/run/${encodeURIComponent(id)}`, json('PATCH', input)),
  delete: (id: string) =>
    request<void>(`/run/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
