<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import 'ag-grid-community/styles/ag-grid.css'
  import 'ag-grid-community/styles/ag-theme-alpine.css'
  import type { ColDef, ColumnApi, GridApi, GridReadyEvent, ICellRendererParams } from 'ag-grid-community'
  import { Grid } from 'ag-grid-community'
  import Viewer from './Viewer.svelte'

  let gridEl: HTMLElement
  let grid: Grid | null
  let gridApi: GridApi
  let colsApi: ColumnApi
  let viewer: Viewer

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
      onGridReady: onGridReady,
    })
  }

  function onGridReady(e: GridReadyEvent) {
    gridApi = e.api
    colsApi = e.columnApi
    loadData()
  }

  async function loadData() {
    const data = await fetch('out/models/stats.json').then((it) => it.json())
    gridApi.setRowData(data)
  }

  const columnDefs: ColDef[] = [
    {
      headerName: 'Dir',
      field: 'outDir',
      filter: true,
      resizable: true,
      sortable: true,
      width: 300,
    },
    {
      headerName: 'File',
      field: 'outFile',
      filter: true,
      resizable: true,
      sortable: true,
      width: 300,
    },
    {
      headerName: 'Has Model',
      field: 'hasModel',
      filter: true,
      resizable: true,
      sortable: true,
      width: 150,
    },
    {
      headerName: 'Path',
      field: 'filePath',
      filter: true,
      resizable: true,
      sortable: true,
      width: 500,
      cellRenderer: ({ value }: ICellRendererParams) => `<a href="${value}" target="_blank">${value}</a>`,
    },
    {
      headerName: 'Size',
      field: 'fileSize',
      resizable: true,
      sortable: true,
      width: 150,
      valueFormatter: ({ value }) => `${((value || 0) / 1024 / 1024).toFixed(2)}Mb`,
    },
    {
      headerName: 'Actions',
      width: 300,
      resizable: true,
      cellRenderer: ({ data }: ICellRendererParams) => {
        const el = document.createElement('div')
        el.classList.add('btn-group')

        if (data.fileSize) {
          const btn = document.createElement('button')
          btn.classList.add('btn', 'btn-info', 'btn-sm')
          btn.addEventListener('click', () => {
            viewer.show(data.filePath as any)
          })
          btn.textContent = 'Viewer'
          el.append(btn)
        }

        if (data.fileSize) {
          const btn = document.createElement('button')
          btn.classList.add('btn', 'btn-info', 'btn-sm')
          btn.textContent = 'Copy Path'
          btn.addEventListener('click', () => {
            navigator.clipboard.writeText(data.filePath)
          })
          el.append(btn)
        }
        return el
      },
    },
  ]
</script>

<main class="relative">
  <div bind:this={gridEl} class="grid ag-theme-alpine-dark" />
</main>

<Viewer bind:this={viewer}></Viewer>

<style>
  main,
  .grid {
    width: 100vw;
    height: 100dvh;
  }
</style>
