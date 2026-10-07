<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  X,
  FilePlus,
  FileDiff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  Search,
  Info,
  CheckCircle2,
} from 'lucide-vue-next';
import type { RegulationItem } from '@/types';

interface ExistingDocCandidate {
  id: string;
  title: string;
  version?: string;
  referenceNumber?: string;
  authority?: string;
}

const props = defineProps<{
  isOpen: boolean;
  incomingDocuments: RegulationItem[];
  existingCatalog: ExistingDocCandidate[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (
    e: 'confirmImport',
    config: {
      mode: 'new' | 'update';
      documentIds: string[];
      targetDocId?: string;
      versionStrategy?: 'bump' | 'overwrite';
      notes?: string;
    }
  ): void;
}>();

const primaryIncoming = computed(() =>
  props.incomingDocuments && props.incomingDocuments.length > 0
    ? props.incomingDocuments[0]
    : null
);
const isMulti = computed(() =>
  props.incomingDocuments ? props.incomingDocuments.length > 1 : false
);

const importMode = ref<'new' | 'update'>('new');

// If bulk import (multiple documents), only Option A can be chosen
watch(
  isMulti,
  (multi) => {
    if (multi) {
      importMode.value = 'new';
    }
  },
  { immediate: true }
);

const selectedTargetId = ref<string>('');
const versionStrategy = ref<'bump' | 'overwrite'>('bump');
const customVersionNote = ref('');
const searchQuery = ref('');

// Fuzzy match scoring calculation
const scoredCatalog = computed(() => {
  if (!primaryIncoming.value) return [];

  const incomingTokens = primaryIncoming.value.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  return props.existingCatalog
    .map((item) => {
      const itemTokens = item.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2);

      const shared = incomingTokens.filter((t) => itemTokens.includes(t));
      const totalUnique = new Set([...incomingTokens, ...itemTokens]).size;
      let score = totalUnique > 0 ? Math.round((shared.length / totalUnique) * 100) : 0;

      if (
        item.referenceNumber &&
        primaryIncoming.value?.referenceNumber &&
        item.referenceNumber.toLowerCase().includes(primaryIncoming.value.referenceNumber.toLowerCase())
      ) {
        score = Math.max(score, 88);
      }

      if (
        item.authority &&
        primaryIncoming.value?.regulator &&
        item.authority.toLowerCase().includes(primaryIncoming.value.regulatorAcronym.toLowerCase())
      ) {
        score += 10;
      }

      if (
        primaryIncoming.value &&
        (item.title.toLowerCase().includes(primaryIncoming.value.title.toLowerCase().slice(0, 15)) ||
          primaryIncoming.value.title.toLowerCase().includes(item.title.toLowerCase().slice(0, 15)))
      ) {
        score = Math.max(score, 75);
      }

      score = Math.min(score, 98);

      return {
        ...item,
        score,
        sharedKeywords: shared,
      };
    })
    .sort((a, b) => b.score - a.score);
});

watch(
  scoredCatalog,
  (newCatalog) => {
    if (newCatalog.length > 0 && !selectedTargetId.value) {
      selectedTargetId.value = newCatalog[0].id;
    }
  },
  { immediate: true }
);

const displayedCandidates = computed(() =>
  scoredCatalog.value.filter((item) =>
    searchQuery.value
      ? item.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (item.referenceNumber &&
          item.referenceNumber.toLowerCase().includes(searchQuery.value.toLowerCase()))
      : true
  )
);

const handleConfirm = () => {
  const mode = isMulti.value ? 'new' : importMode.value;
  emit('confirmImport', {
    mode,
    documentIds: props.incomingDocuments.map((d) => d.id),
    targetDocId: mode === 'update' ? selectedTargetId.value : undefined,
    versionStrategy: mode === 'update' ? versionStrategy.value : undefined,
    notes:
      customVersionNote.value ||
      (mode === 'new'
        ? isMulti.value
          ? `Bulk import of ${props.incomingDocuments.length} documents (v1.0)`
          : 'Baseline v1.0 import'
        : 'Regulatory revision link'),
  });
  emit('close');
};
</script>

