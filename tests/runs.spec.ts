import { test, expect, type Page } from '@playwright/test'

const id = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
const original = {
  id,
  name: 'Базовый сценарий',
  description: 'Исходная гипотеза',
  status: 'RUNNING',
  createdAt: '2026-11-14T00:00:00Z',
}

// Intercept every API request: browser tests must never modify the real database.
async function mockApi(page: Page) {
  let runs = [{ ...original }]
  const writes: { method: string; body: unknown }[] = []
  await page.route('**/api/core/**', async (route) => {
    const request = route.request()
    const method = request.method()
    const path = new URL(request.url()).pathname
    if (method === 'GET' && path === '/api/core/run/all')
      return route.fulfill({ json: runs })
    if (method === 'GET' && path === `/api/core/run/${id}` && runs.length)
      return route.fulfill({ json: runs[0] })
    if (method === 'POST' && path === '/api/core/run') {
      const body = request.postDataJSON()
      writes.push({ method, body })
      const run = { ...original, ...body, status: 'DRAFT' }
      runs = [run]
      return route.fulfill({ status: 201, json: run })
    }
    if (method === 'PATCH' && path === `/api/core/run/${id}`) {
      const body = request.postDataJSON()
      writes.push({ method, body })
      runs[0] = { ...runs[0], ...body }
      return route.fulfill({ json: runs[0] })
    }
    if (method === 'DELETE' && path === `/api/core/run/${id}`) {
      writes.push({ method, body: null })
      runs = []
      return route.fulfill({ status: 204 })
    }
    return route.fulfill({ status: 404, json: { message: 'Прогон не найден' } })
  })
  return writes
}

test('open a run, edit its description without changing status, then delete', async ({
  page,
}) => {
  const writes = await mockApi(page)
  await page.goto('/')
  await page.getByRole('link', { name: /Базовый сценарий/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Базовый сценарий' }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByText('Исходная гипотеза')).toBeVisible()
  await page.getByRole('button', { name: 'Изменить', exact: true }).click()
  await page.getByLabel('Описание', { exact: false }).fill('')
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByText('Описание пока не добавлено.')).toBeVisible()
  await expect(page.locator('.badge')).toHaveText('Выполняется')
  expect(writes[0]).toEqual({
    method: 'PATCH',
    body: { name: original.name, description: null },
  })
  await page.getByRole('button', { name: 'Удалить прогон' }).click()
  await page.getByRole('button', { name: 'Отмена', exact: true }).click()
  expect(writes).toHaveLength(1)
  await page.getByRole('button', { name: 'Удалить прогон' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Удалить прогон' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Начнём с гипотезы' }),
  ).toBeVisible()
  expect(writes[1].method).toBe('DELETE')
})

test('create with field limits and retry a failed load on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const writes = await mockApi(page)
  let failed = false
  await page.route('**/api/core/run/all', async (route) => {
    if (!failed) {
      failed = true
      return route.fulfill({
        status: 503,
        json: { message: 'Временная ошибка' },
      })
    }
    return route.fallback()
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Временная ошибка')
  await page.getByRole('button', { name: 'Попробовать снова' }).click()
  await expect(page.locator('.run-row')).toHaveCount(1)
  await page.getByRole('button', { name: 'Новый прогон' }).click()
  await page.getByLabel('Имя прогона', { exact: true }).fill('   ')
  await page
    .getByRole('button', { name: 'Создать прогон', exact: true })
    .click()
  await expect(
    page.getByText('Введите имя, не из одних пробелов'),
  ).toBeVisible()
  expect(writes).toHaveLength(0)
  await expect(page.getByLabel('Имя прогона', { exact: true })).toHaveAttribute(
    'maxlength',
    '120',
  )
  await expect(page.getByLabel('Описание', { exact: false })).toHaveAttribute(
    'maxlength',
    '2000',
  )
  const name = 'н'.repeat(120),
    description = 'д'.repeat(2000)
  await page.getByLabel('Имя прогона', { exact: true }).fill(name)
  await page.getByLabel('Описание', { exact: false }).fill(description)
  await page
    .getByRole('button', { name: 'Создать прогон', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(writes[0]).toEqual({ method: 'POST', body: { name, description } })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})
