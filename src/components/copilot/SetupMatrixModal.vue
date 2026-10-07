<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  X,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Sparkles,
  Check,
  BookmarkPlus,
  ArrowRight,
  Edit2,
  Layers,
} from 'lucide-vue-next';
import type { JurisdictionPreset } from '@/types';
import {
  ALL_AVAILABLE_JURISDICTIONS,
  SAMPLE_QUESTION_SETS,
} from '@/data/matrixMockData';

const props = defineProps<{
  isOpen: boolean;
  presets: JurisdictionPreset[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'savePreset', preset: JurisdictionPreset): void;
  (
    e: 'runMatrixResearch',
    questions: string[],
    jurisdictionCodes: string[],
    title?: string
  ): void;
}>();

// Raw textarea input
const rawText = ref(
  `1. Can a body corporate serve as a company secretary in this jurisdiction? What registered office or local presence conditions apply?\n2. What are the anti-avoidance restrictions on sole directors concurrently acting as or appointing a corporate secretary?\n3. What statutory filing deadlines and regulatory licensing (e.g. TCSP/ACSP) apply to corporate secretarial service providers?`
);

// Parsed question items
const parsedQuestions = ref<string[]>([
  'Can a body corporate serve as a company secretary in this jurisdiction? What registered office or local presence conditions apply?',
  'What are the anti-avoidance restrictions on sole directors concurrently acting as or appointing a corporate secretary?',
  'What statutory filing deadlines and regulatory licensing (e.g. TCSP/ACSP) apply to corporate secretarial service providers?',
]);

// Selected jurisdiction codes (default 4 core)
const selectedJurisdictions = ref<string[]>(['HK', 'SG', 'UK', 'US']);

// Inline editing question index
const editingIndex = ref<number | null>(null);
const editingText = ref('');

// Save preset inline state
const isSavingPreset = ref(false);
const newPresetName = ref(`Custom Preset ${props.presets.length + 1}`);

// Auto-parse text into questions
const parseRawTextToQuestions = (text: string) => {
  if (!text.trim()) {
    parsedQuestions.value = [];
    return;
  }

  const rawLines = text.split(/\r?\n/);
  const questions: string[] = [];
  let currentBuffer = '';

  const numberPrefixRegex = /^(?:(?:\d+[\.\)]|Q\d+[:\.]|Question\s*\d+[:\.])\s*)/i;

  rawLines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentBuffer) {
        questions.push(currentBuffer.trim());
        currentBuffer = '';
      }
      return;
    }

    if (numberPrefixRegex.test(trimmed)) {
      if (currentBuffer) {
        questions.push(currentBuffer.trim());
      }
      currentBuffer = trimmed.replace(numberPrefixRegex, '');
    } else {
      if (currentBuffer) {
        currentBuffer += ' ' + trimmed;
      } else {
        currentBuffer = trimmed;
      }
    }
  });

  if (currentBuffer) {
    questions.push(currentBuffer.trim());
  }

  const cleanList = questions
    .map((q) => q.replace(numberPrefixRegex, '').trim())
    .filter((q) => q.length > 3);

  parsedQuestions.value = cleanList.length > 0 ? cleanList : [text.trim()];
};

const handleRawTextChange = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  const val = target.value;
  rawText.value = val;
  parseRawTextToQuestions(val);
};

const handleApplySampleSet = (setIdx: number) => {
  const sample = SAMPLE_QUESTION_SETS[setIdx];
  if (sample) {
    const joined = sample.questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
    rawText.value = joined;
    parsedQuestions.value = [...sample.questions];
  }
};

const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
  if (direction === 'up' && index === 0) return;
  if (direction === 'down' && index === parsedQuestions.value.length - 1) return;
  const targetIdx = direction === 'up' ? index - 1 : index + 1;
  const updated = [...parsedQuestions.value];
  const [moved] = updated.splice(index, 1);
  updated.splice(targetIdx, 0, moved);
  parsedQuestions.value = updated;
  rawText.value = updated.map((q, i) => `${i + 1}. ${q}`).join('\n');
};

const handleDeleteQuestion = (index: number) => {
  const updated = parsedQuestions.value.filter((_, i) => i !== index);
  parsedQuestions.value = updated;
  rawText.value = updated.map((q, i) => `${i + 1}. ${q}`).join('\n');
};

const handleStartEdit = (index: number) => {
  editingIndex.value = index;
  editingText.value = parsedQuestions.value[index];
};

