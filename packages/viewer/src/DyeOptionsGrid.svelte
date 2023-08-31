<script lang="ts">
  import { DYE_COLORS, type DyeColor } from './dye-colors'
  import { createEventDispatcher } from 'svelte'

  export let options: DyeColor[] = DYE_COLORS
  const dispatch = createEventDispatcher()

  function colorClicked(color: DyeColor) {
    dispatch('select', color)
  }
</script>

<div class="grid grid-cols-4 gap-1">
  {#each options as option, index}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="aspect-video rounded-sm p-1 text-center cursor-pointer font-bold flex flex-col"
      style="background-color: {option.Color};"
      on:click={() => colorClicked(option)}
    >
      <div class="flex-1">{option.Name}</div>
      <div class="flex-1" style="background-color: {option.SpecColor};" />
    </div>
  {/each}
</div>
