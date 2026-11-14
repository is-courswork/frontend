<script lang="ts">
  import { onMount } from 'svelte'
  import Send from '@lucide/svelte/icons/send'
  import Notebook from '@lucide/svelte/icons/notebook'
  import Plus from '@lucide/svelte/icons/plus'
  import ChevronRight from '@lucide/svelte/icons/chevron-right'
  import ArrowLeft from '@lucide/svelte/icons/arrow-left'
  import Pencil from '@lucide/svelte/icons/pencil'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import LoaderCircle from '@lucide/svelte/icons/loader-circle'
  import RotateCw from '@lucide/svelte/icons/rotate-cw'
  import ExternalLink from '@lucide/svelte/icons/external-link'
  import { api, ApiError, type Run, type RunInput } from './lib/api'
  import StatusBadge from './lib/components/StatusBadge.svelte'
  import RunForm from './lib/components/RunForm.svelte'
  import Modal from './lib/components/Modal.svelte'

  let path = $state(window.location.pathname)
  let refresh = $state(0)
  const runId = $derived(path.match(/^\/runs\/([^/]+)\/?$/)?.[1] ?? null)
  const knownPath = $derived(
    path === '/' || path === '/runs' || path === '/runs/' || !!runId,
  )
  let runs = $state<Run[]>([])
  let run = $state<Run | null>(null)
  let loading = $state(true)
  let error = $state('')
  let notFound = $state(false)
  let formOpen = $state(false)
  let editing = $state<Run | null>(null)
  let deleteOpen = $state(false)
  let deleting = $state(false)
  let deleteError = $state('')
  let toast = $state('')
  let toastTimer: ReturnType<typeof setTimeout>

  onMount(() => {
    const pop = () => {
      path = window.location.pathname
    }
    window.addEventListener('popstate', pop)
    return () => {
      window.removeEventListener('popstate', pop)
      clearTimeout(toastTimer)
    }
  })
  $effect(() => {
    const id = runId
    const valid = knownPath
    void refresh
    const controller = new AbortController()
    void load(id, valid, controller.signal)
    return () => controller.abort()
  })

  async function load(id: string | null, valid: boolean, signal: AbortSignal) {
    loading = true
    error = ''
    notFound = !valid
    run = null
    try {
      if (!valid) return
      if (id) run = await api.get(id, signal)
      else runs = await api.all(signal)
    } catch (e) {
      if (signal.aborted) return
      notFound = e instanceof ApiError && e.status === 404
      error = e instanceof Error ? e.message : 'Не удалось загрузить прогоны.'
    } finally {
      if (!signal.aborted) loading = false
    }
  }
  function navigate(event: MouseEvent, target: string) {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return
    event.preventDefault()
    window.history.pushState(null, '', target)
    path = target
    window.scrollTo({ top: 0 })
  }
  function notify(message: string) {
    toast = message
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toast = ''), 3500)
  }
  function openForm(existing: Run | null = null) {
    editing = existing
    formOpen = true
  }
  async function save(input: RunInput) {
    if (editing) await api.update(editing.id, input)
    else await api.create(input)
    formOpen = false
    refresh += 1
    notify(editing ? 'Изменения сохранены' : 'Прогон создан')
  }
  async function remove() {
    if (!run || deleting) return
    deleting = true
    deleteError = ''
    try {
      await api.delete(run.id)
      deleteOpen = false
      window.history.pushState(null, '', '/runs')
      path = '/runs'
      notify('Прогон удалён')
    } catch (e) {
      deleteError =
        e instanceof Error ? e.message : 'Не удалось удалить прогон.'
    } finally {
      deleting = false
    }
  }
</script>

<svelte:head
  ><title>{run ? `${run.name} — Airlines` : 'Прогоны — Airlines'}</title><meta
    name="description"
    content="Прогоны и гипотезы Airlines"
  /></svelte:head
>

