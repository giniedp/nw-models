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
        api.forEachNode((node) => {
          if (!node.rowIndex) {
            node.setSelected(true)
          }
        })
      },
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
    // {
    //   headerName: 'Shader',
    //   field: '_shaders',
    //   filter: true,
    //   resizable: true,
    //   floatingFilter: true,
    //   width: 150,
    //   cellRenderer: ({ value }: ICellRendererParams) => {
    //     const tags = (value || '')
    //       .map((it: unknown) => `<span class="badge badge-xs badge-primary">${it}</span>`)
    //       .join('')
    //     return `<div class="flex flex-row flex-wrap gap-1 p-1">${tags}</div>`
    //   },
    // },
    // {
    //   headerName: 'Textures',
    //   field: '_textures',
    //   filter: true,
    //   resizable: true,
    //   floatingFilter: true,
    //   width: 300,
    //   cellRenderer: ({ value }: ICellRendererParams) => {
    //     const tags = (value || '')
    //       .map((it: unknown) => `<span class="badge badge-xs badge-primary">${it}</span>`)
    //       .join('')
    //     return `<div class="flex flex-row flex-wrap gap-1 p-1 h-full">${tags}</div>`
    //   },
    // },
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
