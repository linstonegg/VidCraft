<script lang="ts" setup>
import type { ReferenceAdInsight, VideoProject } from '#/types/creative-video';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ElAlert, ElButton, ElTag } from 'element-plus';

import {
  getJob,
  listReferenceAdInsights,
  reanalyzeReferenceAd,
} from '#/api/creative-video';
import ErrorState from '#/components/creative-video/ErrorState.vue';
import LoadingState from '#/components/creative-video/LoadingState.vue';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';

defineOptions({ name: 'VidCraftStudioReferences' });

const props = defineProps<{ project?: null | VideoProject }>();
const route = useRoute();
const router = useRouter();
const projectId = computed(() => String(route.params.id ?? ''));
const loading = ref(true);
const errorMessage = ref('');
const insights = ref<ReferenceAdInsight[]>([]);
const reanalyzingId = ref('');

async function reanalyze(insight: ReferenceAdInsight) {
  reanalyzingId.value = insight.id;
  try {
    const started = await reanalyzeReferenceAd(projectId.value, insight.id);
    let job = await getJob(started.jobId);
    for (let index = 0; index < 20; index += 1) {
      if (['CANCELLED', 'FAILED', 'SUCCEEDED'].includes(job.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
      job = await getJob(started.jobId);
    }
    if (job.status !== 'SUCCEEDED') {
      throw new Error(job.errorMessage ?? '重新分析失败');
    }
    await load();
  } catch (error) {
    errorMessage.value = friendlyErrorMessage(error);
  } finally {
    reanalyzingId.value = '';
  }
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  try {
    insights.value = await listReferenceAdInsights(projectId.value);
  } catch (error) {
    errorMessage.value = friendlyErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-page vc-ref">
    <header class="vc-ref__hero">
      <div class="vc-ref__hero-copy">
        <p class="vc-ref__eyebrow">P1 · 创意参考</p>
        <h1 class="vc-page__title">参考广告洞察</h1>
        <p class="vc-page__subtitle">
          {{ props.project?.title }} ·
          只提取抽象创意语言，不进入产品事实、证据链或 ClaimAnchor。
        </p>
      </div>
      <div class="vc-m1-actions">
        <ElButton @click="router.push(`/studio/${projectId}/ingest`)">
          返回资料采集
        </ElButton>
        <ElButton
          type="primary"
          @click="router.push(`/studio/${projectId}/angles`)"
        >
          去创意方向
        </ElButton>
      </div>
    </header>

    <LoadingState v-if="loading" />

    <ErrorState
      v-else-if="errorMessage"
      class="vc-ref__panel"
      :message="errorMessage"
      :show-retry="true"
      title="参考广告洞察加载失败"
      @retry="load"
    />

    <template v-else>
      <section class="vc-ref__notice">
        <ElAlert
          :closable="false"
          show-icon
          title="参考广告只用于“怎么讲”的抽象灵感；广告里的功能、成绩和品牌文字不能自动写进当前产品事实。"
          type="warning"
        />
      </section>

      <section v-if="insights.length === 0" class="vc-ref__panel vc-ref__empty">
        <h2>还没有参考广告</h2>
        <p>
          这里不提供第二次上传入口；请在资料采集页使用“添加参考广告”完成素材与权属声明。
          演示环境会生成固定 Mock 洞察，不会调用真实音视频模型。
        </p>
        <ElButton
          type="primary"
          @click="router.push(`/studio/${projectId}/ingest`)"
        >
          去资料采集添加
        </ElButton>
      </section>

      <div v-else class="vc-ref__grid">
        <article
          v-for="insight in insights"
          :key="insight.id"
          class="vc-ref__panel vc-ref__card"
        >
          <header class="vc-ref__card-head">
            <div class="vc-ref__card-copy">
              <div class="vc-ref__card-title-row">
                <h2>{{ insight.title }}</h2>
                <ElTag type="warning" effect="plain" round>仅创意参考</ElTag>
              </div>
              <p class="vc-ref__meta">
                {{ insight.format }} · {{ insight.durationSec }}s ·
                <code>{{ insight.sourceId }}</code>
              </p>
            </div>
            <ElButton
              :loading="reanalyzingId === insight.id"
              size="small"
              @click="reanalyze(insight)"
            >
              重新分析
            </ElButton>
          </header>

          <p class="vc-ref__summary">{{ insight.summary }}</p>

          <div v-if="insight.media" class="vc-ref__media">
            <span>解码</span>
            <strong
              >{{ insight.media.width }}×{{ insight.media.height }} ·
              {{ insight.media.mimeType }}</strong
            >
          </div>

          <section v-if="insight.asr" class="vc-ref__block">
            <h3>ASR 转写（Mock）</h3>
            <p>{{ insight.asr.text }}</p>
          </section>

          <section class="vc-ref__block">
            <h3>结构模式</h3>
            <div class="vc-ref__patterns">
              <div
                v-for="pattern in insight.patterns"
                :key="pattern.key"
                class="vc-ref__pattern"
              >
                <strong>{{ pattern.label }}</strong>
                <span>{{ pattern.value }}</span>
              </div>
            </div>
          </section>

          <div class="vc-ref__columns">
            <section class="vc-ref__block vc-ref__block--ok">
              <h3>可抽象借鉴</h3>
              <ul>
                <li v-for="item in insight.abstractLanguage" :key="item">
                  {{ item }}
                </li>
              </ul>
            </section>

            <section class="vc-ref__block vc-ref__block--warn">
              <h3>不可复制</h3>
              <ul>
                <li v-for="item in insight.doNotCopy" :key="item">
                  {{ item }}
                </li>
              </ul>
            </section>
          </div>

          <footer class="vc-ref__isolation">
            <ElTag size="small" type="danger" effect="plain"
              >不能作为产品证据</ElTag
            >
            <span>
              {{ insight.copyright.note }} · 权属声明由用户确认，Mock
              仅展示固定示例
            </span>
          </footer>
        </article>
      </div>
    </template>
  </div>
</template>

<style scoped>
.vc-ref {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 48px;
}

.vc-ref__hero {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  align-items: flex-end;
  justify-content: space-between;
  padding: 18px 20px;
  background:
    linear-gradient(
      135deg,
      rgb(103 87 215 / 8%) 0%,
      rgb(103 87 215 / 2%) 42%,
      transparent 72%
    ),
    var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-ref__hero-copy {
  min-width: 0;
  max-width: 760px;
}

.vc-ref__eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-brand);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.vc-ref__hero .vc-page__title {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.vc-ref__hero .vc-page__subtitle {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
}

.vc-m1-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.vc-ref__panel {
  box-sizing: border-box;
  padding: 16px 18px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-ref__notice :deep(.el-alert) {
  border-radius: var(--vc-border-radius);
}

.vc-ref__empty {
  max-width: 720px;
  margin: 0 auto;
  text-align: center;
}

.vc-ref__empty h2 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 650;
}

.vc-ref__empty p {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vc-text-weak);
}

.vc-ref__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 16px;
}

.vc-ref__card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vc-ref__card-head {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.vc-ref__card-copy {
  flex: 1;
  min-width: 0;
}

.vc-ref__card-title-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.vc-ref__card h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-ref__meta {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vc-text-weak);
}

.vc-ref__meta code {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  word-break: break-all;
}

.vc-ref__summary {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-ref__media {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-ref__media span {
  font-size: 11px;
  color: var(--vc-text-weak);
}

.vc-ref__media strong {
  font-size: 12px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-ref__block h3 {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--vc-text-weak);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.vc-ref__block p {
  padding: 10px 12px;
  margin: 0;
  font-size: 12px;
  line-height: 1.65;
  color: var(--el-text-color-regular, #4b5563);
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-ref__patterns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.vc-ref__pattern {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 10px;
}

.vc-ref__pattern strong {
  font-size: 12px;
  font-weight: 650;
  color: var(--vc-brand);
}

.vc-ref__pattern span {
  font-size: 12px;
  line-height: 1.55;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-ref__columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.vc-ref__block--ok,
.vc-ref__block--warn {
  padding: 12px;
  border-radius: 10px;
}

.vc-ref__block--ok {
  background: #f3faf6;
  border: 1px solid #c6e8d4;
}

.vc-ref__block--warn {
  background: #fff7f6;
  border: 1px solid #ffd6d1;
}

.vc-ref__block ul {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-ref__block li {
  position: relative;
  padding-left: 14px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-ref__block li::before {
  position: absolute;
  top: 0.55em;
  left: 0;
  width: 5px;
  height: 5px;
  content: '';
  background: var(--vc-brand);
  border-radius: 50%;
}

.vc-ref__block--warn li {
  color: #b42318;
}

.vc-ref__block--warn li::before {
  background: #f04438;
}

.vc-ref__isolation {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding-top: 12px;
  margin-top: auto;
  font-size: 12px;
  line-height: 1.55;
  color: var(--vc-text-weak);
  border-top: 1px solid var(--vc-border);
}

@media (max-width: 720px) {
  .vc-ref__patterns,
  .vc-ref__columns {
    grid-template-columns: 1fr;
  }

  .vc-ref__card-head {
    flex-direction: column;
  }

  .vc-ref__card-head .el-button {
    width: 100%;
  }
}
</style>
