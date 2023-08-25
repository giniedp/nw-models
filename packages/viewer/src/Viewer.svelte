<script lang="ts">
  import type { BabylonViewer } from './babylon-viewer/viewer'
  import { showBabylonViewer } from './babylon-viewer/viewer'
  import { derived } from 'svelte/store'
  import type { Writable, Readable } from 'svelte/store'
  import DyePicker from './DyePicker.svelte'
  import type { DyeColor } from './dye-colors'

  export function show(modelUrl: string) {
    close()
    dialogEl.showModal()
    const el = document.createElement('div')
    containerEl.appendChild(el)
    viewer = showBabylonViewer({
      el,
      modelUrl,
    })
    dyeR = viewer.dyeR
    dyeG = viewer.dyeG
    dyeB = viewer.dyeB
    dyeA = viewer.dyeA
    debugMask = viewer.debugMask
    dyeRDisabled = derived(viewer.appearance, (appearance) => appearance?.RDyeSlotDisabled !== '0')
    dyeGDisabled = derived(viewer.appearance, (appearance) => appearance?.GDyeSlotDisabled !== '0')
    dyeBDisabled = derived(viewer.appearance, (appearance) => appearance?.BDyeSlotDisabled !== '0')
    dyeADisabled = derived(viewer.appearance, (appearance) => appearance?.ADyeSlotDisabled !== '0')
    showDye = derived(viewer.appearance, (appearance) => !!appearance)
  }

  export function close() {
    if (viewer) {
      viewer.dispose()
      viewer = null
    }
    dialogEl.close()
    containerEl.innerHTML = ''
  }

  let dialogEl: HTMLDialogElement
  let containerEl: HTMLElement
  let viewer: BabylonViewer | null
  let dyeR: Writable<DyeColor | null>
  let dyeG: Writable<DyeColor | null>
  let dyeB: Writable<DyeColor | null>
  let dyeA: Writable<DyeColor | null>
  let dyeRDisabled: Readable<boolean>
  let dyeGDisabled: Readable<boolean>
  let dyeBDisabled: Readable<boolean>
  let dyeADisabled: Readable<boolean>
  let showDye: Readable<boolean>
  let debugMask: Writable<boolean | null>
</script>

<dialog bind:this={dialogEl} class="w-full p-2 relative">
  <div bind:this={containerEl} />
  <div class="flex flex-col gap-2 w-[200px] absolute top-4 right-4" style="z-index: 100">
    <button type="button" class="btn btn-primary btn-active" on:click={close}> CLOSE </button>
    {#if $showDye}
      <DyePicker bind:color={$dyeR} disabled={$dyeRDisabled} />
      <DyePicker bind:color={$dyeG} disabled={$dyeGDisabled} />
      <DyePicker bind:color={$dyeB} disabled={$dyeBDisabled} />
      <DyePicker bind:color={$dyeA} disabled={$dyeADisabled} />
      <div class="form-control">
        <label class="label cursor-pointer">
          <span class="label-text">DEBUG</span>
          <input type="checkbox" class="toggle" bind:checked={$debugMask} />
        </label>
      </div>
    {/if}
  </div>
</dialog>
