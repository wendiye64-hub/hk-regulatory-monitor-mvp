<script setup lang="ts">
import { X, AlertTriangle, ShieldOff } from 'lucide-vue-next';
import type { RegulatorInScope } from '@/types';

const props = defineProps<{
  isOpen: boolean;
  regulator: RegulatorInScope | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <div
    v-if="isOpen && regulator"
    id="unfollow-confirm-modal"
    class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    @click="emit('close')"
  >
    <div
      class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-in zoom-in-95 space-y-4"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shrink-0">
            <ShieldOff class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-neutral-900">
              Unfollow Supervisory Authority?
            </h3>
            <p class="text-xs text-neutral-500 mt-0.5">
              Confirm removal from active regulatory surveillance scope
            </p>
          </div>
        </div>
        <button
          @click="emit('close')"
          class="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Regulator Info Card -->
      <div class="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs font-mono border border-blue-100">
              {{ regulator.acronym }}
            </span>
            <span class="text-xs text-neutral-500 font-medium">
              {{ regulator.jurisdiction }}
            </span>
          </div>
          <span class="text-[11px] px-2 py-0.5 rounded-md bg-neutral-200/80 text-neutral-700 font-medium">
            {{ regulator.category }}
          </span>
        </div>
        <div class="font-bold text-sm text-neutral-900 leading-snug">
          {{ regulator.name }}
        </div>
      </div>

      <!-- Impact Warning -->
      <div class="flex items-start gap-2.5 p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl text-xs text-amber-900">
        <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div class="space-y-1 leading-relaxed">
          <p class="font-semibold text-amber-900">
            Surveillance and alert ingestion will be paused
          </p>
          <p class="text-[11px] text-amber-800/90">
            This authority will be removed from your <strong>Regulators in Scope</strong>. New regulatory circulars and consultation papers will no longer trigger priority triage alerts. You can re-follow this regulator anytime.
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-xl border border-neutral-200 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="() => { emit('confirm'); emit('close'); }"
          class="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <ShieldOff class="w-3.5 h-3.5" />
          <span>Confirm Unfollow</span>
        </button>
      </div>
    </div>
  </div>
</template>
