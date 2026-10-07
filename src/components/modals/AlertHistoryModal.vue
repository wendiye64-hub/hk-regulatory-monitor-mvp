<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  X,
  History,
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  Clock,
  ShieldCheck,
  RotateCcw,
  Tag,
  Layers,
  Globe,
} from 'lucide-vue-next';
import type { PriorityAlert } from '@/types';

const props = defineProps<{
  isOpen: boolean;
  alerts: PriorityAlert[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'selectAlert', regulationId: string): void;
  (e: 'restoreAlert', alertId: string): void;
}>();

const activeTab = ref<'All' | 'acknowledged' | 'dismissed' | 'imported'>('All');
const searchQuery = ref('');

const processedAlerts = computed(() => {
  return props.alerts.filter((a) => a.status !== 'pending');
});

const filteredHistory = computed(() => {
  return processedAlerts.value.filter((item) => {
    const matchesTab = activeTab.value === 'All' || item.status === activeTab.value;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.regulator.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.jurisdiction.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchesTab && matchesSearch;
  });
});
</script>

<template>
  <div
    v-if="isOpen"
    id="alert-history-modal-overlay"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200"
  >
    <!-- Container: Exactly 70% screen height (h-[70vh]) -->
    <div
      id="alert-history-modal-container"
      class="bg-white rounded-2xl max-w-4xl w-full border border-neutral-200 shadow-2xl flex flex-col h-[70vh] overflow-hidden"
    >
      <!-- Sticky Header Top -->
      <div className="sticky top-0 z-10 p-4 sm:p-5 border-b border-neutral-200 flex items-center justify-between bg-white shadow-2xs">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold shrink-0">
            <History class="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm sm:text-base font-bold text-neutral-900">
                Priority Alerts Processed History
              </h2>
              <span class="bg-neutral-100 text-neutral-700 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full">
                {{ processedAlerts.length }} Recorded
              </span>
            </div>
            <p class="text-xs text-neutral-500 hidden sm:block">
              Audit trail of triaged regulatory notifications. You can restore any item back to the Priority Alert Feed to re-evaluate.
            </p>
          </div>
        </div>
        <button
          @click="emit('close')"
          class="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          title="Close modal"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Sticky Controls & Filter Bar -->
      <div class="sticky top-0 z-10 p-3 sm:p-4 border-b border-neutral-200 bg-neutral-50/90 backdrop-blur-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
        <!-- Status Tabs -->
        <div class="flex items-center gap-1 p-1 bg-neutral-200/70 rounded-xl overflow-x-auto">
          <button
            @click="activeTab = 'All'"
            :class="`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'All'
                ? 'bg-white text-neutral-900 shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`"
          >
            All ({{ processedAlerts.length }})
          </button>
          <button
            @click="activeTab = 'acknowledged'"
            :class="`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'acknowledged'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`"
          >
            Acknowledged ({{ processedAlerts.filter((a) => a.status === 'acknowledged').length }})
          </button>
          <button
            @click="activeTab = 'dismissed'"
            :class="`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dismissed'
                ? 'bg-white text-neutral-800 shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`"
          >
            Dismissed ({{ processedAlerts.filter((a) => a.status === 'dismissed').length }})
          </button>
          <button
            @click="activeTab = 'imported'"
            :class="`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'imported'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`"
          >
            Imported ({{ processedAlerts.filter((a) => a.status === 'imported').length }})
          </button>
        </div>

        <!-- Search bar -->
        <div class="relative flex-1 sm:max-w-xs">
          <Search class="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Filter by title, regulator, jurisdiction..."
            class="w-full pl-8 pr-3 py-1.5 bg-white rounded-xl border border-neutral-300 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition-all"
          />
        </div>
      </div>

      <!-- Scrollable List Body -->
      <div
        id="alert-history-scroll-container"
        class="p-4 sm:p-5 flex-1 overflow-y-auto overflow-x-hidden space-y-3 text-xs"
      >
        <div v-if="filteredHistory.length === 0" class="py-16 text-center text-neutral-400 space-y-2">
          <History class="w-10 h-10 mx-auto stroke-[1.25] text-neutral-300" />
          <p class="font-semibold text-neutral-600 text-sm">No processed alerts found</p>
          <p class="text-xs text-neutral-400 max-w-sm mx-auto">
            {{
              searchQuery
                ? 'No results match your search criteria. Try a different search term.'
                : 'Acknowledged and dismissed alerts will automatically record here with timestamp audit trails.'
            }}
          </p>
        </div>
        <div
          v-else
          v-for="alert in filteredHistory"
          :key="alert.id"
          class="p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50/60 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs"
        >
          <div class="flex-1 min-w-0 space-y-1.5">
            <!-- Top Metadata Strip -->
            <div class="flex items-center gap-2 flex-wrap">
              <span
                v-if="alert.status === 'acknowledged'"
                class="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0"
              >
                <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
                Acknowledged (In Scope)
              </span>
              <span
                v-else-if="alert.status === 'dismissed'"
                class="bg-neutral-100 border border-neutral-200 text-neutral-600 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0"
              >
                <XCircle class="w-3.5 h-3.5 text-neutral-500" />
                Dismissed
              </span>
              <span
                v-else-if="alert.status === 'imported'"
                class="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0"
              >
                <ShieldCheck class="w-3.5 h-3.5 text-blue-600" />
                Imported to Diligence
              </span>
              <span v-else class="bg-neutral-100 text-neutral-600 text-xs font-medium px-2 py-0.5 rounded-full shrink-0">
                {{ alert.status }}
              </span>

              <span class="font-bold text-neutral-800">
                {{ alert.regulator }} ({{ alert.regulatorAcronym }})
              </span>
              <span class="text-neutral-300">•</span>
              <span class="text-neutral-500 flex items-center gap-1">
                <Globe class="w-3 h-3 text-neutral-400" />
                {{ alert.jurisdiction }}
              </span>
            </div>

            <!-- Title -->
            <div class="font-bold text-neutral-900 text-xs sm:text-sm leading-snug">
              {{ alert.title }}
            </div>

            <!-- Themes & Category Tags -->
            <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span
                v-if="alert.category"
                class="text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md font-medium flex items-center gap-1"
              >
                <Layers class="w-2.5 h-2.5 text-neutral-400" />
                <span>{{ alert.category }}</span>
              </span>
              <span
                v-for="(th, idx) in alert.themes"
                :key="`${th}-${idx}`"
                class="text-[10px] bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5 rounded-md font-medium flex items-center gap-1"
              >
                <Tag class="w-2.5 h-2.5 text-blue-500" />
                <span>{{ th }}</span>
              </span>
            </div>

            <!-- Timestamp & Performed By -->
            <div class="flex items-center gap-2 text-[11px] text-neutral-500 pt-1 font-mono">
              <Clock class="w-3 h-3 text-neutral-400" />
              <span>
                Action: {{ alert.actionDate || '2026-09-14 01:15:30 UTC' }}
              </span>
              <span>•</span>
              <span>Officer: {{ alert.assignedTo || 'Ivan Choy' }}</span>
            </div>
          </div>

          <!-- Right Action Buttons -->
          <div class="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0">
            <button
              @click="emit('restoreAlert', alert.id)"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-colors shadow-2xs cursor-pointer"
              title="Move back to Priority Alert Feed to re-evaluate"
            >
              <RotateCcw class="w-3.5 h-3.5 text-amber-700" />
              <span>Restore to Feed</span>
            </button>

            <button
              @click="() => { emit('selectAlert', alert.regulationId); emit('close'); }"
              class="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-semibold text-xs transition-colors cursor-pointer"
              title="Inspect full regulatory record and evidence"
            >
              <span>Inspect</span>
              <ExternalLink class="w-3 h-3 text-neutral-400" />
            </button>
          </div>
        </div>
      </div>

      <!-- Sticky Footer -->
      <div class="p-3 sm:p-4 border-t border-neutral-200 bg-neutral-50/90 flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
        <span>
          Displaying {{ filteredHistory.length }} of {{ processedAlerts.length }} processed items
        </span>
        <button
          @click="emit('close')"
          class="px-4 py-1.5 rounded-xl bg-neutral-900 text-white font-semibold hover:bg-neutral-800 transition-colors shadow-2xs cursor-pointer"
        >
          Close History
        </button>
      </div>
    </div>
  </div>
</template>
