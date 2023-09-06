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
      onSelectionChanged: ({ api }) => {
        const data = api.getSelectedRows()[0]
        if (data) {
          bjsViewer.show(modelPath(data))
          pcViewer.show(modelPath(data))
        } else {
          bjsViewer.close()
          pcViewer.close()
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
    const data = await fetch('stats.json').then((it) => it.json())
    gridApi.setRowData(data)
  }

  function modelPath(data: any) {
    return [data.outDir, data.outFile].join('/')
  }
  const columnDefs: ColDef[] = [
    {
      headerName: 'Dir',
      field: 'outDir',
      filter: true,
      resizable: true,
      sortable: true,
      width: 200,
      floatingFilter: true,
    },
    {
      headerName: 'File',
      field: 'outFile',
      filter: true,
      resizable: true,
      sortable: true,
      width: 400,
      floatingFilter: true,
    },
    {
      headerName: 'Has Model',
      field: 'hasModel',
      filter: true,
      resizable: true,
      sortable: true,
      width: 150,
      cellRenderer: ({ value }: ICellRendererParams) => (value ? '✅' : '❌'),
    },
    {
      headerName: 'Size',
      field: 'fileSize',
      resizable: true,
      sortable: true,
      width: 150,
      valueFormatter: ({ value }) => `${((value || 0) / 1024 / 1024).toFixed(2)}Mb`,
    },
  ]
</script>

<main class="flex flex-row absolute inset-0">
  <div bind:this={gridEl} class="ag-theme-alpine-dark flex-1" />
  <div class="flex-1 grid grid-cols-1 grid-rows-2 overflow-hidden">
    <Viewer bind:this={bjsViewer} playcanvas={false} />
    <Viewer bind:this={pcViewer} playcanvas={true} />
  </div>
</main>

<style>
</style>
