<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Info,
  HelpCircle,
  Grid,
  Check,
  ChevronDown,
  Sparkles,
} from 'lucide-vue-next';
import type { User } from '@/types';
import BackendStatusModal from '../common/BackendStatusModal.vue';
import { useWizardStore } from '@/stores/wizardStore';

const wizardStore = useWizardStore();

const props = withDefaults(
  defineProps<{
    currentUser?: User;
    activeView: string;
    overdueCount?: number;
    pendingAlertsCount?: number;
    isBackendOnline?: boolean;
    totalAlerts?: number;
    totalRegulators?: number;
    totalRegulations?: number;
  }>(),
  {
    currentUser: () => ({
      id: 'usr-ivan-choy',
      name: 'Ivan Choy',
      email: 'ivan.choy@wizpresso.com',
      role: 'Monitor & Compliance Lead',
      organization: 'Wizpresso Demo',
      avatarInitials: 'I',
    }),
    overdueCount: 0,
    pendingAlertsCount: 0,
    isBackendOnline: false,
    totalAlerts: 0,
    totalRegulators: 0,
    totalRegulations: 0,
  }
);

const emit = defineEmits<{
  (e: 'changeView', view: 'news-feed' | 'regulator' | 'tasks'): void;
  (e: 'openScopeConfig'): void;
  (e: 'openOnboarding'): void;
  (e: 'retryApi'): void;
  (e: 'updateBaseUrl', newUrl: string): void;
}>();

const viewTitle = computed(() => {
  if (props.activeView === 'regulator') return 'Regulator';
  if (props.activeView === 'tasks') return 'Tasks';
  return 'News Feed';
});

const showLanguageDropdown = ref(false);
const language = ref<'ENG' | 'EN (US)' | 'EN (UK)'>('ENG');
const showHelpModal = ref(false);
const showProfileMenu = ref(false);

const handleAvatarClick = () => {
  if (wizardStore.hasCompletedScoping) {
    wizardStore.openStep2();
    return;
  }
  showProfileMenu.value = !showProfileMenu.value;
};
</script>

