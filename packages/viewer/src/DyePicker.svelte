<script lang="ts">
  import type { DyeColor } from './dye-colors'
  import DyeOptionsGrid from './DyeOptionsGrid.svelte'
  export let color: DyeColor | null = null
  export let disabled: boolean = true

  let dialogEl: HTMLDialogElement
  let isOpen = false
  function showOptions() {
    isOpen = true
    dialogEl.showModal()
  }
  function closeModal(e: any) {
    if (e?.detail) {
      color = e.detail
    }
    dialogEl.close()
    isOpen = false
  }
</script>

<div class="join join-horizontal w-full">
  <button class="btn btn-square join-item" disabled={disabled ? true : null} on:click={() => (color = null)}>
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <button
    on:click={showOptions}
    disabled={disabled ? true : null}
    class="btn join-item flex-1 px-0"
    style="background-color: {disabled ? '' : color?.Color}"
  />
</div>

<dialog bind:this={dialogEl} class="w-[600px] h-[600px] p-3 flex flex-col gap-1" class:hidden={!isOpen}>
  {#if isOpen}
    <div class="flex-1 overflow-auto">
      <DyeOptionsGrid on:select={(e) => closeModal(e)} />
    </div>
    <button class="btn btn-primary flex-none" on:click={() => closeModal(null)}>CLOSE</button>
  {/if}
</dialog>