<template>
  <div
    v-if="isOpen && primaryIncoming"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-150"
  >
    <div class="bg-white rounded-2xl max-w-2xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
      <!-- Header: 60-30-10, 4 font sizes, 2 weights, 8-point spacing -->
      <div class="p-4 sm:p-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-semibold">
            <Layers class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-neutral-900">
              Import to Diligence
            </h2>
            <p class="text-xs font-normal text-neutral-800">
              Select version strategy for diligence catalog
            </p>
          </div>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="p-2 rounded-lg text-neutral-800 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Modal Body: Logical Proximity -->
      <div class="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
        <!-- Group 1: Document Details / Selection Preview -->
        <div class="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-neutral-800">
              {{ isMulti ? `Selected Documents (${incomingDocuments.length})` : 'Document Details' }}
            </span>
            <span
              v-if="!isMulti"
              class="text-xs font-mono px-2 py-0.5 rounded bg-white text-neutral-800 font-semibold border border-neutral-200"
            >
              {{ primaryIncoming.referenceNumber }}
            </span>
            <span
              v-else
              class="text-xs font-semibold px-2 py-0.5 rounded bg-white text-blue-600 border border-blue-200"
            >
              Baseline v1.0
            </span>
          </div>

          <!-- Single Item Display -->
          <div v-if="!isMulti" class="space-y-2">
            <div class="font-semibold text-neutral-900 text-sm leading-snug">
              {{ primaryIncoming.title }}
            </div>
            <div class="flex flex-wrap items-center gap-2 text-xs text-neutral-800">
              <span class="px-2 py-1 rounded bg-white border border-neutral-200 font-semibold">
                {{ primaryIncoming.regulatorAcronym }}
              </span>
              <span class="px-2 py-1 rounded bg-white border border-neutral-200 font-normal">
                {{ primaryIncoming.jurisdiction }}
              </span>
              <span class="px-2 py-1 rounded bg-white border border-neutral-200 font-normal">
                {{ primaryIncoming.docType }}
              </span>
              <span class="px-2 py-1 rounded bg-white border border-neutral-200 font-normal">
                Effective: {{ primaryIncoming.effectiveDate || 'Immediate' }}
              </span>
            </div>
          </div>

          <!-- Bulk Items Preview List -->
          <div v-else class="space-y-2">
            <div class="max-h-36 overflow-y-auto space-y-2 pr-1">
              <div
                v-for="(doc, idx) in incomingDocuments"
                :key="doc.id"
                class="p-2.5 rounded-lg bg-white border border-neutral-200 flex items-center justify-between gap-3 text-xs"
              >
                <div class="min-w-0 flex-1 flex items-center gap-2">
                  <span class="text-neutral-800 font-mono text-xs shrink-0">#{{ idx + 1 }}</span>
                  <span class="font-semibold text-neutral-900 truncate">{{ doc.title }}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0 text-xs font-mono text-neutral-800">
                  <span class="px-2 py-0.5 rounded bg-neutral-50 border border-neutral-200 font-semibold">
                    {{ doc.regulatorAcronym }}
                  </span>
                  <span class="text-neutral-800 hidden sm:inline">{{ doc.referenceNumber }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bulk Notice: Direct & Concise -->
        <div
          v-if="isMulti"
          class="p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-900 flex items-start gap-2.5 text-xs"
        >
          <Info class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p class="font-normal text-neutral-800 leading-relaxed">
            Bulk import creates separate <strong class="font-semibold text-neutral-900">v1.0 baseline</strong> records. Option B is disabled for batch actions.
          </p>
        </div>

        <!-- Group 2: Classification Strategy (Option A vs Option B) -->
        <div class="space-y-2">
          <div class="text-xs font-semibold text-neutral-800">
            Classification Strategy
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Option A: New Record (v1.0) -->
            <div
              @click="importMode = 'new'"
              :class="`p-4 rounded-xl border-2 transition-all ${
                importMode === 'new'
                  ? 'border-blue-600 bg-white ring-1 ring-blue-600/20 cursor-pointer'
                  : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50 cursor-pointer'
              }`"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="p-2 rounded-lg bg-neutral-100 text-neutral-900">
                  <FilePlus class="w-5 h-5 text-blue-600" />
                </div>
                <div class="flex items-center gap-1.5">
                  <span
                    v-if="isMulti"
                    class="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200"
                  >
                    Required
                  </span>
                  <div
                    :class="`w-4 h-4 rounded-full border flex items-center justify-center ${
                      importMode === 'new' ? 'border-blue-600 bg-blue-600' : 'border-neutral-300'
                    }`"
                  >
                    <div v-if="importMode === 'new'" class="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                </div>
              </div>
              <div class="font-semibold text-neutral-900 mb-1 text-sm">
                Option A: New Record (v1.0)
              </div>
              <p class="text-neutral-800 font-normal leading-relaxed text-xs">
                {{
                  isMulti
                    ? `Establishes ${incomingDocuments.length} separate records in Diligence catalog as baseline v1.0.`
                    : 'Establishes a new record in Diligence catalog as baseline v1.0.'
                }}
              </p>
            </div>

            <!-- Option B: Link Existing -->
            <div
              @click="!isMulti && (importMode = 'update')"
              :class="`p-4 rounded-xl border-2 transition-all ${
                isMulti
                  ? 'opacity-50 bg-neutral-100 border-neutral-200 cursor-not-allowed select-none'
                  : importMode === 'update'
                  ? 'border-blue-600 bg-white ring-1 ring-blue-600/20 cursor-pointer'
                  : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50 cursor-pointer'
              }`"
            >
              <div class="flex items-start justify-between mb-2">
                <div class="p-2 rounded-lg bg-neutral-100 text-neutral-900">
                  <FileDiff class="w-5 h-5 text-neutral-800" />
                </div>
                <div class="flex items-center gap-1.5">
                  <span
                    v-if="isMulti"
                    class="text-xs font-normal px-2 py-0.5 rounded bg-neutral-200 text-neutral-800"
                  >
                    Single Only
                  </span>
                  <div
                    :class="`w-4 h-4 rounded-full border flex items-center justify-center ${
                      !isMulti && importMode === 'update' ? 'border-blue-600 bg-blue-600' : 'border-neutral-300'
                    }`"
                  >
                    <div v-if="!isMulti && importMode === 'update'" class="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                </div>
              </div>
              <div class="font-semibold text-neutral-900 mb-1 text-sm">
                Option B: Link Existing
              </div>
              <p class="text-neutral-800 font-normal leading-relaxed text-xs">
                {{
                  isMulti
                    ? 'Disabled for batch actions. Version increments must be configured per document.'
                    : 'Matches existing records for version increment (v1.1) or payload overwrite.'
                }}
              </p>
            </div>
          </div>
        </div>

        <!-- Option B Matching Pool -->
        <div
          v-if="importMode === 'update'"
          class="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 animate-in fade-in"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-blue-600" />
              <span class="font-semibold text-neutral-900 text-xs">
                Fuzzy Matches ({{ scoredCatalog.length }})
              </span>
            </div>
            <div class="relative w-48">
              <Search class="w-3.5 h-3.5 text-neutral-800 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                v-model="searchQuery"
                placeholder="Filter matches..."
                class="w-full pl-8 pr-2.5 py-1.5 bg-white rounded-lg border border-neutral-200 text-xs font-normal text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <!-- Candidates list -->
          <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
            <div
              v-for="candidate in displayedCandidates.slice(0, 5)"
              :key="candidate.id"
              @click="selectedTargetId = candidate.id"
              :class="`p-3 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                selectedTargetId === candidate.id
                  ? 'border-blue-600 bg-white ring-1 ring-blue-600 shadow-xs'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-semibold text-neutral-900 truncate">
                    {{ candidate.title }}
                  </span>
                  <span
                    v-if="candidate.version"
                    class="text-xs font-mono px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-800"
                  >
                    {{ candidate.version }}
                  </span>
                </div>
                <div class="text-xs text-neutral-800 font-normal flex items-center gap-2">
                  <span v-if="candidate.authority">{{ candidate.authority }}</span>
                  <span v-if="candidate.referenceNumber" class="font-mono">
                    Ref: {{ candidate.referenceNumber }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <span
                  :class="`text-xs font-semibold px-2 py-0.5 rounded ${
                    candidate.score >= 50
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                  }`"
                >
                  {{ candidate.score }}%
                </span>
                <input
                  type="radio"
                  name="targetRecord"
                  :checked="selectedTargetId === candidate.id"
                  @change="selectedTargetId = candidate.id"
                  class="text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <!-- Version Strategy Selector -->
          <div class="pt-3 border-t border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span class="text-neutral-900 font-semibold text-xs">Version Mode:</span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="versionStrategy = 'bump'"
                :class="`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  versionStrategy === 'bump'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-white text-neutral-800 border border-neutral-200 font-normal hover:bg-neutral-50'
                }`"
              >
                Increment Version (v1.1)
              </button>
              <button
                type="button"
                @click="versionStrategy = 'overwrite'"
                :class="`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  versionStrategy === 'overwrite'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-white text-neutral-800 border border-neutral-200 font-normal hover:bg-neutral-50'
                }`"
              >
                Overwrite Payload
              </button>
            </div>
          </div>
        </div>

        <!-- Group 3: Audit Note -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-neutral-800">
            Audit Note (Optional)
          </label>
          <input
            type="text"
            v-model="customVersionNote"
            placeholder="Reason for import or revision details..."
            class="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-normal text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      <!-- Footer: 60-30-10, 8-point grid -->
      <div class="p-4 sm:p-6 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
        <div class="flex items-center gap-1.5 text-neutral-800 text-xs font-normal">
          <ShieldCheck class="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Logged in audit trail</span>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-800 hover:bg-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleConfirm"
            class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>{{ isMulti ? `Confirm Import (${incomingDocuments.length})` : 'Confirm Import' }}</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
