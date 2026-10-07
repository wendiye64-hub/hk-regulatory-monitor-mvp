<script setup lang="ts">
import { cn } from '@/lib/utils';

const props = defineProps<{
  class?: string;
}>();
</script>

<template>
  <div :class="cn('rounded-xl border border-neutral-200 bg-white text-neutral-950 shadow-2xs', props.class)">
    <slot />
  </div>
</template>
