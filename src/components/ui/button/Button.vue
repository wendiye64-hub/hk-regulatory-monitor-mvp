<script setup lang="ts">
import { computed } from 'vue';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default: 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-2xs',
        destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-2xs',
        outline: 'border border-neutral-200 bg-white hover:bg-neutral-100 hover:text-neutral-900 text-neutral-700 shadow-2xs',
        secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200/80',
        ghost: 'hover:bg-neutral-100 hover:text-neutral-900 text-neutral-700',
        link: 'text-blue-600 underline-offset-4 hover:underline',
        primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs',
      },
      size: {
        default: 'h-9 px-4 py-2 text-xs sm:text-sm',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-lg px-6 text-sm',
        icon: 'h-8 w-8 rounded-lg p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonProps = {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  class?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
};

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'default',
  size: 'default',
  type: 'button',
  disabled: false,
});

const classes = computed(() => cn(buttonVariants({ variant: props.variant, size: props.size }), props.class));
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled">
    <slot />
  </button>
</template>
