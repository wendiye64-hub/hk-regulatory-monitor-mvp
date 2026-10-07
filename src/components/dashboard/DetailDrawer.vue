<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  X,
  ExternalLink,
  Shield,
  Calendar,
  Sparkles,
  Edit3,
  CheckCircle2,
  Share2,
  Clock,
  UserPlus,
  FileText,
  AlertTriangle,
  History,
  Building2,
  GripVertical,
  Maximize2,
  Minimize2,
  Layers,
  Plus,
  Bookmark,
  BookmarkCheck,
} from 'lucide-vue-next';
import type { RegulationItem, MaterialityLevel } from '@/types';
import { normalizeRelevance } from '@/types';
import { useTaskStore } from '@/stores/taskStore';
import { useDirectoryStore } from '@/stores/directoryStore';

const props = defineProps<{
  regulation: RegulationItem | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'openOverrideModal', regulation: RegulationItem): void;
  (e: 'openAssignModal', regulation: RegulationItem): void;
  (e: 'importToMonitor', regulation: RegulationItem): void;
  (e: 'importToDiligence', regulation: RegulationItem): void;
  (e: 'dismissRegulation', regulationId: string): void;
  (e: 'createTaskForNews', regulation: RegulationItem): void;
  (e: 'goToTask', taskId: string): void;
}>();

const taskStore = useTaskStore();
const directoryStore = useDirectoryStore();

const isBookmarked = computed(() => {
  if (!props.regulation) return false;
  return directoryStore.isBookmarked(props.regulation.id, props.regulation.referenceNumber, props.regulation.title);
});

const handleToggleBookmark = () => {
  if (!props.regulation) return;
  if (isBookmarked.value) {
    directoryStore.removeBookmark(props.regulation.id, props.regulation.referenceNumber, props.regulation.title);
  } else {
    directoryStore.addBookmark(props.regulation);
  }
};

const linkedTasks = computed(() => {
  if (!props.regulation) return [];
  return taskStore.getTasksForNews(
    props.regulation.id,
    props.regulation.title,
    props.regulation.referenceNumber
  );
});

// Dynamic Width and Resizing State
const minWidth = 380;
const calculateDefaultWidth = () => {
  if (typeof window === 'undefined') return 720;
  return Math.min(740, Math.max(minWidth, Math.round(window.innerWidth * 0.55)));
};

const drawerWidth = ref<number>(calculateDefaultWidth());
const isDragging = ref<boolean>(false);

const isMaximized = computed(() => {
  if (typeof window === 'undefined') return false;
  return drawerWidth.value >= window.innerWidth - 12;
});

const drawerStyle = computed(() => ({
  width: `${drawerWidth.value}px`,
  maxWidth: '100vw',
  transition: isDragging.value
    ? 'none'
    : 'width 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
}));

const handleImport = (reg: RegulationItem) => {
  emit('importToDiligence', reg);
};

const getMaterialityColor = (level: string) => {
  const norm = normalizeRelevance(level);
  switch (norm) {
    case 'Direct / Highly Relevant':
      return 'bg-rose-50 border-rose-200 text-rose-700';
    case 'Relevant':
      return 'bg-orange-50 border-orange-200 text-orange-700';
    case 'Partially Relevant':
      return 'bg-amber-50 border-amber-200 text-amber-700';
    default:
      return 'bg-neutral-100 border-neutral-200 text-neutral-600';
  }
};

