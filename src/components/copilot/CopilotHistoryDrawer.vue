<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  X,
  History,
  Plus,
  Search,
  Clock,
  Layers,
  Edit2,
  Trash2,
  Download,
  Check,
  Calendar,
} from 'lucide-vue-next';
import type { MatrixSessionState } from '@/types';

const props = defineProps<{
  isOpen: boolean;
  sessions: MatrixSessionState[];
  activeSessionId: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'selectSession', sessionId: string): void;
  (e: 'openNewMatrixModal'): void;
  (e: 'renameSession', sessionId: string, newTitle: string): void;
  (e: 'deleteSession', sessionId: string): void;
  (e: 'exportSession', session: MatrixSessionState): void;
}>();

const searchQuery = ref('');
const renamingSessionId = ref<string | null>(null);
const renameInputText = ref('');

interface HoverTooltipData {
  title: string;
  tags: string[];
  updatedAt: string;
  creator: string;
  x: number;
  y: number;
}

const hoverTooltip = ref<HoverTooltipData | null>(null);
let hoverTimer: number | null = null;

const filteredSessions = computed(() => {
  if (!searchQuery.value.trim()) return props.sessions;
  const q = searchQuery.value.toLowerCase();
  return props.sessions.filter(
    (s) =>
      s.sessionTitle.toLowerCase().includes(q) ||
      s.questions.some((item) => item.questionText.toLowerCase().includes(q)) ||
      s.jurisdictions.some(
        (j) => j.name.toLowerCase().includes(q) || j.code.toLowerCase().includes(q)
      )
  );
});

const groupedSessions = computed(() => {
  const today: MatrixSessionState[] = [];
  const prev7Days: MatrixSessionState[] = [];
  const prev30Days: MatrixSessionState[] = [];

  filteredSessions.value.forEach((sess, idx) => {
    if (idx === 0) {
      today.push(sess);
    } else if (idx === 1) {
      prev7Days.push(sess);
    } else {
      prev30Days.push(sess);
    }
  });

  return { today, prev7Days, prev30Days };
});

const handleItemMouseEnter = (e: MouseEvent, sess: MatrixSessionState) => {
  if (hoverTimer) {
    window.clearTimeout(hoverTimer);
  }
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const tooltipX = Math.min(rect.right + 12, window.innerWidth - 300);
  const tooltipY = Math.min(rect.top, window.innerHeight - 150);

  hoverTimer = window.setTimeout(() => {
    hoverTooltip.value = {
      title: sess.sessionTitle,
      tags: sess.jurisdictions.map((j) => `${j.code} (${j.regulatorAcronym})`),
      updatedAt: sess.updatedAt,
      creator: sess.creator || 'Ivan Choy (Lead Compliance Officer)',
      x: tooltipX,
      y: tooltipY,
    };
  }, 300);
};

