<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import {
  LayoutGrid,
  Radio,
  Building2,
  ClipboardList,
  Bot,
  Compass,
  SlidersHorizontal,
  ChevronRight,
  Pin,
  Plus,
  Search,
  X,
  BookmarkCheck,
  MessageSquare,
  Clock,
  Calendar,
  History,
} from 'lucide-vue-next';
import type { MatrixSessionState } from '@/types';

export type MainNavView = 'news-feed' | 'regulator' | 'tasks';

const props = withDefaults(
  defineProps<{
    activeView: string;
    openAlertsCount?: number;
    pendingAlertsCount?: number;
    overdueCount?: number;
    isExpanded?: boolean;
    matrixSessions?: MatrixSessionState[];
    activeMatrixSessionId?: string;
  }>(),
  {
    openAlertsCount: 3,
    overdueCount: 0,
    isExpanded: undefined,
    matrixSessions: () => [],
    activeMatrixSessionId: '',
  }
);

const emit = defineEmits<{
  (e: 'selectView', view: MainNavView): void;
  (e: 'navigate', view: MainNavView): void;
  (e: 'openScopeConfig'): void;
  (e: 'expandedChange', expanded: boolean): void;
  (e: 'selectMatrixSession', sessionId: string): void;
  (e: 'newChat'): void;
  (e: 'newMatrixWorkspace'): void;
  (e: 'toggleSaveSession', sessionId: string): void;
}>();

const isHovered = ref(false);
const isPinned = ref(false);
const historySearchQuery = ref('');

// Custom dark tooltip for hovered history sessions
interface HoveredSessionTooltipData {
  title: string;
  isSaved?: boolean;
  jurisdictions?: Array<{ code: string; name: string }>;
  updatedAt?: string;
  x: number;
  y: number;
}

const hoveredSessionTooltip = ref<HoveredSessionTooltipData | null>(null);
let tooltipTimer: number | null = null;

const handleSessionMouseEnter = (sess: MatrixSessionState, event: MouseEvent) => {
  if (tooltipTimer) {
    clearTimeout(tooltipTimer);
    tooltipTimer = null;
  }
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();

  tooltipTimer = window.setTimeout(() => {
    hoveredSessionTooltip.value = {
      title: sess.sessionTitle,
      isSaved: sess.isSaved,
      jurisdictions: sess.jurisdictions,
      updatedAt: sess.updatedAt || sess.createdAt,
      x: rect.right + 12,
      y: rect.top + rect.height / 2,
    };
  }, 90);
};

const handleSessionMouseLeave = () => {
  if (tooltipTimer) {
    clearTimeout(tooltipTimer);
    tooltipTimer = null;
  }
  hoveredSessionTooltip.value = null;
};

const handleSessionClick = (sessionId: string) => {
  handleSessionMouseLeave();
  emit('selectMatrixSession', sessionId);
  handleNavClick('tasks');
};

const tooltipStyle = computed(() => {
  if (!hoveredSessionTooltip.value) return {};
  const { x, y } = hoveredSessionTooltip.value;
  const clampedY = typeof window !== 'undefined'
    ? Math.max(32, Math.min(window.innerHeight - 80, y))
    : y;
  return {
    left: `${x}px`,
    top: `${clampedY}px`,
    transform: 'translateY(-50%)',
  };
});

watch(isHovered, (val) => {
  if (!val) {
    handleSessionMouseLeave();
  }
});

onUnmounted(() => {
  if (tooltipTimer) {
    clearTimeout(tooltipTimer);
    tooltipTimer = null;
  }
});

const effectiveExpanded = computed(() => {
  if (props.isExpanded !== undefined) return props.isExpanded;
  return isHovered.value || isPinned.value;
});

watch([isHovered, isPinned], () => {
  emit('expandedChange', isHovered.value || isPinned.value);
});

const isToday = (dateStr?: string) => {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  } catch {
    return false;
  }
};

const isWithin7Days = (dateStr?: string) => {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffTime = now.getTime() - d.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 7;
  } catch {
    return false;
  }
};

const navItems = [
  {
    id: 'news-feed' as MainNavView,
    label: 'News Feed',
    icon: Radio,
    badge: undefined,
  },
  {
    id: 'regulator' as MainNavView,
    label: 'Regulator',
    icon: Building2,
    badge: undefined,
  },
  {
    id: 'tasks' as MainNavView,
    label: 'Tasks',
    icon: ClipboardList,
    badge: undefined,
  },
];

const handleNavClick = (viewId: MainNavView) => {
  emit('selectView', viewId);
  emit('navigate', viewId);
};

const handleNewChat = () => {
  emit('newChat');
  emit('newMatrixWorkspace');
  handleNavClick('tasks');
};

