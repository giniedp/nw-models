<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { ColDef, ColumnApi, GridApi, GridReadyEvent, ICellRendererParams } from 'ag-grid-community'
  import { Grid } from 'ag-grid-community'
  import Viewer from './Viewer.svelte'

  let gridEl: HTMLElement
  let grid: Grid | null
  let gridApi: GridApi
  let colsApi: ColumnApi
  let pcViewer: Viewer
  let bjsViewer: Viewer

  onMount(async () => {
    bindGrid()
  })

  onDestroy(() => {
    grid?.destroy()
    grid = null
  })

  function bindGrid() {
    grid = new Grid(gridEl, {
      columnDefs: columnDefs,
      enableCellTextSelection: true,
      rowSelection: 'single',
      onGridReady: onGridReady,
      onModelUpdated: ({ api }) => {
        const modelUrl = sessionStorage.getItem('modelUrl')
        api.forEachNodeAfterFilterAndSort((node) => {
          if (modelPath(node.data) === modelUrl) {
            node.setSelected(true, true)
            api.ensureNodeVisible(node, 'middle')
          }
        })
      },
      onSelectionChanged: ({ api }) => {
        const data = api.getSelectedRows()[0]
        if (data) {
          const url = modelPath(data)
          sessionStorage.setItem('downloadName', document.title.replaceAll(' ', '_') + '_' + data.file.replace('.glb', ''))
          sessionStorage.setItem('modelUrl', url)
          bjsViewer?.show(url)
          pcViewer?.show(url)
        } else {
          bjsViewer?.close()
          pcViewer?.close()
        }
      },
    })
  }

  function onGridReady(e: GridReadyEvent) {
    gridApi = e.api
    colsApi = e.columnApi
    loadData()
  }

  async function loadData() {
    const data = await fetch('assets.json').then((it) => it.json())
    gridApi.setRowData(data)
  }

  function modelPath(data: any) {
    return [data.dir, data.file].join('/')
  }
  const columnDefs: ColDef[] = [
    {
      headerName: 'Dir',
      field: 'dir',
      filter: true,
      resizable: true,
      sortable: true,
      width: 200,
      floatingFilter: true,
    },
    {
      headerName: 'File',
      field: 'file',
      filter: true,
      resizable: true,
      sortable: true,
      width: 400,
      floatingFilter: true,
    },
    {
      headerName: 'OK',
      field: 'exists',
      filter: true,
      resizable: false,
      sortable: true,
      width: 75,
      cellRenderer: ({ value }: ICellRendererParams) => (value ? '✅' : '❌'),
    },
    {
      headerName: 'Size',
      field: 'size',
      resizable: true,
      sortable: true,
      width: 100,
      valueFormatter: ({ value }) => `${((value || 0) / 1024 / 1024).toFixed(2)}Mb`,
    },
  ]
</script>

<main class="flex flex-row absolute inset-0">
  <div bind:this={gridEl} class="ag-theme-alpine-dark flex-1" />
  <div class="flex-1 grid grid-cols-1 overflow-hidden">
    <Viewer bind:this={bjsViewer} playcanvas={false} />
  </div>
</main>

<style>
</style>
