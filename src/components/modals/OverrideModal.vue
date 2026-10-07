<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, ShieldAlert, AlertTriangle, Check } from 'lucide-vue-next';
import type { RegulationItem, MaterialityLevel } from '@/types';
import { normalizeRelevance } from '@/types';

const props = defineProps<{
  regulation: RegulationItem | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirmOverride', regulationId: string, newTier: MaterialityLevel, rationale: string): void;
}>();

const selectedTier = ref<MaterialityLevel>('Relevant');
const rationale = ref('');
const error = ref('');

const tiers: MaterialityLevel[] = ['Direct / Highly Relevant', 'Relevant', 'Partially Relevant'];

watch(
  () => props.regulation,
  (reg) => {
    if (reg) {
      selectedTier.value = normalizeRelevance(reg.materiality);
    }
  },
  { immediate: true }
);

const handleSubmit = () => {
  if (!rationale.value.trim()) {
    error.value = 'Audit justification rationale is strictly mandatory to maintain compliance integrity.';
    return;
  }
  if (props.regulation) {
    emit('confirmOverride', props.regulation.id, selectedTier.value, rationale.value.trim());
    rationale.value = '';
    error.value = '';
    emit('close');
  }
};
</script>

<template>
  <div v-if="isOpen && regulation" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div
      id="override-materiality-modal"
      class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 space-y-4"
    >
      <!-- Header -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <ShieldAlert class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-neutral-900">
              Human-in-the-Loop Override
            </h3>
            <p class="text-xs text-neutral-500">
              Override AI Relevance classification
            </p>
          </div>
        </div>

        <button
          @click="emit('close')"
          class="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Regulation Details Summary -->
      <div class="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs">
        <div class="font-semibold text-neutral-900 line-clamp-1">
          {{ regulation.title }}
        </div>
        <div class="text-[11px] text-neutral-500 mt-0.5">
          Ref: {{ regulation.referenceNumber }} · {{ regulation.regulatorAcronym }}
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4 text-xs">
        <!-- Tier Selection -->
        <div>
          <label class="font-bold text-neutral-800 block mb-2">
            Select New Relevance Tier
          </label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="tier in tiers"
              :key="tier"
              type="button"
              @click="selectedTier = tier"
              :class="`py-2 px-3 rounded-xl font-bold border transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                selectedTier === tier
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                  : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`"
            >
              <span>{{ tier }}</span>
              <Check v-if="selectedTier === tier" class="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        <!-- Mandatory Rationale -->
        <div>
          <label class="font-bold text-neutral-800 block mb-1">
            Required Audit Justification Rationale <span class="text-rose-500">*</span>
          </label>
          <textarea
            rows="3"
            required
            v-model="rationale"
            @input="error = ''"
            placeholder="Provide clear diligence justification (e.g. Entity does not operate third-party foreign LLM pipelines in HK jurisdiction, mitigating exposure...)"
            class="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
          />
          <p v-if="error" class="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
            <AlertTriangle class="w-3 h-3" />
            {{ error }}
          </p>
        </div>

        <div class="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed">
          <strong>Immutable Notice:</strong> This override and rationale will be permanently recorded
          to the compliance audit timeline with your user ID and cryptographic timestamp.
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Commit Override
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
