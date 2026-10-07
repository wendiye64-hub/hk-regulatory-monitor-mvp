<script setup lang="ts">
import { ref } from 'vue';
import { X, UserPlus, Check } from 'lucide-vue-next';
import type { RegulationItem, PriorityAlert } from '@/types';

const props = defineProps<{
  item: RegulationItem | PriorityAlert | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirmAssign', itemId: string, assigneeName: string, note?: string): void;
}>();

const colleagues = [
  { name: 'Ivan Choy', role: 'Monitor Lead', email: 'ivan.choy@wizpresso.com' },
  { name: 'Sarah Lin', role: 'Compliance Officer', email: 'sarah.lin@wizpresso.com' },
  { name: 'David Wong', role: 'Risk Analyst', email: 'david.wong@wizpresso.com' },
  { name: 'Rachel Chen', role: 'Legal Counsel', email: 'rachel.chen@wizpresso.com' },
];

const selectedColleague = ref(colleagues[0].name);
const note = ref('');

const handleAssign = () => {
  if (props.item) {
    emit('confirmAssign', props.item.id, selectedColleague.value, note.value);
    emit('close');
  }
};
</script>

<template>
  <div v-if="isOpen && item" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-xl bg-blue-50 text-blue-600">
            <UserPlus class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-neutral-900">Assign Regulation</h3>
            <p class="text-xs text-neutral-500">Route item to responsible teammate</p>
          </div>
        </div>
        <button @click="emit('close')" class="p-1 text-neutral-400 hover:text-neutral-700">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="p-3 bg-neutral-50 rounded-xl text-xs font-semibold text-neutral-900 line-clamp-2">
        {{ item.title }}
      </div>

      <form @submit.prevent="handleAssign" class="space-y-4 text-xs">
        <div>
          <label class="font-bold text-neutral-800 block mb-2">Select Assignee</label>
          <div class="space-y-1.5">
            <button
              v-for="c in colleagues"
              :key="c.name"
              type="button"
              @click="selectedColleague = c.name"
              :class="`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
                selectedColleague === c.name
                  ? 'bg-blue-50/70 border-blue-400 text-blue-900 font-semibold'
                  : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-800'
              }`"
            >
              <div>
                <div class="text-xs font-bold">{{ c.name }}</div>
                <div class="text-[11px] text-neutral-500">
                  {{ c.role }} · {{ c.email }}
                </div>
              </div>
              <Check v-if="selectedColleague === c.name" class="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>

        <div>
          <label class="font-bold text-neutral-800 block mb-1">Handover Note (Optional)</label>
          <input
            type="text"
            v-model="note"
            placeholder="e.g. Please verify Tier-2 cloud contract clauses by Friday..."
            class="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            Confirm Assignment
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
