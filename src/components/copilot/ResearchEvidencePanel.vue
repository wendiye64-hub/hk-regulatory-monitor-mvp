<script setup lang="ts">
import { computed } from 'vue';
import { ExternalLink, FileText, ShieldCheck, AlertTriangle, Clock, Hash } from 'lucide-vue-next';
import type { MatrixCellData } from '@/types';
import { REQUIRED_GATES, safeOfficialUrl } from '@/services/researchApi';
const props = defineProps<{ cell: MatrixCellData }>();
const evidence = computed(() => props.cell.researchEvidence);
const record = computed(() => evidence.value?.export_record || {});
const gates = computed(() => record.value.validation_gates || evidence.value?.verification?.gates || {});
const sections = computed(() => [
  { title: '直接依据', type: 'direct', entries: record.value.direct_evidence || [] },
  { title: '间接说明', type: 'indirect', entries: record.value.indirect_evidence || [] },
]);
const labels: Record<string, string> = {
  official_current_source: '当前官方来源', exact_evidence: '原文摘录准确',
  legal_citation: '法规与条款引用', substantive_support: '实质支持结论', legal_version: '法规版本',
};
const allGates = computed(() => [...REQUIRED_GATES, ...Object.keys(gates.value).filter(g => !REQUIRED_GATES.includes(g as typeof REQUIRED_GATES[number]))]);
const text = (value: unknown): string => typeof value === 'string' ? value : JSON.stringify(value, null, 2);
</script>

