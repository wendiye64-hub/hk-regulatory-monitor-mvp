<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  ClipboardList,
  CheckCircle2,
  FileText,
  Building2,
  Globe,
  Layers,
  HelpCircle,
  Search,
  Check,
  ChevronDown,
} from 'lucide-vue-next';
import { useTaskStore } from '@/stores/taskStore';
import { ALL_JURISDICTIONS } from '@/types';
import type { PriorityAlert, RegulationItem, RegulatorInScope } from '@/types';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    initialTitle?: string;
    initialTopic?: string;
    initialJurisdiction?: string;
    initialNews?: Array<{ id: string; title: string; regulator?: string; regulatorAcronym?: string }>;
    initialRegulators?: Array<{ id: string; name: string; acronym?: string; jurisdiction?: string }>;
  }>(),
  {
    initialTitle: '',
    initialTopic: '',
    initialJurisdiction: 'Singapore',
    initialNews: () => [],
    initialRegulators: () => [],
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'taskCreated', taskId: string): void;
}>();

const taskStore = useTaskStore();

const taskTitle = ref(props.initialTitle || '');
const taskTopic = ref(props.initialTopic || '');
const homeJurisdiction = ref('Hong Kong');

// Helper to parse multiple initial jurisdictions
const parseJurisdictions = (val?: string): string[] => {
  if (!val) return ['Singapore'];
  const items = val.split(/[&,➔/]+/).map((s) => s.trim()).filter(Boolean);
  return items.length > 0 ? items : ['Singapore'];
};

// Target Jurisdiction can choose more than 1
const targetJurisdictions = ref<string[]>(parseJurisdictions(props.initialJurisdiction));
const isTargetDropdownOpen = ref(false);
const targetSearchQuery = ref('');
const targetDropdownRef = ref<HTMLDivElement | null>(null);

const COMMON_TARGETS = [
  'Singapore',
  'United Kingdom',
  'European Union',
  'United States',
  'Japan',
  'Australia',
  'Global / Cross-Border',
];

const toggleTargetJurisdiction = (jur: string) => {
  if (targetJurisdictions.value.includes(jur)) {
    targetJurisdictions.value = targetJurisdictions.value.filter((j) => j !== jur);
  } else {
    targetJurisdictions.value.push(jur);
  }
};

const removeTargetJurisdiction = (jur: string) => {
  targetJurisdictions.value = targetJurisdictions.value.filter((j) => j !== jur);
};

const clearTargetJurisdictions = () => {
  targetJurisdictions.value = [];
};

const filteredTargetOptions = computed(() => {
  const query = targetSearchQuery.value.trim().toLowerCase();
  const baseList = ['Global / Cross-Border', ...ALL_JURISDICTIONS];
  const unique = Array.from(new Set(baseList));
  if (!query) return unique;
  return unique.filter((j) => j.toLowerCase().includes(query));
});

