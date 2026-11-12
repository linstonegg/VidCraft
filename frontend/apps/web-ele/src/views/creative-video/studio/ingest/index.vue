<script lang="ts" setup>
import type { ProductSource, VideoProject } from '#/types/creative-video';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useNow } from '@vueuse/core';
import {
  ElAlert,
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTag,
  ElTree,
} from 'element-plus';

import {
  createReferenceAdInsight,
  getJob,
  getProject,
} from '#/api/creative-video';
import { postBusinessData } from '#/api/creative-video/client';
import { generateUnderstanding } from '#/api/creative-video/understanding';
import ErrorState from '#/components/creative-video/ErrorState.vue';
import LoadingState from '#/components/creative-video/LoadingState.vue';
import ResearchAssistantPanel from '#/components/creative-video/m11/ResearchAssistantPanel.vue';
import { useJobPolling } from '#/composables/creative-video/use-job-polling';
import { useProjectAccess } from '#/composables/creative-video/use-project-access';
import { useCreativeVideoIngestionStore } from '#/stores/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';
import { formatDateTime } from '#/utils/creative-video/format';
import { validateProductUrl } from '#/utils/creative-video/validation';

import AssetUploader from './components/AssetUploader.vue';
import CoveragePanel from './components/CoveragePanel.vue';
import DemoAuthDialog from './components/DemoAuthDialog.vue';
import JobProgress from './components/JobProgress.vue';

defineOptions({ name: 'VidCraftIngest' });

const route = useRoute();
const router = useRouter();
const projectId = computed(() => String(route.params.id ?? ''));
const project = ref<null | VideoProject>(null);
const loadingProject = ref(true);
const projectError = ref('');
const store = useCreativeVideoIngestionStore();
const { canEdit } = useProjectAccess(project);
const addingReferenceAd = ref(false);
const referenceFileInput = ref<HTMLInputElement | null>(null);

const url = ref('');
const scenario = ref('PUBLIC_SUCCESS');
const urlJobId = ref<null | string>(null);
const demoOpen = ref(false);
interface ExplorationNode {
  summary?: string;
  label: string;
  children?: ExplorationNode[];
}
const exploration = ref<ExplorationNode[]>([]);
const exploring = ref(false);
async function explore() {
  exploring.value = true;
  try {
    const result = await postBusinessData<{ nodes: ExplorationNode[] }>(
      `/projects/${encodeURIComponent(projectId.value)}/demo-session/explore`,
    );
    exploration.value = result.nodes;
    await store.refresh();
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    exploring.value = false;
  }
}

const confirmOpen = ref(false);
const selectedSourceIds = ref<string[]>([]);
const confirming = ref(false);
const saving = ref(false);

const scenarioOptions = [
  { label: '公开页面采集成功', value: 'PUBLIC_SUCCESS' },
  { label: '只采集部分页面', value: 'PARTIAL' },
  { label: '需要登录后才能继续', value: 'LOGIN_REQUIRED' },
  { label: '采集失败', value: 'FETCH_FAILED' },
  { label: '慢任务（可观察进度）', value: 'SLOW_COLLECT' },
];

const kindLabels: Record<ProductSource['kind'], string> = {
  BRAND_ASSET: '品牌资料',
  DEMO_SESSION: '演示环境',
  DOCUMENT: '产品文档',
  PUBLIC_WEB: '公开网址',
  REFERENCE_AD: '参考广告',
  SCREEN_RECORDING: '产品录屏',
  SCREENSHOT: '产品截图',
  USER_NOTE: '补充说明',
};

const sourceStatusLabels: Record<string, string> = {
  EXCLUDED: '已排除',
  FAILED: '失败',
  PENDING: '待处理',
  PROCESSING: '处理中',
  READY: '已就绪',
};

const kindCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const source of store.state?.sources ?? []) {
    counts[source.kind] = (counts[source.kind] ?? 0) + 1;
  }
  return counts;
});

const coverageMissing = computed(
  () =>
    store.state?.coverage.filter((item) => item.status !== 'CONFIRMED') ?? [],
);

const includedReadySources = computed(
  () =>
    store.state?.sources.filter(
      (item) => item.status === 'READY' && item.includedInAnalysis,
    ) ?? [],
);

