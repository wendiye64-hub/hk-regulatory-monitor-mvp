<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  ClipboardList,
  Search,
  Plus,
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  AlertCircle,
  Layers,
  FileText,
  Building2,
  Trash2,
  Share2,
  Download,
  Copy,
  Check,
  Globe,
  X,
  Pin,
  UserPlus,
  UserCheck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-vue-next';
import { useTaskStore, type ComplianceTask, type TaskQuestion } from '@/stores/taskStore';
import { useDirectoryStore } from '@/stores/directoryStore';
import TaskReportModal from '../modals/TaskReportModal.vue';
import ComboboxFilter from '@/components/common/ComboboxFilter.vue';
import PaginationController from '@/components/common/PaginationController.vue';
import { ALL_JURISDICTIONS, type RegulatorInScope } from '@/types';

const props = defineProps<{
  initialSelectedTaskId?: string | null;
  regulators?: RegulatorInScope[];
}>();

const emit = defineEmits<{
  (e: 'openCreateTaskModal'): void;
  (e: 'navigateToNewsDetail', item: any): void;
  (e: 'navigateToRegulatorDetail', regulatorId: string): void;
  (e: 'toggleFollowRegulator', regulatorId: string): void;
  (e: 'toggleFollowRegulatorByAcronym', acronym: string, targetFollow: boolean): void;
  (e: 'showToast', title: string, message: string, type: 'success' | 'info' | 'warning'): void;
}>();

const taskStore = useTaskStore();
const directoryStore = useDirectoryStore();

// Collapse/Expand state for Linked News & Regulators
const isLinkedContextCollapsed = ref(false);
const isNewsCollapsed = ref(false);
const isRegulatorsCollapsed = ref(false);

// Search & Multi-Select Filter state
const searchQuery = ref('');
const selectedStatuses = ref<string[]>([]);
const selectedJurisdictions = ref<string[]>([]);
const selectedLinkages = ref<string[]>([]);

const hasActiveFilters = computed(() => {
  return (
    searchQuery.value.trim() !== '' ||
    selectedStatuses.value.length > 0 ||
    selectedJurisdictions.value.length > 0 ||
    selectedLinkages.value.length > 0
  );
});

const handleClearAllFilters = () => {
  searchQuery.value = '';
  selectedStatuses.value = [];
  selectedJurisdictions.value = [];
  selectedLinkages.value = [];
};

// Selected task for detail view
const selectedTaskId = ref<string | null>(props.initialSelectedTaskId || null);

// Report Modal
const isReportModalOpen = ref(false);

// Active citation pin modal
const activeCitation = ref<{ pin: string; sourceTitle: string; url: string; excerpt: string; clause?: string } | null>(null);

const currentTask = computed<ComplianceTask | null>(() => {
  if (!selectedTaskId.value) return null;
  return taskStore.tasks.find((t) => t.id === selectedTaskId.value) || null;
});

const filteredTasks = computed(() => {
  return taskStore.tasks.filter((t) => {
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      const match =
        t.title.toLowerCase().includes(q) ||
        (t.topic && t.topic.toLowerCase().includes(q)) ||
        t.jurisdiction.toLowerCase().includes(q) ||
        t.questions.some((qu) => qu.questionText.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Status multi-select
    if (selectedStatuses.value.length > 0 && !selectedStatuses.value.includes(t.status)) {
      return false;
    }

    // Jurisdiction multi-select
    if (selectedJurisdictions.value.length > 0) {
      const matchJur = selectedJurisdictions.value.some((jur) => {
        const jLower = jur.toLowerCase();
        if (t.jurisdiction && t.jurisdiction.toLowerCase().includes(jLower)) return true;
        if (t.homeJurisdiction && t.homeJurisdiction.toLowerCase().includes(jLower)) return true;
        if (t.targetJurisdiction && t.targetJurisdiction.toLowerCase().includes(jLower)) return true;
        if (t.targetJurisdictions && t.targetJurisdictions.some((tj) => tj.toLowerCase().includes(jLower))) return true;
        return false;
      });
      if (!matchJur) return false;
    }

    // Linkage multi-select
    if (selectedLinkages.value.length > 0) {
      const hasNews = t.linkedNewsIds && t.linkedNewsIds.length > 0;
      const hasRegs = t.linkedRegulatorIds && t.linkedRegulatorIds.length > 0;
      const hasNoLinks = !hasNews && !hasRegs;

      const matchNews = selectedLinkages.value.includes('Has Linked News') && hasNews;
      const matchRegs = selectedLinkages.value.includes('Has Linked Regulators') && hasRegs;
      const matchNone = selectedLinkages.value.includes('No Links') && hasNoLinks;

      if (!matchNews && !matchRegs && !matchNone) return false;
    }

    return true;
  });
});

// Pagination for Tasks View (default 20, options 40, 60, 100)
const pageSize = ref<number>(20);
const currentPage = ref<number>(1);

const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredTasks.value.slice(start, start + pageSize.value);
});

watch([searchQuery, selectedStatuses, selectedJurisdictions, selectedLinkages], () => {
  currentPage.value = 1;
});

const selectTask = (task: ComplianceTask) => {
  selectedTaskId.value = task.id;
};

const handleBackToList = () => {
  selectedTaskId.value = null;
};

const handleDeleteTask = (taskId: string) => {
  taskStore.deleteTask(taskId);
  selectedTaskId.value = null;
  emit('showToast', 'Task Removed', 'Analysis task has been deleted.', 'info');
};

const handleUnlinkNews = (taskId: string, newsId: string) => {
  taskStore.unlinkNewsFromTask(taskId, newsId);
  emit('showToast', 'Link Removed', 'News item unlinked from this task.', 'info');
};

