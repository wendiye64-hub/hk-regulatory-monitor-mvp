<script setup lang="ts">
import { cn } from '@/lib/utils';

const props = defineProps<{
  defaultValue?: string | number;
  modelValue?: string | number;
  class?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}>();

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void;
}>();
</script>

<template>
  <input
    :type="type || 'text'"
    :class="cn(
      'flex h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs sm:text-sm shadow-2xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
      props.class
    )"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    @input="emits('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
