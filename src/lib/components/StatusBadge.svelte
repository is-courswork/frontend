<script lang="ts">
  import type { RunStatus } from '../api'
  let { status }: { status: RunStatus } = $props()
  const labels: Record<RunStatus, string> = {
    DRAFT: 'Черновик',
    RUNNING: 'Выполняется',
    PAUSED: 'На паузе',
    FINISHED: 'Завершён',
    CANCELLED: 'Отменён',
    FAILED: 'Ошибка',
  }
</script>

<span class="badge {status}">{labels[status] ?? status}</span>