const handleUnlinkRegulator = (taskId: string, regulatorId: string) => {
  taskStore.unlinkRegulatorFromTask(taskId, regulatorId);
  emit('showToast', 'Link Removed', 'Regulator unlinked from this task.', 'info');
};

const handleOpenSourceInDrawer = (url: any) => {
  emit('navigateToNewsDetail', {
    id: url.id,
    title: url.title,
    officialUrl: url.url,
    regulator: url.authority,
    regulatorAcronym: url.authority,
    jurisdiction: url.jurisdiction,
    whyRelevantExplanation: url.rationale || 'Primary supervisory standard addressing the compliance task requirements.',
    authenticExcerpt: url.excerpt || url.title,
    publishDate: url.publishDate || '2026-03-20',
    docType: url.docType || 'Guideline',
  });
};

const handleToggleUrlBookmark = (taskId: string, questionId: string, url: any) => {
  const isNowBookmarked = taskStore.toggleUrlBookmark(taskId, questionId, url.id);
  if (isNowBookmarked) {
    directoryStore.addBookmark({
      id: url.id,
      title: url.title,
      referenceNumber: `REF-${url.authority}-2026`,
      docType: url.docType || 'Guideline',
      regulator: url.authority,
      regulatorAcronym: url.authority,
      jurisdiction: url.jurisdiction,
      category: 'Financial Services & Capital Markets',
      themes: ['Operational resilience and incident reporting'],
      publishDate: url.publishDate || '2026-03-20',
      effectiveDate: '2026-06-30',
      aiRelevanceScore: 92,
      materiality: 'Relevant',
      diligenceStatus: 'None',
      status: 'None',
      owner: 'Ivan Choy',
      officialUrl: url.url,
      executiveSummary: url.rationale || url.title,
      operationalImpact: 'Monitored regulatory document identified via Compliance Task.',
      affectedBusinessUnits: ['Compliance', 'Legal'],
      authenticExcerpt: url.excerpt || url.title,
      auditTimeline: [],
      whyRelevantExplanation: url.rationale,
    });
    emit('showToast', 'URL Bookmarked', `"${url.title.slice(0, 36)}..." saved to Directory Bookmarks.`, 'success');
  } else {
    directoryStore.removeBookmark(url.id, undefined, url.title);
    emit('showToast', 'Bookmark Removed', `"${url.title.slice(0, 36)}..." removed from Directory Bookmarks.`, 'info');
  }
};

const handleToggleUrlFollow = (taskId: string, questionId: string, url: any) => {
  const isNowFollowed = taskStore.toggleUrlFollow(taskId, questionId, url.id);
  emit(
    'showToast',
    isNowFollowed ? 'Authority Followed' : 'Authority Unfollowed',
    `${url.authority} (${url.jurisdiction}) is now ${isNowFollowed ? 'followed for active surveillance' : 'unfollowed'}.`,
    isNowFollowed ? 'success' : 'info'
  );
};

// All unique sources used across task questions (Linked News & Publications)
const allTaskSources = computed(() => {
  if (!currentTask.value) return [];
  const map = new Map<string, any>();

  // Gather from all questions' retrievedUrls
  for (const q of currentTask.value.questions) {
    for (const url of q.retrievedUrls || []) {
      const key = url.id || url.url || url.title;
      if (!map.has(key)) {
        map.set(key, {
          ...url,
          questionId: q.id,
          isBookmarked: directoryStore.isBookmarked(url.id, undefined, url.title),
        });
      }
    }
  }

  return Array.from(map.values());
});

// All unique regulatory authorities involved across task questions (Linked Regulatory Authorities)
const allTaskAuthorities = computed(() => {
  if (!currentTask.value) return [];
  const map = new Map<string, any>();

  // 1. Gather from retrievedUrls authorities
  for (const q of currentTask.value.questions) {
    for (const url of q.retrievedUrls || []) {
      const acronym = (url.authority || '').trim().toUpperCase();
      if (acronym && !map.has(acronym)) {
        const matched = props.regulators?.find(
          (r) => r.acronym?.toUpperCase() === acronym || r.name?.toUpperCase() === acronym
        );

        map.set(acronym, {
          acronym,
          name: matched?.name || `${acronym} Regulatory Authority`,
          jurisdiction: matched?.jurisdiction || url.jurisdiction || 'Global',
          id: matched?.id || `reg-${acronym.toLowerCase()}`,
          isFollowed: matched ? matched.isFollowed : url.isFollowed ?? true,
        });
      }
    }
  }

  // 2. Also check currentTask.linkedRegulatorIds
  for (const regId of currentTask.value.linkedRegulatorIds || []) {
    const norm = regId.replace('reg-', '').toUpperCase();
    if (norm && !map.has(norm)) {
      const matched = props.regulators?.find(
        (r) => r.id === regId || r.acronym?.toUpperCase() === norm
      );
      map.set(norm, {
        acronym: norm,
        name: matched?.name || `${norm} Regulatory Authority`,
        jurisdiction: matched?.jurisdiction || 'Global',
        id: matched?.id || regId,
        isFollowed: matched ? matched.isFollowed : true,
      });
    }
  }

  return Array.from(map.values());
});