<template>
  <div class="space-y-6 text-xs">
    <div v-if="cell.researchState === 'researching'" role="status" class="p-4 bg-blue-50/30 border border-blue-200 rounded-2xl text-neutral-700 leading-relaxed">
      正在检索官方来源、提取原文并执行独立校验。证据将在研究完成后显示。
    </div>
    <div v-if="cell.researchError" role="alert" class="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl text-rose-800 whitespace-pre-wrap break-words">
      <div class="flex items-center gap-1.5 font-semibold mb-2"><AlertTriangle class="w-4 h-4" />研究未完成</div>
      {{ cell.researchError }}
    </div>
    <div v-if="cell.researchJobId" class="text-neutral-500 font-mono break-all">任务 ID：{{ cell.researchJobId }}</div>
    <template v-if="evidence">
      <div class="p-5 bg-blue-50/30 border border-blue-200 rounded-2xl space-y-3.5">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <h3 class="font-bold text-neutral-900 flex items-center gap-1.5"><FileText class="w-4 h-4 text-blue-600" />研究答案</h3>
          <span class="text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-semibold">{{ cell.statusBadgeLabel }}</span>
        </div>
        <p class="text-neutral-600 leading-relaxed">机器生成的研究材料，尚未经人工复核，不是正式结论。</p>
        <div class="space-y-1"><h4 class="font-bold text-neutral-900">结论 · {{ record.conclusion || '未提供' }}</h4><p class="text-neutral-700 whitespace-pre-wrap leading-relaxed">{{ record.summary || '后端未提供结论摘要。' }}</p></div>
        <div class="space-y-1"><h4 class="font-bold text-neutral-900">适用范围</h4><p class="text-neutral-700 whitespace-pre-wrap leading-relaxed">{{ record.scope || '未提供，需澄清研究对象。' }}</p></div>
        <div class="space-y-1"><h4 class="font-bold text-neutral-900">条件与例外</h4><ul v-if="record.conditions_or_exceptions?.length" class="list-disc pl-4 space-y-1 text-neutral-700"><li v-for="(condition, i) in record.conditions_or_exceptions" :key="i">{{ condition }}</li></ul><p v-else class="text-neutral-500">后端未列出条件或例外。</p></div>
        <div class="space-y-1"><h4 class="font-bold text-neutral-900">法规名称与条款位置</h4><p class="text-neutral-700">{{ record.legal_instrument || '未提供法规名称' }}</p><p class="text-neutral-600">{{ record.regulation_location || record.legal_reference || '未提供条款位置' }}</p></div>
        <div class="flex flex-wrap gap-2 text-neutral-500"><span v-if="record.authority">{{ record.authority }}</span><span v-if="record.as_of_date">基准日：{{ record.as_of_date }}</span><span>{{ evidence.publication_status || (cell.researchState === 'review_pending' ? 'review_pending' : 'not_publishable') }}</span></div>
        <a v-if="safeOfficialUrl(record.official_url)" :href="safeOfficialUrl(record.official_url)" target="_blank" rel="noopener noreferrer" class="inline-flex gap-1 items-center font-semibold text-blue-600 hover:text-blue-800">官方法规链接<ExternalLink class="w-3.5 h-3.5" /></a>
      </div>

      <div class="p-4 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-3">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <h3 class="font-bold text-neutral-800 flex items-center gap-1.5"><ShieldCheck class="w-4 h-4 text-neutral-600" />独立机器校验</h3>
          <span class="px-2 py-0.5 rounded-full border font-semibold" :class="cell.researchState === 'review_pending' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-800 border-amber-200'">{{ cell.researchState === 'review_pending' ? '总体通过 · 待人工复核' : '总体未通过 / 未完成' }}</span>
        </div>
        <div class="grid sm:grid-cols-2 gap-2">
          <div v-for="gate in allGates" :key="gate" class="flex justify-between items-center gap-2 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
            <span class="text-neutral-700">{{ labels[gate] || gate }}</span>
            <span class="font-semibold shrink-0" :class="gates[gate] === true ? 'text-blue-700' : gates[gate] === false ? 'text-amber-800' : 'text-neutral-500'">{{ gates[gate] === true ? '通过' : gates[gate] === false ? '未通过' : '未执行' }}</span>
          </div>
        </div>
      </div>

      <section v-for="section in sections" :key="section.type" class="space-y-3">
        <div class="flex items-center justify-between"><h3 class="font-bold text-neutral-800 flex items-center gap-1.5"><FileText class="w-4 h-4 text-blue-600" />{{ section.title }}</h3><span class="font-mono text-neutral-500">{{ section.entries.length }} 条</span></div>
        <p v-if="section.type === 'indirect'" class="text-neutral-500 leading-relaxed">仅用于解释背景，不能替代直接依据或改变校验结果。</p>
        <div v-if="!section.entries.length" class="p-4 rounded-xl border border-dashed border-neutral-300 bg-white text-neutral-500">后端未返回{{ section.title }}。</div>
        <article v-for="(entry, i) in section.entries" :key="`${entry.source_id}-${i}`" class="rounded-xl border border-neutral-200 p-4 bg-white shadow-2xs space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1.5 min-w-0"><div class="flex flex-wrap gap-1.5"><span class="bg-neutral-900 text-white font-mono px-2 py-0.5 rounded-md">{{ entry.authority || entry.source_id }}</span><span class="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full border border-neutral-200">{{ section.title }}</span></div><h4 class="font-semibold text-neutral-900 break-words">{{ entry.legal_reference || entry.source_id }}<span v-if="entry.page != null"> · 第 {{ entry.page }} 页</span></h4></div>
            <a v-if="safeOfficialUrl(entry.url)" :href="safeOfficialUrl(entry.url)" target="_blank" rel="noopener noreferrer" class="p-1 rounded-lg text-neutral-500 hover:text-blue-600 hover:bg-neutral-100 shrink-0" title="打开官方来源"><ExternalLink class="w-4 h-4" /></a>
          </div>
          <blockquote class="p-4 bg-neutral-50 text-neutral-800 rounded-xl font-mono leading-relaxed whitespace-pre-wrap border border-neutral-200 border-l-4 border-l-blue-600">{{ entry.excerpt || '后端未提供原文摘录。' }}</blockquote>
          <a v-if="safeOfficialUrl(entry.url)" :href="safeOfficialUrl(entry.url)" target="_blank" rel="noopener noreferrer" class="block break-all text-blue-600 hover:text-blue-800">{{ entry.url }}</a>
          <div class="pt-2 border-t border-neutral-100 space-y-1.5 text-neutral-500">
            <div class="flex items-start gap-1.5"><Clock class="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>获取时间：{{ entry.retrieved_at || '未提供' }}</span></div>
            <div class="flex items-start gap-1.5 font-mono"><Hash class="w-3.5 h-3.5 shrink-0 mt-0.5" /><span class="break-all select-all">content_hash：{{ entry.content_hash || '未提供' }}</span></div>
          </div>
        </article>
      </section>

      <div class="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
        <h3 class="font-bold text-neutral-800 flex items-center gap-1.5"><AlertTriangle class="w-4 h-4 text-amber-700" />证据缺口与爬取记录</h3>
        <div><h4 class="font-semibold text-neutral-900 mb-1.5">证据缺口</h4><ul v-if="evidence.evidence_gaps?.length" class="space-y-2"><li v-for="(gap, i) in evidence.evidence_gaps" :key="i" class="text-neutral-700 whitespace-pre-wrap break-words leading-relaxed">{{ text(gap) }}</li></ul><p v-else class="text-neutral-500">后端未报告证据缺口。</p></div>
        <div><h4 class="font-semibold text-neutral-900 mb-1.5">爬取错误</h4><ul v-if="evidence.crawl_errors?.length" class="space-y-2"><li v-for="(error, i) in evidence.crawl_errors" :key="i" class="text-neutral-700 whitespace-pre-wrap break-words leading-relaxed">{{ text(error) }}</li></ul><p v-else class="text-neutral-500">后端未报告爬取错误。</p></div>
      </div>
    </template>
  </div>
</template>