const handleItemMouseLeave = () => {
  if (hoverTimer) {
    window.clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  hoverTooltip.value = null;
};

const handleStartRename = (sess: MatrixSessionState, e: MouseEvent) => {
  e.stopPropagation();
  renamingSessionId.value = sess.sessionId;
  renameInputText.value = sess.sessionTitle;
};

const handleSaveRename = (sessId: string) => {
  if (renameInputText.value.trim()) {
    emit('renameSession', sessId, renameInputText.value.trim());
  }
  renamingSessionId.value = null;
};
</script>

<template>
  <div v-if="isOpen">
    <!-- Backdrop for mobile -->
    <div
      id="copilot-history-drawer-backdrop"
      class="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-2xs lg:hidden cursor-pointer"
      @click="emit('close')"
    />

    <aside
      id="copilot-history-drawer"
      class="fixed inset-y-0 left-0 z-50 w-80 sm:w-88 bg-white border-r border-neutral-200 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200"
    >
      <!-- Drawer Header -->
      <div class="p-4 border-b border-neutral-200 bg-neutral-50/90 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-2xs">
            <History class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Research History & Workspaces
            </h3>
            <p class="text-[11px] text-neutral-500">
              Cross-Jurisdiction Matrix Logs
            </p>
          </div>
        </div>

        <button
          @click="emit('close')"
          class="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors cursor-pointer"
          title="Close sidebar"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Action Button: New Matrix Workspace -->
      <div class="p-3 border-b border-neutral-100 bg-white">
        <button
          id="btn-drawer-new-matrix-workspace"
          @click="
            () => {
              emit('openNewMatrixModal');
              emit('close');
            }
          "
          class="w-full py-2.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>+ New Matrix Workspace</span>
        </button>
      </div>

      <!-- Search Input -->
      <div class="px-3 pt-2 pb-2 bg-white">
        <div class="relative">
          <Search class="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search research topics, jurisdictions, or keywords..."
            class="w-full pl-8 pr-3 py-1.5 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      <!-- Scrollable Groups: Today, 7 Days, 30 Days -->
      <div class="flex-1 overflow-y-auto p-3 space-y-5 text-xs">
        <!-- Group 1: Today -->
        <div v-if="groupedSessions.today.length > 0" class="space-y-1.5">
          <div class="px-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <Clock class="w-3 h-3" />
            <span>Today</span>
          </div>
          <div class="space-y-1">
            <div
              v-for="sess in groupedSessions.today"
              :key="sess.sessionId"
              @mouseenter="(e) => handleItemMouseEnter(e, sess)"
              @mouseleave="handleItemMouseLeave"
              @click="
                () => {
                  emit('selectSession', sess.sessionId);
                  emit('close');
                }
              "
              :class="`group relative p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                sess.sessionId === activeSessionId
                  ? 'bg-blue-50/90 border-blue-400 shadow-2xs'
                  : 'bg-white border-neutral-200/80 hover:bg-neutral-50/80 hover:border-neutral-300'
              }`"
            >
              <div class="flex items-center justify-between gap-2">
                <div
                  v-if="renamingSessionId === sess.sessionId"
                  class="flex items-center gap-1 flex-1"
                  @click.stop
                >
                  <input
                    type="text"
                    v-model="renameInputText"
                    @keydown.enter="handleSaveRename(sess.sessionId)"
                    @keydown.esc="renamingSessionId = null"
                    class="flex-1 px-2 py-0.5 bg-white border border-blue-500 rounded text-xs text-neutral-900 focus:outline-none"
                    autofocus
                  />
                  <button
                    @click="handleSaveRename(sess.sessionId)"
                    class="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                  >
                    <Check class="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4
                  v-else
                  :class="`text-xs font-semibold truncate flex-1 leading-snug ${
                    sess.sessionId === activeSessionId ? 'text-blue-950 font-bold' : 'text-neutral-800'
                  }`"
                >
                  {{ sess.sessionTitle }}
                </h4>
              </div>

              <div class="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-neutral-500">
                <div class="flex items-center gap-1 flex-wrap truncate">
                  <span
                    v-for="j in sess.jurisdictions.slice(0, 3)"
                    :key="j.code"
                    class="px-1 py-0.2 rounded bg-neutral-100 text-neutral-700 font-mono text-[10px] font-bold"
                  >
                    {{ j.code }}
                  </span>
                  <span v-if="sess.jurisdictions.length > 3" class="text-[10px] text-neutral-400 font-mono">
                    +{{ sess.jurisdictions.length - 3 }}
                  </span>
                </div>
                <span class="text-[10px] text-neutral-400 shrink-0">
                  {{ sess.questions.length }} question{{ sess.questions.length > 1 ? 's' : '' }}
                </span>
              </div>

              <!-- Hover Action Bar -->
              <div
                v-if="renamingSessionId !== sess.sessionId"
                class="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-white/95 px-1.5 py-0.5 rounded-lg border border-neutral-200/90 shadow-xs z-10"
              >
                <button
                  @click="(e) => handleStartRename(sess, e)"
                  class="p-1 rounded text-neutral-400 hover:text-blue-600 hover:bg-neutral-100 transition-colors"
                  title="Rename session"
                >
                  <Edit2 class="w-3 h-3" />
                </button>
                <button
                  @click.stop="emit('exportSession', sess)"
                  class="p-1 rounded text-neutral-400 hover:text-emerald-600 hover:bg-neutral-100 transition-colors"
                  title="Export compliance audit brief"
                >
                  <Download class="w-3 h-3" />
                </button>
                <button
                  @click.stop="emit('deleteSession', sess.sessionId)"
                  class="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete session"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Group 2: Previous 7 Days -->
        <div v-if="groupedSessions.prev7Days.length > 0" class="space-y-1.5">
          <div class="px-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar class="w-3 h-3" />
            <span>Previous 7 Days</span>
          </div>
          <div class="space-y-1">
            <div
              v-for="sess in groupedSessions.prev7Days"
              :key="sess.sessionId"
              @mouseenter="(e) => handleItemMouseEnter(e, sess)"
              @mouseleave="handleItemMouseLeave"
              @click="
                () => {
                  emit('selectSession', sess.sessionId);
                  emit('close');
                }
              "
              :class="`group relative p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                sess.sessionId === activeSessionId
                  ? 'bg-blue-50/90 border-blue-400 shadow-2xs'
                  : 'bg-white border-neutral-200/80 hover:bg-neutral-50/80 hover:border-neutral-300'
              }`"
            >
              <div class="flex items-center justify-between gap-2">
                <div
                  v-if="renamingSessionId === sess.sessionId"
                  class="flex items-center gap-1 flex-1"
                  @click.stop
                >
                  <input
                    type="text"
                    v-model="renameInputText"
                    @keydown.enter="handleSaveRename(sess.sessionId)"
                    @keydown.esc="renamingSessionId = null"
                    class="flex-1 px-2 py-0.5 bg-white border border-blue-500 rounded text-xs text-neutral-900 focus:outline-none"
                    autofocus
                  />
                  <button
                    @click="handleSaveRename(sess.sessionId)"
                    class="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                  >
                    <Check class="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4
                  v-else
                  :class="`text-xs font-semibold truncate flex-1 leading-snug ${
                    sess.sessionId === activeSessionId ? 'text-blue-950 font-bold' : 'text-neutral-800'
                  }`"
                >
                  {{ sess.sessionTitle }}
                </h4>
              </div>

              <div class="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-neutral-500">
                <div class="flex items-center gap-1 flex-wrap truncate">
                  <span
                    v-for="j in sess.jurisdictions.slice(0, 3)"
                    :key="j.code"
                    class="px-1 py-0.2 rounded bg-neutral-100 text-neutral-700 font-mono text-[10px] font-bold"
                  >
                    {{ j.code }}
                  </span>
                  <span v-if="sess.jurisdictions.length > 3" class="text-[10px] text-neutral-400 font-mono">
                    +{{ sess.jurisdictions.length - 3 }}
                  </span>
                </div>
                <span class="text-[10px] text-neutral-400 shrink-0">
                  {{ sess.questions.length }} question{{ sess.questions.length > 1 ? 's' : '' }}
                </span>
              </div>

              <!-- Hover Action Bar -->
              <div
                v-if="renamingSessionId !== sess.sessionId"
                class="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-white/95 px-1.5 py-0.5 rounded-lg border border-neutral-200/90 shadow-xs z-10"
              >
                <button
                  @click="(e) => handleStartRename(sess, e)"
                  class="p-1 rounded text-neutral-400 hover:text-blue-600 hover:bg-neutral-100 transition-colors"
                  title="Rename session"
                >
                  <Edit2 class="w-3 h-3" />
                </button>
                <button
                  @click.stop="emit('exportSession', sess)"
                  class="p-1 rounded text-neutral-400 hover:text-emerald-600 hover:bg-neutral-100 transition-colors"
                  title="Export compliance audit brief"
                >
                  <Download class="w-3 h-3" />
                </button>
                <button
                  @click.stop="emit('deleteSession', sess.sessionId)"
                  class="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete session"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Group 3: Previous 30 Days -->
        <div v-if="groupedSessions.prev30Days.length > 0" class="space-y-1.5">
          <div class="px-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar class="w-3 h-3" />
            <span>Previous 30 Days</span>
          </div>
          <div class="space-y-1">
            <div
              v-for="sess in groupedSessions.prev30Days"
              :key="sess.sessionId"
              @mouseenter="(e) => handleItemMouseEnter(e, sess)"
              @mouseleave="handleItemMouseLeave"
              @click="
                () => {
                  emit('selectSession', sess.sessionId);
                  emit('close');
                }
              "
              :class="`group relative p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                sess.sessionId === activeSessionId
                  ? 'bg-blue-50/90 border-blue-400 shadow-2xs'
                  : 'bg-white border-neutral-200/80 hover:bg-neutral-50/80 hover:border-neutral-300'
              }`"
            >
              <div class="flex items-center justify-between gap-2">
                <div
                  v-if="renamingSessionId === sess.sessionId"
                  class="flex items-center gap-1 flex-1"
                  @click.stop
                >
                  <input
                    type="text"
                    v-model="renameInputText"
                    @keydown.enter="handleSaveRename(sess.sessionId)"
                    @keydown.esc="renamingSessionId = null"
                    class="flex-1 px-2 py-0.5 bg-white border border-blue-500 rounded text-xs text-neutral-900 focus:outline-none"
                    autofocus
                  />
                  <button
                    @click="handleSaveRename(sess.sessionId)"
                    class="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                  >
                    <Check class="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4
                  v-else
                  :class="`text-xs font-semibold truncate flex-1 leading-snug ${
                    sess.sessionId === activeSessionId ? 'text-blue-950 font-bold' : 'text-neutral-800'
                  }`"
                >
                  {{ sess.sessionTitle }}
                </h4>
              </div>

              <div class="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-neutral-500">
                <div class="flex items-center gap-1 flex-wrap truncate">
                  <span
                    v-for="j in sess.jurisdictions.slice(0, 3)"
                    :key="j.code"
                    class="px-1 py-0.2 rounded bg-neutral-100 text-neutral-700 font-mono text-[10px] font-bold"
                  >
                    {{ j.code }}
                  </span>
                  <span v-if="sess.jurisdictions.length > 3" class="text-[10px] text-neutral-400 font-mono">
                    +{{ sess.jurisdictions.length - 3 }}
                  </span>
                </div>
                <span class="text-[10px] text-neutral-400 shrink-0">
                  {{ sess.questions.length }} question{{ sess.questions.length > 1 ? 's' : '' }}
                </span>
              </div>

              <!-- Hover Action Bar -->
              <div
                v-if="renamingSessionId !== sess.sessionId"
                class="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-white/95 px-1.5 py-0.5 rounded-lg border border-neutral-200/90 shadow-xs z-10"
              >
                <button
                  @click="(e) => handleStartRename(sess, e)"
                  class="p-1 rounded text-neutral-400 hover:text-blue-600 hover:bg-neutral-100 transition-colors"
                  title="Rename session"
                >
                  <Edit2 class="w-3 h-3" />
                </button>
                <button
                  @click.stop="emit('exportSession', sess)"
                  class="p-1 rounded text-neutral-400 hover:text-emerald-600 hover:bg-neutral-100 transition-colors"
                  title="Export compliance audit brief"
                >
                  <Download class="w-3 h-3" />
                </button>
                <button
                  @click.stop="emit('deleteSession', sess.sessionId)"
                  class="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete session"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredSessions.length === 0" class="p-6 text-center text-neutral-400 text-xs">
          No matching research history records found
        </div>
      </div>

      <!-- Drawer Footer -->
      <div class="p-3 border-t border-neutral-200 bg-neutral-50/70 text-[11px] text-neutral-500 flex items-center justify-between">
        <span>{{ sessions.length }} matrix workspace(s)</span>
        <span class="text-neutral-400">Pure Client-Side State</span>
      </div>
    </aside>

    <!-- Floating Tooltip (>300ms hover feedback) -->
    <div
      v-if="hoverTooltip"
      class="fixed z-50 max-w-xs p-3.5 bg-neutral-900 text-white rounded-xl shadow-2xl border border-neutral-700 text-xs pointer-events-none animate-in fade-in duration-150"
      :style="{
        left: `${hoverTooltip.x}px`,
        top: `${hoverTooltip.y}px`,
      }"
    >
      <div class="space-y-2">
        <p class="font-bold text-neutral-100 leading-snug">
          {{ hoverTooltip.title }}
        </p>

        <div class="space-y-1 text-[11px] text-neutral-300">
          <div class="flex items-center gap-1.5 text-neutral-400">
            <Layers class="w-3 h-3" />
            <span>Associated Authorities & Jurisdictions:</span>
          </div>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="(t, idx) in hoverTooltip.tags"
              :key="idx"
              class="bg-neutral-800 text-neutral-200 px-1.5 py-0.5 rounded text-[10px] font-mono border border-neutral-700"
            >
              {{ t }}
            </span>
          </div>
        </div>

        <div class="pt-1.5 border-t border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400">
          <span>{{ hoverTooltip.updatedAt.slice(0, 16) }}</span>
          <span>{{ hoverTooltip.creator.split(' ')[0] }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
