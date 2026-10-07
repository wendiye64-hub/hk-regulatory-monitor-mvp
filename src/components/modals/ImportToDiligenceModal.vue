<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  FileCheck2,
  X,
  Building2,
  Globe2,
  Sparkles,
  Layers,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  FolderPlus,
} from 'lucide-vue-next';
import type { RegulatoryDirectoryItem, DiligenceProject } from '@/types';
import { INITIAL_DILIGENCE_PROJECTS } from '@/data/directoryData';

const props = defineProps<{
  isOpen: boolean;
  regulations: RegulatoryDirectoryItem[];
  availableProjects?: DiligenceProject[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (
    e: 'confirm',
    payload: {
      projectId: string;
      projectName: string;
      evidenceType: string;
      notes: string;
      regulationIds: string[];
    }
  ): void;
}>();

const projects = computed(() => props.availableProjects || INITIAL_DILIGENCE_PROJECTS);

const selectedProjectId = ref<string>(projects.value[0]?.id || 'proj-va-custody');
const selectedEvidenceType = ref<string>('Primary Statutory Requirement (Mandatory)');
const assessmentNotes = ref<string>('');
const isSubmitting = ref(false);

const customProjectName = ref('Regulatory Diligence Review');

const selectedProject = computed(() => {
  if (projects.value.length === 0) return null;
  return projects.value.find((p) => p.id === selectedProjectId.value) || projects.value[0];
});

const handleConfirm = () => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;
  setTimeout(() => {
    const projId = selectedProject.value?.id || `proj-custom-${Date.now()}`;
    const projName = selectedProject.value?.name || customProjectName.value.trim() || 'New Diligence Review';
    emit('confirm', {
      projectId: projId,
      projectName: projName,
      evidenceType: selectedEvidenceType.value,
      notes: assessmentNotes.value.trim(),
      regulationIds: props.regulations.map((r) => r.id),
    });
    isSubmitting.value = false;
  }, 250);
};
</script>

<template>
  <div
    v-if="isOpen"
    id="modal-import-diligence"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
  >
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity"
      @click="emit('close')"
    />

    <!-- Modal Dialog Card -->
    <div
      class="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden z-10 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-neutral-100 bg-slate-50/80 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <FileCheck2 class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-neutral-900 leading-tight">
              Import Regulation to Diligence
            </h3>
            <p class="text-xs text-neutral-500">
              Bind regulatory requirements as auditable compliance evidence & assessment checklist criteria
            </p>
          </div>
        </div>
        <button
          @click="emit('close')"
          class="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Scrollable Body -->
      <div class="px-6 py-5 overflow-y-auto space-y-5">
        <!-- Target Regulations Preview Card -->
        <div class="bg-blue-50/50 border border-blue-200/80 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck class="w-3.5 h-3.5 text-blue-600" />
              <span>Target Publication ({{ regulations.length }})</span>
            </span>
            <span class="text-[11px] font-semibold bg-blue-100/80 text-blue-800 px-2 py-0.5 rounded-full">
              Legal Evidence Binding
            </span>
          </div>

          <div class="space-y-2 max-h-40 overflow-y-auto pr-1">
            <div
              v-for="reg in regulations"
              :key="reg.id"
              class="bg-white border border-blue-100 rounded-lg p-3 text-xs shadow-2xs"
            >
              <div class="font-bold text-neutral-900 leading-snug">
                {{ reg.title }}
              </div>
              <div class="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                <span class="font-mono font-medium text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded">
                  Ref: {{ reg.referenceNumber }}
                </span>
                <span class="flex items-center gap-1">
                  <Building2 class="w-3 h-3 text-neutral-400" />
                  {{ reg.regulatorAcronym }}
                </span>
                <span class="flex items-center gap-1">
                  <Globe2 class="w-3 h-3 text-neutral-400" />
                  {{ reg.jurisdiction }}
                </span>
                <span
                  v-if="reg.aiRelevanceScore"
                  class="ml-auto inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded"
                >
                  <Sparkles class="w-3 h-3 text-blue-600" />
                  {{ reg.aiRelevanceScore }}% Match
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Project Selector -->
        <div>
          <label class="block text-xs font-bold text-neutral-800 mb-1.5">
            {{ projects.length > 0 ? 'Select Destination Diligence Project / Checklist *' : 'Target Diligence Project Name *' }}
          </label>
          <div v-if="projects.length > 0" class="space-y-2">
            <div
              v-for="proj in projects"
              :key="proj.id"
              @click="selectedProjectId = proj.id"
              :class="`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                selectedProjectId === proj.id
                  ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30'
                  : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 bg-white'
              }`"
            >
              <div class="flex items-start gap-3 min-w-0">
                <div
                  :class="`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedProjectId === proj.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-100 text-neutral-600'
                  }`"
                >
                  <Layers class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <div class="text-xs font-bold text-neutral-900 truncate">
                    {{ proj.name }}
                  </div>
                  <div class="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                    <span class="font-mono text-neutral-600 font-medium">{{ proj.code }}</span>
                    <span>•</span>
                    <span>{{ proj.lead }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                  {{ proj.regulationsCount }} rules bound
                </span>
                <CheckCircle2
                  v-if="selectedProjectId === proj.id"
                  class="w-4 h-4 text-blue-600 shrink-0"
                />
              </div>
            </div>
          </div>
          <div v-else class="space-y-1.5">
            <input
              v-model="customProjectName"
              type="text"
              placeholder="e.g., Regulatory Compliance Diligence Review"
              class="w-full px-3 py-2 text-xs text-neutral-800 bg-white border border-neutral-300 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p class="text-[11px] text-neutral-500">
              A new Diligence Checklist will be created with these regulations linked as audit evidence.
            </p>
          </div>
        </div>

        <!-- Evidence Classification -->
        <div>
          <label class="block text-xs font-bold text-neutral-800 mb-1.5">
            Compliance Evidence Classification
          </label>
          <select
            v-model="selectedEvidenceType"
            class="w-full h-9 px-3 text-xs font-medium text-neutral-800 bg-white border border-neutral-300 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
          >
            <option value="Primary Statutory Requirement (Mandatory)">
              Primary Statutory Requirement (Mandatory Compliance Benchmark)
            </option>
            <option value="Supervisory Guidance & Best Practice">
              Supervisory Guidance & Industry Best Practice Benchmark
            </option>
            <option value="Supporting Audit Precedent">
              Supporting Legal Precedent & Enforcement Audit Evidence
            </option>
            <option value="Gap Analysis Assessment Reference">
              Gap Analysis & Readiness Self-Assessment Reference
            </option>
          </select>
        </div>

        <!-- Notes / Assessment Directives -->
        <div>
          <label class="block text-xs font-bold text-neutral-800 mb-1.5">
            Diligence Scope Instructions / Audit Directives (Optional)
          </label>
          <textarea
            v-model="assessmentNotes"
            rows="2"
            placeholder="e.g., Audit against Section 4.1 cold-storage key management procedures and obtain third-party custody insurance certificate..."
            class="w-full px-3 py-2 text-xs text-neutral-800 bg-white border border-neutral-300 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-neutral-400"
          ></textarea>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="px-6 py-3.5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
        <span class="text-xs text-neutral-500">
          Binding to <strong class="text-neutral-800">{{ selectedProject?.name || customProjectName }}</strong>
        </span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="emit('close')"
            class="px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleConfirm"
            :disabled="isSubmitting"
            class="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <span v-if="isSubmitting">Binding to Diligence...</span>
            <template v-else>
              <span>Confirm Import to Diligence</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
