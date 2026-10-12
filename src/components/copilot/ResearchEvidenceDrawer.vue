<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue';
import { X, Maximize2, Minimize2, GripVertical } from 'lucide-vue-next';
import type { MatrixCellData } from '@/types';
import ResearchEvidencePanel from './ResearchEvidencePanel.vue';
const props = defineProps<{ isOpen: boolean; cell?: MatrixCellData; question?: string; jurisdiction?: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();
const width = ref(Math.min(window.innerWidth, 720));
const maximized = ref(false);
const dialog = ref<HTMLElement>();
const closeButton = ref<HTMLButtonElement>();
let previousFocus: HTMLElement | null = null;
const style = computed(() => ({ width: `${maximized.value ? window.innerWidth : Math.min(width.value, window.innerWidth)}px`, maxWidth: '100vw' }));
const resize = (e: PointerEvent) => {
  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture(e.pointerId);
  maximized.value = false;
};
const move = (e: PointerEvent) => {
  if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) width.value = Math.max(Math.min(360, window.innerWidth), Math.min(window.innerWidth, window.innerWidth - e.clientX));
};
const keydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close');
  if (e.key !== 'Tab') return;
  const focusables = dialog.value?.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex="0"]');
  const first = focusables?.[0]; const last = focusables?.[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
  if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
};
watch(() => props.isOpen, async open => {
  if (open) { previousFocus = document.activeElement as HTMLElement; await nextTick(); closeButton.value?.focus(); }
  else previousFocus?.focus();
});
onBeforeUnmount(() => { if (props.isOpen) previousFocus?.focus(); });
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-backdrop">
      <div v-if="isOpen && cell" class="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs" @click.self="emit('close')">
        <Transition name="drawer-slide" appear>
          <div ref="dialog" role="dialog" aria-modal="true" aria-labelledby="research-evidence-title" tabindex="-1" class="fixed top-0 right-0 bottom-0 bg-white shadow-2xl flex flex-col border-l border-neutral-200 select-text" :style="style" @keydown="keydown">
            <div class="absolute -left-2.5 top-0 bottom-0 w-5 cursor-col-resize z-50 flex items-center justify-center select-none group touch-none" @pointerdown.prevent="resize" @pointermove="move" @dblclick="maximized = !maximized">
              <div class="w-1 h-full rounded-full group-hover:bg-blue-500 bg-transparent transition-colors" />
              <div class="absolute top-1/2 -translate-y-1/2 w-4 h-11 bg-white border border-neutral-300 rounded-full shadow-md flex items-center justify-center text-neutral-400 group-hover:border-blue-500 group-hover:text-blue-600"><GripVertical class="w-3 h-3" /></div>
            </div>
            <div class="p-5 sm:p-6 border-b border-neutral-200 bg-neutral-50/70 flex items-start justify-between gap-4">
              <div class="space-y-2 min-w-0 flex-1"><div class="flex items-center gap-2 flex-wrap"><span class="text-xs font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-md">Evidence Pack</span><span class="text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 px-2 py-0.5 rounded-md">{{ jurisdiction }}</span><span class="text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">{{ cell.statusBadgeLabel }}</span></div><h2 id="research-evidence-title" class="text-base sm:text-lg font-bold text-neutral-900 leading-snug break-words">{{ question }}</h2></div>
              <div class="flex gap-1 shrink-0"><button type="button" class="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-xl transition-colors cursor-pointer" :aria-label="maximized ? '恢复宽度' : '展开全屏'" @click="maximized = !maximized"><Minimize2 v-if="maximized" class="w-4 h-4" /><Maximize2 v-else class="w-4 h-4" /></button><button ref="closeButton" type="button" aria-label="关闭证据面板" title="关闭（Esc）" class="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-xl transition-colors cursor-pointer" @click="emit('close')"><X class="w-5 h-5" /></button></div>
            </div>
            <div class="flex-1 overflow-y-auto p-5 sm:p-6"><ResearchEvidencePanel :cell="cell" /></div>
            <div class="p-4 border-t border-neutral-200 bg-neutral-50 text-xs text-neutral-500">研究材料 · 待人工复核后方可作为正式结论</div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-backdrop-enter-active, .drawer-backdrop-leave-active { transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1); }
.drawer-backdrop-enter-from, .drawer-backdrop-leave-to { opacity: 0; }
.drawer-slide-enter-active, .drawer-slide-leave-active { transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1); }
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(100%); }
</style>
