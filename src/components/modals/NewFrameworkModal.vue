<script setup lang="ts">
import { ref } from 'vue';
import { X, Shield } from 'lucide-vue-next';
import type { FrameworkCardData } from '@/types';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'addFramework', framework: Omit<FrameworkCardData, 'id' | 'lastModified'>): void;
}>();

const title = ref('');
const version = ref('');
const authority = ref('');
const tagType = ref<'Operational' | 'Reporting' | 'Governance'>('Operational');
const outstandingItems = ref(120);

const handleSubmit = () => {
  if (!title.value.trim()) return;

  emit('addFramework', {
    title: title.value.trim(),
    version: version.value.trim() ? version.value.trim() : undefined,
    authority: authority.value.trim() ? authority.value.trim() : undefined,
    tagType: tagType.value,
    completionPct: 0,
    outstandingItems: Number(outstandingItems.value) || 100,
    fulfillmentRate: 0,
    reviewsCount: 1,
    latestReviewName: 'Initial Scoping Review',
  });

  emit('close');
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Shield class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-neutral-900">Add New Framework</h3>
            <p class="text-xs text-neutral-500">Track standard or regulatory policy matrix</p>
          </div>
        </div>
        <button @click="emit('close')" class="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer">
          <X class="w-4 h-4" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-3.5 text-xs">
        <div>
          <label class="font-bold text-neutral-800 block mb-1">
            Framework Title <span class="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            v-model="title"
            placeholder="e.g. NIST AI Risk Management Framework [AI RMF 1.0]"
            class="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="font-bold text-neutral-800 block mb-1">Version (Optional)</label>
            <input
              type="text"
              v-model="version"
              placeholder="e.g. Version 1"
              class="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="font-bold text-neutral-800 block mb-1">Type</label>
            <select
              v-model="tagType"
              class="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:outline-none"
            >
              <option value="Operational">Operational</option>
              <option value="Reporting">Reporting</option>
              <option value="Governance">Governance</option>
            </select>
          </div>
        </div>

        <div>
          <label class="font-bold text-neutral-800 block mb-1">Issuing Authority / Standard Body</label>
          <input
            type="text"
            v-model="authority"
            placeholder="e.g. National Institute of Standards and Technology (NIST)"
            class="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="font-bold text-neutral-800 block mb-1">Initial Requirement Items</label>
          <input
            type="number"
            v-model="outstandingItems"
            class="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
          >
            Create Framework
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