// Drag Resizing Logic (pinned to the right edge: width = window.innerWidth - mouseX)
const startResize = (e: MouseEvent) => {
  e.preventDefault();
  isDragging.value = true;
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'col-resize';

  const onMouseMove = (moveEvent: MouseEvent) => {
    if (!isDragging.value) return;
    const newWidth = window.innerWidth - moveEvent.clientX;
    drawerWidth.value = Math.max(minWidth, Math.min(window.innerWidth, newWidth));
  };

  const onMouseUp = () => {
    isDragging.value = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};

const startTouchResize = (e: TouchEvent) => {
  if (!e.touches[0]) return;
  isDragging.value = true;

  const onTouchMove = (moveEvent: TouchEvent) => {
    if (!isDragging.value || !moveEvent.touches[0]) return;
    const newWidth = window.innerWidth - moveEvent.touches[0].clientX;
    drawerWidth.value = Math.max(minWidth, Math.min(window.innerWidth, newWidth));
  };

  const onTouchEnd = () => {
    isDragging.value = false;
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
  };

  window.addEventListener('touchmove', onTouchMove);
  window.addEventListener('touchend', onTouchEnd);
};

const toggleMaximize = () => {
  if (isMaximized.value) {
    drawerWidth.value = calculateDefaultWidth();
  } else {
    drawerWidth.value = window.innerWidth;
  }
};

// Window Resize & Keyboard Shortcuts
const handleWindowResize = () => {
  if (drawerWidth.value > window.innerWidth) {
    drawerWidth.value = window.innerWidth;
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
};

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (drawerWidth.value > window.innerWidth) {
        drawerWidth.value = window.innerWidth;
      } else if (drawerWidth.value < minWidth) {
        drawerWidth.value = calculateDefaultWidth();
      }
    }
  }
);

