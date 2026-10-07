<script setup lang="ts">
import { computed, watch } from 'vue';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    totalItems: number;
    currentPage: number;
    pageSize: number;
    pageSizeOptions?: number[];
  }>(),
  {
    pageSizeOptions: () => [20, 40, 60, 100],
  }
);

const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void;
  (e: 'update:pageSize', size: number): void;
}>();

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(props.totalItems / props.pageSize));
});

const startIndex = computed(() => {
  return props.totalItems === 0 ? 0 : (props.currentPage - 1) * props.pageSize;
});

const endIndex = computed(() => {
  return Math.min(startIndex.value + props.pageSize, props.totalItems);
});

// Watch pageSize change: automatically reset page to 1
const handlePageSizeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const newSize = Number(target.value);
  emit('update:pageSize', newSize);
  emit('update:currentPage', 1);
};

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === props.currentPage) return;
  emit('update:currentPage', page);
};

// Compute displayed numbered page buttons (e.g. [1, 2, 3] or [1, '...', 4, 5, 6, '...', 10])
const displayedPageNumbers = computed(() => {
  const pages: (number | string)[] = [];
  const total = totalPages.value;
  const current = props.currentPage;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }
  return pages;
});
</script>

<template>
  <div
    class="pagination-controller px-4 sm:px-6 py-3 border-t border-neutral-200 bg-neutral-50/90 rounded-b-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-800 font-normal"
  >
    <!-- Left: Records Range Display -->
    <div class="flex items-center gap-2">
      <span>
        Showing
        <strong class="text-neutral-900 font-semibold">{{ totalItems === 0 ? 0 : startIndex + 1 }}</strong>
        –
        <strong class="text-neutral-900 font-semibold">{{ endIndex }}</strong>
        of
        <strong class="text-neutral-900 font-semibold">{{ totalItems }}</strong>
        total records
      </span>
    </div>

    <!-- Right: Per page Selector & Page Controls -->
    <div class="flex items-center gap-3 flex-wrap">
      <!-- Per Page Dropdown -->
      <div class="flex items-center gap-1.5">
        <label class="text-neutral-700 text-xs font-normal">Per page:</label>
        <select
          :value="pageSize"
          @change="handlePageSizeChange"
          class="h-8 px-2 text-xs font-semibold text-neutral-900 bg-white border border-neutral-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
        >
          <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">
            {{ opt }}
          </option>
        </select>
      </div>

      <!-- Navigation & Numbered Buttons -->
      <div class="flex items-center gap-1">
        <!-- First Page << -->
        <button
          type="button"
          @click="goToPage(1)"
          :disabled="currentPage <= 1"
          class="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="First Page"
        >
          <ChevronsLeft class="w-3.5 h-3.5 text-neutral-800" />
        </button>

        <!-- Prev Page < -->
        <button
          type="button"
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage <= 1"
          class="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft class="w-3.5 h-3.5 text-neutral-800" />
        </button>

        <!-- Numbered Page Buttons -->
        <template v-for="(pageNum, idx) in displayedPageNumbers" :key="`p-${idx}`">
          <span v-if="pageNum === '...'" class="px-1 text-neutral-400">...</span>
          <button
            v-else
            type="button"
            @click="goToPage(Number(pageNum))"
            :class="`min-w-[32px] h-8 px-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              currentPage === pageNum
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-neutral-900 border-neutral-200 hover:bg-neutral-100'
            }`"
          >
            {{ pageNum }}
          </button>
        </template>

        <!-- Next Page > -->
        <button
          type="button"
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage >= totalPages"
          class="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Next Page"
        >
          <ChevronRight class="w-3.5 h-3.5 text-neutral-800" />
        </button>

        <!-- Last Page >> -->
        <button
          type="button"
          @click="goToPage(totalPages)"
          :disabled="currentPage >= totalPages"
          class="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Last Page"
        >
          <ChevronsRight class="w-3.5 h-3.5 text-neutral-800" />
        </button>
      </div>
    </div>
  </div>
</template>