const handleToggleSourceBookmark = (source: any) => {
  const isAlreadyBookmarked = directoryStore.isBookmarked(source.id, undefined, source.title);
  if (isAlreadyBookmarked) {
    directoryStore.removeBookmark(source.id, undefined, source.title);
    if (currentTask.value) {
      for (const q of currentTask.value.questions) {
        for (const u of q.retrievedUrls) {
          if (u.id === source.id || u.title === source.title) {
            u.isBookmarked = false;
          }
        }
      }
    }
    emit('showToast', 'Bookmark Removed', `"${source.title.slice(0, 36)}..." removed from Directory Bookmarks.`, 'info');
  } else {
    directoryStore.addBookmark({
      id: source.id,
      title: source.title,
      referenceNumber: `REF-${source.authority}-2026`,
      docType: source.docType || 'Guideline',
      regulator: source.authority,
      regulatorAcronym: source.authority,
      jurisdiction: source.jurisdiction,
      category: 'Financial Services & Capital Markets',
      themes: ['Operational resilience and incident reporting'],
      publishDate: source.publishDate || '2026-03-20',
      effectiveDate: '2026-06-30',
      aiRelevanceScore: 92,
      materiality: 'Relevant',
      diligenceStatus: 'None',
      status: 'None',
      owner: 'Ivan Choy',
      officialUrl: source.url,
      executiveSummary: source.rationale || source.title,
      operationalImpact: 'Monitored regulatory document referenced in Compliance Task.',
      affectedBusinessUnits: ['Compliance', 'Legal'],
      authenticExcerpt: source.excerpt || source.title,
      auditTimeline: [],
      whyRelevantExplanation: source.rationale,
    });
    if (currentTask.value) {
      for (const q of currentTask.value.questions) {
        for (const u of q.retrievedUrls) {
          if (u.id === source.id || u.title === source.title) {
            u.isBookmarked = true;
          }
        }
      }
    }
    emit('showToast', 'Bookmarked to Directory', `"${source.title.slice(0, 36)}..." saved to Directory > Bookmarks.`, 'success');
  }
};

const handleToggleAuthorityFollow = (authority: any) => {
  const targetFollow = !authority.isFollowed;
  if (authority.id) {
    emit('toggleFollowRegulator', authority.id);
  } else {
    emit('toggleFollowRegulatorByAcronym', authority.acronym, targetFollow);
  }

  // Also update task questions url.isFollowed
  if (currentTask.value) {
    for (const q of currentTask.value.questions) {
      for (const u of q.retrievedUrls) {
        if (u.authority?.toUpperCase() === authority.acronym?.toUpperCase()) {
          u.isFollowed = targetFollow;
        }
      }
    }
  }

  emit(
    'showToast',
    targetFollow ? 'Authority Followed' : 'Authority Unfollowed',
    `${authority.name} (${authority.acronym}) is now ${targetFollow ? 'followed in Regulator Surveillance Scope' : 'unfollowed'}.`,
    targetFollow ? 'success' : 'info'
  );
};

// Starter Templates for Empty State
const starterTemplates = [
  {
    title: 'Cross-Border Operational Resilience & Outsourcing',
    topic: 'Operational Resilience',
    jurisdiction: 'Hong Kong & Singapore',
    questions: [
      'What are the mandatory statutory notification timelines for severe cybersecurity or operational disruptions?',
      'Are financial institutions required to enforce direct inspection and audit rights in cloud vendor contracts?',
    ],
  },
  {
    title: 'Corporate Secretarial & Beneficial Ownership Review',
    topic: 'Corporate Governance & AML/CFT',
    jurisdiction: 'Hong Kong & United Kingdom',
    questions: [
      'Can a body corporate serve as sole director or company secretary in this jurisdiction?',
      'What are the statutory filing deadlines and regulatory licensing for corporate service providers?',
    ],
  },
  {
    title: 'Virtual Asset Service Provider (VASP) Licensing Scope',
    topic: 'VASP & Market Conduct',
    jurisdiction: 'Hong Kong & European Union',
    questions: [
      'What licensing triggers apply to cross-border virtual asset trading platforms serving retail customers?',
      'What client asset segregation and custody requirements are mandated?',
    ],
  },
];

const handleCreateFromTemplate = (tpl: (typeof starterTemplates)[0]) => {
  const created = taskStore.createTask({
    title: tpl.title,
    topic: tpl.topic,
    jurisdiction: tpl.jurisdiction,
    rawQuestions: tpl.questions,
  });
  selectedTaskId.value = created.id;
  emit('showToast', 'Task Created', `"${created.title}" initialized with analysis.`, 'success');
};
</script>

