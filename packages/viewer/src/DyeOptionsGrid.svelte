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
      class="aspect-square rounded-sm p-1 text-center cursor-pointer font-bold"
      style="background-color: {option.Color}; border-color: {option.SpecColor}; border-width: 2px;"
      on:click={() => colorClicked(option)}
    >
      {option.Name}
    </div>
  {/each}
</div>
