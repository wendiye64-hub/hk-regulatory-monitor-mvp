<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  X,
  History,
  Database,
  Sparkles,
  Filter,
  Clock,
  ArrowRight,
  Check,
} from 'lucide-vue-next';
import type { BackfillConfig, BackfillTimespan, RegulatorInScope } from '@/types';

const props = defineProps<{
  isOpen: boolean;
  regulator: RegulatorInScope | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirmBackfill', config: BackfillConfig): void;
}>();

const timespan = ref<BackfillTimespan>('none');
const criticalHighOnly = ref(true);
const routingOption = ref<'direct_to_regulations' | 'route_to_triage'>('direct_to_regulations');

const handleConfirm = () => {
  if (!props.regulator) return;
  emit('confirmBackfill', {
    regulatorId: props.regulator.id,
    regulatorName: props.regulator.name,
    acronym: props.regulator.acronym,
    timespan: timespan.value || 'none',
    criticalHighOnly: criticalHighOnly.value,
    routingOption: routingOption.value,
  });
  emit('close');
};

const timespanOptions = [
  {
    id: 'none' as BackfillTimespan,
    label: 'None (Follow from Now On)',
    sublabel: 'No historical backfill; monitor live publications from today onward',
  },
  {
    id: '30d' as BackfillTimespan,
    label: 'Past 30 Days',
    sublabel: 'Rapid catch-up for recent urgent regulatory publications',
  },
  {
    id: '90d' as BackfillTimespan,
    label: 'Past 90 Days',
    sublabel: 'Covers the previous supervisory quarter (Recommended for audits)',
  },
  {
    id: '1y' as BackfillTimespan,
    label: 'Past 1 Year',
    sublabel: 'Aligns annual audit and comprehensive compliance baseline',
  },
  {
    id: 'full' as BackfillTimespan,
    label: 'Full Historical Archive',
    sublabel: 'Deep repository archive ingestion (large data volume)',
  },
];

const isBackfillActive = computed(() => timespan.value && timespan.value !== 'none');
</script>