const handleClickOutside = (event: MouseEvent) => {
  if (targetDropdownRef.value && !targetDropdownRef.value.contains(event.target as Node)) {
    isTargetDropdownOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

const taskSummary = ref('');
const selectedNews = ref<Array<{ id: string; title: string; regulator?: string; regulatorAcronym?: string }>>([
  ...props.initialNews,
]);
const selectedRegulators = ref<Array<{ id: string; name: string; acronym?: string; jurisdiction?: string }>>([
  ...props.initialRegulators,
]);

// Batch question text
const rawQuestionsText = ref('');
const isSubmitting = ref(false);

// Preset templates for quick question loading
const questionPresets = [
  {
    label: 'Operational Resilience',
    topic: 'Operational Resilience & Incident Reporting',
    targets: ['Singapore', 'United Kingdom'],
    summary: 'Evaluate cross-border notification obligations, tolerance metrics, and mandatory cloud audit clauses across Singapore and UK.',
    questions: [
      'What are the mandatory statutory notification timelines for severe cybersecurity or operational disruptions?',
      'Are financial institutions required to enforce direct inspection and audit rights in third-party cloud service contracts?',
      'What scenario testing and tolerance thresholds must be established for critical business services?',
    ],
  },
  {
    label: 'Corporate Secretarial & AML',
    topic: 'Corporate Governance & Beneficial Ownership',
    targets: ['United Kingdom', 'Singapore'],
    summary: 'Compare register of significant controllers requirements and restrictions on sole corporate directors across UK and Singapore.',
    questions: [
      'Can a body corporate serve as sole director or company secretary in this jurisdiction?',
      'What anti-avoidance restrictions apply to sole directors appointing corporate secretarial entities?',
      'What are the statutory filing deadlines and registry requirements for Significant Controllers registers?',
    ],
  },
  {
    label: 'Virtual Assets & Fintech',
    topic: 'VASP Licensing & Market Conduct',
    targets: ['Singapore', 'European Union', 'United States'],
    summary: 'Assess cross-border licensing triggers, client suitability, and cold-storage custody standards across MAS, MiCA, and US frameworks.',
    questions: [
      'What licensing triggers apply to cross-border virtual asset trading platforms serving local retail customers?',
      'What custody and client asset segregation standards are mandated by the supervisory authority?',
    ],
  },
];

const applyPreset = (preset: (typeof questionPresets)[0]) => {
  taskTopic.value = preset.topic;
  targetJurisdictions.value = [...preset.targets];
  taskSummary.value = preset.summary;
  if (!taskTitle.value) {
    taskTitle.value = `${preset.label} Compliance Assessment (${homeJurisdiction.value} ➔ ${preset.targets.join(', ')})`;
  }
  rawQuestionsText.value = preset.questions.map((q, idx) => `${idx + 1}. ${q}`).join('\n\n');
};

// Auto-populate title if empty when topic or jurisdictions change
watch(
  [taskTopic, homeJurisdiction, targetJurisdictions],
  () => {
    if (taskTopic.value && !taskTitle.value) {
      const targetsStr = targetJurisdictions.value.length > 0 ? targetJurisdictions.value.join(', ') : 'Global';
      taskTitle.value = `${taskTopic.value} Review (${homeJurisdiction.value} ➔ ${targetsStr})`;
    }
  },
  { deep: true }
);

// Sync props if modal opens with pre-linked items
watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      if (props.initialTitle) taskTitle.value = props.initialTitle;
      if (props.initialTopic) taskTopic.value = props.initialTopic;
      if (props.initialJurisdiction) targetJurisdictions.value = parseJurisdictions(props.initialJurisdiction);
      selectedNews.value = [...props.initialNews];
      selectedRegulators.value = [...props.initialRegulators];

      // Auto-populate target jurisdictions and context if regulators are pre-selected
      if (selectedRegulators.value.length > 0) {
        const firstReg = selectedRegulators.value[0];
        const regJurs = selectedRegulators.value
          .map((r) => r.jurisdiction)
          .filter(Boolean) as string[];

        const distinctTargets = regJurs.filter((j) => j !== homeJurisdiction.value);
        if (distinctTargets.length > 0) {
          targetJurisdictions.value = Array.from(new Set(distinctTargets));
        } else if (regJurs.length > 0) {
          targetJurisdictions.value = [regJurs[0]];
        }

        const regNames = selectedRegulators.value.map((r) => r.acronym || r.name).join(', ');
        const targetStr = targetJurisdictions.value.join(', ') || 'Cross-Border';

        if (!props.initialTitle) {
          taskTitle.value = `${regNames} Supervisory Assessment (${homeJurisdiction.value} ➔ ${targetStr})`;
        }

        if (!props.initialTopic) {
          taskTopic.value = `${firstReg.acronym || firstReg.name} Supervisory Compliance`;
        }

        if (!taskSummary.value) {
          taskSummary.value = `Regulatory surveillance and statutory compliance review for ${firstReg.name} (${firstReg.acronym || firstReg.jurisdiction}).`;
        }

        if (!rawQuestionsText.value.trim()) {
          const regCode = firstReg.acronym || firstReg.name;
          rawQuestionsText.value = [
            `1. What are the primary statutory obligations and supervisory notification timelines mandated by ${regCode}?`,
            `2. What operational resilience criteria, incident thresholds, and periodic compliance audits are enforced by ${regCode}?`,
            `3. Are authorized institutions required to enforce direct inspection and third-party audit rights under ${regCode} guidelines?`,
          ].join('\n\n');
        }
      } else if (!taskTitle.value) {
        if (selectedNews.value.length > 0) {
          taskTitle.value = `Analysis: ${selectedNews.value[0].title.slice(0, 48)}...`;
        }
      }
    }
  }
);

