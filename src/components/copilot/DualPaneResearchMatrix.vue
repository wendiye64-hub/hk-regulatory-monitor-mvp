<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  Copy,
  Check,
  Send,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ChevronUp,
  ChevronDown,
  Hash,
} from 'lucide-vue-next';
import type {
  MatrixSessionState,
  MatrixComplianceStatus,
  MatrixFollowUpItem,
} from '@/types';

interface FollowUpCard extends MatrixFollowUpItem {
  scope?: 'macro' | 'country';
}

const props = defineProps<{
  session: MatrixSessionState;
}>();

const emit = defineEmits<{
  (e: 'updateSession', session: MatrixSessionState): void;
  (e: 'openNewMatrixModal'): void;
  (e: 'exportCsv'): void;
}>();

// Navigation Coordinates
const activeQIndex = ref(0);
const activeJurCode = ref(props.session.jurisdictions[0]?.code || 'HK');

// Animation & Transitions
const isCellTransitioning = ref(false);
const highlightedCitationId = ref<string | null>(null);

// Follow-up Prompt input bar state
const followUpPrompt = ref('');
const applyToAllJurisdictions = ref(false);
const isProcessingFollowUp = ref(false);

// Collapse/Expand state for follow-up card containers
const macroFollowUpsCollapsed = ref(false);
const countryFollowUpsCollapsed = ref(false);

// Confirmation Modal for Deleting All Follow-ups
interface ConfirmDeleteModalState {
  isOpen: boolean;
  scope: 'macro' | 'country';
  title: string;
  count: number;
}
const confirmDeleteModal = ref<ConfirmDeleteModalState | null>(null);

// Copied feedback states
const copiedPrompt = ref(false);
const copiedHashId = ref<string | null>(null);

const leftPaneRef = ref<HTMLElement | null>(null);
const rightPaneRef = ref<HTMLElement | null>(null);

// Ensure valid coordinates when session updates
watch(
  () => props.session.sessionId,
  () => {
    activeQIndex.value = 0;
    activeJurCode.value = props.session.jurisdictions[0]?.code || 'HK';
  }
);

// Active Question & Jurisdiction Objects
const currentQuestion = computed(() => {
  return props.session.questions[activeQIndex.value] || props.session.questions[0];
});

const currentJurisdiction = computed(() => {
  return (
    props.session.jurisdictions.find((j) => j.code === activeJurCode.value) ||
    props.session.jurisdictions[0]
  );
});

// Active Matrix Cell Key
const activeCellKey = computed(() => {
  if (!currentQuestion.value || !currentJurisdiction.value) return '';
  return `${currentQuestion.value.questionId}_${currentJurisdiction.value.code}`;
});

const activeCell = computed(() => {
  return props.session.matrixCells[activeCellKey.value];
});

// Stepper & Select Handlers
const handleQuestionChange = (newIndex: number) => {
  if (newIndex >= 0 && newIndex < props.session.questions.length) {
    isCellTransitioning.value = true;
    activeQIndex.value = newIndex;
    setTimeout(() => {
      isCellTransitioning.value = false;
    }, 150);
  }
};

const handleJurisdictionChange = (code: string) => {
  isCellTransitioning.value = true;
  activeJurCode.value = code;
  setTimeout(() => {
    isCellTransitioning.value = false;
  }, 150);
};