<template>
  <div v-if="isOpen && regulator">
    <!-- Backdrop -->
    <div
      id="historical-backfill-drawer-backdrop"
      class="fixed inset-0 z-50 bg-neutral-950/40 backdrop-blur-2xs cursor-pointer"
      @click="emit('close')"
    />

    <!-- Drawer Right Panel -->
    <aside
      id="historical-backfill-drawer"
      class="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl border-l border-neutral-200 flex flex-col animate-in slide-in-from-right duration-200"
    >
      <!-- Drawer Header -->
      <div class="p-5 border-b border-neutral-200 bg-neutral-50/80 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <History class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-sm sm:text-base font-bold text-neutral-900">
                Historical Backfill & Ingestion Routing
              </h3>
            </div>
            <p class="text-xs text-neutral-500">
              Configure lookback timespan and triage routing for newly followed authority
            </p>
          </div>
        </div>

        <button
          @click="emit('close')"
          class="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Scrollable Content Body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm">
        <!-- Target Regulator Card -->
        <div class="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
          <div class="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
            Newly Followed Authority
          </div>
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-bold text-neutral-900 text-sm">{{ regulator.name }}</h4>
              <div class="flex items-center gap-2 mt-1 text-xs text-neutral-600">
                <span class="font-mono font-bold bg-white text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">
                  {{ regulator.acronym }}
                </span>
                <span>{{ regulator.jurisdiction }}</span>
                <span>•</span>
                <span>{{ regulator.category }}</span>
              </div>
            </div>
            <span class="bg-blue-600 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-2xs">
              Active in Scope
            </span>
          </div>
        </div>

        <!-- Dimension 1: Timespan Selection -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="font-bold text-neutral-900 text-xs sm:text-sm flex items-center gap-1.5">
              <Clock class="w-4 h-4 text-blue-600" />
              <span>1. Backfill Timespan (Optional)</span>
            </label>
            <span class="text-[11px] text-neutral-500 font-medium">
              {{ isBackfillActive ? 'Historical Backfill Enabled' : 'Follow from Now On' }}
            </span>
          </div>
          <p class="text-xs text-neutral-500 -mt-1 leading-relaxed">
            Select a lookback range to ingest historical records, or choose "None" to begin monitoring from today without backfill.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div
              v-for="opt in timespanOptions"
              :key="opt.id"
              @click="timespan = timespan === opt.id && opt.id !== 'none' ? 'none' : opt.id"
              :class="`p-3 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                timespan === opt.id
                  ? opt.id === 'none'
                    ? 'bg-slate-100 border-slate-400 shadow-2xs'
                    : 'bg-blue-50/80 border-blue-500 shadow-2xs'
                  : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
              }`"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-bold text-neutral-900 text-xs">{{ opt.label }}</span>
                <div
                  :class="`w-4 h-4 rounded-full border flex items-center justify-center ${
                    timespan === opt.id
                      ? opt.id === 'none'
                        ? 'border-slate-700 bg-slate-700 text-white'
                        : 'border-blue-600 bg-blue-600 text-white'
                      : 'border-neutral-300'
                  }`"
                >
                  <Check v-if="timespan === opt.id" class="w-3 h-3 stroke-[3]" />
                </div>
              </div>
              <span class="text-[11px] text-neutral-500 leading-tight">{{ opt.sublabel }}</span>
            </div>
          </div>
        </div>

        <template v-if="isBackfillActive">
          <hr class="border-neutral-200" />

          <!-- Dimension 2: Noise Filter -->
          <div class="space-y-2">
            <label class="font-bold text-neutral-900 text-xs sm:text-sm flex items-center gap-1.5">
              <Filter class="w-4 h-4 text-amber-600" />
              <span>2. Noise Threshold Filter</span>
            </label>

            <label class="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/80 flex items-start gap-3 cursor-pointer hover:bg-neutral-100/60 transition-colors select-none">
              <input
                type="checkbox"
                v-model="criticalHighOnly"
                class="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-neutral-300 cursor-pointer"
              />
              <div class="space-y-0.5">
                <span class="font-bold text-neutral-900 text-xs">
                  Backfill Critical & High Materiality Items Only (Recommended)
                </span>
                <p class="text-[11px] text-neutral-500 leading-relaxed">
                  Filters out routine administrative announcements or non-material circulars, ingesting only high-impact supervisory directives.
                </p>
              </div>
            </label>
          </div>

          <hr class="border-neutral-200" />

          <!-- Dimension 3: Ingestion Routing Path -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <label class="font-bold text-neutral-900 text-xs sm:text-sm flex items-center gap-1.5">
                <Database class="w-4 h-4 text-emerald-600" />
                <span>3. Ingestion Routing Path</span>
              </label>
            </div>

            <div class="space-y-3">
              <!-- Option A: Direct to Regulations Table -->
              <div
                @click="routingOption = 'direct_to_regulations'"
                :class="`p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-2 ${
                  routingOption === 'direct_to_regulations'
                    ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-300/40 shadow-2xs'
                    : 'bg-white border-neutral-200 hover:border-neutral-300'
                }`"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Default
                    </span>
                    <h5 class="font-bold text-neutral-900 text-xs sm:text-sm">
                      Option A: Direct to Regulations Table
                    </h5>
                  </div>
                  <div
                    :class="`w-4 h-4 rounded-full border flex items-center justify-center ${
                      routingOption === 'direct_to_regulations'
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-neutral-300'
                    }`"
                  >
                    <Check v-if="routingOption === 'direct_to_regulations'" class="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
                <p class="text-xs text-neutral-600 leading-relaxed pl-1">
                  Records are cataloged directly into the active Regulations master inventory with a
                  <span class="bg-neutral-200 text-neutral-800 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded">
                    [Historical Import]
                  </span>
                  tag. Does not trigger SLA sirens or alert triage queues, preserving auditor focus.
                </p>
              </div>

              <!-- Option B: Route to Triage Queue -->
              <div
                @click="routingOption = 'route_to_triage'"
                :class="`p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-2 ${
                  routingOption === 'route_to_triage'
                    ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-300/40 shadow-2xs'
                    : 'bg-white border-neutral-200 hover:border-neutral-300'
                }`"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Mandatory Review
                    </span>
                    <h5 class="font-bold text-neutral-900 text-xs sm:text-sm">
                      Option B: Route to Priority Alert Feed (Triage Queue)
                    </h5>
                  </div>
                  <div
                    :class="`w-4 h-4 rounded-full border flex items-center justify-center ${
                      routingOption === 'route_to_triage'
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-neutral-300'
                    }`"
                  >
                    <Check v-if="routingOption === 'route_to_triage'" class="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
                <p class="text-xs text-neutral-600 leading-relaxed pl-1">
                  Critical policy changes are injected as actionable cards into the Priority Alert Feed labeled
                  <span class="bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded">
                    [Backfill Alert]
                  </span>
                  with mandatory review SLAs for assigned compliance officers.
                </p>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Drawer Footer -->
      <div class="p-5 border-t border-neutral-200 bg-neutral-50/90 flex items-center justify-between gap-3 shrink-0">
        <button
          @click="emit('close')"
          class="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-xl transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <button
          id="btn-confirm-backfill"
          @click="handleConfirm"
          class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Sparkles class="w-4 h-4" />
          <span>
            {{ isBackfillActive ? 'Start Backfill & Follow' : 'Follow Authority from Today' }}
          </span>
          <ArrowRight class="w-4 h-4" />
        </button>
      </div>
    </aside>
  </div>
</template>
