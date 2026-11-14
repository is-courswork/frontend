<script lang="ts">
  import type { Snippet } from 'svelte'
  let {
    titleId,
    onclose,
    busy = false,
    children,
  }: {
    titleId: string
    onclose: () => void
    busy?: boolean
    children: Snippet
  } = $props()
  let dialog: HTMLDialogElement
  $effect(() => {
    dialog.showModal()
    return () => dialog.close()
  })
</script>

<dialog
  bind:this={dialog}
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault()
    if (!busy) onclose()
  }}
>
  {@render children()}
</dialog>