const removeNews = (id: string) => {
  selectedNews.value = selectedNews.value.filter((n) => n.id !== id);
};

const removeRegulator = (id: string) => {
  selectedRegulators.value = selectedRegulators.value.filter((r) => r.id !== id);
};

// Parse lines into individual questions
const parsedQuestionCount = computed(() => {
  if (!rawQuestionsText.value.trim()) return 0;
  const lines = rawQuestionsText.value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\d+[\.\)]?$/.test(l));
  return lines.length;
});

const handleCreateTask = async () => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    const rawLines = rawQuestionsText.value
      .split(/\r?\n/)
      .map((line) => line.replace(/^(?:\d+[\.\)]|Q\d+[:\.]|Question\s*\d+[:\.])\s*/i, '').trim())
      .filter((q) => q.length > 0);

    const titleFinal =
      taskTitle.value.trim() ||
      (taskTopic.value ? `${taskTopic.value} Review` : 'Regulatory Intelligence Task');

    const targetJurs = targetJurisdictions.value.length > 0 ? targetJurisdictions.value : ['Singapore'];
    const targetJurStr = targetJurs.join(', ');

    const created = taskStore.createTask({
      title: titleFinal,
      topic: taskTopic.value.trim() || 'General Supervisory Assessment',
      jurisdiction: `${homeJurisdiction.value} ➔ ${targetJurStr}`,
      homeJurisdiction: homeJurisdiction.value,
      targetJurisdiction: targetJurStr,
      targetJurisdictions: [...targetJurs],
      summary:
        taskSummary.value.trim() ||
        `Cross-border regulatory assessment between ${homeJurisdiction.value} and ${targetJurStr}.`,
      rawQuestions: rawLines,
      linkedNewsIds: selectedNews.value.map((n) => n.id),
      linkedRegulatorIds: selectedRegulators.value.map((r) => r.id),
    });

    emit('taskCreated', created.id);
    emit('close');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs select-text overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]"
        @click.stop
      >
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-2xs">
              <ClipboardList class="w-4 h-4" />
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-neutral-900">
                Create Regulatory Analysis Task
              </h3>
              <p class="text-xs text-neutral-500">
                Batch query compliance questions against official retrieved records
              </p>
            </div>
          </div>
          <button
            @click="emit('close')"
            class="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
          <!-- Step 1: Contextual Setup -->
          <div class="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-3">
            <div class="flex items-center gap-2 text-xs font-bold text-neutral-800">
              <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
              <span>Contextual Setup & Scope</span>
            </div>

            <!-- Task Title -->
            <div>
              <label class="block text-xs font-bold text-neutral-700 mb-1">
                Task Title <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                v-model="taskTitle"
                placeholder="e.g. Cross-Border Operational Resilience Compliance Assessment"
                class="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <!-- Dual Jurisdiction Setup: Home ➔ Target (Multiple) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold text-neutral-700 mb-1 flex items-center gap-1">
                  <span>Home Jurisdiction</span>
                </label>
                <select
                  v-model="homeJurisdiction"
                  class="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                >
                  <option value="Hong Kong">Hong Kong</option>
                  <option value="Singapore">Singapore</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="European Union">European Union</option>
                  <option value="United States">United States</option>
                  <option v-for="jur in ALL_JURISDICTIONS" :key="`home-${jur}`" :value="jur">
                    {{ jur }}
                  </option>
                </select>
                <p class="text-[11px] text-neutral-400 mt-1">Origin baseline jurisdiction</p>
              </div>

              <!-- Target Jurisdiction(s) with Multi-Select -->
              <div class="relative" ref="targetDropdownRef">
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold text-neutral-700 flex items-center gap-1">
                    <span>Target Jurisdiction(s)</span>
                    <span class="text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {{ targetJurisdictions.length }} selected
                    </span>
                  </label>
                  <button
                    v-if="targetJurisdictions.length > 0"
                    type="button"
                    @click="clearTargetJurisdictions"
                    class="text-[11px] text-neutral-400 hover:text-rose-600 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                <!-- Dropdown Trigger Button -->
                <button
                  type="button"
                  @click="isTargetDropdownOpen = !isTargetDropdownOpen"
                  class="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 flex items-center justify-between hover:border-neutral-300 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer text-left shadow-2xs"
                >
                  <span class="truncate pr-2 text-neutral-700">
                    <template v-if="targetJurisdictions.length === 0">
                      <span class="text-neutral-400">Select target jurisdiction(s)...</span>
                    </template>
                    <template v-else-if="targetJurisdictions.length <= 2">
                      {{ targetJurisdictions.join(', ') }}
                    </template>
                    <template v-else>
                      {{ targetJurisdictions.slice(0, 2).join(', ') }} (+{{ targetJurisdictions.length - 2 }} more)
                    </template>
                  </span>
                  <ChevronDown
                    :class="`w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200 ${
                      isTargetDropdownOpen ? 'rotate-180' : ''
                    }`"
                  />
                </button>

                <!-- Multi-select Dropdown Popover -->
                <div
                  v-if="isTargetDropdownOpen"
                  class="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                >
                  <!-- Search Filter -->
                  <div class="p-2 border-b border-neutral-100 bg-neutral-50/50">
                    <div class="relative">
                      <Search class="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        v-model="targetSearchQuery"
                        placeholder="Search country / jurisdiction..."
                        class="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        @click.stop
                      />
                    </div>

                    <!-- Quick Shortcut Badges for Top Destinations -->
                    <div class="flex items-center gap-1 flex-wrap mt-2 pt-1 border-t border-neutral-100">
                      <span class="text-[10px] text-neutral-400 font-medium">Quick add:</span>
                      <button
                        v-for="target in COMMON_TARGETS"
                        :key="`quick-${target}`"
                        type="button"
                        @click="toggleTargetJurisdiction(target)"
                        :class="`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                          targetJurisdictions.includes(target)
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`"
                      >
                        {{ target === 'United Kingdom' ? 'UK' : target === 'United States' ? 'US' : target === 'European Union' ? 'EU' : target }}
                      </button>
                    </div>
                  </div>

                  <!-- Scrollable Options List with Checkboxes -->
                  <div class="max-h-52 overflow-y-auto p-1 space-y-0.5">
                    <div
                      v-for="jur in filteredTargetOptions"
                      :key="`opt-${jur}`"
                      @click="toggleTargetJurisdiction(jur)"
                      class="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-neutral-50 transition-colors select-none"
                      :class="targetJurisdictions.includes(jur) ? 'bg-blue-50/70 text-blue-900 font-medium' : 'text-neutral-700'"
                    >
                      <span class="truncate">{{ jur }}</span>
                      <div
                        :class="`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ml-2 ${
                          targetJurisdictions.includes(jur)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-neutral-300 bg-white'
                        }`"
                      >
                        <Check v-if="targetJurisdictions.includes(jur)" class="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>
                    <div v-if="filteredTargetOptions.length === 0" class="p-3 text-center text-xs text-neutral-400">
                      No matching jurisdictions
                    </div>
                  </div>

                  <!-- Dropdown Footer -->
                  <div class="p-2 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between text-[11px]">
                    <span class="text-neutral-500 font-medium">
                      {{ targetJurisdictions.length }} selected
                    </span>
                    <button
                      type="button"
                      @click="isTargetDropdownOpen = false"
                      class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold cursor-pointer shadow-2xs"
                    >
                      Done
                    </button>
                  </div>
                </div>

                <!-- Selected Jurisdiction Chips Display -->
                <div v-if="targetJurisdictions.length > 0" class="flex flex-wrap gap-1 mt-1.5">
                  <span
                    v-for="jur in targetJurisdictions"
                    :key="`chip-${jur}`"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium shadow-2xs"
                  >
                    <span>{{ jur }}</span>
                    <button
                      type="button"
                      @click.stop="removeTargetJurisdiction(jur)"
                      class="text-blue-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <X class="w-3 h-3" />
                    </button>
                  </span>
                </div>
                <p v-else class="text-[11px] text-amber-600 mt-1">
                  ⚠️ Please select at least one target jurisdiction.
                </p>
              </div>
            </div>

            <!-- Contextual Summary -->
            <div>
              <label class="block text-xs font-bold text-neutral-700 mb-1">
                Task Summary & Background Scope
              </label>
              <textarea
                v-model="taskSummary"
                rows="2"
                placeholder="e.g. Evaluate cross-border regulatory differences in incident notification windows and mandatory cloud outsourcing audit clauses under dual-licensed operations."
                class="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all leading-relaxed"
              ></textarea>
            </div>
          </div>

          <!-- Pre-linked News Context -->
          <div v-if="selectedNews.length > 0" class="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5">
            <div class="flex items-center justify-between text-xs font-bold text-blue-900">
              <span class="flex items-center gap-1.5">
                <FileText class="w-3.5 h-3.5 text-blue-600" />
                Linked News & Regulatory Items ({{ selectedNews.length }})
              </span>
              <span class="text-[11px] text-blue-600 font-normal">Context provided to task</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="item in selectedNews"
                :key="item.id"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-xs text-neutral-800 shadow-2xs max-w-full"
              >
                <span class="font-bold text-blue-600 text-[10px]">
                  {{ item.regulatorAcronym || 'REG' }}
                </span>
                <span class="truncate max-w-[260px]">{{ item.title }}</span>
                <button
                  @click="removeNews(item.id)"
                  class="text-neutral-400 hover:text-rose-600 transition-colors ml-0.5"
                  title="Remove link"
                >
                  <X class="w-3 h-3" />
                </button>
              </span>
            </div>
          </div>

          <!-- Pre-linked Regulators Context -->
          <div v-if="selectedRegulators.length > 0" class="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1.5">
            <div class="flex items-center justify-between text-xs font-bold text-indigo-900">
              <span class="flex items-center gap-1.5">
                <Building2 class="w-3.5 h-3.5 text-indigo-600" />
                Linked Regulatory Authorities ({{ selectedRegulators.length }})
              </span>
              <span class="text-[11px] text-indigo-600 font-normal">Target authorities for source retrieval</span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="reg in selectedRegulators"
                :key="reg.id"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-xs text-neutral-800 shadow-2xs"
              >
                <span class="font-bold text-indigo-600 text-[10px]">
                  {{ reg.acronym || reg.name }}
                </span>
                <span class="text-neutral-600 text-[11px]">{{ reg.jurisdiction }}</span>
                <button
                  @click="removeRegulator(reg.id)"
                  class="text-neutral-400 hover:text-rose-600 transition-colors ml-0.5"
                  title="Remove link"
                >
                  <X class="w-3 h-3" />
                </button>
              </span>
            </div>
          </div>

          <!-- Step 2: Batch Compliance Questions Input -->
          <div class="space-y-2 p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 text-xs font-bold text-neutral-800">
                <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                <span>Batch Questions Input & Clarification</span>
              </label>
              <span class="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                {{ parsedQuestionCount > 0 ? `${parsedQuestionCount} questions parsed` : 'Batch Question Mode' }}
              </span>
            </div>

            <!-- Starter Presets -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[11px] text-neutral-500">Quick Presets:</span>
              <button
                v-for="p in questionPresets"
                :key="p.label"
                type="button"
                @click="applyPreset(p)"
                class="px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-medium transition-colors cursor-pointer"
              >
                {{ p.label }}
              </button>
            </div>

            <textarea
              v-model="rawQuestionsText"
              rows="5"
              placeholder="Paste or type multiple questions in one go:&#10;1. What are the mandatory incident reporting timelines?&#10;2. What third-party cloud audit rights apply?&#10;(If left empty, system automatically attaches routine supervisory monitoring query)"
              class="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono leading-relaxed"
            ></textarea>
            <p class="text-[11px] text-neutral-500 flex items-center gap-1">
              <HelpCircle class="w-3 h-3 text-neutral-400 shrink-0" />
              <span>Questions will be directly mapped to authoritative official sources with precise text citations.</span>
            </p>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-2.5 bg-neutral-50/70">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleCreateTask"
            :disabled="isSubmitting"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>{{ isSubmitting ? 'Creating Task...' : 'Run Analysis & Create Task' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
