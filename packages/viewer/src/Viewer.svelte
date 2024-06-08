<script lang="ts">
  import { derived, writable } from 'svelte/store'
  import DyePicker from './DyePicker.svelte'
  import type { DyeColor } from './dye-colors'

  import { initViewer as bjsViewer, type AppearanceDyeExtras, type Viewer } from './babylon-viewer/viewer'

  export let playcanvas = false

  export function show(modelUrl: string) {
    isOpen = true
    setTimeout(() => updateViewer(modelUrl))
  }

  export function close() {
    if (viewer) {
      viewer.dispose()
      viewer = null
    }
    if (viewerEl) {
      viewerEl.innerHTML = ''
    }
    isOpen = false
    appearance.set(null)
  }

  function updateViewer(modelUrl: string) {
    if (viewer) {
      viewer.showModel(modelUrl)
    } else {
      viewer = createViewer(viewerEl, modelUrl)
    }
  }

  function createViewer(parent: HTMLElement, modelUrl: string) {
    const initViewer = bjsViewer
    let el = parent
    if (!playcanvas) {
      el = document.createElement('div')
      parent.appendChild(el)
    }
    return initViewer({
      el,
      modelUrl,
      dyeR,
      dyeG,
      dyeB,
      dyeA,
      debugMask,
      appearance,
    })
  }

  function fullscreen() {
    viewerEl.requestFullscreen()
  }

  async function screenshot() {
    if (!viewer) {
      return
    }
    const data = await viewer.captureScreenshot()
    const blob = await fetch(data).then((res) => res.blob())
    const showSaveFilePicker = (window as any)['showSaveFilePicker'] as any
    const handle = await showSaveFilePicker({
      suggestedName: sessionStorage.getItem('downloadName') + '.png',
    })
    if (await verifyPermission(handle)) {
      await writeFile(handle, blob)
    }
  }

  async function writeFile(fileHandle: any, contents: Blob) {
    const writable = await fileHandle.createWritable()
    await writable.write(contents)
    await writable.close()
  }

  async function verifyPermission(fileHandle: any) {
    const options = {
      mode: 'readwrite',
    }
    // Check if permission was already granted. If so, return true.
    if ((await fileHandle.queryPermission(options)) === 'granted') {
      return true
    }
    // Request permission. If the user grants permission, return true.
    if ((await fileHandle.requestPermission(options)) === 'granted') {
      return true
    }
    // The user didn't grant permission, so return false.
    return false
  }

  let isOpen = false
  let containerEl: HTMLElement
  let viewerEl: HTMLElement
  let viewer: Viewer | null

  const dyeR = writable<DyeColor | null>(null)
  const dyeG = writable<DyeColor | null>(null)
  const dyeB = writable<DyeColor | null>(null)
  const dyeA = writable<DyeColor | null>(null)
  const debugMask = writable<boolean | null>(null)
  const appearance = writable<AppearanceDyeExtras | null>(null)

  const dyeRDisabled = derived(appearance, (it) => it?.RDyeSlotDisabled !== '0')
  const dyeGDisabled = derived(appearance, (it) => it?.GDyeSlotDisabled !== '0')
  const dyeBDisabled = derived(appearance, (it) => it?.BDyeSlotDisabled !== '0')
  const dyeADisabled = derived(appearance, (it) => it?.ADyeSlotDisabled !== '0')
  const showDye = derived(appearance, (it) => {
    console.log(it)
    return !!it
  })
</script>

{#if isOpen}
  <div class="relative flex flex-col" bind:this={containerEl}>
    <div bind:this={viewerEl} class="absolute inset-0" />
    <div class="flex flex-col gap-2 w-[200px] absolute top-4 right-4" style="z-index: 100">
      <button type="button" class="btn btn-primary" on:click={fullscreen}> Fullscreen </button>
      <button type="button" class="btn btn-primary" on:click={screenshot}> Screenshot </button>
      {#if $showDye}
        <DyePicker bind:color={$dyeR} disabled={$dyeRDisabled} />
        <DyePicker bind:color={$dyeG} disabled={$dyeGDisabled} />
        <DyePicker bind:color={$dyeB} disabled={$dyeBDisabled} />
        <DyePicker bind:color={$dyeA} disabled={$dyeADisabled} />
        <div class="form-control">
          <label class="label btn px-2">
            <span class="label-text">Show Mask</span>
            <input type="checkbox" class="toggle" bind:checked={$debugMask} />
          </label>
        </div>
      {/if}
    </div>
  </div>
{/if}
