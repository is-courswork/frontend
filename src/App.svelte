<script lang="ts">
  import { onMount } from 'svelte'
  import Plus from '@lucide/svelte/icons/plus'
  import ArrowRight from '@lucide/svelte/icons/arrow-right'
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
  import LogoMark from './lib/components/LogoMark.svelte'

  let path = $state(window.location.pathname)
  let refresh = $state(0)
  const preview =
    import.meta.env.DEV &&
    (window.location.pathname === '/preview' ||
      window.location.pathname.startsWith('/preview/'))
  const homePath = preview ? '/preview' : '/'
  const runsPath = preview ? '/preview/runs' : '/runs'
  const client = preview
    ? import('./lib/preview').then(({ previewApi }) => previewApi)
    : Promise.resolve(api)
  const runId = $derived(
    path.match(
      preview ? /^\/preview\/runs\/([^/]+)\/?$/ : /^\/runs\/([^/]+)\/?$/,
    )?.[1] ?? null,
  )
  const inRuns = $derived(
    path === runsPath || path === `${runsPath}/` || !!runId,
  )
  let runs = $state<Run[]>([])
  let listLoading = $state(false)
  let listError = $state('')
  let run = $state<Run | null>(null)
  let loading = $state(false)
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
    const active = inRuns
    void refresh
    if (!active) return
    const controller = new AbortController()
    void loadList(controller.signal)
    return () => controller.abort()
  })
  $effect(() => {
    const id = runId
    void refresh
    if (!id) {
      run = null
      loading = false
      error = ''
      notFound = false
      return
    }
    const controller = new AbortController()
    void loadRun(id, controller.signal)
    return () => controller.abort()
  })

  async function loadList(signal: AbortSignal) {
    listLoading = true
    listError = ''
    try {
      runs = await (await client).all(signal)
    } catch (e) {
      if (!signal.aborted)
        listError =
          e instanceof Error ? e.message : 'Не удалось загрузить список.'
    } finally {
      if (!signal.aborted) listLoading = false
    }
  }
  async function loadRun(id: string, signal: AbortSignal) {
    loading = true
    error = ''
    notFound = false
    run = null
    try {
      run = await (await client).get(id, signal)
    } catch (e) {
      if (signal.aborted) return
      notFound = e instanceof ApiError && e.status === 404
      error = e instanceof Error ? e.message : 'Не удалось загрузить прогон.'
    } finally {
      if (!signal.aborted) loading = false
    }
  }
  function go(target: string) {
    if (target !== path) window.history.pushState(null, '', target)
    path = target
    window.scrollTo({ top: 0 })
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
    go(target)
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
    const updating = !!editing
    const saved = editing
      ? await (await client).update(editing.id, input)
      : await (await client).create(input)
    formOpen = false
    refresh += 1
    go(`${runsPath}/${saved.id}`)
    notify(updating ? 'Изменения сохранены' : 'Прогон создан')
  }
  async function remove() {
    if (!run || deleting) return
    deleting = true
    deleteError = ''
    try {
      await (await client).delete(run.id)
      deleteOpen = false
      refresh += 1
      go(runsPath)
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
  ><title
    >{run
      ? `${run.name} — Airlines`
      : inRuns
        ? 'Прогоны — Airlines'
        : 'Airlines'}</title
  ><meta
    name="description"
    content="Система проверки гипотез для авиакомпаний"
  /></svelte:head
>

{#if path === homePath}
  <div class="landing-shell">
    <main>
      <section class="landing-content">
        <div class="landing-symbol">
          <LogoMark size={76} />
        </div>
        <h1>Airlines</h1>
        <p class="landing-description">
          Система проверки гипотез<br class="desktop-break" /> для авиакомпаний
        </p>
        <a
          class="section-link"
          href={runsPath}
          onclick={(e) => navigate(e, runsPath)}
          >Прогоны<ArrowRight size={16} /></a
        >
      </section>
    </main>
    <footer class="landing-footer">
      <a
        class="quiet-link"
        href="https://airlines.arhr.tech/info"
        target="_blank"
        rel="noopener noreferrer">О проекте<ExternalLink size={13} /></a
      >
      {#if import.meta.env.DEV}
        <a class="quiet-link" href={preview ? '/' : '/preview/runs'}
          >{preview ? 'Выйти из примеров' : 'Примеры прогонов'}</a
        >
      {/if}
    </footer>
  </div>
{:else if inRuns}
  <div class="workspace" class:has-selection={!!runId}>
    <aside class="run-sidebar">
      <a
        href={homePath}
        class="brand"
        onclick={(e) => navigate(e, homePath)}
        aria-label="Airlines — главная"><LogoMark />Airlines</a
      >
      <div class="sidebar-heading">
        <h1>Прогоны</h1>
        <span class="run-count" aria-label="Всего прогонов"
          >{listLoading ? '…' : runs.length}</span
        >
        <button
          class="create-run"
          onclick={() => openForm()}
          aria-label="Новый прогон"
          title="Новый прогон"><Plus size={19} strokeWidth={1.6} /></button
        >
      </div>
      <nav class="run-navigation" aria-label="Список прогонов">
        {#if listLoading && !runs.length}<div
            class="sidebar-state"
            role="status"
          >
            <LoaderCircle size={16} class="spin" />Загружаем прогоны…
          </div>
        {:else if listError}<div class="sidebar-state sidebar-error">
            <p role="alert">{listError}</p>
            <button class="btn secondary" onclick={() => (refresh += 1)}
              ><RotateCw size={14} />Попробовать снова</button
            >
          </div>
        {:else if runs.length}
          {#each runs as item (item.id)}<a
              class="run-entry"
              href="{runsPath}/{item.id}"
              aria-current={runId === item.id ? 'page' : undefined}
              title={item.name}
              onclick={(e) => navigate(e, `${runsPath}/${item.id}`)}
              ><span class="run-name">{item.name}</span><StatusBadge
                status={item.status}
              /></a
            >{/each}
        {:else}<p class="sidebar-empty">
            Пока нет прогонов.<br />Создайте первый, чтобы начать.
          </p>{/if}
      </nav>
      <footer class="sidebar-footer">
        {#if preview}<div class="preview-note">
            <span>Примеры прогонов</span><a href="/runs">Выйти</a>
          </div>{/if}
        <a
          class="quiet-link"
          href="https://airlines.arhr.tech/info"
          target="_blank"
          rel="noopener noreferrer">О проекте<ExternalLink size={13} /></a
        >
      </footer>
    </aside>
    <main class="run-content">
      <div class="mobile-detail-header">
        <a href={runsPath} class="back" onclick={(e) => navigate(e, runsPath)}
          ><ArrowLeft size={16} />Все прогоны</a
        ><a
          href={homePath}
          class="mobile-home"
          aria-label="Airlines — главная"
          onclick={(e) => navigate(e, homePath)}><LogoMark size={28} /></a
        >
      </div>
      {#if !runId}
        <section class="welcome">
          <h2>
            {!listLoading && !listError && !runs.length
              ? 'Ваш первый прогон'
              : 'Выберите прогон'}
          </h2>
          <p>
            {!listLoading && !listError && !runs.length
              ? 'Создайте прогон, задайте имя и добавьте описание.'
              : 'Откройте прогон в списке слева или создайте новый.'}
          </p>
          <button class="btn secondary" onclick={() => openForm()}
            ><Plus size={16} />Создать прогон</button
          >
        </section>
      {:else if loading}
        <div class="state-message" role="status">
          <LoaderCircle size={19} class="spin" />Загружаем прогон…
        </div>
      {:else if notFound}
        <section class="welcome">
          <h1>Прогон не найден</h1>
          <p>Возможно, он был удалён. Выберите другой прогон в списке.</p>
          <a
            class="btn secondary"
            href={runsPath}
            onclick={(e) => navigate(e, runsPath)}>К списку прогонов</a
          >
        </section>
      {:else if error}
        <section class="welcome">
          <h2>Не удалось загрузить прогон</h2>
          <p role="alert">{error}</p>
          <button class="btn secondary" onclick={() => (refresh += 1)}
            ><RotateCw size={16} />Попробовать снова</button
          >
        </section>
      {:else if run}
        <article class="run-detail">
          <div class="detail-header">
            <div class="run-title-line">
              <h1>{run.name}</h1>
              <StatusBadge status={run.status} />
            </div>
            <div class="detail-actions">
              <button class="btn secondary" onclick={() => openForm(run)}
                ><Pencil size={15} />Изменить</button
              ><button
                class="btn tertiary icon-btn"
                onclick={() => {
                  deleteError = ''
                  deleteOpen = true
                }}
                aria-label="Удалить прогон"><Trash2 size={17} /></button
              >
            </div>
          </div>
          <section class="detail-description" aria-label="Описание">
            <p class="prose" class:no-description={!run.description}>
              {run.description || 'Описание пока не добавлено.'}
            </p>
          </section>
        </article>
      {/if}
    </main>
  </div>
{:else}
  <main class="welcome unknown-page">
    <h1>Страница не найдена</h1>
    <a
      class="btn secondary"
      href={homePath}
      onclick={(e) => navigate(e, homePath)}>На главную</a
    >
  </main>
{/if}

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
