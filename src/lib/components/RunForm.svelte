<script lang="ts">
  import { untrack } from 'svelte'
  import X from '@lucide/svelte/icons/x'
  import LoaderCircle from '@lucide/svelte/icons/loader-circle'
  import { ApiError, type Run, type RunInput } from '../api'
  import Modal from './Modal.svelte'

  let {
    run = null,
    onsave,
    onclose,
  }: {
    run?: Run | null
    onsave: (input: RunInput) => Promise<void>
    onclose: () => void
  } = $props()
  // Each create/edit action mounts a fresh form with its own initial values.
  let name = $state(untrack(() => run?.name ?? ''))
  let description = $state(untrack(() => run?.description ?? ''))
  let busy = $state(false)
  let error = $state('')
  let nameError = $state('')
  let descriptionError = $state('')

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (busy) return
    nameError = !name.trim()
      ? 'Введите имя, не из одних пробелов'
      : name.length > 120
        ? 'Максимум 120 символов'
        : ''
    descriptionError = description.length > 2000 ? 'Максимум 2000 символов' : ''
    if (nameError || descriptionError) return
    busy = true
    error = ''
    try {
      await onsave({ name, description: description || null })
    } catch (e) {
      error = e instanceof Error ? e.message : 'Не удалось сохранить прогон.'
      if (e instanceof ApiError) {
        for (const field of e.fieldErrors ?? []) {
          if (field.field === 'name') nameError = field.message
          if (field.field === 'description') descriptionError = field.message
        }
      }
    } finally {
      busy = false
    }
  }
</script>

<Modal titleId="form-title" {onclose} {busy}>
  <form onsubmit={submit} novalidate>
    <div class="dialog-heading">
      <h2 id="form-title">{run ? 'Изменить прогон' : 'Новый прогон'}</h2>
      <button
        class="btn tertiary icon-btn"
        type="button"
        onclick={onclose}
        disabled={busy}
        aria-label="Закрыть"><X size={18} /></button
      >
    </div>
    <p class="dialog-intro">Имя и описание можно изменить позже.</p>
    {#if error}<p class="error-banner" role="alert">{error}</p>{/if}
    <div class="form-field">
      <label for="run-name">Имя прогона</label>
      <input
        id="run-name"
        bind:value={name}
        oninput={() => (nameError = '')}
        maxlength="120"
        required
        disabled={busy}
        placeholder="Например, повышение цены бизнеса"
        autocomplete="off"
        aria-invalid={nameError ? true : undefined}
        aria-describedby="name-help"
      />
      <div class="help" id="name-help">
        <span class:error-text={!!nameError}
          >{nameError || 'От 1 до 120 символов'}</span
        ><span>{name.length} / 120</span>
      </div>
    </div>
    <div class="form-field">
      <label for="run-description"
        >Описание <span class="optional">· необязательно</span></label
      >
      <textarea
        id="run-description"
        bind:value={description}
        oninput={() => (descriptionError = '')}
        maxlength="2000"
        disabled={busy}
        placeholder="Что хотите проверить в этом прогоне?"
        aria-invalid={descriptionError ? true : undefined}
        aria-describedby="description-help"></textarea>
      <div class="help" id="description-help">
        <span class:error-text={!!descriptionError}
          >{descriptionError || 'До 2000 символов'}</span
        ><span>{description.length} / 2000</span>
      </div>
    </div>
    <div class="dialog-actions">
      <button
        class="btn secondary"
        type="button"
        onclick={onclose}
        disabled={busy}>Отмена</button
      >
      <button class="btn" type="submit" disabled={busy}
        >{#if busy}<LoaderCircle size={16} class="spin" />Сохранение…{:else}{run
            ? 'Сохранить'
            : 'Создать прогон'}{/if}</button
      >
    </div>
  </form>
</Modal>