const handleSaveEdit = (index: number) => {
  if (!editingText.value.trim()) return;
  const updated = [...parsedQuestions.value];
  updated[index] = editingText.value.trim();
  parsedQuestions.value = updated;
  rawText.value = updated.map((q, i) => `${i + 1}. ${q}`).join('\n');
  editingIndex.value = null;
};

const handleAddSingleQuestion = () => {
  const newQ = `New Question ${parsedQuestions.value.length + 1}`;
  const updated = [...parsedQuestions.value, newQ];
  parsedQuestions.value = updated;
  rawText.value = updated.map((q, i) => `${i + 1}. ${q}`).join('\n');
  editingIndex.value = updated.length - 1;
  editingText.value = newQ;
};

// Jurisdiction selection helpers
const handleToggleJurisdiction = (code: string) => {
  if (selectedJurisdictions.value.includes(code)) {
    selectedJurisdictions.value = selectedJurisdictions.value.filter((c) => c !== code);
  } else {
    selectedJurisdictions.value = [...selectedJurisdictions.value, code];
  }
};

const handleSelectAllJurisdictions = () => {
  selectedJurisdictions.value = ALL_AVAILABLE_JURISDICTIONS.map((j) => j.code);
};

const handleClearJurisdictions = () => {
  selectedJurisdictions.value = [];
};

const handleSelectRegion = (region: 'APAC' | 'EMEA' | 'AMER') => {
  let codes: string[] = [];
  if (region === 'APAC') codes = ['HK', 'SG', 'AU', 'JP', 'ID'];
  else if (region === 'EMEA') codes = ['UK', 'EU'];
  else if (region === 'AMER') codes = ['US'];

  const merged = new Set([...selectedJurisdictions.value, ...codes]);
  selectedJurisdictions.value = Array.from(merged);
};

const handleApplyPreset = (preset: JurisdictionPreset) => {
  selectedJurisdictions.value = preset.jurisdictionCodes;
};

const jurisdictionName = (code: string) =>
  ALL_AVAILABLE_JURISDICTIONS.find((jurisdiction) => jurisdiction.code === code)?.name || code;

const handleConfirmSavePreset = () => {
  if (!newPresetName.value.trim() || selectedJurisdictions.value.length === 0) return;
  const countryNames = selectedJurisdictions.value
    .map((c) => ALL_AVAILABLE_JURISDICTIONS.find((j) => j.code === c)?.name || c)
    .join(', ');
  const newPreset: JurisdictionPreset = {
    id: `preset-custom-${Date.now()}`,
    name: newPresetName.value.trim() || countryNames,
    description: `Covers ${countryNames}`,
    jurisdictionCodes: [...selectedJurisdictions.value],
  };
  emit('savePreset', newPreset);
  isSavingPreset.value = false;
  newPresetName.value = `Custom Preset ${props.presets.length + 2}`;
};

// Complexity Calculation
const totalQuestions = computed(() => parsedQuestions.value.length);
const totalJurisdictions = computed(() => selectedJurisdictions.value.length);
const matrixComplexity = computed(() => totalQuestions.value * totalJurisdictions.value);

const handleRun = () => {
  if (totalQuestions.value === 0 || totalJurisdictions.value === 0) return;
  emit('runMatrixResearch', parsedQuestions.value, selectedJurisdictions.value);
  emit('close');
};
</script>