<template>
  <div class="tasks-view w-full p-4 sm:p-6 lg:p-8 space-y-5 animate-in fade-in">
    <!-- ============================================================= -->
    <!-- VIEW A: TASK DETAIL VIEW (When a task is selected)           -->
    <!-- ============================================================= -->
    <div v-if="currentTask" class="space-y-6">
      <!-- Detail Top Navigation -->
      <div class="flex items-center justify-between gap-4 border-b border-neutral-200 pb-4 flex-wrap">
        <button
          @click="handleBackToList"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-700 transition-colors cursor-pointer"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>Back to All Tasks</span>
        </button>

        <div class="flex items-center gap-2">
          <!-- Export Report Button (Phase 2 Report compilation) -->
          <button
            @click="isReportModalOpen = true"
            class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <FileText class="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>

          <!-- Delete Task -->
          <button
            @click="handleDeleteTask(currentTask.id)"
            class="p-2 rounded-xl border border-neutral-200 hover:bg-rose-50 hover:text-rose-600 text-neutral-400 transition-colors cursor-pointer"
            title="Delete Task"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Task Header Card with Step 1 Contextual Setup Information -->
      <div class="bg-white rounded-2xl border border-neutral-200 p-5 shadow-2xs space-y-3.5">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 flex items-center gap-1.5 shadow-2xs flex-wrap">
              <Globe class="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{{ currentTask.homeJurisdiction || 'Hong Kong' }}</span>
              <ArrowRight class="w-3 h-3 text-blue-400 shrink-0" />
              <template v-if="currentTask.targetJurisdictions && currentTask.targetJurisdictions.length > 0">
                <span class="flex items-center gap-1 flex-wrap">
                  <span
                    v-for="target in currentTask.targetJurisdictions"
                    :key="`tgt-${target}`"
                    class="bg-blue-100/80 text-blue-900 px-1.5 py-0.2 rounded text-[11px] font-semibold"
                  >
                    {{ target }}
                  </span>
                </span>
              </template>
              <span v-else>{{ currentTask.targetJurisdiction || currentTask.jurisdiction }}</span>
            </span>
            <span
              :class="`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                currentTask.status === 'Completed'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : currentTask.status === 'Running'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`"
            >
              {{ currentTask.status }}
            </span>
          </div>
          <span class="text-xs text-neutral-500 font-mono">
            Updated: {{ currentTask.updatedAt }}
          </span>
        </div>

        <div>
          <h1 class="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
            {{ currentTask.title }}
          </h1>
          <p v-if="currentTask.topic" class="text-xs text-neutral-600 mt-1">
            <strong>Topic:</strong> {{ currentTask.topic }} • <strong>Lead Reviewer:</strong> {{ currentTask.owner }}
          </p>
        </div>

        <!-- Task Contextual Summary -->
        <div v-if="currentTask.summary" class="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs text-neutral-700 leading-relaxed space-y-1">
          <div class="font-bold text-neutral-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <FileText class="w-3.5 h-3.5 text-blue-600" />
            <span>Task Context & Evaluation Scope:</span>
          </div>
          <p class="text-neutral-700 text-xs leading-relaxed">{{ currentTask.summary }}</p>
        </div>
      </div>

      <!-- LINKED CONTEXT: 
           Separated into:
           1. Linked News & Publications (Sources cited in answers below, bookmark to Directory)
           2. Linked Regulatory Authorities (Regulators involved in answers below, follow in scope)
           Toggleable collapse/expand button to temporarily tuck them away
      -->
      <div class="space-y-3">
        <!-- Section Header with Collapse/Expand Button -->
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                <Layers class="w-4 h-4 text-blue-600" />
                <span>Linked Sources & Authorities</span>
              </h3>
              <span class="text-xs text-neutral-500 font-medium">
                ({{ allTaskSources.length }} Publications • {{ allTaskAuthorities.length }} Regulators)
              </span>
            </div>
            <p class="text-[11px] text-neutral-500 mt-0.5">
              Authoritative sources retrieved for the questions below. Bookmark publications to Directory or follow authorities for continuous monitoring.
            </p>
          </div>

          <!-- Section Toggle Button to temporarily hide/collapse -->
          <button
            type="button"
            @click="isLinkedContextCollapsed = !isLinkedContextCollapsed"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-200 transition-colors shadow-2xs cursor-pointer"
            :title="isLinkedContextCollapsed ? 'Expand linked publications and authorities' : 'Hide / collapse linked publications and authorities'"
          >
            <EyeOff v-if="!isLinkedContextCollapsed" class="w-3.5 h-3.5 text-neutral-500" />
            <Eye v-else class="w-3.5 h-3.5 text-neutral-500" />
            <span>{{ isLinkedContextCollapsed ? 'Show Linked Sources' : 'Hide Linked Sources' }}</span>
          </button>
        </div>

        <!-- Collapsed Compact Preview Bar (When Collapsed) -->
        <div
          v-if="isLinkedContextCollapsed"
          @click="isLinkedContextCollapsed = false"
          class="p-3.5 bg-neutral-50 hover:bg-neutral-100/90 rounded-2xl border border-neutral-200 flex items-center justify-between text-xs text-neutral-600 cursor-pointer transition-colors shadow-2xs group"
        >
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-neutral-800 flex items-center gap-1.5">
              <EyeOff class="w-3.5 h-3.5 text-neutral-500" />
              <span>Linked sources temporarily hidden:</span>
            </span>
            <span class="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
              {{ allTaskSources.length }} Publications (Connected to Directory Bookmarks)
            </span>
            <span class="text-neutral-300">•</span>
            <span class="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md font-semibold text-[11px]">
              {{ allTaskAuthorities.length }} Regulators (Connected to Surveillance Scope)
            </span>
          </div>
          <span class="text-blue-600 font-bold flex items-center gap-1 group-hover:underline text-xs">
            <span>Click to Expand</span>
            <ChevronDown class="w-3.5 h-3.5" />
          </span>
        </div>

        <!-- Expanded 2-Column Grid (When Not Collapsed) -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Linked News & Publications -->
          <div class="bg-white rounded-2xl border border-neutral-200 p-4.5 shadow-2xs space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                  <FileText class="w-4 h-4 text-blue-600" />
                  <span>Linked News & Publications ({{ allTaskSources.length }})</span>
                </h3>
                <p class="text-[11px] text-neutral-400 mt-0.5">
                  Sources cited in question answers below
                </p>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Directory Bookmarks
                </span>
                <button
                  type="button"
                  @click="isNewsCollapsed = !isNewsCollapsed"
                  class="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                  :title="isNewsCollapsed ? 'Expand card' : 'Collapse card'"
                >
                  <ChevronDown v-if="isNewsCollapsed" class="w-3.5 h-3.5" />
                  <ChevronUp v-else class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div v-show="!isNewsCollapsed">
              <div v-if="allTaskSources.length === 0" class="text-xs text-neutral-400 py-3 text-center italic">
                No specific publication sources retrieved for this task yet.
              </div>

              <div v-else class="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                <div
                  v-for="source in allTaskSources"
                  :key="source.id || source.url"
                  class="p-3 rounded-xl bg-neutral-50/90 border border-neutral-200/80 hover:bg-white hover:border-blue-300 transition-all flex flex-col justify-between gap-2 text-xs"
                >
                  <div>
                    <div class="flex items-center justify-between gap-2 mb-1">
                      <div class="flex items-center gap-1.5">
                        <span class="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded">
                          {{ source.authority }}
                        </span>
                        <span class="text-[10px] text-neutral-600 font-medium bg-neutral-200/70 px-1.5 py-0.2 rounded">
                          {{ source.jurisdiction }}
                        </span>
                      </div>
                      <span class="text-[10px] text-neutral-400 font-mono">
                        {{ source.publishDate || 'Official Gazetted' }}
                      </span>
                    </div>

                    <!-- Clickable title: opens DetailDrawer -->
                    <button
                      type="button"
                      @click="handleOpenSourceInDrawer(source)"
                      class="text-left font-bold text-neutral-900 hover:text-blue-600 transition-colors text-xs leading-snug cursor-pointer group flex items-start gap-1"
                      title="Click to open Detail Drawer with official jump link"
                    >
                      <span class="group-hover:underline">{{ source.title }}</span>
                      <ExternalLink class="w-3 h-3 text-neutral-400 group-hover:text-blue-600 shrink-0 mt-0.5" />
                    </button>
                  </div>

                  <!-- Action Bar: Direct jump link & Bookmark to Directory -->
                  <div class="flex items-center justify-between pt-1 border-t border-neutral-200/60 text-[11px]">
                    <a
                      :href="source.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <span>Official URL</span>
                      <ExternalLink class="w-3 h-3" />
                    </a>

                    <button
                      type="button"
                      @click="handleToggleSourceBookmark(source)"
                      :class="`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
                        directoryStore.isBookmarked(source.id, undefined, source.title)
                          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                      }`"
                      :title="directoryStore.isBookmarked(source.id, undefined, source.title) ? 'Bookmarked in Directory' : 'Bookmark to Directory Bookmarks'"
                    >
                      <BookmarkCheck
                        v-if="directoryStore.isBookmarked(source.id, undefined, source.title)"
                        class="w-3.5 h-3.5 text-amber-600"
                      />
                      <Bookmark v-else class="w-3.5 h-3.5 text-neutral-400" />
                      <span>{{ directoryStore.isBookmarked(source.id, undefined, source.title) ? 'Bookmarked' : 'Bookmark to Directory' }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Linked Regulatory Authorities -->
          <div class="bg-white rounded-2xl border border-neutral-200 p-4.5 shadow-2xs space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                  <Building2 class="w-4 h-4 text-indigo-600" />
                  <span>Linked Regulatory Authorities ({{ allTaskAuthorities.length }})</span>
                </h3>
                <p class="text-[11px] text-neutral-400 mt-0.5">
                  Supervisory bodies involved in question answers below
                </p>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                  Surveillance Scope
                </span>
                <button
                  type="button"
                  @click="isRegulatorsCollapsed = !isRegulatorsCollapsed"
                  class="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                  :title="isRegulatorsCollapsed ? 'Expand card' : 'Collapse card'"
                >
                  <ChevronDown v-if="isRegulatorsCollapsed" class="w-3.5 h-3.5" />
                  <ChevronUp v-else class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div v-show="!isRegulatorsCollapsed">
              <div v-if="allTaskAuthorities.length === 0" class="text-xs text-neutral-400 py-3 text-center italic">
                No specific regulatory authorities detected in this task.
              </div>

              <div v-else class="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                <div
                  v-for="auth in allTaskAuthorities"
                  :key="auth.acronym"
                  class="p-3 rounded-xl bg-neutral-50/90 border border-neutral-200/80 hover:bg-white hover:border-indigo-300 transition-all flex items-center justify-between gap-3 text-xs"
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      <span class="font-bold text-neutral-900 text-xs">
                        {{ auth.acronym }}
                      </span>
                      <span class="text-[10px] text-neutral-500 bg-neutral-200/60 px-1.5 py-0.2 rounded font-medium">
                        {{ auth.jurisdiction }}
                      </span>
                    </div>
                    <div class="text-[11px] text-neutral-600 truncate mt-0.5">
                      {{ auth.name }}
                    </div>
                  </div>

                  <!-- Action: Follow / Unfollow Regulator in Scope -->
                  <div class="shrink-0 flex items-center gap-1.5">
                    <button
                      type="button"
                      @click="handleToggleAuthorityFollow(auth)"
                      :class="`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        auth.isFollowed
                          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                      }`"
                      :title="auth.isFollowed ? `Currently following ${auth.acronym}` : `Follow ${auth.acronym} in Surveillance Scope`"
                    >
                      <UserCheck v-if="auth.isFollowed" class="w-3.5 h-3.5 text-blue-600" />
                      <UserPlus v-else class="w-3.5 h-3.5 text-neutral-400" />
                      <span>{{ auth.isFollowed ? 'Following' : '+ Follow' }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- QUESTIONS & OFFICIAL RETRIEVED SOURCES -->
      <div class="space-y-5">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <ClipboardList class="w-4 h-4 text-blue-600" />
            <span>Compliance Questions & Findings ({{ currentTask.questions.length }})</span>
          </h2>
          <span class="text-xs text-neutral-500">Side-by-Side Comparison: Analysis ⟷ Official Grounding Sources</span>
        </div>

        <div class="space-y-6">
          <div
            v-for="(q, idx) in currentTask.questions"
            :key="q.id"
            class="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6 shadow-2xs space-y-4"
          >
            <!-- Question Heading -->
            <div class="border-b border-neutral-100 pb-3 flex items-start justify-between gap-3">
              <div>
                <div class="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                  Question {{ idx + 1 }}
                </div>
                <h3 class="text-sm sm:text-base font-bold text-neutral-900 leading-snug">
                  {{ q.questionText }}
                </h3>
              </div>
              <span class="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0">
                {{ q.status }}
              </span>
            </div>

            <!-- Side-by-side split layout: Left = Answer & Citations, Right = Retrieved Official Sources & Rationale -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <!-- Left Column: AI Generated Answer (answer_text) with precise citation pins -->
              <div class="lg:col-span-7 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <Sparkles class="w-4 h-4 text-blue-600" />
                    <span>Regulatory Analysis & Statutory Grounding</span>
                  </div>
                  <span class="text-[11px] text-neutral-400 font-mono">answer_text{{ idx + 1 }}</span>
                </div>

                <div class="p-4.5 bg-neutral-50 rounded-2xl border border-neutral-200/90 leading-relaxed text-xs sm:text-sm text-neutral-800 whitespace-pre-line shadow-2xs">
                  {{ q.llmAnswer }}
                </div>

                <!-- Citation Pins list -->
                <div v-if="q.citations && q.citations.length > 0" class="space-y-1.5 pt-1">
                  <div class="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                    <Pin class="w-3 h-3 text-blue-600" />
                    <span>Precise Text Citations ({{ q.citations.length }})</span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="c in q.citations"
                      :key="c.pin"
                      @click="activeCitation = c"
                      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors cursor-pointer"
                      title="Click to inspect citation clause and excerpt"
                    >
                      <Pin class="w-3 h-3 text-blue-600" />
                      <span>{{ c.pin }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Right Column: Authoritative Official Sources Retrieved, Applicability Rationale & Monitoring -->
              <div class="lg:col-span-5 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <FileText class="w-4 h-4 text-indigo-600" />
                    <span>Official Sources & Applicability Grounding</span>
                  </div>
                  <span class="text-[11px] text-neutral-400 font-medium">
                    {{ q.retrievedUrls.length }} Sources
                  </span>
                </div>

                <div class="space-y-3">
                  <div
                    v-for="url in q.retrievedUrls"
                    :key="url.id"
                    class="p-4 rounded-2xl bg-white border border-neutral-200/90 shadow-2xs hover:border-blue-300 transition-all space-y-2.5"
                  >
                    <!-- Source Header: Authority badge, Jurisdiction, and clickable title to open Slide-over Drawer -->
                    <div>
                      <div class="flex items-center justify-between gap-2 mb-1.5">
                        <div class="flex items-center gap-1.5">
                          <span class="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md">
                            {{ url.authority }}
                          </span>
                          <span class="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                            {{ url.jurisdiction }}
                          </span>
                        </div>
                        <span class="text-[10px] text-neutral-400 font-mono">
                          {{ url.publishDate || 'Official Gazetted' }}
                        </span>
                      </div>

                      <!-- Clickable Title: opens right slide-over Drawer -->
                      <button
                        type="button"
                        @click="handleOpenSourceInDrawer(url)"
                        class="text-left font-bold text-neutral-900 hover:text-blue-600 transition-colors text-xs leading-snug cursor-pointer group flex items-start gap-1"
                        title="Click to slide out Detail Drawer with official document jump link"
                      >
                        <span class="group-hover:underline">{{ url.title }}</span>
                        <ExternalLink class="w-3 h-3 text-neutral-400 group-hover:text-blue-600 shrink-0 mt-0.5" />
                      </button>

                      <div class="flex items-center gap-2 mt-1">
                        <a
                          :href="url.url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
                        >
                          <span>Official Source Link</span>
                          <ExternalLink class="w-3 h-3" />
                        </a>
                        <span class="text-neutral-300">•</span>
                        <span class="text-[10px] text-neutral-500">Click title to open slide-over detail drawer</span>
                      </div>
                    </div>

                    <!-- Applicability Rationale (Explains why this responds to this compliance task) -->
                    <div class="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1">
                      <div class="font-bold flex items-center gap-1 text-[11px] text-amber-900">
                        <Sparkles class="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Applicability Rationale (Task Alignment Justification):</span>
                      </div>
                      <p class="text-[11px] text-neutral-800 leading-relaxed">
                        {{ url.rationale || 'Directly sets statutory compliance and supervisory reporting mandates for this task inquiry.' }}
                      </p>
                    </div>

                    <!-- Authentic Clause Excerpt if available -->
                    <div v-if="url.excerpt" class="p-2.5 rounded-xl bg-neutral-50 text-[11px] font-mono text-neutral-700 leading-relaxed border border-neutral-200">
                      <div class="text-[10px] text-neutral-400 font-sans font-bold uppercase mb-0.5">Authentic Clause Excerpt</div>
                      {{ url.excerpt }}
                    </div>

                    <!-- Monitoring: Follow authority in scope or bookmark URL -->
                    <div class="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                      <!-- Follow Authority Button -->
                      <button
                        type="button"
                        @click="handleToggleUrlFollow(currentTask.id, q.id, url)"
                        :class="`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          url.isFollowed
                            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                        }`"
                        :title="url.isFollowed ? `Currently following ${url.authority}` : `Follow ${url.authority} for surveillance`"
                      >
                        <UserCheck v-if="url.isFollowed" class="w-3.5 h-3.5 text-blue-600" />
                        <UserPlus v-else class="w-3.5 h-3.5 text-neutral-500" />
                        <span>{{ url.isFollowed ? 'Followed ' + url.authority : 'Follow ' + url.authority }}</span>
                      </button>

                      <!-- Bookmark URL Button -->
                      <button
                        type="button"
                        @click="handleToggleUrlBookmark(currentTask.id, q.id, url)"
                        :class="`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          url.isBookmarked
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                        }`"
                        :title="url.isBookmarked ? 'Bookmarked in Directory' : 'Bookmark into Directory'"
                      >
                        <BookmarkCheck v-if="url.isBookmarked" class="w-3.5 h-3.5 text-amber-600" />
                        <Bookmark v-else class="w-3.5 h-3.5 text-neutral-500" />
                        <span>{{ url.isBookmarked ? 'Bookmarked' : 'Bookmark URL' }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Consolidated Summary -->
        <div class="bg-gradient-to-br from-neutral-900 via-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <Sparkles class="w-5 h-5 text-amber-400" />
              <h3 class="text-base sm:text-lg font-bold text-white tracking-tight">
                Consolidated Compliance Summary (Cross-Regulatory Synthesis)
              </h3>
            </div>
            <span class="text-[11px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-0.5 rounded-full font-mono font-semibold">
              solidated_summary
            </span>
          </div>

          <div class="text-xs sm:text-sm text-neutral-200 leading-relaxed whitespace-pre-line bg-black/20 p-4 rounded-xl border border-white/10 font-sans">
            {{ currentTask.consolidatedSummary || 'Comprehensive multi-jurisdictional synthesis generated across all retrieved statutory circulars, divergence benchmarks, and operational safeguards.' }}
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================= -->
    <!-- VIEW B: TASK LIST VIEW (When no specific task is selected)   -->
    <!-- ============================================================= -->
    <div v-else class="space-y-5">
      <!-- Top Bar: Title & Create Task Button -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 class="text-base sm:text-lg font-bold text-neutral-900 tracking-tight flex items-center gap-2">
            <ClipboardList class="w-5 h-5 text-blue-600" />
            <span>Task Management & Analysis Dossiers</span>
          </h2>
          <p class="text-xs text-neutral-500">
            Track and audit multi-jurisdictional compliance research tasks
          </p>
        </div>

        <button
          @click="emit('openCreateTaskModal')"
          class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Create Task</span>
        </button>
      </div>

      <!-- Filter Bar (All Multi-Select) -->
      <div class="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-center">
          <!-- Search -->
          <div class="relative md:col-span-4">
            <Search class="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Search historical tasks by title, jurisdiction, or inquiry..."
              class="w-full pl-9 pr-3 h-9 bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 focus:border-blue-500 rounded-xl text-xs text-neutral-900 focus:outline-none transition-colors"
            />
          </div>

          <!-- Status Multi-Select -->
          <div class="md:col-span-3">
            <ComboboxFilter
              label="Status"
              placeholder="All Statuses"
              :options="['Completed', 'Action Required', 'Running']"
              v-model:selectedValues="selectedStatuses"
            />
          </div>

          <!-- Jurisdiction Multi-Select -->
          <div class="md:col-span-3">
            <ComboboxFilter
              label="Jurisdiction"
              placeholder="All Jurisdictions"
              :options="ALL_JURISDICTIONS"
              v-model:selectedValues="selectedJurisdictions"
            />
          </div>

          <!-- Linkage Multi-Select -->
          <div class="md:col-span-2">
            <ComboboxFilter
              label="Linkage"
              placeholder="All Linkage"
              :options="['Has Linked News', 'Has Linked Regulators', 'No Links']"
              v-model:selectedValues="selectedLinkages"
            />
          </div>
        </div>

        <!-- Active Filters Tag Bar with Clear All -->
        <div v-if="hasActiveFilters" class="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 text-xs flex-wrap">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-neutral-500 text-[11px] font-medium">Active filters:</span>

            <span
              v-for="st in selectedStatuses"
              :key="st"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200"
            >
              <span>{{ st }}</span>
              <button @click="selectedStatuses = selectedStatuses.filter(s => s !== st)" class="hover:text-emerald-900 cursor-pointer">
                <X class="w-3 h-3" />
              </button>
            </span>

            <span
              v-for="jur in selectedJurisdictions"
              :key="jur"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200"
            >
              <span>{{ jur }}</span>
              <button @click="selectedJurisdictions = selectedJurisdictions.filter(j => j !== jur)" class="hover:text-blue-900 cursor-pointer">
                <X class="w-3 h-3" />
              </button>
            </span>

            <span
              v-for="lnk in selectedLinkages"
              :key="lnk"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-medium border border-purple-200"
            >
              <span>{{ lnk }}</span>
              <button @click="selectedLinkages = selectedLinkages.filter(l => l !== lnk)" class="hover:text-purple-900 cursor-pointer">
                <X class="w-3 h-3" />
              </button>
            </span>
          </div>

          <button
            @click="handleClearAllFilters"
            class="text-neutral-500 hover:text-rose-600 font-medium text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
          >
            <X class="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      <!-- EMPTY STATE -->
      <div
        v-if="taskStore.tasks.length === 0"
        class="bg-white rounded-2xl border border-neutral-200 p-8 sm:p-12 text-center space-y-6"
      >
        <div class="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto text-blue-600 shadow-2xs">
          <ClipboardList class="w-8 h-8" />
        </div>
        <div class="space-y-1 max-w-md mx-auto">
          <h3 class="text-base font-bold text-neutral-900">No Regulatory Tasks Yet</h3>
          <p class="text-xs text-neutral-500 leading-relaxed">
            Create an analysis task to batch-query compliance questions across official sources. You can also select news or authorities from other tabs to link them directly.
          </p>
        </div>

        <button
          @click="emit('openCreateTaskModal')"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
        >
          <Plus class="w-4 h-4" />
          <span>Create Your First Task</span>
        </button>

        <!-- Quick Starter Templates -->
        <div class="pt-6 border-t border-neutral-100 max-w-3xl mx-auto">
          <div class="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
            Or Start With a Pre-Configured Dossier Template
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
            <div
              v-for="tpl in starterTemplates"
              :key="tpl.title"
              @click="handleCreateFromTemplate(tpl)"
              class="p-4 rounded-xl border border-neutral-200 hover:border-blue-400 bg-neutral-50/50 hover:bg-white transition-all cursor-pointer group"
            >
              <div class="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                {{ tpl.jurisdiction }}
              </div>
              <h4 class="text-xs font-bold text-neutral-900 group-hover:text-blue-600 transition-colors mt-1">
                {{ tpl.title }}
              </h4>
              <p class="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                {{ tpl.questions[0] }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- TASK LIST TABLE -->
      <div v-else class="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
        <table class="w-full text-left text-xs">
          <thead class="bg-neutral-50 border-b border-neutral-200 font-bold text-neutral-700">
            <tr>
              <th class="p-3">Task Title & Scope</th>
              <th class="p-3 w-40">Jurisdiction</th>
              <th class="p-3 w-28">Status</th>
              <th class="p-3 w-24">Inquiries</th>
              <th class="p-3 w-28">Linked Context</th>
              <th class="p-3 w-32">Last Updated</th>
              <th class="p-3 w-28 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr
              v-for="task in paginatedTasks"
              :key="task.id"
              class="hover:bg-neutral-50/70 transition-colors group cursor-pointer"
              @click="selectTask(task)"
            >
              <td class="p-3">
                <div class="font-bold text-neutral-900 group-hover:text-blue-600 transition-colors">
                  {{ task.title }}
                </div>
                <div class="text-[11px] text-neutral-500 mt-0.5">
                  {{ task.topic || 'General Compliance' }}
                </div>
              </td>
              <td class="p-3">
                <template v-if="task.targetJurisdictions && task.targetJurisdictions.length > 1">
                  <div class="flex items-center gap-1 flex-wrap">
                    <span class="font-semibold text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded text-[10px]">
                      {{ task.homeJurisdiction || 'HK' }} ➔
                    </span>
                    <span
                      v-for="tj in task.targetJurisdictions"
                      :key="tj"
                      class="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[10px]"
                    >
                      {{ tj }}
                    </span>
                  </div>
                </template>
                <span v-else class="font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded text-[11px]">
                  {{ task.jurisdiction }}
                </span>
              </td>
              <td class="p-3">
                <span
                  :class="`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    task.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : task.status === 'Running'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-amber-50 text-amber-700'
                  }`"
                >
                  <span>{{ task.status }}</span>
                </span>
              </td>
              <td class="p-3 text-neutral-600 font-semibold">
                {{ task.questions.length }} Question{{ task.questions.length > 1 ? 's' : '' }}
              </td>
              <td class="p-3">
                <span
                  :class="`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    task.linkedNewsIds.length + task.linkedRegulatorIds.length > 0
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-neutral-400'
                  }`"
                >
                  <Layers class="w-3 h-3" />
                  <span>{{ task.linkedNewsIds.length + task.linkedRegulatorIds.length }} items</span>
                </span>
              </td>
              <td class="p-3 text-neutral-500 font-mono text-[11px]">{{ task.updatedAt }}</td>
              <td class="p-3 text-right" @click.stop>
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    @click.stop="selectTask(task)"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 cursor-pointer"
                  >
                    View
                  </button>
                  <button
                    @click.stop="handleDeleteTask(task.id)"
                    class="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination for Tasks View -->
        <PaginationController
          v-if="filteredTasks.length > 0"
          :totalItems="filteredTasks.length"
          v-model:currentPage="currentPage"
          v-model:pageSize="pageSize"
        />
      </div>
    </div>

    <!-- Phase 2 Report Export Modal -->
    <TaskReportModal
      v-if="isReportModalOpen"
      :isOpen="isReportModalOpen"
      :task="currentTask"
      @close="isReportModalOpen = false"
    />

    <!-- Interactive Citation Excerpt Modal -->
    <Teleport to="body">
      <div
        v-if="activeCitation"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs select-text animate-in fade-in duration-150"
      >
        <div class="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-lg w-full p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div class="flex items-center gap-2">
              <span class="font-bold text-xs bg-blue-600 text-white px-2 py-0.5 rounded-md">
                {{ activeCitation.pin }}
              </span>
              <span class="text-xs font-semibold text-neutral-700 truncate">
                {{ activeCitation.sourceTitle }}
              </span>
            </div>
            <button
              @click="activeCitation = null"
              class="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-2 text-xs sm:text-sm">
            <div v-if="activeCitation.clause" class="font-bold text-neutral-900">
              {{ activeCitation.clause }}
            </div>
            <p class="text-neutral-700 leading-relaxed italic bg-neutral-50 p-4 rounded-xl border border-neutral-200">
              "{{ activeCitation.excerpt }}"
            </p>
          </div>

          <div class="flex items-center justify-between pt-2">
            <a
              :href="activeCitation.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>View Official Source</span>
              <ExternalLink class="w-3 h-3" />
            </a>
            <button
              @click="activeCitation = null"
              class="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