const urlStatus = computed(
  () => store.state?.urlCollectionStatus ?? 'NOT_STARTED',
);
const ingestionStatus = computed(() => store.state?.status ?? 'EMPTY');
const now = useNow({ interval: 1000 });
const demoSession = computed(() => {
  const session = store.state?.demoSession;
  if (
    session?.status === 'ACTIVE' &&
    session.expiresAt &&
    Date.parse(session.expiresAt) <= now.value.getTime()
  )
    return { ...session, status: 'EXPIRED' as const };
  return session ?? null;
});

const urlStatusAlert = computed(() => {
  const map: Record<
    string,
    { text: string; type: 'error' | 'info' | 'success' | 'warning' }
  > = {
    FETCH_FAILED: {
      text: '模拟采集失败：可重试，或改用上传资料。',
      type: 'error',
    },
    LOGIN_REQUIRED: {
      text: '公开页面不足以确认登录后的功能，请模拟授权演示环境或上传录屏。',
      type: 'warning',
    },
    NOT_STARTED: { text: '尚未进行 URL 模拟采集。', type: 'info' },
    PARTIAL: {
      text: '只采集到部分公开页面，缺失项已在覆盖度中标记。',
      type: 'warning',
    },
    PUBLIC_SUCCESS: {
      text: '模拟采集完成：来源与证据已生成。',
      type: 'success',
    },
  };
  return map[urlStatus.value] ?? null;
});

const { job: urlJob } = useJobPolling(urlJobId, {
  onTerminal: async (job) => {
    await store.refresh().catch(() => {});
    if (job.status === 'FAILED') {
      ElMessage.error(job.errorMessage || '模拟采集失败');
    } else {
      ElMessage.success('模拟采集完成，已生成来源与证据');
    }
  },
});

async function loadProject() {
  loadingProject.value = true;
  projectError.value = '';
  try {
    project.value = await getProject(projectId.value);
    url.value = project.value.productUrl ?? '';
    await store.load(projectId.value);
    if (
      store.state?.urlJobId &&
      store.state.urlCollectionStatus === 'FETCHING'
    ) {
      urlJobId.value = store.state.urlJobId;
    }
  } catch (error) {
    projectError.value = friendlyErrorMessage(error);
  } finally {
    loadingProject.value = false;
  }
}

async function startUrlCollection() {
  if (!canEdit.value) {
    ElMessage.warning('当前角色只读，不能启动模拟采集');
    return;
  }
  const error = validateProductUrl(url.value);
  if (error) {
    ElMessage.warning(error);
    return;
  }
  if (!url.value.trim()) {
    ElMessage.warning('请输入产品网址');
    return;
  }
  try {
    const result = await store.runUrlAnalysis(url.value.trim(), scenario.value);
    urlJobId.value = result.jobId;
    ElMessage.info('已提交模拟采集任务（Mock 不会真实访问该网址）');
  } catch (collectionError) {
    ElMessage.error(friendlyErrorMessage(collectionError));
  }
}

async function toggleSource(source: ProductSource, included: boolean) {
  try {
    await store.toggleSource(source, included);
    ElMessage.success(
      included ? '来源已重新参与分析' : '来源已排除，覆盖度已更新',
    );
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  }
}

function triggerReferenceUpload() {
  referenceFileInput.value?.click();
}

async function inspectVideo(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsDataURL(file);
  });
  try {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'metadata';
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.addEventListener('loadedmetadata', () => resolve(), { once: true });
      video.addEventListener(
        'error',
        () => reject(new Error('video decode failed')),
        {
          once: true,
        },
      );
    });
    const durationSec = Math.max(1, Math.round(video.duration || 1));
    const width = video.videoWidth || 0;
    const height = video.videoHeight || 0;
    let format = '9:16';
    if (width && width === height) format = '1:1';
    else if (width > height) format = '16:9';
    video.currentTime = Math.min(0.1, Math.max(0, video.duration / 10));
    await new Promise<void>((resolve) => {
      video.addEventListener('seeked', () => resolve(), { once: true });
      setTimeout(resolve, 800);
    });
    let thumbnailDataUrl: string | undefined;
    if (width && height) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(320, width);
      canvas.height = Math.round((canvas.width / width) * height);
      canvas
        .getContext('2d')
        ?.drawImage(video, 0, 0, canvas.width, canvas.height);
      thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.6);
    }
    URL.revokeObjectURL(url);
    return {
      contentDataUrl: file.size <= 2_000_000 ? dataUrl : undefined,
      durationSec,
      format,
      height,
      thumbnailDataUrl,
      width,
    };
  } catch {
    return { durationSec: 30, format: '9:16', height: 0, width: 0 };
  }
}