<template>
  <div
    v-if="isOpen"
    id="setup-matrix-modal-backdrop"
    class="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    @click.self="emit('close')"
  >
    <div
      id="setup-matrix-modal-container"
      class="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Layers class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-neutral-900">
                Multi-Question × Multi-Country Matrix Setup
              </h3>
              <span class="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-md font-mono border border-blue-200">
                Cross-Jurisdiction Copilot
              </span>
            </div>
            <p class="text-xs text-neutral-500 mt-0.5">
              Input compliance inquiry questions and select target country jurisdictions to run simultaneous deep-dive analysis.
            </p>
          </div>
        </div>

        <button
          @click="emit('close')"
          class="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Scrollable Form Body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm">
        <!-- Section 1: Inquiry Question Stack -->
        <div class="space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <label class="font-bold text-neutral-900 text-sm">
                Inquiry Question Stack (Auto-Numbered or Raw Multi-Line)
              </label>
              <span class="bg-slate-100 text-slate-700 font-mono text-xs px-2 py-0.5 rounded-md font-semibold border border-slate-200">
                {{ parsedQuestions.length }} Question{{ parsedQuestions.length !== 1 ? 's' : '' }} Parsed
              </span>
            </div>

            <!-- Pre-defined Sample Sets -->
            <div class="flex items-center gap-1.5">
              <span class="text-[11px] text-neutral-500 font-medium">Load Archetype:</span>
              <button
                v-for="(sample, idx) in SAMPLE_QUESTION_SETS"
                :key="idx"
                type="button"
                @click="handleApplySampleSet(idx)"
                class="px-2 py-1 rounded-lg text-[11px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 transition-colors cursor-pointer"
              >
                {{ sample.category }}
              </button>
            </div>
          </div>

          <!-- Raw Input Textarea -->
          <div class="space-y-1">
            <textarea
              :value="rawText"
              @input="handleRawTextChange"
              rows="4"
              placeholder="Paste or type multiple questions separated by lines or numbers (1., 2., Q1, Q2)..."
              class="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-xl text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans leading-relaxed"
            />
            <div class="flex items-center justify-between text-[11px] text-neutral-400 px-1">
              <span>Lines starting with 1., 2., Q1., or questions separated by newlines are parsed automatically.</span>
              <button
                type="button"
                @click="handleAddSingleQuestion"
                class="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          <!-- Structured Question List with Reorder / Delete / Inline Edit -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-500 px-1">
              <span>Parsed Questions List</span>
              <span>Reorder / Edit Actions</span>
            </div>

            <div v-if="parsedQuestions.length === 0" class="p-4 rounded-xl border border-dashed border-neutral-300 text-center text-neutral-400 text-xs">
              No questions parsed yet. Enter inquiry queries in the box above.
            </div>

            <div v-else class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              <div
                v-for="(qText, idx) in parsedQuestions"
                :key="idx"
                class="group p-2.5 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 flex items-center justify-between gap-2.5 transition-all shadow-2xs"
              >
                <div class="flex items-start gap-2.5 flex-1 min-w-0">
                  <span class="w-5 h-5 rounded-md bg-neutral-100 text-neutral-700 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {{ idx + 1 }}
                  </span>

                  <div v-if="editingIndex === idx" class="flex-1 space-y-1.5">
                    <input
                      type="text"
                      v-model="editingText"
                      @keydown.enter="handleSaveEdit(idx)"
                      @keydown.esc="editingIndex = null"
                      class="w-full px-2.5 py-1 bg-white border border-blue-500 rounded-lg text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autofocus
                    />
                    <div class="flex items-center gap-2">
                      <button
                        @click="handleSaveEdit(idx)"
                        class="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        @click="editingIndex = null"
                        class="text-[10px] text-neutral-500 hover:text-neutral-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  <p
                    v-else
                    @click="handleStartEdit(idx)"
                    class="text-xs text-neutral-800 font-medium leading-relaxed cursor-pointer hover:text-blue-700 transition-colors"
                    title="Click to inline edit this question"
                  >
                    {{ qText }}
                  </p>
                </div>

                <!-- Action buttons: Move up/down, edit, delete -->
                <div class="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    @click="handleStartEdit(idx)"
                    class="p-1 rounded text-neutral-400 hover:text-blue-600 hover:bg-neutral-200/60 transition-colors cursor-pointer"
                    title="Inline edit"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                  </button>
                  <button
                    @click="handleMoveQuestion(idx, 'up')"
                    :disabled="idx === 0"
                    class="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 disabled:opacity-30 cursor-pointer"
                    title="Move up"
                  >
                    <MoveUp class="w-3.5 h-3.5" />
                  </button>
                  <button
                    @click="handleMoveQuestion(idx, 'down')"
                    :disabled="idx === parsedQuestions.length - 1"
                    class="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 disabled:opacity-30 cursor-pointer"
                    title="Move down"
                  >
                    <MoveDown class="w-3.5 h-3.5" />
                  </button>
                  <button
                    @click="handleDeleteQuestion(idx)"
                    class="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete question"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr class="border-neutral-200" />

        <!-- Section 2: Jurisdictions & Presets Engine (Country Names ONLY) -->
        <div class="space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <label class="font-bold text-neutral-900 text-sm">
                Jurisdictions & Presets Engine
              </label>
              <span class="bg-blue-50 text-blue-700 font-mono text-xs px-2 py-0.5 rounded-md font-semibold border border-blue-200">
                {{ selectedJurisdictions.length }} Jurisdiction{{ selectedJurisdictions.length !== 1 ? 's' : '' }} Selected
              </span>
            </div>

            <!-- Quick Select Buttons -->
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                @click="handleSelectAllJurisdictions"
                class="text-[11px] font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                @click="handleClearJurisdictions"
                class="text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 px-2 py-1 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Clear
              </button>
              <span class="text-neutral-300">|</span>
              <button
                v-for="region in (['APAC', 'EMEA', 'AMER'] as const)"
                :key="region"
                type="button"
                @click="handleSelectRegion(region)"
                class="text-[11px] font-medium text-slate-700 hover:bg-slate-200 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                +{{ region }}
              </button>
            </div>
          </div>

          <!-- Preset Quick-Bar (Country Names ONLY) -->
          <div class="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <BookmarkPlus class="w-3.5 h-3.5 text-blue-600" />
                Preset Quick-Bar
              </span>
              <span class="text-[11px] text-slate-500">Click a preset to quickly apply saved combinations</span>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <button
                v-for="preset in presets"
                :key="preset.id"
                type="button"
                @click="handleApplyPreset(preset)"
                :class="`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  preset.jurisdictionCodes.length === selectedJurisdictions.length &&
                  preset.jurisdictionCodes.every((c) => selectedJurisdictions.includes(c))
                    ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400/40'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`"
                :title="
                  preset.jurisdictionCodes.map(jurisdictionName).join(', ')
                "
              >
                <span>
                  {{
                    preset.jurisdictionCodes.map(jurisdictionName).join(', ')
                  }}
                </span>
                <span
                  :class="`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    preset.jurisdictionCodes.length === selectedJurisdictions.length &&
                    preset.jurisdictionCodes.every((c) => selectedJurisdictions.includes(c))
                      ? 'bg-blue-700 text-blue-100'
                      : 'bg-slate-100 text-slate-600'
                  }`"
                >
                  {{ preset.jurisdictionCodes.length }}
                </span>
              </button>
            </div>
          </div>

          <!-- Multi-Select Jurisdiction Matrix Pills (Country Names Only - NO REGULATORY INSTITUTIONS) -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div
              v-for="jur in ALL_AVAILABLE_JURISDICTIONS"
              :key="jur.code"
              @click="handleToggleJurisdiction(jur.code)"
              :class="`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-center justify-between ${
                selectedJurisdictions.includes(jur.code)
                  ? 'bg-blue-50/70 border-blue-500 shadow-2xs'
                  : 'bg-white border-neutral-200/90 hover:border-neutral-300 hover:bg-neutral-50/50'
              }`"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs font-bold font-mono px-1.5 py-0.5 rounded bg-neutral-900 text-white shrink-0">
                  {{ jur.code }}
                </span>
                <span class="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                  {{ jur.name }}
                </span>
              </div>
              <div
                :class="`w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                  selectedJurisdictions.includes(jur.code)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-neutral-300 bg-white'
                }`"
              >
                <Check v-if="selectedJurisdictions.includes(jur.code)" class="w-3 h-3 stroke-[3]" />
              </div>
            </div>
          </div>

          <!-- Save Current Combination as Custom Preset -->
          <div class="pt-2">
            <button
              v-if="!isSavingPreset"
              type="button"
              @click="isSavingPreset = true"
              :disabled="selectedJurisdictions.length === 0"
              class="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <BookmarkPlus class="w-3.5 h-3.5" />
              <span>Save current combination as custom preset...</span>
            </button>

            <div v-else class="flex items-center gap-2 p-2.5 bg-blue-50/50 border border-blue-200 rounded-xl max-w-md animate-in fade-in duration-150">
              <input
                type="text"
                v-model="newPresetName"
                placeholder="Enter custom preset name..."
                class="flex-1 px-3 py-1 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autofocus
              />
              <button
                type="button"
                @click="handleConfirmSavePreset"
                :disabled="!newPresetName.trim()"
                class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                title="Confirm Save"
              >
                <Check class="w-3.5 h-3.5" />
                <span>Save Preset</span>
              </button>
              <button
                type="button"
                @click="isSavingPreset = false"
                class="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 border-t border-neutral-200 bg-neutral-50/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div class="flex items-center gap-2">
          <span class="text-xs text-neutral-600 font-medium">Computation Complexity:</span>
          <span class="bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-xs font-bold px-2.5 py-1 rounded-full shadow-2xs flex items-center gap-1.5">
            <Sparkles class="w-3.5 h-3.5 text-emerald-600" />
            {{ totalQuestions }} Question{{ totalQuestions !== 1 ? 's' : '' }} × {{ totalJurisdictions }} Jurisdiction{{ totalJurisdictions !== 1 ? 's' : '' }} = {{ matrixComplexity }} Analysis Cells
          </span>
        </div>

        <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="btn-run-matrix-research"
            @click="handleRun"
            :disabled="totalQuestions === 0 || totalJurisdictions === 0"
            class="flex-1 sm:flex-initial px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <Sparkles class="w-4 h-4" />
            <span>Run Matrix Research</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