<div class="app-shell">
  <aside>
    <a
      href="/runs"
      class="brand"
      onclick={(e) => navigate(e, '/runs')}
      aria-label="Airlines — все прогоны"
      ><Send size={25} strokeWidth={1.7} />Airlines</a
    >
    <nav class="navigation" aria-label="Основная навигация">
      <a href="/runs" aria-current="page" onclick={(e) => navigate(e, '/runs')}
        ><Notebook size={18} />Прогоны</a
      >
    </nav>
    <a
      class="aside-link"
      href="https://airlines.arhr.tech/info"
      target="_blank"
      rel="noopener noreferrer">О проекте<ExternalLink size={13} /></a
    >
  </aside>
  <main id="main">
    <header class="topbar">
      <span>{runId ? 'Прогоны / Обзор' : 'Рабочее пространство / Прогоны'}</span
      >
    </header>
    <div class="content">
      {#if runId}<a
          href="/runs"
          class="back"
          onclick={(e) => navigate(e, '/runs')}
          ><ArrowLeft size={16} />Все прогоны</a
        >{/if}
      {#if !runId && knownPath}
        <div class="heading-row">
          <div>
            <p class="eyebrow">Рабочее пространство</p>
            <h1>Прогоны</h1>
            <p class="lead">
              Ваши гипотезы. Каждый прогон — отдельный сценарий.
            </p>
          </div>
          <button class="btn" onclick={() => openForm()}
            ><Plus size={17} />Новый прогон</button
          >
        </div>
      {/if}
      {#if loading}
        <div class="state-message" role="status">
          <LoaderCircle size={19} class="spin" /><span
            >Загружаем {runId ? 'прогон' : 'прогоны'}…</span
          >
        </div>
      {:else if notFound}
        <section class="empty">
          <h1>{runId ? 'Прогон не найден' : 'Страница не найдена'}</h1>
          <p>Возможно, ссылка изменилась или прогон был удалён.</p>
          <a
            class="btn secondary"
            href="/runs"
            onclick={(e) => navigate(e, '/runs')}>К списку прогонов</a
          >
        </section>
      {:else if error}
        <section class="empty">
          <h2>Не удалось загрузить данные</h2>
          <p role="alert">{error}</p>
          <button class="btn secondary" onclick={() => (refresh += 1)}
            ><RotateCw size={16} />Попробовать снова</button
          >
        </section>
      {:else if run}
        <div class="heading-row">
          <div class="detail-title">
            <h1>{run.name}</h1>
            <StatusBadge status={run.status} />
          </div>
          <div class="detail-actions">
            <button class="btn secondary" onclick={() => openForm(run)}
              ><Pencil size={16} />Изменить</button
            ><button
              class="btn tertiary icon-btn"
              onclick={() => {
                deleteError = ''
                deleteOpen = true
              }}
              aria-label="Удалить прогон"><Trash2 size={18} /></button
            >
          </div>
        </div>
        <section class="detail-description">
          <h2 class="field-label">Описание</h2>
          <p class="prose" class:no-description={!run.description}>
            {run.description || 'Описание пока не добавлено.'}
          </p>
        </section>
      {:else if runs.length}
        <div class="list-caption" aria-hidden="true">
          <span>Имя и описание</span><span>Статус</span>
        </div>
        <ul class="runs" aria-label="Список прогонов">
          {#each runs as item (item.id)}<li>
              <a
                class="run-row"
                href="/runs/{item.id}"
                onclick={(e) => navigate(e, `/runs/${item.id}`)}
                ><span class="min-w-0"
                  ><span class="run-name">{item.name}</span><span
                    class="run-description"
                    >{item.description || 'Без описания'}</span
                  ></span
                ><StatusBadge status={item.status} /><ChevronRight
                  size={18}
                  class="run-arrow"
                /></a
              >
            </li>{/each}
        </ul>
        <p class="list-foot">Всего прогонов: {runs.length}</p>
      {:else}
        <section class="empty">
          <h2>Начнём с гипотезы</h2>
          <p>Создайте первый прогон, задайте имя и добавьте описание.</p>
          <button class="btn secondary" onclick={() => openForm()}
            ><Plus size={17} />Создать прогон</button
          >
        </section>
      {/if}
    </div>
  </main>
</div>

{#if formOpen}<RunForm
    run={editing}
    onsave={save}
    onclose={() => (formOpen = false)}
  />{/if}
{#if deleteOpen && run}
  <Modal
    titleId="delete-title"
    onclose={() => (deleteOpen = false)}
    busy={deleting}
  >
    <div class="dialog-heading"><h2 id="delete-title">Удалить прогон?</h2></div>
    <p class="dialog-intro">
      Прогон «{run.name}» будет удалён. Это действие нельзя отменить.
    </p>
    {#if deleteError}<p class="error-banner" role="alert">{deleteError}</p>{/if}
    <div class="dialog-actions">
      <button
        class="btn secondary"
        onclick={() => (deleteOpen = false)}
        disabled={deleting}>Отмена</button
      ><button class="btn danger" onclick={remove} disabled={deleting}
        >{#if deleting}<LoaderCircle
            size={16}
            class="spin"
          />Удаление…{:else}Удалить прогон{/if}</button
      >
    </div>
  </Modal>
{/if}
<div class="toast" role="status" aria-live="polite" hidden={!toast}>
  {toast}
</div>
