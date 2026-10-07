<script setup lang="ts">
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  type DialogRootProps,
  type DialogRootEmits,
  useForwardPropsEmits,
} from 'radix-vue';
import { cn } from '@/lib/utils';
import { X } from 'lucide-vue-next';

interface Props extends DialogRootProps {
  title?: string;
  description?: string;
  contentClass?: string;
}

const props = defineProps<Props>();
const emits = defineEmits<DialogRootEmits>();
const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <DialogRoot v-bind="forwarded">
    <slot name="trigger" />
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in" />
      <DialogContent
        :class="cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-neutral-200 bg-white p-6 shadow-2xl duration-200 rounded-2xl animate-in zoom-in-95',
          props.contentClass
        )"
      >
        <div v-if="props.title || $slots.header" class="flex flex-col space-y-1.5 text-center sm:text-left">
          <slot name="header">
            <DialogTitle v-if="props.title" class="text-base sm:text-lg font-bold text-neutral-900 leading-none tracking-tight">
              {{ props.title }}
            </DialogTitle>
            <DialogDescription v-if="props.description" class="text-xs sm:text-sm text-neutral-500">
              {{ props.description }}
            </DialogDescription>
          </slot>
        </div>

        <slot />

        <div v-if="$slots.footer" class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-2 border-t border-neutral-100">
          <slot name="footer" />
        </div>

        <DialogClose class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:pointer-events-none text-neutral-500 hover:text-neutral-900 cursor-pointer">
          <X class="h-4 w-4" />
          <span class="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
