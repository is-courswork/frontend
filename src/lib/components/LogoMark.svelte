<script lang="ts">
  let { size = 32 }: { size?: number } = $props()
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 48 48"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-hidden="true"
>
  <path
    d="M5.5 31.5 24.5 21.8 35 5.5 31.5 24.5 43 30 28.3 31 15 42 18 30Z"
    fill="currentColor"
  />
  <path
    d={size < 24 ? 'm5.5 41.5 7-5.25' : 'm5.5 41.5 7-5.25M4.5 37.5l4-3'}
    stroke="currentColor"
    stroke-width={size < 24 ? 2.2 : 1.8}
    stroke-linecap="round"
  />
</svg>
