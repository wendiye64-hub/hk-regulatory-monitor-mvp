<script setup lang="ts">
import { computed } from 'vue';
import {
  X,
  Building2,
  Globe,
  ExternalLink,
  Shield,
  Layers,
  Plus,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-vue-next';
import type { RegulatorInScope } from '@/types';
import { useTaskStore } from '@/stores/taskStore';

const props = defineProps<{
  isOpen: boolean;
  regulator: RegulatorInScope | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'toggleFollow', regulatorId: string): void;
  (e: 'createTaskForRegulator', regulator: RegulatorInScope): void;
  (e: 'goToTask', taskId: string): void;
}>();

const taskStore = useTaskStore();

const linkedTasks = computed(() => {
  if (!props.regulator) return [];
  return taskStore.getTasksForRegulator(props.regulator.id || props.regulator.acronym);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen && regulator" class="fixed inset-0 z-50 overflow-hidden pointer-events-auto">
      <div
        class="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity cursor-pointer"
        @click="emit('close')"
      />

      <div
        class="fixed top-0 right-0 bottom-0 bg-white shadow-2xl flex flex-col border-l border-neutral-200 z-50 w-full max-w-xl select-text animate-in slide-in-from-right duration-200"
      >
        <!-- Header -->
        <div class="p-5 sm:p-6 border-b border-neutral-200 bg-neutral-50/70 flex items-start justify-between gap-4">
          <div class="space-y-2 min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-md">
                {{ regulator.acronym || 'REG' }}
              </span>
              <span class="text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 px-2 py-0.5 rounded-md">
                {{ regulator.jurisdiction }}
              </span>
              <span
                v-if="regulator.isFollowed"
                class="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full"
              >
                <Check class="w-3 h-3 text-blue-600" />
                <span>Following</span>
              </span>
            </div>

            <h2 class="text-base sm:text-lg font-bold text-neutral-900 leading-snug break-words">
              {{ regulator.name }}
            </h2>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              @click="emit('createTaskForRegulator', regulator); emit('close')"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Create Compliance Analysis Task for this Regulator"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Create Task</span>
            </button>

            <button
              @click="emit('close')"
              class="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          <!-- Authority Quick Facts -->
          <div class="grid grid-cols-2 gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-xs">
            <div>
              <div class="text-neutral-500 font-medium">Supervisory Category</div>
              <div class="font-bold text-neutral-900 mt-1">
                {{ regulator.category || 'Financial Services & Capital Markets' }}
              </div>
            </div>
            <div>
              <div class="text-neutral-500 font-medium">Monitoring Cadence</div>
              <div class="font-bold text-neutral-900 mt-1">
                {{ regulator.cadence || 'Daily' }}
              </div>
            </div>
            <div>
              <div class="text-neutral-500 font-medium">Endpoint Status</div>
              <div class="font-bold text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 class="w-3.5 h-3.5" />
                <span>{{ regulator.health || 'Healthy' }}</span>
              </div>
            </div>
            <div>
              <div class="text-neutral-500 font-medium">Official Portal</div>
              <a
                :href="regulator.officialEndpoint"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:underline font-semibold mt-1 inline-flex items-center gap-1 truncate max-w-full"
              >
                <span>Visit Source</span>
                <ExternalLink class="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>

          <!-- LINKED TASKS -->
          <!-- Expand linked compliance tasks for this regulatory authority -->
          <div class="p-4 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Layers class="w-4 h-4 text-blue-600" />
                <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-800">
                  Linked Compliance Tasks ({{ linkedTasks.length }})
                </h3>
              </div>
              <button
                @click="emit('createTaskForRegulator', regulator); emit('close')"
                class="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>Create Task</span>
              </button>
            </div>

            <div v-if="linkedTasks.length === 0" class="text-xs text-neutral-400 py-3 italic text-center">
              No tasks currently linked to this regulatory authority. Click "Create Task" to start research.
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="t in linkedTasks"
                :key="t.id"
                class="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between gap-2"
              >
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold text-neutral-900 truncate">
                    {{ t.title }}
                  </div>
                  <div class="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                    <span>{{ t.jurisdiction }}</span>
                    <span>•</span>
                    <span class="text-emerald-700 font-semibold">{{ t.status }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <button
                    @click="emit('goToTask', t.id); emit('close')"
                    class="px-2.5 py-1 rounded text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 cursor-pointer"
                  >
                    View Task
                  </button>
                  <button
                    @click="taskStore.unlinkRegulatorFromTask(t.id, regulator.id)"
                    class="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Unlink regulator from this task"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Sub-Scopes / Divisions -->
          <div v-if="regulator.subScopes && regulator.subScopes.length > 0" class="space-y-2">
            <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Supervisory Scopes & Divisions ({{ regulator.subScopes.length }})
            </h3>
            <div class="space-y-2">
              <div
                v-for="sub in regulator.subScopes"
                :key="sub.id"
                class="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs flex items-center justify-between gap-2"
              >
                <div>
                  <div class="font-bold text-neutral-800">{{ sub.name }}</div>
                  <div class="text-[11px] text-neutral-500 font-mono">{{ sub.code }}</div>
                </div>
                <span :class="`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sub.isFollowed ? 'bg-blue-50 text-blue-700' : 'text-neutral-400'}`">
                  {{ sub.isFollowed ? 'Monitored' : 'Inactive' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 sm:p-5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
          <button
            @click="emit('toggleFollow', regulator.id)"
            :class="`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              regulator.isFollowed
                ? 'bg-neutral-200 hover:bg-rose-50 text-neutral-800 hover:text-rose-600'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`"
          >
            {{ regulator.isFollowed ? 'Unfollow Authority' : '+ Follow Authority' }}
          </button>

          <button
            @click="emit('createTaskForRegulator', regulator); emit('close')"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