onMounted(() => {
  window.addEventListener('resize', handleWindowResize);
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize);
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen && regulation" class="fixed inset-0 z-50 overflow-hidden pointer-events-auto">
      <!-- Backdrop with smooth fade -->
      <Transition name="drawer-backdrop" appear>
        <div
          v-if="isOpen"
          class="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity cursor-pointer"
          @click="emit('close')"
        />
      </Transition>

      <!-- Resizable Drawer pinned firmly to the right edge (right: 0) -->
      <Transition name="drawer-slide" appear>
        <div
          v-if="isOpen"
          id="detail-evaluation-drawer"
          class="fixed top-0 right-0 bottom-0 bg-white shadow-2xl flex flex-col border-l border-neutral-200 z-50 select-text"
          :style="drawerStyle"
        >
          <!-- Left Edge Drag-to-Resize Handle -->
          <div
            @mousedown.prevent="startResize"
            @touchstart.prevent="startTouchResize"
            @dblclick="toggleMaximize"
            class="absolute -left-2.5 top-0 bottom-0 w-5 cursor-col-resize z-50 flex items-center justify-center select-none group touch-none"
            :title="isMaximized ? 'Drag to resize (Double-click to restore)' : 'Drag to resize (Double-click for full screen)'"
          >
            <!-- Vertical guide line -->
            <div
              :class="`w-1 h-full rounded-full transition-colors duration-150 ${
                isDragging
                  ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.7)]'
                  : 'group-hover:bg-blue-500 bg-transparent'
              }`"
            />

            <!-- Tactile grip tab on the border -->
            <div
              :class="`absolute top-1/2 -translate-y-1/2 w-4 h-11 bg-white border rounded-full shadow-md flex items-center justify-center transition-all ${
                isDragging
                  ? 'border-blue-600 text-blue-600 scale-110 shadow-lg'
                  : 'border-neutral-300 text-neutral-400 group-hover:border-blue-500 group-hover:text-blue-600'
              }`"
            >
              <GripVertical class="w-3 h-3 stroke-[2.5]" />
            </div>
          </div>

          <!-- Drawer Header -->
          <div class="p-5 sm:p-6 border-b border-neutral-200 bg-neutral-50/70 flex items-start justify-between gap-4">
            <div class="space-y-2 min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-md">
                  {{ regulation.regulatorAcronym }}
                </span>
                <span class="text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 px-2 py-0.5 rounded-md">
                  {{ regulation.jurisdiction }}
                </span>
                <span class="text-xs font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">
                  {{ regulation.referenceNumber }}
                </span>
                <span class="text-xs font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                  {{ regulation.docType }}
                </span>
              </div>

              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-base sm:text-lg font-bold text-neutral-900 leading-snug break-words">
                  {{ regulation.title }}
                </h2>
                <span
                  v-if="(regulation as any).isAcknowledged"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                  title="Acknowledged from Live Priority Alerts Feed"
                >
                  <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
                  <span>Acknowledged</span>
                </span>
              </div>

              <div class="flex items-center gap-2 pt-0.5 flex-wrap">
                <span
                  v-for="(theme, idx) in regulation.themes"
                  :key="`${theme}-${idx}`"
                  class="text-xs font-medium bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full"
                >
                  #{{ theme }}
                </span>

                <a
                  :href="regulation.officialUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 ml-2 transition-colors bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                >
                  <span>Official Regulator URL</span>
                  <ExternalLink class="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  @click="handleToggleBookmark"
                  :class="`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    isBookmarked
                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900'
                  }`"
                  :title="isBookmarked ? 'Bookmarked in Directory' : 'Bookmark into Directory'"
                >
                  <BookmarkCheck v-if="isBookmarked" class="w-3.5 h-3.5 text-amber-600" />
                  <Bookmark v-else class="w-3.5 h-3.5" />
                  <span>{{ isBookmarked ? 'Bookmarked' : 'Bookmark' }}</span>
                </button>
              </div>
            </div>

            <!-- Header Controls: Maximize / Restore Toggle & Close Button -->
            <div class="flex items-center gap-1 shrink-0">
              <button
                type="button"
                @click="toggleMaximize"
                class="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-xl transition-colors cursor-pointer"
                :title="isMaximized ? 'Restore width' : 'Expand to full screen'"
                :aria-label="isMaximized ? 'Restore width' : 'Expand to full screen'"
              >
                <Minimize2 v-if="isMaximized" class="w-4 h-4" />
                <Maximize2 v-else class="w-4 h-4" />
              </button>

              <button
                type="button"
                @click="emit('close')"
                class="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-xl transition-colors cursor-pointer"
                aria-label="Close drawer"
                title="Close drawer (Esc)"
              >
                <X class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Drawer Scrollable Content -->
          <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            <!-- Key Dates Block -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80">
              <div>
                <div class="text-xs text-neutral-600 font-medium flex items-center gap-1">
                  <Calendar class="w-3.5 h-3.5 text-neutral-500" />
                  Date
                </div>
                <div class="text-xs sm:text-sm font-semibold text-neutral-900 mt-1">
                  {{ regulation.publishDate }}
                </div>
              </div>

              <div>
                <div class="text-xs text-neutral-600 font-medium flex items-center gap-1">
                  <Clock class="w-3.5 h-3.5 text-neutral-500" />
                  Effective
                </div>
                <div class="text-xs sm:text-sm font-semibold text-neutral-900 mt-1">
                  {{ regulation.effectiveDate }}
                </div>
              </div>

              <div>
                <div class="text-xs text-neutral-600 font-medium">Owner</div>
                <div class="text-xs sm:text-sm font-semibold text-neutral-900 mt-1">
                  {{ regulation.owner }}
                </div>
              </div>
            </div>

            <!-- AI Impact Analysis Card -->
            <div class="bg-blue-50/30 border border-blue-200 rounded-2xl p-5 space-y-3.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Sparkles class="w-4 h-4 text-blue-600" />
                  <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-900">
                    AI Impact Analysis
                  </h3>
                </div>
                <span class="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  Automated Synthesis
                </span>
              </div>

              <div>
                <h4 class="text-xs font-bold text-neutral-900 mb-1">Executive Summary</h4>
                <p class="text-xs text-neutral-700 leading-relaxed">
                  {{ regulation.executiveSummary }}
                </p>
              </div>

              <div>
                <h4 class="text-xs font-bold text-neutral-900 mb-1">Operational Impact</h4>
                <p class="text-xs text-neutral-700 leading-relaxed">
                  {{ regulation.operationalImpact }}
                </p>
              </div>

              <div>
                <h4 class="text-xs font-bold text-neutral-900 mb-1.5 flex items-center gap-1">
                  <Building2 class="w-3.5 h-3.5 text-neutral-500" />
                  Affected Units
                </h4>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="unit in regulation.affectedBusinessUnits"
                    :key="unit"
                    class="text-xs font-medium bg-white text-neutral-800 border border-neutral-200 px-2.5 py-0.5 rounded-lg"
                  >
                    {{ unit }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Linked Compliance Tasks -->
            <div class="p-4 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Layers class="w-4 h-4 text-blue-600" />
                  <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-800">
                    Linked Compliance Tasks ({{ linkedTasks.length }})
                  </h3>
                </div>
                <button
                  type="button"
                  @click="emit('createTaskForNews', regulation)"
                  class="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>Link New Task</span>
                </button>
              </div>

              <div v-if="linkedTasks.length === 0" class="text-xs text-neutral-400 py-2 italic text-center">
                This item has not been linked to any compliance tasks yet.
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="t in linkedTasks"
                  :key="t.id"
                  class="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between gap-2"
                >
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-bold text-neutral-900 truncate">
                      {{ t.title }}
                    </div>
                    <div class="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                      <span class="bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded font-medium">{{ t.jurisdiction }}</span>
                      <span>•</span>
                      <span class="text-emerald-700 font-semibold">{{ t.status }}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      @click="emit('goToTask', t.id); emit('close')"
                      class="px-2 py-1 rounded text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 cursor-pointer"
                    >
                      View Task
                    </button>
                    <button
                      type="button"
                      @click="taskStore.unlinkNewsFromTask(t.id, regulation.id, regulation.title)"
                      class="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Unlink from this task"
                    >
                      <X class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Human-in-the-Loop Override Panel -->
            <div class="p-4 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Shield class="w-4 h-4 text-neutral-600" />
                  <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-800">
                    Evaluation & Relevance
                  </h3>
                </div>

                <button
                  id="btn-override-materiality"
                  type="button"
                  @click="emit('openOverrideModal', regulation)"
                  class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
                >
                  <Edit3 class="w-3.5 h-3.5" />
                  <span>Override Tier</span>
                </button>
              </div>

              <div class="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <div>
                  <div class="text-xs text-neutral-600 font-medium">Assessed Tier</div>
                  <div class="flex items-center gap-2 mt-1">
                    <span
                      :class="`text-xs font-bold px-2.5 py-0.5 rounded-md border ${getMaterialityColor(
                        regulation.materiality
                      )}`"
                    >
                      {{ normalizeRelevance(regulation.materiality) }}
                    </span>
                    <span class="text-xs font-mono text-neutral-600 font-medium">
                      Score: {{ regulation.aiRelevanceScore }}/100
                    </span>
                  </div>
                </div>

                <div class="text-right text-xs">
                  <div class="text-neutral-600 text-xs font-medium">Monitor Status</div>
                  <div class="font-semibold text-neutral-900 mt-1">
                    {{ regulation.diligenceStatus }}
                  </div>
                </div>
              </div>

              <div
                v-if="regulation.overrides && regulation.overrides.length > 0"
                class="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1"
              >
                <div class="font-bold text-amber-950 flex items-center gap-1">
                  <AlertTriangle class="w-3.5 h-3.5 text-amber-700" />
                  Human Override Record
                </div>
                <p class="text-neutral-800">
                  Changed from <strong>{{ regulation.overrides[0].previousTier }}</strong> to
                  <strong>{{ regulation.overrides[0].newTier }}</strong> by
                  {{ regulation.overrides[0].user }}.
                </p>
                <p class="text-xs text-neutral-700 italic">
                  Rationale: "{{ regulation.overrides[0].justification }}"
                </p>
              </div>
            </div>

            <!-- Applicability Rationale -->
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                  <Sparkles class="w-4 h-4 text-blue-600" />
                  <span>Applicability Rationale</span>
                </h3>
                <span class="text-xs text-neutral-500 font-medium">
                  Applicable justification addressing this task
                </span>
              </div>

              <!-- Rationale Content Box -->
              <div class="p-4 bg-amber-50/70 border border-amber-200/90 rounded-2xl text-xs text-amber-950 leading-relaxed shadow-2xs space-y-2">
                <div class="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                  <Sparkles class="w-3.5 h-3.5 text-amber-600" />
                  <span>Task Relevance & Statutory Justification:</span>
                </div>
                <p class="text-xs text-neutral-800 leading-relaxed">
                  {{ regulation.whyRelevantExplanation || 'Primary supervisory standard directly addressing the statutory disclosure, operational threshold, and governance requirements evaluated in this compliance task.' }}
                </p>
              </div>

              <!-- Supporting Clause Reference if available -->
              <div v-if="regulation.authenticExcerpt" class="mt-2 space-y-1">
                <div class="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                  <FileText class="w-3 h-3 text-neutral-400" />
                  <span>Official Text Excerpt:</span>
                </div>
                <div class="p-3.5 bg-neutral-50 text-neutral-800 rounded-xl text-xs font-mono leading-relaxed max-h-52 overflow-y-auto whitespace-pre-wrap border border-neutral-200 border-l-4 border-l-blue-600">
                  {{ regulation.authenticExcerpt }}
                </div>
              </div>
            </div>

            <!-- Immutable Audit Timeline -->
            <div class="space-y-3">
              <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                <History class="w-4 h-4 text-neutral-600" />
                Immutable Audit Timeline
              </h3>

              <div class="relative pl-5 border-l-2 border-neutral-200 space-y-4 text-xs">
                <div v-for="log in regulation.auditTimeline" :key="log.id" class="relative">
                  <div class="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                  <div class="flex items-center justify-between font-semibold text-neutral-900">
                    <span>{{ log.action }}</span>
                    <span class="text-xs font-mono text-neutral-600 font-medium">
                      {{ log.timestamp }}
                    </span>
                  </div>
                  <p class="text-neutral-600 text-xs mt-0.5">By {{ log.performedBy }}</p>
                  <p class="text-neutral-800 text-xs mt-1 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                    {{ log.details }}
                  </p>
                  <p
                    v-if="log.rationale"
                    class="text-amber-900 text-xs mt-1 bg-amber-50/80 p-2 rounded-lg border border-amber-200 italic"
                  >
                    Audit Justification: "{{ log.rationale }}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Drawer Action Footer -->
          <div class="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="emit('dismissRegulation', regulation.id)"
                class="px-3 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 transition-colors cursor-pointer"
              >
                Dismiss
              </button>

              <button
                type="button"
                @click="emit('openAssignModal', regulation)"
                class="px-3 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus class="w-3.5 h-3.5 text-neutral-500" />
                <span>Assign</span>
              </button>
            </div>

            <button
              id="btn-import-to-diligence-drawer"
              type="button"
              @click="handleImport(regulation)"
              :disabled="regulation.diligenceStatus === 'Imported'"
              :class="`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-2xs ${
                regulation.diligenceStatus === 'Imported'
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              }`"
            >
              <template v-if="regulation.diligenceStatus === 'Imported'">
                <CheckCircle2 class="w-4 h-4" />
                <span>Imported</span>
              </template>
              <template v-else>
                <Share2 class="w-4 h-4" />
                <span>Import to Diligence</span>
              </template>
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.drawer-backdrop-enter-active,
.drawer-backdrop-leave-active {
  transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-backdrop-enter-from,
.drawer-backdrop-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}
.drawer-slide-enter-to,
.drawer-slide-leave-from {
  transform: translateX(0);
}
</style>