// Citation Click & Scroll Handler
const handleCitationClick = (citationId: string) => {
  highlightedCitationId.value = citationId;
  const citationElem = document.getElementById(`citation-card-${citationId}`);
  if (citationElem) {
    citationElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  setTimeout(() => {
    highlightedCitationId.value = null;
  }, 2500);
};

const handleCopyPrompt = () => {
  if (currentQuestion.value) {
    navigator.clipboard.writeText(currentQuestion.value.questionText);
    copiedPrompt.value = true;
    setTimeout(() => {
      copiedPrompt.value = false;
    }, 2000);
  }
};

const handleCopyHash = (id: string, hash: string) => {
  navigator.clipboard.writeText(hash);
  copiedHashId.value = id;
  setTimeout(() => {
    copiedHashId.value = null;
  }, 2000);
};

// Follow-Up Inquiry Handler
const handleSendFollowUp = async () => {
  if (!followUpPrompt.value.trim() || isProcessingFollowUp.value) return;

  const promptText = followUpPrompt.value.trim();
  const isBroadcast = applyToAllJurisdictions.value;
  followUpPrompt.value = '';
  isProcessingFollowUp.value = true;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const newCardId = `fu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  if (isBroadcast) {
    // Macro follow up
    const existingFollowUps = currentQuestion.value.followUps || [];
    const nextIndex = existingFollowUps.length + 1;

    const newMacroCard: FollowUpCard = {
      id: newCardId,
      index: nextIndex,
      queryText: promptText,
      findingText: `Harmonized multi-jurisdiction finding for Question ${activeQIndex.value + 1}: Cross-border synthesis reveals differentiated obligations across monitored regions. In APAC (${props.session.jurisdictions.map((j) => j.code).join(', ')}), statutory filings mandate strict registered office alignment and physical verification. Statutory timelines require ongoing compliance monitoring.`,
      timestamp: timeStr,
      isStreaming: true,
      scope: 'macro',
    };

    const updatedQuestions = props.session.questions.map((q, idx) => {
      if (idx === activeQIndex.value) {
        return {
          ...q,
          followUps: [...(q.followUps || []), newMacroCard],
        };
      }
      return q;
    });

    const updatedSession: MatrixSessionState = {
      ...props.session,
      questions: updatedQuestions,
      updatedAt: new Date().toISOString(),
    };

    emit('updateSession', updatedSession);

    // Auto scroll
    await nextTick();
    const elem = document.getElementById(`follow-up-card-${newCardId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Streaming simulation
    setTimeout(() => {
      const finalQuestions = updatedSession.questions.map((q, idx) => {
        if (idx === activeQIndex.value) {
          return {
            ...q,
            followUps: (q.followUps || []).map((c) =>
              c.id === newCardId ? { ...c, isStreaming: false } : c
            ),
          };
        }
        return q;
      });
      emit('updateSession', { ...updatedSession, questions: finalQuestions });
      isProcessingFollowUp.value = false;
    }, 1200);
  } else {
    // Country-specific follow up
    const cellKey = activeCellKey.value;
    const currentCell = props.session.matrixCells[cellKey];
    if (!currentCell) {
      isProcessingFollowUp.value = false;
      return;
    }

    const existingFollowUps = currentCell.followUps || [];
    const nextIndex = existingFollowUps.length + 1;

    const newCountryCard: FollowUpCard = {
      id: newCardId,
      index: nextIndex,
      queryText: promptText,
      findingText: `Specific regulatory finding for [${currentJurisdiction.value.name} (${currentJurisdiction.value.regulatorAcronym})]: In relation to "${promptText}", statutory provisions stipulate strict compliance guidelines. Designated compliance officers must maintain documentation for a minimum statutory retention period. Failure to notify constitutes a regulatory infraction.`,
      timestamp: timeStr,
      isStreaming: true,
      jurisdictionCode: currentJurisdiction.value.code,
      jurisdictionName: currentJurisdiction.value.name,
      scope: 'country',
    };

    const updatedCells = {
      ...props.session.matrixCells,
      [cellKey]: {
        ...currentCell,
        followUps: [...existingFollowUps, newCountryCard],
      },
    };

    const updatedSession: MatrixSessionState = {
      ...props.session,
      matrixCells: updatedCells,
      updatedAt: new Date().toISOString(),
    };

    emit('updateSession', updatedSession);

    // Auto scroll
    await nextTick();
    const elem = document.getElementById(`follow-up-card-${newCardId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Streaming simulation
    setTimeout(() => {
      const finalCells = {
        ...updatedSession.matrixCells,
        [cellKey]: {
          ...updatedSession.matrixCells[cellKey],
          followUps: (updatedSession.matrixCells[cellKey]?.followUps || []).map((c) =>
            c.id === newCardId ? { ...c, isStreaming: false } : c
          ),
        },
      };
      emit('updateSession', { ...updatedSession, matrixCells: finalCells });
      isProcessingFollowUp.value = false;
    }, 1200);
  }
};

// Delete Single Follow-up Card
const handleDeleteSingleFollowUp = (cardId: string, scope: 'macro' | 'country') => {
  if (scope === 'macro') {
    const updatedQuestions = props.session.questions.map((q, idx) => {
      if (idx === activeQIndex.value) {
        return {
          ...q,
          followUps: (q.followUps || []).filter((c) => c.id !== cardId),
        };
      }
      return q;
    });
    emit('updateSession', {
      ...props.session,
      questions: updatedQuestions,
      updatedAt: new Date().toISOString(),
    });
  } else {
    const cellKey = activeCellKey.value;
    const currentCell = props.session.matrixCells[cellKey];
    if (currentCell) {
      const updatedCells = {
        ...props.session.matrixCells,
        [cellKey]: {
          ...currentCell,
          followUps: (currentCell.followUps || []).filter((c) => c.id !== cardId),
        },
      };
      emit('updateSession', {
        ...props.session,
        matrixCells: updatedCells,
        updatedAt: new Date().toISOString(),
      });
    }
  }
};

// Execute Delete All (confirmed via modal)
const handleExecuteDeleteAll = () => {
  if (!confirmDeleteModal.value) return;

  if (confirmDeleteModal.value.scope === 'macro') {
    const updatedQuestions = props.session.questions.map((q, idx) => {
      if (idx === activeQIndex.value) {
        return { ...q, followUps: [] };
      }
      return q;
    });
    emit('updateSession', {
      ...props.session,
      questions: updatedQuestions,
      updatedAt: new Date().toISOString(),
    });
  } else {
    const cellKey = activeCellKey.value;
    const currentCell = props.session.matrixCells[cellKey];
    if (currentCell) {
      const updatedCells = {
        ...props.session.matrixCells,
        [cellKey]: { ...currentCell, followUps: [] },
      };
      emit('updateSession', {
        ...props.session,
        matrixCells: updatedCells,
        updatedAt: new Date().toISOString(),
      });
    }
  }
  confirmDeleteModal.value = null;
};

// Citation split helper for activeCell markdown
const parseMarkdownWithCitations = (markdownText: string) => {
  return markdownText.split('\n\n').map((paragraph) => {
    const parts = paragraph.split(/(\[Cap\.[^\]]+\]|\[[^\]]+§[^\]]+\]|\[Doc-\d+\]|\[CR[^\]]+\])/g);
    return parts.map((part) => ({
      text: part,
      isCitation: part.startsWith('[') && part.endsWith(']'),
    }));
  });
};
</script>

<template>
  <div
    id="dual-pane-research-matrix"
    class="flex flex-col h-full w-full bg-slate-50 relative overflow-hidden"
  >
    <!-- 1. Matrix Top Control Bar -->
    <div
      id="matrix-top-control-bar"
      class="bg-white border-b border-neutral-200 px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between gap-4 flex-wrap z-20 shadow-2xs"
    >
      <div class="flex items-center gap-3">
        <!-- Active Matrix Session Metadata -->
        <div class="space-y-0.5">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-sm sm:text-base font-bold text-neutral-900 leading-snug">
              {{ session.sessionTitle }}
            </h2>
            <span class="bg-blue-50 text-blue-700 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border border-blue-200">
              {{ session.questions.length }}Q × {{ session.jurisdictions.length }}J Matrix
            </span>
          </div>
          <p class="text-[11px] text-neutral-500">
            Updated: {{ session.updatedAt.slice(0, 16).replace('T', ' ') }} · Lead Compliance Officer
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <button
          id="btn-new-matrix-setup"
          @click="emit('openNewMatrixModal')"
          class="px-3.5 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles class="w-3.5 h-3.5 text-blue-400" />
          <span>New Matrix Setup</span>
        </button>

        <button
          id="btn-export-audit-csv"
          @click="emit('exportCsv')"
          class="px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-700 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Export compliance matrix as CSV audit report"
        >
          <Download class="w-3.5 h-3.5 text-blue-600" />
          <span>Export CSV</span>
        </button>
      </div>
    </div>

    <!-- 2. Dual-Pane Split Layout -->
    <div class="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
      <!-- LEFT PANE: Research Matrix & Country Analysis (60% width) -->
      <div
        id="left-pane-matrix-flow"
        ref="leftPaneRef"
        class="lg:w-[60%] border-r border-neutral-200 bg-white flex flex-col overflow-y-auto"
      >
        <div class="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">
          <!-- BLOCK 1: Question Focus Card -->
          <div
            id="question-focus-card"
            class="p-4 bg-neutral-50 rounded-xl border border-neutral-200 shadow-2xs relative"
          >
            <div class="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-full bg-blue-600 text-white font-mono text-xs font-semibold flex items-center justify-center">
                  Q
                </span>
                <span class="text-xs font-semibold text-neutral-900 tracking-wide">
                  Question
                </span>
              </div>

              <!-- Question Stepper & Select Controller -->
              <div class="flex items-center gap-1.5">
                <button
                  @click="handleQuestionChange(activeQIndex - 1)"
                  :disabled="activeQIndex === 0"
                  class="p-1 rounded-lg bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer transition-colors shadow-2xs"
                  title="Previous"
                >
                  <ChevronLeft class="w-4 h-4" />
                </button>

                <select
                  :value="activeQIndex"
                  @change="(e) => handleQuestionChange(Number((e.target as HTMLSelectElement).value))"
                  class="px-2.5 py-1 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer shadow-2xs"
                >
                  <option
                    v-for="(q, idx) in session.questions"
                    :key="q.questionId"
                    :value="idx"
                  >
                    Question {{ idx + 1 }} / {{ session.questions.length }}
                  </option>
                </select>

                <button
                  @click="handleQuestionChange(activeQIndex + 1)"
                  :disabled="activeQIndex === session.questions.length - 1"
                  class="p-1 rounded-lg bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-30 cursor-pointer transition-colors shadow-2xs"
                  title="Next"
                >
                  <ChevronRight class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Full Question Text Display -->
            <p class="text-sm font-semibold text-neutral-900 leading-relaxed pr-8">
              {{ currentQuestion?.questionText }}
            </p>

            <!-- Card Bottom Meta & Actions -->
            <div class="flex items-center justify-between mt-3 pt-2 border-t border-neutral-200/70 text-xs text-neutral-500">
              <span class="text-xs text-neutral-400">
                Recalculates all jurisdiction cells
              </span>
              <button
                @click="handleCopyPrompt"
                class="flex items-center gap-1 text-xs text-neutral-600 hover:text-blue-600 font-medium transition-colors cursor-pointer"
              >
                <template v-if="copiedPrompt">
                  <Check class="w-3.5 h-3.5 text-emerald-600" />
                  <span class="text-emerald-700 font-semibold">Copied</span>
                </template>
                <template v-else>
                  <Copy class="w-3.5 h-3.5" />
                  <span>Copy Prompt</span>
                </template>
              </button>
            </div>
          </div>

          <!-- BLOCK 2: AI Cross-Country Macro Synthesis -->
          <div
            id="cross-country-macro-synthesis"
            class="p-4 rounded-xl bg-white border border-neutral-200 shadow-2xs relative"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="bg-blue-600 text-white p-1 rounded-md">
                  <Sparkles class="w-3.5 h-3.5" />
                </span>
                <span class="text-xs font-semibold text-neutral-900 tracking-wide">
                  Cross-Jurisdiction Synthesis
                </span>
              </div>
              <span class="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full border border-blue-200">
                Macro
              </span>
            </div>

            <div class="text-xs text-neutral-700 leading-relaxed mt-2">
              {{ currentQuestion?.crossCountrySummary }}
            </div>
          </div>

          <!-- Dynamic Follow-up Analysis Cards (Broadcast: Directly Beneath Multi-Jurisdiction Synthesis) -->
          <div
            v-if="currentQuestion?.followUps && currentQuestion.followUps.length > 0"
            id="macro-follow-ups-container"
            class="space-y-3 pt-1"
          >
            <!-- Header Controls: Collapse All & Delete All on top left -->
            <div class="flex items-center justify-between pb-1 flex-wrap gap-2">
              <div class="flex items-center gap-2">
                <button
                  id="btn-collapse-macro-followups"
                  @click="macroFollowUpsCollapsed = !macroFollowUpsCollapsed"
                  class="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                  :title="macroFollowUpsCollapsed ? 'Expand all follow-up cards' : 'Collapse all follow-up cards'"
                >
                  <template v-if="macroFollowUpsCollapsed">
                    <ChevronDown class="w-3.5 h-3.5 text-neutral-500" />
                    <span>Expand All ({{ currentQuestion.followUps.length }})</span>
                  </template>
                  <template v-else>
                    <ChevronUp class="w-3.5 h-3.5 text-neutral-500" />
                    <span>Collapse All</span>
                  </template>
                </button>

                <button
                  id="btn-delete-all-macro-followups"
                  @click="
                    confirmDeleteModal = {
                      isOpen: true,
                      scope: 'macro',
                      title: 'Multi-Jurisdiction Synthesis',
                      count: currentQuestion.followUps?.length || 0,
                    }
                  "
                  class="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors shadow-2xs cursor-pointer"
                  title="Delete all"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                  <span>Delete All</span>
                </button>
              </div>

              <span class="text-xs font-medium text-neutral-500">
                {{ currentQuestion.followUps.length }} Follow-up{{ currentQuestion.followUps.length !== 1 ? 's' : '' }}
              </span>
            </div>

            <!-- Collapsed state notice -->
            <div
              v-if="macroFollowUpsCollapsed"
              @click="macroFollowUpsCollapsed = false"
              class="p-3 bg-blue-50/60 border border-dashed border-blue-200 rounded-lg text-center text-xs font-medium text-blue-700 cursor-pointer hover:bg-blue-100/60 transition-colors flex items-center justify-center gap-2"
            >
              <ChevronDown class="w-4 h-4 text-blue-500" />
              <span>{{ currentQuestion.followUps.length }} follow-up analysis card{{ currentQuestion.followUps.length !== 1 ? 's' : '' }} collapsed. Click to expand.</span>
            </div>

            <!-- Expanded Cards List -->
            <div v-else class="space-y-3">
              <div
                v-for="card in currentQuestion.followUps"
                :key="card.id"
                :id="`follow-up-card-${card.id}`"
                class="p-4 rounded-xl border border-neutral-200 bg-white shadow-2xs space-y-3 transition-all duration-300 animate-in fade-in slide-in-from-top-3"
              >
                <!-- Title Row -->
                <div class="flex items-center justify-between pb-2 border-b border-neutral-100 flex-wrap gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <h4 class="text-xs font-semibold text-neutral-900 truncate">
                      Follow-up ({{ card.timestamp }} - Multi-Jurisdiction)
                    </h4>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <span
                      v-if="card.isStreaming"
                      class="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                      Streaming...
                    </span>
                    <span class="text-xs font-mono font-semibold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded border border-neutral-200">
                      #{{ card.index }}
                    </span>
                  </div>
                </div>

                <!-- Query -->
                <div class="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200/70 text-xs text-neutral-800 leading-relaxed">
                  <span class="font-semibold text-neutral-700">Query: </span>
                  <span class="text-neutral-900">
                    {{ card.queryText }}
                  </span>
                </div>

                <!-- Finding -->
                <div class="p-3 bg-neutral-50/60 rounded-lg border border-neutral-200/70 text-xs text-neutral-800 leading-relaxed space-y-1">
                  <div class="font-semibold text-neutral-900">
                    Finding:
                  </div>
                  <div class="text-neutral-800 leading-relaxed pl-2 border-l-2 border-blue-500">
                    {{ card.findingText }}
                    <span v-if="card.isStreaming" class="inline-block w-1.5 h-3.5 bg-blue-600 animate-pulse ml-1 align-middle" />
                  </div>
                </div>

                <!-- Delete -->
                <div class="flex items-center justify-end pt-1 border-t border-neutral-100">
                  <button
                    :id="`btn-delete-macro-card-${card.id}`"
                    @click="handleDeleteSingleFollowUp(card.id, 'macro')"
                    title="Delete"
                    class="flex items-center gap-1 text-xs text-neutral-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- BLOCK 3: Country Deep-Dive & Segmented Pill Tabs -->
          <div id="country-deep-dive-section" class="space-y-4">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-neutral-900 tracking-wide">
                  Country Analysis
                </span>
                <span class="text-xs text-neutral-500">
                  (Statutory details and evidence)
                </span>
              </div>

              <!-- Compliance status legend -->
              <div class="flex items-center gap-3 text-xs text-neutral-500 font-medium">
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Permitted
                </span>
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Conditional
                </span>
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Prohibited
                </span>
              </div>
            </div>

            <!-- Horizontal Segmented Pill Tabs -->
            <div
              id="jurisdiction-pill-tabs"
              class="flex items-center gap-2 p-1.5 bg-neutral-100 rounded-xl overflow-x-auto border border-neutral-200"
            >
              <button
                v-for="jur in session.jurisdictions"
                :key="jur.code"
                @click="handleJurisdictionChange(jur.code)"
                :class="`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 shrink-0 cursor-pointer select-none ${
                  jur.code === activeJurCode
                    ? 'bg-white text-neutral-900 shadow-2xs border border-neutral-300 font-semibold'
                    : 'bg-transparent text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                }`"
              >
                <!-- Semantic Status Dot -->
                <span
                  :class="`w-2 h-2 rounded-full shrink-0 ${
                    (session.matrixCells[`${currentQuestion?.questionId}_${jur.code}`]?.complianceStatus || jur.complianceStatus) === 'compliant'
                      ? 'bg-emerald-500 ring-2 ring-emerald-200'
                      : (session.matrixCells[`${currentQuestion?.questionId}_${jur.code}`]?.complianceStatus || jur.complianceStatus) === 'conditional'
                      ? 'bg-amber-500 ring-2 ring-amber-200'
                      : 'bg-rose-500 ring-2 ring-rose-200'
                  }`"
                />
                <span class="font-mono text-xs font-semibold">{{ jur.code }}</span>
                <span class="text-xs">{{ jur.name }}</span>
              </button>
            </div>

            <!-- Country Detailed Content -->
            <div
              :class="`p-4 rounded-xl border border-neutral-200 bg-white transition-opacity duration-150 shadow-2xs ${
                isCellTransitioning ? 'opacity-30' : 'opacity-100'
              }`"
            >
              <!-- Active Country Header Badge & Status -->
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 flex-wrap gap-2">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded bg-neutral-900 text-white font-mono text-xs font-semibold">
                    {{ currentJurisdiction.code }}
                  </span>
                  <span class="text-sm font-semibold text-neutral-900">
                    {{ currentJurisdiction.name }}
                  </span>
                  <span class="text-xs text-neutral-500 font-medium">
                    ({{ currentJurisdiction.regulatorAcronym }})
                  </span>
                </div>

                <div
                  v-if="activeCell"
                  class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200"
                >
                  <span
                    :class="`w-2 h-2 rounded-full ${
                      activeCell.complianceStatus === 'compliant'
                        ? 'bg-emerald-500'
                        : activeCell.complianceStatus === 'conditional'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`"
                  />
                  <span>{{ activeCell.statusBadgeLabel }}</span>
                </div>
              </div>

              <!-- Answer with interactive citations -->
              <div v-if="activeCell" class="space-y-3">
                <div class="text-xs sm:text-sm text-neutral-800 leading-relaxed space-y-3 prose-sm">
                  <p
                    v-for="(para, pIdx) in parseMarkdownWithCitations(activeCell.answerMarkdown)"
                    :key="pIdx"
                    class="leading-relaxed"
                  >
                    <template v-for="(seg, segIdx) in para" :key="segIdx">
                      <button
                        v-if="seg.isCitation"
                        type="button"
                        @click="() => {
                          const targetCitation = activeCell?.verifiedCitations[0];
                          if (targetCitation) handleCitationClick(targetCitation.citationId);
                        }"
                        class="inline-flex items-center mx-1 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-800 font-mono text-xs font-semibold transition-colors cursor-pointer border border-blue-200"
                        title="Highlight citation"
                      >
                        {{ seg.text }}
                      </button>
                      <span v-else>{{ seg.text }}</span>
                    </template>
                  </p>
                </div>

                <!-- Key Takeaways -->
                <div
                  v-if="activeCell.keyTakeaways && activeCell.keyTakeaways.length > 0"
                  class="mt-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200/80 space-y-1.5"
                >
                  <span class="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                    <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
                    Key Takeaways
                  </span>
                  <ul class="space-y-1 text-xs text-neutral-700 pl-4 list-disc">
                    <li v-for="(point, kIdx) in activeCell.keyTakeaways" :key="kIdx" class="leading-relaxed">
                      {{ point }}
                    </li>
                  </ul>
                </div>
              </div>

              <div v-else class="p-8 text-center text-xs text-neutral-400">
                Loading compliance analysis data for this cell...
              </div>
            </div>

            <!-- Dynamic Country Follow-up Cards -->
            <div
              v-if="activeCell?.followUps && activeCell.followUps.length > 0"
              id="country-follow-ups-container"
              class="space-y-3 pt-2"
            >
              <!-- Header Controls: Collapse All & Delete All on top left -->
              <div class="flex items-center justify-between pb-1 flex-wrap gap-2">
                <div class="flex items-center gap-2">
                  <button
                    id="btn-collapse-country-followups"
                    @click="countryFollowUpsCollapsed = !countryFollowUpsCollapsed"
                    class="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                    :title="countryFollowUpsCollapsed ? 'Expand all follow-up cards' : 'Collapse all follow-up cards'"
                  >
                    <template v-if="countryFollowUpsCollapsed">
                      <ChevronDown class="w-3.5 h-3.5 text-neutral-500" />
                      <span>Expand All ({{ activeCell.followUps.length }})</span>
                    </template>
                    <template v-else>
                      <ChevronUp class="w-3.5 h-3.5 text-neutral-500" />
                      <span>Collapse All</span>
                    </template>
                  </button>

                  <button
                    id="btn-delete-all-country-followups"
                    @click="
                      confirmDeleteModal = {
                        isOpen: true,
                        scope: 'country',
                        title: currentJurisdiction?.name || 'Country Deep-Dive',
                        count: activeCell.followUps?.length || 0,
                      }
                    "
                    class="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors shadow-2xs cursor-pointer"
                    title="Delete all"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                    <span>Delete All</span>
                  </button>
                </div>

                <span class="text-xs font-medium text-neutral-500">
                  {{ activeCell.followUps.length }} Follow-up{{ activeCell.followUps.length !== 1 ? 's' : '' }}
                </span>
              </div>

              <!-- Collapsed notice -->
              <div
                v-if="countryFollowUpsCollapsed"
                @click="countryFollowUpsCollapsed = false"
                class="p-3 bg-blue-50/60 border border-dashed border-blue-200 rounded-lg text-center text-xs font-medium text-blue-700 cursor-pointer hover:bg-blue-100/60 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronDown class="w-4 h-4 text-blue-500" />
                <span>{{ activeCell.followUps.length }} follow-up analysis card{{ activeCell.followUps.length !== 1 ? 's' : '' }} collapsed. Click to expand.</span>
              </div>

              <!-- Expanded Cards -->
              <div v-else class="space-y-3">
                <div
                  v-for="card in activeCell.followUps"
                  :key="card.id"
                  :id="`follow-up-card-${card.id}`"
                  class="p-4 rounded-xl border border-neutral-200 bg-white shadow-2xs space-y-3 transition-all duration-300 animate-in fade-in slide-in-from-top-3"
                >
                  <!-- Title Row -->
                  <div class="flex items-center justify-between pb-2 border-b border-neutral-100 flex-wrap gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <h4 class="text-xs font-semibold text-neutral-900 truncate">
                        Follow-up ({{ card.timestamp }} - {{ card.jurisdictionName }})
                      </h4>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <span
                        v-if="card.isStreaming"
                        class="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse"
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                        Streaming...
                      </span>
                      <span class="text-xs font-mono font-semibold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded border border-neutral-200">
                        #{{ card.index }}
                      </span>
                    </div>
                  </div>

                  <!-- Query -->
                  <div class="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200/70 text-xs text-neutral-800 leading-relaxed">
                    <span class="font-semibold text-neutral-700">Query: </span>
                    <span class="text-neutral-900">
                      {{ card.queryText }}
                    </span>
                  </div>

                  <!-- Finding -->
                  <div class="p-3 bg-neutral-50/60 rounded-lg border border-neutral-200/70 text-xs text-neutral-800 leading-relaxed space-y-1">
                    <div class="font-semibold text-neutral-900">
                      Finding:
                    </div>
                    <div class="text-neutral-800 leading-relaxed pl-2 border-l-2 border-blue-500">
                      {{ card.findingText }}
                      <span v-if="card.isStreaming" class="inline-block w-1.5 h-3.5 bg-blue-600 animate-pulse ml-1 align-middle" />
                    </div>
                  </div>

                  <!-- Delete -->
                  <div class="flex items-center justify-end pt-1 border-t border-neutral-100">
                    <button
                      :id="`btn-delete-country-card-${card.id}`"
                      @click="handleDeleteSingleFollowUp(card.id, 'country')"
                      title="Delete"
                      class="flex items-center gap-1 text-xs text-neutral-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT PANE: Synchronized Evidence Pack (40% width) -->
      <div
        id="right-pane-evidence"
        ref="rightPaneRef"
        class="lg:w-[40%] bg-neutral-50 flex flex-col overflow-y-auto"
      >
        <!-- Evidence Header -->
        <div class="p-4 border-b border-neutral-200 bg-white shrink-0 sticky top-0 z-10 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <ShieldCheck class="w-4 h-4 text-blue-600" />
            <h3 class="text-xs font-semibold text-neutral-900">
              Evidence Pack
            </h3>
          </div>
          <span class="bg-neutral-100 text-neutral-700 font-mono text-xs font-semibold px-2 py-0.5 rounded border border-neutral-200">
            {{ activeCell?.verifiedCitations.length || 0 }} Source{{ (activeCell?.verifiedCitations.length || 0) !== 1 ? 's' : '' }}
          </span>
        </div>

        <!-- Citation Cards List -->
        <div
          :class="`p-4 space-y-3 flex-1 transition-opacity duration-150 ${
            isCellTransitioning ? 'opacity-30' : 'opacity-100'
          }`"
        >
          <!-- Context Notice -->
          <div class="text-xs text-neutral-500 flex items-center justify-between pb-1">
            <span>
              Scope: <strong class="text-neutral-800">{{ currentJurisdiction.name }}</strong> × Question {{ activeQIndex + 1 }}
            </span>
            <span class="text-emerald-700 font-medium flex items-center gap-1">
              <Check class="w-3 h-3" /> Verified
            </span>
          </div>

          <div
            v-if="!activeCell || activeCell.verifiedCitations.length === 0"
            class="p-8 text-center rounded-xl border border-dashed border-neutral-300 bg-white text-neutral-400 text-xs"
          >
            No statutory citations verified for this cell yet.
          </div>

          <div
            v-else
            v-for="citation in activeCell.verifiedCitations"
            :key="citation.citationId"
            :id="`citation-card-${citation.citationId}`"
            :class="`rounded-xl border transition-all duration-300 p-4 bg-white shadow-2xs space-y-2.5 ${
              highlightedCitationId === citation.citationId
                ? 'ring-2 ring-blue-600 bg-blue-50/20 border-blue-600'
                : 'border-neutral-200 hover:border-neutral-300'
            }`"
          >
            <!-- Card Header -->
            <div class="flex items-start justify-between gap-2">
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="bg-neutral-900 text-white font-mono text-xs font-semibold px-1.5 py-0.5 rounded">
                    {{ citation.regulatorAcronym }}
                  </span>
                  <span class="text-xs text-neutral-500 font-medium">
                    Effective: {{ citation.effectiveDate }}
                  </span>
                </div>
                <h4 class="text-xs sm:text-sm font-semibold text-neutral-900 leading-snug">
                  {{ citation.sourceTitle }}
                </h4>
              </div>

              <a
                :href="citation.sourceUrl"
                target="_blank"
                rel="noreferrer"
                class="p-1 rounded-lg text-neutral-400 hover:text-blue-600 hover:bg-neutral-100 transition-colors shrink-0"
                title="Open Source"
              >
                <ExternalLink class="w-4 h-4" />
              </a>
            </div>

            <!-- Exact Excerpt -->
            <div class="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200/80 text-xs text-neutral-800 leading-relaxed font-serif">
              <p class="italic">
                "{{ citation.excerpt }}"
              </p>
            </div>

            <!-- Digital Certificate & Relevance Tag -->
            <div class="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div class="flex items-center gap-1.5 text-neutral-500 font-mono">
                <Hash class="w-3 h-3 text-neutral-400" />
                <span class="text-neutral-400">SHA-256:</span>
                <span
                  @click="handleCopyHash(citation.citationId, citation.sha256)"
                  class="text-neutral-700 font-semibold hover:text-blue-600 cursor-pointer"
                  title="Click to copy hash"
                >
                  {{ citation.sha256.slice(0, 14) }}...
                </span>
                <span v-if="copiedHashId === citation.citationId" class="text-emerald-600 font-sans text-xs font-semibold">
                  Copied
                </span>
              </div>

              <div class="flex items-center gap-1.5">
                <span class="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold text-xs">
                  {{ citation.relevanceScore }}% Match
                </span>
                <span
                  v-if="citation.relevanceTag"
                  class="text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full font-medium text-xs"
                >
                  {{ citation.relevanceTag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Bottom Follow-up Input Bar -->
    <div
      id="follow-up-input-bar"
      class="bg-white border-t border-neutral-200 px-4 sm:px-6 py-3 shrink-0 shadow-sm z-20"
    >
      <div class="max-w-5xl mx-auto space-y-2">
        <!-- Pre-loaded Context Anchor & Broadcast Checkbox -->
        <div class="flex items-center justify-between flex-wrap gap-2 text-xs">
          <div class="flex items-center gap-2 text-neutral-600">
            <span class="text-neutral-500 font-medium">Context:</span>
            <span
              :class="`font-semibold px-2 py-0.5 rounded border text-xs ${
                applyToAllJurisdictions
                  ? 'bg-neutral-100 text-neutral-800 border-neutral-300'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`"
            >
              {{
                applyToAllJurisdictions
                  ? `Q${activeQIndex + 1} × All Jurisdictions`
                  : `Q${activeQIndex + 1} × ${currentJurisdiction.name}`
              }}
            </span>
          </div>

          <label class="flex items-center gap-1.5 text-xs text-neutral-700 font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              v-model="applyToAllJurisdictions"
              class="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-600 border-neutral-300"
            />
            <span>Broadcast to all jurisdictions</span>
          </label>
        </div>

        <!-- Prompt Input Form -->
        <div class="flex items-center gap-2">
          <input
            type="text"
            v-model="followUpPrompt"
            @keydown.enter="handleSendFollowUp"
            :placeholder="
              applyToAllJurisdictions
                ? `Ask inquiry across all monitored jurisdictions for Question ${activeQIndex + 1}...`
                : `Ask follow-up for ${currentJurisdiction.name}...`
            "
            class="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-300 rounded-lg text-xs sm:text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all"
          />
          <button
            id="btn-send-follow-up"
            @click="handleSendFollowUp"
            :disabled="!followUpPrompt.trim() || isProcessingFollowUp"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shrink-0"
          >
            <span v-if="isProcessingFollowUp" class="animate-spin text-sm">⟳</span>
            <Send v-else class="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal for Delete All Real-time Follow-up Analysis Cards -->
    <div
      v-if="confirmDeleteModal?.isOpen"
      id="confirm-delete-modal-overlay"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      @click="confirmDeleteModal = null"
    >
      <div
        id="confirm-delete-modal-dialog"
        class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-150"
        @click.stop
      >
        <div class="flex items-start gap-3.5">
          <div class="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0 text-red-600">
            <AlertTriangle class="w-5 h-5" />
          </div>
          <div class="space-y-1">
            <h3 class="text-base font-bold text-neutral-900">
              Delete All Real-time Follow-up Analysis?
            </h3>
            <p class="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Are you sure you want to delete all
              <span class="font-bold text-neutral-900">{{ confirmDeleteModal.count }}</span>
              Real-time Follow-up Analysis cards from
              <span class="font-semibold text-neutral-800">"{{ confirmDeleteModal.title }}"</span>? This will clear all follow-up questions and findings.
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
          <button
            id="btn-cancel-delete-all"
            @click="confirmDeleteModal = null"
            class="px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-delete-all"
            @click="handleExecuteDeleteAll"
            class="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 class="w-4 h-4" />
            <span>Confirm Delete</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