async function onReferenceFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const media = await inspectVideo(file);
  await addReferenceAd(file, media);
}

async function addReferenceAd(
  file?: File,
  media?: {
    contentDataUrl?: string;
    durationSec: number;
    format: string;
    height: number;
    thumbnailDataUrl?: string;
    width: number;
  },
) {
  if (!canEdit.value || addingReferenceAd.value) return;
  addingReferenceAd.value = true;
  try {
    const started = await createReferenceAdInsight(projectId.value, {
      copyrightConfirmed: true,
      contentDataUrl: media?.contentDataUrl,
      durationSec: media?.durationSec ?? 30,
      format: media?.format ?? '9:16',
      height: media?.height,
      fileName: file?.name,
      fileSize: file?.size,
      mimeType: file?.type,
      thumbnailDataUrl: media?.thumbnailDataUrl,
      title: file
        ? `参考广告：${file.name}`
        : '参考广告：问题-反转-演示（Mock 授权示例）',
      width: media?.width,
    });
    let job = await getJob(started.jobId);
    for (let index = 0; index < 20; index += 1) {
      if (['CANCELLED', 'FAILED', 'SUCCEEDED'].includes(job.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
      job = await getJob(started.jobId);
    }
    if (job.status !== 'SUCCEEDED') {
      throw new Error(job.errorMessage ?? '参考广告分析任务失败');
    }
    ElMessage.success('参考广告分析完成；不进入产品事实');
    await router.push(`/studio/${projectId.value}/references`);
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    addingReferenceAd.value = false;
  }
}

async function saveIngestion() {
  saving.value = true;
  try {
    await store.refresh();
    ElMessage.success('资料已保存到 Mock 服务端（刷新浏览器不会丢失）');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

function openConfirm() {
  if (includedReadySources.value.length === 0) {
    ElMessage.warning('至少需要一份有效资料才能开始分析');
    return;
  }
  selectedSourceIds.value = includedReadySources.value.map((item) => item.id);
  confirmOpen.value = true;
}

async function confirmAndAnalyze() {
  if (selectedSourceIds.value.length === 0) {
    ElMessage.warning('请至少选择一份参与分析的资料');
    return;
  }
  confirming.value = true;
  try {
    const snapshot = await store.confirm(selectedSourceIds.value);
    confirmOpen.value = false;
    ElMessage.success(`资料快照已确认：${snapshot.id}`);
    try {
      const { jobId } = await generateUnderstanding(projectId.value, {
        ingestionSnapshotId: snapshot.id,
        scope: 'FULL',
      });
      await router.push({
        path: `/studio/${projectId.value}/understanding`,
        query: { jobId },
      });
    } catch (error) {
      ElMessage.warning(
        `快照已确认，但分析任务未启动：${friendlyErrorMessage(error)}`,
      );
      await router.push(`/studio/${projectId.value}/understanding`);
    }
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    confirming.value = false;
  }
}

async function revokeDemo() {
  try {
    await ElMessageBox.confirm(
      '撤销后将不能继续模拟探索，但已采集证据仍保留。',
      '撤销模拟授权',
      {
        cancelButtonText: '取消',
        confirmButtonText: '撤销',
        type: 'warning',
      },
    );
    await store.revokeDemo();
    ElMessage.success('模拟授权已撤销');
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return;
    }
    ElMessage.error(friendlyErrorMessage(error));
  }
}

function scrollToSection(id: string) {
  const target = document.querySelector<HTMLElement>(`#${id}`);
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

onMounted(loadProject);
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-page vc-ingest">
    <LoadingState v-if="loadingProject" />

    <ErrorState
      v-else-if="projectError"
      class="vc-ingest__error"
      :message="projectError"
      :show-retry="false"
      title="无法加载项目资料"
    >
      <ElButton type="primary" plain @click="router.push('/projects')">
        返回项目中心
      </ElButton>
      <ElButton @click="loadProject">重试</ElButton>
    </ErrorState>

    <template v-else-if="project">
      <header class="vc-ingest__hero">
        <div class="vc-ingest__hero-copy">
          <p class="vc-ingest__eyebrow">Ingest · S1</p>
          <h1 class="vc-page__title">产品资料采集</h1>
          <p class="vc-page__subtitle">
            {{ project.title }} · 当前资料状态：
            <strong class="vc-ingest__status">{{
              {
                COLLECTING: '采集/分析中',
                CONFIRMED: '已确认快照',
                EMPTY: '空',
                READY_TO_CONFIRM: '待确认',
                STALE: '资料已变化（旧报告可能过时）',
              }[ingestionStatus]
            }}</strong>
          </p>
        </div>
        <div class="vc-m1-actions">
          <ElDropdown trigger="click">
            <ElButton>参考广告 ▾</ElButton>
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem
                  :disabled="addingReferenceAd || !canEdit"
                  @click="addReferenceAd()"
                  >添加参考广告</ElDropdownItem
                >
                <ElDropdownItem
                  :disabled="!canEdit"
                  @click="triggerReferenceUpload"
                  >上传参考广告</ElDropdownItem
                >
                <ElDropdownItem
                  divided
                  @click="router.push(`/studio/${projectId}/references`)"
                  >查看参考广告库</ElDropdownItem
                >
              </ElDropdownMenu>
            </template>
          </ElDropdown>
          <input
            ref="referenceFileInput"
            accept="video/*"
            class="vc-hidden-file"
            type="file"
            @change="onReferenceFile"
          />
        </div>
      </header>

      <ElAlert
        v-if="!canEdit"
        :closable="false"
        class="vc-m1-ingest__notice"
        show-icon
        title="当前角色只读：可以查看资料与证据，但不能编辑或启动分析。"
        type="info"
      />

      <div class="vc-m1-ingest">
        <aside class="vc-ingest__panel vc-m1-ingest__nav">
          <div class="vc-ingest__panel-head">
            <h3>资料来源</h3>
            <p class="vc-m1-ingest__weak">按需补充资料，无需逐项完成。</p>
          </div>
          <button
            class="vc-m1-ingest__nav-item"
            type="button"
            @click="scrollToSection('ingest-url')"
          >
            <span>公开网址</span>
            <ElTag size="small" effect="plain">{{
              kindCounts.PUBLIC_WEB ?? 0
            }}</ElTag>
          </button>
          <button
            class="vc-m1-ingest__nav-item"
            type="button"
            @click="scrollToSection('ingest-demo')"
          >
            <span>演示系统</span>
            <ElTag
              :type="demoSession?.status === 'ACTIVE' ? 'success' : 'info'"
              size="small"
              effect="plain"
            >
              {{ demoSession?.status || 'NONE' }}
            </ElTag>
          </button>
          <button
            class="vc-m1-ingest__nav-item"
            type="button"
            @click="scrollToSection('ingest-assets')"
          >
            <span>录屏 / 截图 / 文档</span>
            <ElTag size="small" effect="plain">{{
              store.state?.assets.length ?? 0
            }}</ElTag>
          </button>
          <button
            class="vc-m1-ingest__nav-item"
            type="button"
            @click="scrollToSection('ingest-sources')"
          >
            <span>全部来源</span>
            <ElTag size="small" effect="plain">{{
              store.state?.sources.length ?? 0
            }}</ElTag>
          </button>
          <p class="vc-m1-ingest__weak vc-ingest__nav-note">
            六类资料都会生成来源与证据；Mock
            不会真实爬取网页，也不保存真实文件内容。
          </p>
        </aside>

        <main class="vc-m1-ingest__center">
          <section id="ingest-url" class="vc-ingest__panel">
            <div class="vc-ingest__panel-head">
              <div>
                <h3>公开网址模拟采集</h3>
                <p class="vc-m1-ingest__weak">
                  演示场景仅用于本地 Mock；Mock
                  不会访问该网址，也不会登录任何系统。
                </p>
              </div>
            </div>
            <div class="vc-m1-ingest__row">
              <ElInput
                v-model="url"
                placeholder="https://example.com/product"
              />
              <ElSelect v-model="scenario" class="vc-m1-ingest__scenario">
                <ElOption
                  v-for="item in scenarioOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </ElSelect>
              <ElButton
                :disabled="!canEdit"
                type="primary"
                @click="startUrlCollection"
              >
                开始模拟采集
              </ElButton>
            </div>
            <JobProgress v-if="urlJob" :job="urlJob" title="URL 采集任务" />
            <ElAlert
              v-if="urlStatusAlert"
              :closable="false"
              class="vc-m1-ingest__notice"
              :title="urlStatusAlert.text"
              show-icon
              :type="urlStatusAlert.type"
            />
          </section>

          <section id="ingest-demo" class="vc-ingest__panel">
            <div class="vc-m1-ingest__section-head">
              <div class="vc-ingest__panel-head vc-ingest__panel-head--inline">
                <div>
                  <h3>演示环境授权（模拟）</h3>
                  <p class="vc-m1-ingest__weak">
                    仅 Mock 授权，不连接真实系统。
                  </p>
                </div>
              </div>
              <div class="vc-m1-actions">
                <ElButton
                  :disabled="!canEdit"
                  size="small"
                  @click="demoOpen = true"
                >
                  打开演示环境授权
                </ElButton>
                <ElButton
                  v-if="demoSession?.status === 'ACTIVE'"
                  :disabled="!canEdit"
                  size="small"
                  type="danger"
                  plain
                  @click="revokeDemo"
                >
                  撤销授权
                </ElButton>
              </div>
            </div>
            <ElAlert
              :closable="false"
              title="这是 Mock 授权演示：不会连接或登录真实网站；不接收真实密码，也不保存 Cookie 或 Token。"
              show-icon
              type="warning"
            />
            <div v-if="demoSession" class="vc-m1-ingest__session">
              <ElButton
                v-if="demoSession.status === 'ACTIVE'"
                :disabled="!canEdit"
                :loading="exploring"
                @click="explore"
                >模拟探索功能树</ElButton
              >
              <span>会话 {{ demoSession.id }}</span>
              <ElTag
                :type="demoSession.status === 'ACTIVE' ? 'success' : 'info'"
                size="small"
              >
                {{ demoSession.status }}
              </ElTag>
              <span>只读：{{ demoSession.readOnly ? '是' : '否' }}</span>
              <span>范围：{{ demoSession.scopedDomains.join('、') }}</span>
              <span>到期：{{ formatDateTime(demoSession.expiresAt) }}</span>
            </div>
            <p v-else class="vc-m1-ingest__weak">当前没有演示授权会话。</p>
            <div
              v-if="exploration.length > 0 && demoSession?.status === 'ACTIVE'"
              class="vc-ingest__tree"
            >
              <ElTree
                :data="exploration"
                default-expand-all
                aria-label="模拟探索功能树"
              >
                <template #default="{ data }"
                  ><details>
                    <summary>{{ data.label }}</summary>
                    <p>{{ data.summary || '模拟节点摘要' }}</p>
                  </details></template
                >
              </ElTree>
            </div>
          </section>

          <section id="ingest-assets" class="vc-ingest__panel">
            <div class="vc-ingest__panel-head">
              <div>
                <h3>录屏 / 截图 / 文档 / 品牌素材</h3>
                <p class="vc-m1-ingest__weak">
                  上传本地文件元数据，补足网址采集看不到的功能证据。
                </p>
              </div>
            </div>
            <AssetUploader />
          </section>

          <section id="ingest-sources" class="vc-ingest__panel">
            <div class="vc-ingest__panel-head">
              <div>
                <h3>来源与证据</h3>
                <p class="vc-m1-ingest__weak">
                  勾选要参与产品理解的来源；排除项不会进入分析快照。
                </p>
              </div>
            </div>
            <p
              v-if="(store.state?.sources.length ?? 0) === 0"
              class="vc-m1-ingest__weak"
            >
              还没有任何来源。至少补充一份有效资料才能开始产品分析。
            </p>
            <ul v-else class="vc-m1-ingest__sources">
              <li v-for="source in store.state?.sources ?? []" :key="source.id">
                <div class="vc-m1-ingest__source-head">
                  <strong>{{ source.title }}</strong>
                  <ElTag size="small">{{ kindLabels[source.kind] }}</ElTag>
                  <ElTag
                    :type="
                      source.status === 'READY'
                        ? 'success'
                        : source.status === 'FAILED'
                          ? 'danger'
                          : 'info'
                    "
                    effect="plain"
                    size="small"
                  >
                    {{ sourceStatusLabels[source.status] || source.status }}
                  </ElTag>
                  <span class="vc-m1-ingest__grow"></span>
                  <ElCheckbox
                    :disabled="!canEdit"
                    :model-value="source.includedInAnalysis"
                    @change="
                      (value: string | number | boolean) =>
                        toggleSource(source, Boolean(value))
                    "
                  >
                    参与分析
                  </ElCheckbox>
                </div>
                <p class="vc-m1-ingest__weak">
                  {{ source.summary || '暂无摘要' }}
                </p>
                <div class="vc-m1-ingest__source-meta">
                  <a
                    v-if="source.referenceUrl"
                    :href="source.referenceUrl"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {{ source.referenceUrl }}
                  </a>
                  <span>证据 {{ source.evidenceIds.length }} 条</span>
                  <span>v{{ source.version }}</span>
                </div>
              </li>
            </ul>
          </section>
        </main>

        <aside class="vc-m1-ingest__side">
          <div class="vc-ingest__panel vc-ingest__side-card">
            <CoveragePanel :coverage="store.state?.coverage ?? []" />
            <p class="vc-m1-ingest__weak">
              快照：{{ store.state?.lastConfirmedSnapshotId || '尚未确认' }} ·
              缺失 {{ coverageMissing.length }} 项
            </p>
          </div>
        </aside>
      </div>

      <footer class="vc-ingest__submit-bar" aria-label="资料提交">
        <div>
          <strong>已选 {{ includedReadySources.length }} 个有效来源</strong>
          <p class="vc-m1-ingest__weak">
            缺失 {{ coverageMissing.length }} 项 · 检查资料后开始产品分析
          </p>
        </div>
        <div class="vc-m1-actions">
          <ElButton
            :disabled="!canEdit"
            :loading="saving"
            @click="saveIngestion"
            >保存资料</ElButton
          >
          <ElButton
            :disabled="!canEdit || includedReadySources.length === 0"
            type="primary"
            @click="openConfirm"
            >确认资料并开始分析</ElButton
          >
        </div>
      </footer>

      <DemoAuthDialog v-model:open="demoOpen" @done="store.refresh()" />

      <ElDialog v-model="confirmOpen" title="确认资料并开始分析" width="620px">
        <div class="vc-m1-ingest__confirm">
          <p>将创建不可变资料快照，并启动一次模拟产品理解任务。</p>
          <ElAlert
            :closable="false"
            show-icon
            title="你是把当前资料固定为快照；之后新增或替换资料需要新快照与新报告，不会静默修改旧报告。"
            type="info"
          />
          <h4>参与分析的来源</h4>
          <ElCheckboxGroup
            v-model="selectedSourceIds"
            class="vc-m1-ingest__confirm-list"
          >
            <ElCheckbox
              v-for="source in includedReadySources"
              :key="source.id"
              :value="source.id"
            >
              {{ kindLabels[source.kind] }}：{{ source.title }}
            </ElCheckbox>
          </ElCheckboxGroup>
          <h4>仍缺失的信息</h4>
          <p v-if="coverageMissing.length === 0" class="vc-m1-ingest__weak">
            覆盖度全部确认。
          </p>
          <ul v-else class="vc-m1-ingest__weak">
            <li v-for="item in coverageMissing" :key="item.code">
              {{ item.label }}：{{ item.explanation }}
            </li>
          </ul>
          <p class="vc-m1-ingest__weak">
            Mock 提示：产品理解结果来自固定演示数据与当前证据等级，不代表真实 AI
            调研结论。
          </p>
        </div>
        <template #footer>
          <ElButton @click="confirmOpen = false">取消</ElButton>
          <ElButton
            :loading="confirming"
            type="primary"
            @click="confirmAndAnalyze"
          >
            确认并开始分析
          </ElButton>
        </template>
      </ElDialog>
    </template>

    <ResearchAssistantPanel
      :highlight-question-id="String(route.query.question ?? '')"
      :project-id="projectId"
    />
  </div>
</template>

<style scoped>
.vc-ingest__submit-bar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  margin-top: 16px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: 12px;
  box-shadow: 0 -4px 20px rgb(0 0 0 / 5%);
}

.vc-ingest {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vc-ingest__error {
  padding: 8px 0;
}

.vc-ingest__hero {
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

.vc-ingest__hero-copy {
  min-width: 0;
  max-width: 720px;
}

.vc-ingest__eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-brand);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.vc-ingest__hero .vc-page__title {
  font-size: 22px;
  letter-spacing: -0.02em;
}

.vc-ingest__status {
  color: var(--vc-brand);
}

.vc-m1-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.vc-m1-ingest {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: start;
}

.vc-ingest__panel {
  box-sizing: border-box;
  padding: 16px 18px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-ingest__panel-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.vc-ingest__panel-head--inline {
  margin-bottom: 0;
}

.vc-ingest__panel-head h3,
.vc-m1-ingest__center h3,
.vc-m1-ingest__side h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-ingest__step {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  font-size: 12px;
  font-weight: 700;
  color: var(--vc-brand);
  background: var(--vc-brand-soft);
  border: 1px solid var(--vc-brand-border);
  border-radius: 10px;
}

.vc-m1-ingest__nav {
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vc-m1-ingest__nav-item {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 9px 10px;
  font-size: 13px;
  color: var(--el-text-color-regular, #4b5563);
  text-align: left;
  cursor: pointer;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 10px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;
}

.vc-m1-ingest__nav-item:hover {
  color: var(--vc-brand);
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
}

.vc-ingest__nav-note {
  padding-top: 6px;
  margin-top: 4px;
  border-top: 1px solid var(--vc-border);
}

.vc-m1-ingest__center {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.vc-m1-ingest__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.vc-m1-ingest__row .el-input {
  flex: 1;
  min-width: 220px;
}

.vc-m1-ingest__scenario {
  width: 190px;
}

.vc-m1-ingest__section-head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.vc-m1-ingest__notice {
  margin-top: 10px;
}

.vc-m1-ingest__weak {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
}

.vc-ingest__panel-head .vc-m1-ingest__weak {
  margin-top: 4px;
}

.vc-m1-ingest__session {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 12px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--vc-text-weak);
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-border);
  border-radius: 10px;
}

.vc-ingest__tree {
  padding: 10px 12px;
  margin-top: 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-border);
  border-radius: 10px;
}

.vc-m1-ingest__sources {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-m1-ingest__sources li {
  padding: 12px 14px;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 10px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.vc-m1-ingest__sources li:hover {
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
  box-shadow: 0 6px 18px rgb(103 87 215 / 8%);
}

.vc-m1-ingest__source-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.vc-m1-ingest__source-head strong {
  font-size: 14px;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-m1-ingest__grow {
  flex: 1;
}

.vc-m1-ingest__source-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-m1-ingest__source-meta a {
  color: var(--vc-brand);
  text-decoration: none;
}

.vc-m1-ingest__source-meta a:hover {
  text-decoration: underline;
}

.vc-m1-ingest__side {
  position: sticky;
  top: 12px;
}

.vc-ingest__side-card {
  background:
    linear-gradient(180deg, rgb(103 87 215 / 5%) 0%, transparent 56%),
    var(--el-bg-color-overlay, #fff);
  border-color: var(--vc-brand-border);
}

.vc-m1-ingest__side-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.vc-m1-ingest__confirm {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.vc-m1-ingest__confirm h4 {
  margin: 8px 0 0;
  font-size: 13px;
}

.vc-m1-ingest__confirm-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.vc-m1-ingest__confirm ul {
  padding-left: 18px;
  margin: 0;
}

@media (max-width: 1280px) {
  .vc-m1-ingest {
    grid-template-columns: 1fr;
  }

  .vc-m1-ingest__nav,
  .vc-m1-ingest__side {
    position: static;
  }
}

@media (max-width: 720px) {
  .vc-ingest__hero {
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vc-m1-ingest__nav-item,
  .vc-m1-ingest__sources li {
    transition: none;
  }
}

.vc-hidden-file {
  display: none;
}
</style>