const groupedSessions = computed(() => {
  const all = props.matrixSessions || [];
  const q = historySearchQuery.value.trim().toLowerCase();

  const matches = (s: MatrixSessionState) => {
    if (!q) return true;
    return (
      s.sessionTitle.toLowerCase().includes(q) ||
      s.jurisdictions.some(
        (j) => j.name.toLowerCase().includes(q) || j.code.toLowerCase().includes(q)
      )
    );
  };

  const saved = all.filter((s) => s.isSaved && matches(s));
  const unsaved = all.filter((s) => !s.isSaved && matches(s));

  const today = unsaved.filter((s) => isToday(s.updatedAt || s.createdAt));
  const prev7Days = unsaved.filter(
    (s) => !isToday(s.updatedAt || s.createdAt) && isWithin7Days(s.updatedAt || s.createdAt)
  );
  const other = unsaved.filter(
    (s) => !isToday(s.updatedAt || s.createdAt) && !isWithin7Days(s.updatedAt || s.createdAt)
  );

  return { saved, today, prev7Days, other };
});

const totalMatches = computed(
  () =>
    groupedSessions.value.saved.length +
    groupedSessions.value.today.length +
    groupedSessions.value.prev7Days.length +
    groupedSessions.value.other.length
);
</script>

<template>
  <aside
    id="monitor-global-sidebar"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    :style="{
      width: effectiveExpanded ? '16rem' : '4rem',
      transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      willChange: 'width',
    }"
    class="monitor-sidebar relative shrink-0 h-full bg-white border-r border-neutral-200 flex flex-col z-20 select-none overflow-hidden"
  >
    <!-- Brand Header -->
    <div class="h-16 flex items-center px-3.5 border-b border-neutral-100 shrink-0">
      <div class="flex items-center gap-3 overflow-hidden w-full">
        <div class="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm text-white">
          <svg
            class="w-5 h-5 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>

        <div v-if="effectiveExpanded" class="flex-1 min-w-0 transition-opacity duration-200">
          <h1 class="text-sm font-bold text-neutral-900 leading-tight truncate">
            Monitor
          </h1>
          <p class="text-xs text-neutral-500 truncate">
            Wizpresso Regulatory
          </p>
        </div>

        <button
          v-if="effectiveExpanded"
          @click="isPinned = !isPinned"
          :title="isPinned ? 'Unpin sidebar' : 'Pin sidebar'"
          :class="`p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer ${
            isPinned ? 'text-blue-600 bg-blue-50' : ''
          }`"
        >
          <Pin class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Main Navigation & Integrated History Tree -->
    <div class="flex-1 flex flex-col min-h-0 py-3 px-2 overflow-y-auto">
      <!-- Layer 1: Primary Navigation (Frameworks & Monitor, Regulatory Directory, Regulatory Copilot) -->
      <div class="space-y-1 shrink-0">
        <button
          v-for="item in navItems"
          :key="item.id"
          :id="`nav-item-${item.id}`"
          @click="handleNavClick(item.id)"
          :class="`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group cursor-pointer ${
            activeView === item.id
              ? 'bg-blue-50 text-blue-600 font-semibold shadow-2xs'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          }`"
          :title="!effectiveExpanded ? item.label : undefined"
        >
          <component
            :is="item.icon"
            :class="`w-5 h-5 shrink-0 transition-colors ${
              activeView === item.id ? 'text-blue-600' : 'text-neutral-500 group-hover:text-neutral-800'
            }`"
          />

          <span v-if="effectiveExpanded" class="truncate flex-1 text-left text-xs sm:text-sm font-medium">
            {{ item.label }}
          </span>

          <span
            v-if="item.badge && effectiveExpanded"
            :class="`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
              item.badge === 'AI'
                ? 'bg-blue-100 text-blue-700'
                : item.badge === 'Global'
                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                : 'bg-rose-500 text-white'
            }`"
          >
            {{ item.badge }}
          </span>
        </button>
      </div>

      <!-- Spacer -->
      <div class="my-3 mx-1 border-t border-neutral-100/90 shrink-0" />

      <!-- Layer 2: + New Chat Button (Hidden) -->
      <div v-if="false" class="shrink-0 mb-2">
        <button
          v-if="effectiveExpanded"
          id="btn-sidebar-new-chat"
          @click="handleNewChat"
          class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer select-none"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>+ New Chat</span>
        </button>
        <button
          v-else
          id="btn-sidebar-new-chat-collapsed"
          @click="handleNewChat"
          class="w-full h-10 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-xs cursor-pointer"
          title="+ New Chat"
        >
          <Plus class="w-5 h-5" />
        </button>
      </div>

      <!-- Layer 3: Search bar & Chat History List (Hidden) -->
      <div v-if="false" class="flex-1 flex flex-col min-h-0">
        <!-- Search Input -->
        <div class="relative mb-2 shrink-0">
          <Search class="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            v-model="historySearchQuery"
            placeholder="Search chat history..."
            class="w-full pl-8 pr-7 py-1.5 bg-neutral-50 hover:bg-neutral-100/80 focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-lg text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-neutral-400"
          />
          <button
            v-if="historySearchQuery"
            @click="historySearchQuery = ''"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs p-0.5 cursor-pointer"
            title="Clear search"
          >
            <X class="w-3 h-3" />
          </button>
        </div>

        <!-- Hierarchical History Lists: Saved, Today, Previous 7 Days, Other -->
        <div
          class="flex-1 overflow-y-auto space-y-2 pr-0.5"
          @scroll.passive="handleSessionMouseLeave"
        >
          <template v-if="totalMatches > 0">
            <!-- Saved -->
            <div v-if="groupedSessions.saved.length > 0" class="space-y-0.5">
              <div class="flex items-center justify-between px-2 pt-2.5 pb-1">
                <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <BookmarkCheck class="w-3 h-3 text-amber-500" />
                  <span>Saved</span>
                </span>
                <span class="text-[10px] font-mono text-neutral-400 font-semibold bg-neutral-100 px-1.5 py-0.2 rounded">
                  {{ groupedSessions.saved.length }}
                </span>
              </div>
              <div class="space-y-0.5">
                <button
                  v-for="sess in groupedSessions.saved"
                  :key="sess.sessionId"
                  :id="`sidebar-history-${sess.sessionId}`"
                  @mouseenter="(e) => handleSessionMouseEnter(sess, e)"
                  @mouseleave="handleSessionMouseLeave"
                  @click="handleSessionClick(sess.sessionId)"
                  :class="`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left group cursor-pointer ${
                    activeView === 'copilot' && sess.sessionId === activeMatrixSessionId
                      ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200/80 shadow-2xs'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent'
                  }`"
                >
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare class="w-3.5 h-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-600" />
                    <span class="truncate flex-1 font-medium">{{ sess.sessionTitle }}</span>
                  </div>
                  <BookmarkCheck class="w-3.5 h-3.5 text-amber-500 shrink-0" title="Saved to Favorites" />
                </button>
              </div>
            </div>

            <!-- Today -->
            <div v-if="groupedSessions.today.length > 0" class="space-y-0.5">
              <div class="flex items-center justify-between px-2 pt-2.5 pb-1">
                <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <Clock class="w-3 h-3 text-blue-500" />
                  <span>Today</span>
                </span>
                <span class="text-[10px] font-mono text-neutral-400 font-semibold bg-neutral-100 px-1.5 py-0.2 rounded">
                  {{ groupedSessions.today.length }}
                </span>
              </div>
              <div class="space-y-0.5">
                <button
                  v-for="sess in groupedSessions.today"
                  :key="sess.sessionId"
                  :id="`sidebar-history-${sess.sessionId}`"
                  @mouseenter="(e) => handleSessionMouseEnter(sess, e)"
                  @mouseleave="handleSessionMouseLeave"
                  @click="handleSessionClick(sess.sessionId)"
                  :class="`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left group cursor-pointer ${
                    activeView === 'copilot' && sess.sessionId === activeMatrixSessionId
                      ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200/80 shadow-2xs'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent'
                  }`"
                >
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare class="w-3.5 h-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-600" />
                    <span class="truncate flex-1 font-medium">{{ sess.sessionTitle }}</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Previous 7 Days -->
            <div v-if="groupedSessions.prev7Days.length > 0" class="space-y-0.5">
              <div class="flex items-center justify-between px-2 pt-2.5 pb-1">
                <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <Calendar class="w-3 h-3 text-emerald-500" />
                  <span>Previous 7 Days</span>
                </span>
                <span class="text-[10px] font-mono text-neutral-400 font-semibold bg-neutral-100 px-1.5 py-0.2 rounded">
                  {{ groupedSessions.prev7Days.length }}
                </span>
              </div>
              <div class="space-y-0.5">
                <button
                  v-for="sess in groupedSessions.prev7Days"
                  :key="sess.sessionId"
                  :id="`sidebar-history-${sess.sessionId}`"
                  @mouseenter="(e) => handleSessionMouseEnter(sess, e)"
                  @mouseleave="handleSessionMouseLeave"
                  @click="handleSessionClick(sess.sessionId)"
                  :class="`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left group cursor-pointer ${
                    activeView === 'copilot' && sess.sessionId === activeMatrixSessionId
                      ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200/80 shadow-2xs'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent'
                  }`"
                >
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare class="w-3.5 h-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-600" />
                    <span class="truncate flex-1 font-medium">{{ sess.sessionTitle }}</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- Other -->
            <div v-if="groupedSessions.other.length > 0" class="space-y-0.5">
              <div class="flex items-center justify-between px-2 pt-2.5 pb-1">
                <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <History class="w-3 h-3 text-neutral-400" />
                  <span>Other</span>
                </span>
                <span class="text-[10px] font-mono text-neutral-400 font-semibold bg-neutral-100 px-1.5 py-0.2 rounded">
                  {{ groupedSessions.other.length }}
                </span>
              </div>
              <div class="space-y-0.5">
                <button
                  v-for="sess in groupedSessions.other"
                  :key="sess.sessionId"
                  :id="`sidebar-history-${sess.sessionId}`"
                  @mouseenter="(e) => handleSessionMouseEnter(sess, e)"
                  @mouseleave="handleSessionMouseLeave"
                  @click="handleSessionClick(sess.sessionId)"
                  :class="`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left group cursor-pointer ${
                    activeView === 'copilot' && sess.sessionId === activeMatrixSessionId
                      ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200/80 shadow-2xs'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-transparent'
                  }`"
                >
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare class="w-3.5 h-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-600" />
                    <span class="truncate flex-1 font-medium">{{ sess.sessionTitle }}</span>
                  </div>
                </button>
              </div>
            </div>
          </template>
          <div v-else class="py-6 px-2 text-center text-xs text-neutral-400">
            {{ historySearchQuery ? 'No matching chat history found' : 'No chat history yet' }}
          </div>
        </div>
      </div>
      <!-- Collapsed view shortcut icon (Hidden) -->
      <div v-else-if="false" class="flex-1 flex flex-col items-center pt-2">
        <div
          class="p-2 text-neutral-400 hover:text-neutral-600 rounded-xl hover:bg-neutral-100 cursor-pointer transition-colors"
          title="Expand sidebar to view Chat History"
          @click="isHovered = true"
        >
          <History class="w-5 h-5" />
        </div>
      </div>
    </div>

    <!-- Bottom Configuration Shortcut -->
    <div class="p-2 border-t border-neutral-100 shrink-0">
      <button
        id="btn-open-scope-config-sidebar"
        @click="emit('openScopeConfig')"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors group cursor-pointer"
        :title="!effectiveExpanded ? 'Watchlist Search & Scope' : undefined"
      >
        <SlidersHorizontal class="w-5 h-5 text-neutral-500 group-hover:text-blue-600 shrink-0" />
        <div v-if="effectiveExpanded" class="flex items-center justify-between flex-1 truncate">
          <span class="text-neutral-700 font-medium">Watchlist Search</span>
          <ChevronRight class="w-3.5 h-3.5 text-neutral-400" />
        </div>
      </button>
    </div>
  </aside>

  <!-- Floating Full-Name Card on Hover -->
  <Teleport to="body">
    <Transition name="tooltip-fade">
      <div
        v-if="hoveredSessionTooltip"
        id="sidebar-session-hover-card"
        class="fixed z-[9999] max-w-sm sm:max-w-md p-3.5 bg-neutral-950 text-white rounded-xl shadow-2xl border border-neutral-800 text-xs pointer-events-none select-none"
        :style="tooltipStyle"
      >
        <!-- Triangle pointer arrow pointing back to sidebar button -->
        <div
          class="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-neutral-950 rotate-45 border-l border-b border-neutral-800"
        />

        <div class="relative z-10 space-y-2">
          <!-- Full session title in high-contrast white text -->
          <p class="font-bold text-white text-xs sm:text-sm leading-snug break-words">
            {{ hoveredSessionTooltip.title }}
          </p>

          <!-- Badges / Metadata if available -->
          <div
            v-if="(hoveredSessionTooltip.jurisdictions && hoveredSessionTooltip.jurisdictions.length > 0) || hoveredSessionTooltip.isSaved"
            class="flex items-center gap-1.5 flex-wrap pt-0.5"
          >
            <span
              v-if="hoveredSessionTooltip.isSaved"
              class="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            >
              <BookmarkCheck class="w-3 h-3 text-amber-400" />
              <span>Saved</span>
            </span>

            <span
              v-for="j in hoveredSessionTooltip.jurisdictions?.slice(0, 4)"
              :key="j.code"
              class="bg-neutral-800 text-neutral-300 border border-neutral-700 px-1.5 py-0.5 rounded text-[10px] font-mono"
            >
              {{ j.code }}
            </span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateY(-50%) scale(0.97);
}
</style>
