<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Shield,
  Search,
  Plus,
  ChevronRight,
  Clock,
} from 'lucide-vue-next';
import type { FrameworkCardData } from '@/types';

const props = defineProps<{
  frameworks: FrameworkCardData[];
}>();

const emit = defineEmits<{
  (e: 'selectFramework', framework: FrameworkCardData): void;
  (e: 'newFramework'): void;
}>();

const searchQuery = ref('');
const filterTag = ref<'All' | 'Operational' | 'Reporting' | 'Governance'>('All');

const filteredFrameworks = computed(() => {
  return props.frameworks.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (item.authority && item.authority.toLowerCase().includes(searchQuery.value.toLowerCase()));
    const matchesTag = filterTag.value === 'All' || item.tagType === filterTag.value;
    return matchesSearch && matchesTag;
  });
});
</script>

<template>
  <div id="frameworks-module-container" class="space-y-5">
    <!-- Top Search & Action Bar -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div class="relative flex-1 max-w-md">
        <Search class="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          id="input-search-frameworks"
          type="text"
          v-model="searchQuery"
          placeholder="Search frameworks"
          class="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-300 bg-white text-xs sm:text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
        />
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs">
          <button
            v-for="tag in (['All', 'Operational', 'Reporting'] as const)"
            :key="tag"
            @click="filterTag = tag"
            :class="`px-3 py-1 rounded-lg font-medium transition-all ${
              filterTag === tag
                ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`"
          >
            {{ tag }}
          </button>
        </div>

        <button
          id="btn-add-framework"
          @click="emit('newFramework')"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors shrink-0"
        >
          <Plus class="w-4 h-4" />
          <span>Framework</span>
        </button>
      </div>
    </div>

    <!-- Grid of Framework Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div
        v-for="card in filteredFrameworks"
        :key="card.id"
        :id="`framework-card-${card.id}`"
        class="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
      >
        <div>
          <!-- Header: Shield Icon + Title + Red Pct -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5 flex-1 min-w-0">
              <Shield class="w-5 h-5 text-neutral-700 shrink-0 mt-0.5 stroke-[1.8]" />
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h4 class="text-sm sm:text-[15px] font-bold text-neutral-900 leading-snug line-clamp-2">
                    {{ card.title }}
                  </h4>
                  <span
                    v-if="card.version"
                    class="text-[11px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-md font-medium"
                  >
                    {{ card.version }}
                  </span>
                </div>
                <p v-if="card.authority" class="text-xs text-neutral-500 mt-1 line-clamp-1">
                  {{ card.authority }}
                </p>
              </div>
            </div>

            <span class="text-sm font-bold text-rose-600 shrink-0">
              {{ card.completionPct }}%
            </span>
          </div>

          <!-- Progress bar line -->
          <div class="w-full h-1 bg-neutral-200 rounded-full overflow-hidden mt-3 mb-3">
            <div
              class="h-full bg-emerald-500 rounded-full transition-all duration-300"
              :style="{ width: `${Math.max(card.completionPct, 2)}%` }"
            />
          </div>

          <!-- Tags row -->
          <div class="flex items-center gap-2 flex-wrap mb-3 text-xs">
            <span
              :class="`text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                card.tagType === 'Operational' ? 'bg-blue-600' : 'bg-slate-800'
              }`"
            >
              {{ card.tagType }}
            </span>

            <span v-if="card.reviewsCount !== undefined" class="text-neutral-500 text-xs">
              {{ card.reviewsCount }} Review
            </span>

            <span v-if="card.suggestionsCount !== undefined" class="text-blue-600 hover:underline cursor-pointer text-xs font-medium">
              {{ card.suggestionsCount }} suggestions
            </span>
          </div>

          <!-- Card middle box -->
          <div
            v-if="card.pendingReview"
            class="border border-amber-300 bg-amber-50/60 rounded-xl p-3 text-xs text-amber-900 space-y-1.5 mb-4"
          >
            <div class="flex items-center gap-1.5 font-bold text-amber-900">
              <Clock class="w-3.5 h-3.5 text-amber-700" />
              <span>Pending Review</span>
            </div>
            <div class="flex items-center justify-between text-amber-800">
              <span>Requirements</span>
              <span class="font-semibold">{{ card.pendingReview.requirements }}</span>
            </div>
            <div class="flex items-center justify-between text-amber-800">
              <span>Categories</span>
              <span class="font-semibold">{{ card.pendingReview.categories }}</span>
            </div>
            <div class="flex items-center justify-between text-amber-800 truncate gap-2">
              <span>File name</span>
              <span class="font-mono text-[11px] truncate text-amber-900">
                {{ card.pendingReview.fileName }}
              </span>
            </div>
            <div class="flex items-center justify-between text-amber-800">
              <span>Pages</span>
              <span class="font-semibold">{{ card.pendingReview.pages }}</span>
            </div>
          </div>
          <div
            v-else-if="card.latestReviewName"
            class="border border-neutral-200 rounded-xl p-3 mb-4 bg-neutral-50/50"
          >
            <div class="text-[11px] text-neutral-500 mb-0.5">Latest Review</div>
            <div class="text-xs font-bold text-neutral-800">
              {{ card.latestReviewName }}
            </div>
          </div>

          <!-- Metrics -->
          <div class="space-y-2 mb-4 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-neutral-800 font-medium">Outstanding Items</span>
              <span class="bg-rose-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                {{ card.outstandingItems }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-neutral-800 font-medium">Fulfillment Rate</span>
              <span class="text-neutral-600 font-medium">
                {{ card.fulfillmentRate }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
          <span>Last modified: {{ card.lastModified }}</span>
          <button
            @click="emit('selectFramework', card)"
            class="flex items-center gap-1 text-neutral-700 hover:text-blue-600 font-semibold transition-colors"
          >
            <span>View details</span>
            <ChevronRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