<template>
  <header
    id="app-global-navbar"
    class="monitor-navbar h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0"
  >
    <!-- Left: View Title -->
    <div class="flex items-center gap-4 sm:gap-6">
      <div class="flex items-center gap-2">
        <h2 class="text-base sm:text-lg font-semibold text-neutral-900 tracking-tight">
          {{ viewTitle }}
        </h2>
        <div class="relative group">
          <button
            class="text-neutral-400 hover:text-neutral-600 transition-colors p-0.5 rounded-full cursor-pointer"
            aria-label="Information"
          >
            <Info class="w-4 h-4" />
          </button>
          <div
            class="absolute left-0 top-full mt-2 hidden group-hover:block w-72 p-3 bg-neutral-900 text-neutral-100 text-xs rounded-xl shadow-xl z-50 pointer-events-none leading-relaxed"
          >
            <p class="font-medium text-white mb-1">Regulatory Intelligence Workspace</p>
            Auditable monitoring & diligence platform tracking global financial authorities (HKMA, MAS, SFC, FCA, SEC).
          </div>
        </div>
      </div>
    </div>

    <!-- Right: Actions, Language, Help, User Avatar with Notification Badge -->
    <div class="flex items-center gap-2 sm:gap-3">
      <!-- Live API Diagnostic Button -->
      <BackendStatusModal
        :isOnline="isBackendOnline"
        :totalAlerts="totalAlerts"
        :totalRegulators="totalRegulators"
        :totalRegulations="totalRegulations"
        @retry="emit('retryApi')"
        @updateBaseUrl="emit('updateBaseUrl', $event)"
      />

      <!-- Language Switcher -->
      <div class="relative">
        <button
          @click="showLanguageDropdown = !showLanguageDropdown"
          class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
        >
          <span>{{ language }}</span>
          <ChevronDown class="w-3 h-3 text-neutral-400" />
        </button>

        <div
          v-if="showLanguageDropdown"
          class="absolute right-0 top-full mt-1 w-32 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-50"
        >
          <button
            v-for="lang in (['ENG', 'EN (US)', 'EN (UK)'] as const)"
            :key="lang"
            @click="
              language = lang;
              showLanguageDropdown = false;
            "
            class="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 flex items-center justify-between cursor-pointer"
          >
            <span>{{ lang }}</span>
            <Check v-if="language === lang" class="w-3 h-3 text-blue-600" />
          </button>
        </div>
      </div>

      <!-- Help Circle -->
      <button
        id="btn-navbar-help"
        @click="showHelpModal = true"
        class="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
        title="Workflow & Audit Guidelines"
      >
        <HelpCircle class="w-4 h-4" />
      </button>

      <!-- 9-dots App Launcher -->
      <button
        id="btn-navbar-launcher"
        class="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors hidden sm:block cursor-pointer"
        title="Wizpresso Suite"
      >
        <Grid class="w-4 h-4" />
      </button>

      <!-- User Avatar Circle with Notification Red Dot (driven by wizardStore.hasCompletedScoping) -->
      <div class="relative">
        <button
          id="btn-navbar-user-avatar"
          @click="handleAvatarClick"
          class="relative flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer group"
          :title="wizardStore.hasCompletedScoping ? 'New scoping recommendations available! Click to open Step 2' : 'User Profile'"
        >
          <div class="relative">
            <div class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {{ currentUser.avatarInitials || 'U' }}
            </div>

            <!-- Pulsing Red Dot Badge driven by wizardStore.hasCompletedScoping -->
            <span
              v-if="wizardStore.hasCompletedScoping"
              id="avatar-scoping-badge"
              class="absolute -top-0.5 -right-0.5 flex h-3 w-3"
            >
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-rose-600 ring-2 ring-white"></span>
            </span>
          </div>

          <span class="hidden md:inline-block text-xs font-semibold text-neutral-800">
            {{ currentUser.name }}
          </span>

          <span
            v-if="wizardStore.hasCompletedScoping"
            class="hidden lg:inline-flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-full"
          >
            Scope Ready
          </span>
        </button>

        <div
          v-if="showProfileMenu"
          class="absolute right-0 top-full mt-2 w-56 bg-white border border-neutral-200 rounded-2xl shadow-xl p-3 z-50 text-xs"
        >
          <div class="pb-2 border-b border-neutral-100">
            <p class="font-semibold text-neutral-900">{{ currentUser.name }}</p>
            <p class="text-neutral-500 text-xs truncate">{{ currentUser.email }}</p>
            <span class="inline-block mt-1 text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-md">
              {{ currentUser.role }}
            </span>
          </div>
          <div class="py-2 space-y-1">
            <div class="text-xs text-neutral-500 font-medium">Organization</div>
            <div class="text-neutral-800 font-medium">{{ currentUser.organization }}</div>
          </div>
          <div class="pt-2 border-t border-neutral-100 space-y-1.5">
            <button
              id="btn-reopen-onboarding-profile"
              @click="
                wizardStore.openWizard();
                showProfileMenu = false;
              "
              class="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div class="flex items-center gap-1.5">
                <Sparkles class="w-3.5 h-3.5 text-blue-600" />
                <span>{{ wizardStore.hasCompletedScoping ? 'View Scoping Step 2' : 'Re-open Setup Wizard' }}</span>
              </div>
              <span v-if="wizardStore.hasCompletedScoping" class="w-2 h-2 rounded-full bg-rose-500"></span>
            </button>
            <div class="text-neutral-400 text-[11px] px-2">
              Connected to Monitor API v3
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Help Modal -->
    <div
      v-if="showHelpModal"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      @click.self="showHelpModal = false"
    >
      <div
        class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-4 animate-in zoom-in-95 duration-200"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-base font-bold text-neutral-900 flex items-center gap-2">
            <HelpCircle class="w-5 h-5 text-blue-600" />
            Workflow & Audit Guidelines
          </h3>
          <button
            @click="showHelpModal = false"
            class="text-neutral-400 hover:text-neutral-700 p-1 text-sm font-semibold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div class="space-y-3 text-xs text-neutral-600 leading-relaxed">
          <div class="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-neutral-800">
            <span class="font-bold text-blue-900 block mb-1">
              1. Triaging & In-Scope Review (P0)
            </span>
            Review top alerts in News Feed and Watchlist. Click any card or row to inspect official
            regulatory excerpts and AI impact assessments.
          </div>

          <div class="p-3 bg-amber-50/70 rounded-xl border border-amber-100 text-neutral-800">
            <span class="font-bold text-amber-900 block mb-1">
              2. Regulatory Directory Bookmarks
            </span>
            Acknowledging any supervisory alert automatically saves it into your Directory Bookmarks for compliance diligence.
          </div>
        </div>

        <div class="pt-2 flex items-center justify-between">
          <button
            id="btn-reopen-onboarding-help"
            @click="
              showHelpModal = false;
              wizardStore.openWizard();
            "
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>Launch Setup Wizard</span>
          </button>
          <button
            @click="showHelpModal = false"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
