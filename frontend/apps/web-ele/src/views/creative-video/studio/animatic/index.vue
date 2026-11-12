<script lang="ts" setup>
import type {
  AnimaticSnapshot,
  ImageAssetVersion,
  ShotRevision,
  StoryboardRevision,
  VideoProject,
} from '#/types/creative-video';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { ElButton, ElInput, ElMessage, ElTag } from 'element-plus';

import {
  approveAnimatic,
  buildAnimatic,
  commentAnimatic,
  getAnimaticState,
  getM2Handoff,
  getProductionReadiness,
  getStaleImpact,
} from '#/api/creative-video';
import GuardNotice from '#/components/creative-video/m2/GuardNotice.vue';
import StaleImpactDrawer from '#/components/creative-video/m2/StaleImpactDrawer.vue';
import GenerationSpecPreview from '#/components/creative-video/m21/GenerationSpecPreview.vue';
import { useJobPolling } from '#/composables/creative-video/use-job-polling';
import { useM2JobId } from '#/composables/creative-video/use-m2-job';
import { useProjectAccess } from '#/composables/creative-video/use-project-access';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';
import {
  buildTimeline,
  findCurrentShot,
  formatMs,
  formatMsPrecise,
} from '#/utils/creative-video/m2-timeline';
import JobProgress from '#/views/creative-video/studio/ingest/components/JobProgress.vue';

defineOptions({ name: 'VidCraftAnimatic' });

const _props = defineProps<{ project?: null | VideoProject }>();
const route = useRoute();
const projectId = computed(() => String(route.params.id ?? ''));
const projectRef = computed(() => _props.project ?? null);
const { canApprove, canEdit, isReviewer } = useProjectAccess(projectRef);

const loading = ref(true);
const errorMessage = ref('');
const needsStoryboard = ref(false);
const state = ref<Awaited<ReturnType<typeof getAnimaticState>> | null>(null);
const handoff = ref<any | null>(null);
const productionReadiness = ref<Awaited<
  ReturnType<typeof getProductionReadiness>
> | null>(null);
const staleOpen = ref(false);
const staleImpact = ref<Awaited<ReturnType<typeof getStaleImpact>> | null>(
  null,
);
const { clearJob, jobId, setJob } = useM2JobId();
const acting = ref(false);
const playing = ref(false);
const currentTimeMs = ref(0);
const subtitlesOn = ref(true);
const muted = ref(true);
const feedback = ref('');
const playerEl = ref<HTMLDivElement | null>(null);
let rafId: null | number = null;
let lastTs = 0;

const { job } = useJobPolling(jobId, {
  onTerminal: async (result) => {
    if (result.status === 'SUCCEEDED') ElMessage.success('预演快照已生成');
    else ElMessage.error(result.errorMessage ?? '预演构建失败，可重试');
    clearJob();
    await load();
  },
});

const snapshot = computed<AnimaticSnapshot | null>(
  () => state.value?.latest ?? null,
);
const storyboard = computed<null | StoryboardRevision>(
  () => state.value?.storyboard ?? null,
);
const shots = computed<ShotRevision[]>(() => {
  const all = state.value?.shots ?? [];
  if (!snapshot.value) return all;
  return snapshot.value.orderedShotRevisionIds
    .map((id) => all.find((shot) => shot.id === id))
    .filter(Boolean) as ShotRevision[];
});
const timeline = computed(() => {
  try {
    return buildTimeline(
      shots.value.map((shot) => ({
        durationMs: shot.durationMs,
        id: shot.id,
        overlapToNextMs: shot.transitionOverlapToNextMs,
        referenceImageId: shot.activeReferenceImageId,
        shotId: shot.shotId,
      })),
    );
  } catch {
    return { segments: [], totalDurationMs: 0 };
  }
});
const totalMs = computed(
  () => snapshot.value?.totalDurationMs || timeline.value.totalDurationMs,
);
const currentSegment = computed(() =>
  findCurrentShot(timeline.value.segments, currentTimeMs.value),
);
const currentShot = computed(
  () =>
    shots.value.find((shot) => shot.shotId === currentSegment.value?.shotId) ??
    null,
);
const images = computed<ImageAssetVersion[]>(() => state.value?.images ?? []);
const currentImage = computed(() => {
  const id =
    currentSegment.value?.referenceImageId ??
    currentShot.value?.activeReferenceImageId;
  return images.value.find((item) => item.id === id) ?? null;
});
const approved = computed(() => snapshot.value?.status === 'APPROVED');
const validity = computed(
  () => productionReadiness.value?.effectiveValidity ?? null,
);
const validityLabel = computed(() => {
  if (validity.value === 'CURRENT') return '当前有效';
  if (validity.value === 'REVIEW_REQUIRED') return '历史快照 · 需复核';
  if (validity.value === 'BLOCKED') return '已阻塞';
  return '有效性待评估';
});
const validityType = computed(() => {
  if (validity.value === 'CURRENT') return 'success';
  if (validity.value === 'BLOCKED') return 'danger';
  return 'warning';
});
const stale = computed(
  () =>
    state.value?.latest?.status === 'STALE' ||
    state.value?.storyboard?.status !== 'APPROVED',
);

async function openStaleImpact() {
  try {
    staleImpact.value = await getStaleImpact(projectId.value);
    staleOpen.value = true;
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  }
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  needsStoryboard.value = false;
  try {
    const result = await getAnimaticState(projectId.value);
    state.value = result;
    if (!result.storyboard) {
      needsStoryboard.value = true;
      return;
    }
    handoff.value = await getM2Handoff(projectId.value);
    try {
      productionReadiness.value = await getProductionReadiness(projectId.value);
    } catch {
      productionReadiness.value = null;
    }
    if (currentTimeMs.value > totalMs.value) {
      currentTimeMs.value = 0;
    }
  } catch (error) {
    errorMessage.value = friendlyErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function build() {
  if (!state.value?.storyboard) return;
  acting.value = true;
  try {
    const result = await buildAnimatic(projectId.value, {
      storyboardRevisionId: state.value.storyboard.id,
    });
    setJob(result.jobId);
    ElMessage.info('正在按时间线构建 120 秒预演快照');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

function tick(ts: number) {
  if (!playing.value) return;
  if (!lastTs) lastTs = ts;
  const delta = ts - lastTs;
  lastTs = ts;
  currentTimeMs.value = Math.min(totalMs.value, currentTimeMs.value + delta);
  if (currentTimeMs.value >= totalMs.value) {
    playing.value = false;
    currentTimeMs.value = totalMs.value;
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function play() {
  if (totalMs.value === 0) return;
  if (currentTimeMs.value >= totalMs.value) currentTimeMs.value = 0;
  playing.value = true;
  lastTs = 0;
  rafId = requestAnimationFrame(tick);
}

function pause() {
  playing.value = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

function togglePlay() {
  if (playing.value) pause();
  else play();
}

function seek(ms: number) {
  currentTimeMs.value = Math.max(0, Math.min(totalMs.value, ms));
}

function jump(delta: number) {
  const segments = timeline.value.segments;
  if (segments.length === 0) return;
  const index = segments.findIndex(
    (segment) => segment.shotId === currentSegment.value?.shotId,
  );
  const target =
    segments[Math.max(0, Math.min(segments.length - 1, index + delta))];
  if (target) seek(target.startMs);
}

async function submitFeedback() {
  if (!snapshot.value || !feedback.value.trim()) {
    ElMessage.warning('请输入反馈内容');
    return;
  }
  acting.value = true;
  try {
    await commentAnimatic(projectId.value, snapshot.value.id, {
      atMs: currentTimeMs.value,
      shotId: currentShot.value?.shotId ?? '',
      text: feedback.value.trim(),
    });
    feedback.value = '';
    await load();
    ElMessage.success('反馈已记录到当前时间点');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function approve() {
  if (!snapshot.value) return;
  acting.value = true;
  try {
    await approveAnimatic(
      projectId.value,
      snapshot.value.id,
      snapshot.value.version,
    );
    await load();
    ElMessage.success('预演快照已确认，可进入 M3 占位');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function fullscreen() {
  if (!playerEl.value) return;
  try {
    await playerEl.value.requestFullscreen();
  } catch {
    ElMessage.info('当前浏览器未允许全屏');
  }
}

onMounted(async () => {
  await load();
});

onBeforeUnmount(() => {
  pause();
});
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-m2-page vc-animatic">
    <div v-if="loading" class="vc-m2-loading">正在读取分镜与预演快照…</div>

    <GuardNotice
      v-else-if="needsStoryboard"
      description="预演必须基于已确认的整套分镜；请先确认 15/15 镜头与分镜集合。"
      label="返回图文分镜"
      title="分镜尚未全部确认"
      :to="`/studio/${projectId}/storyboard`"
    />

    <section v-else-if="errorMessage" class="vc-animatic__panel vc-m2-error">
      <h2>无法加载预演</h2>
      <p>{{ errorMessage }}</p>
      <ElButton @click="load">重试</ElButton>
    </section>

    <template v-else>
      <header class="vc-animatic__hero">
        <div class="vc-animatic__hero-copy">
          <p class="vc-m2-eyebrow">S6 · 低成本整片预演</p>
          <h1>
            {{
              snapshot
                ? `120 秒故事预演 · ${formatMs(totalMs)}`
                : '生成一份低成本预演'
            }}
          </h1>
          <p class="vc-m2-sub">
            低成本预演 · 使用分镜图片和字幕模拟，画质及运动不代表最终效果 ·
            无真实 TTS
          </p>
        </div>
        <div class="vc-m2-head__actions">
          <ElTag v-if="approved && !stale" type="success" effect="plain" round
            >已确认快照</ElTag
          >
          <ElTag v-if="stale" type="danger" effect="plain" round
            >预演需要复核</ElTag
          >
          <ElTag v-if="snapshot" :type="validityType" effect="plain" round>
            {{ validityLabel }}
          </ElTag>
          <ElButton
            v-if="!snapshot && storyboard?.status === 'APPROVED' && canEdit"
            :loading="acting"
            type="primary"
            @click="build"
          >
            生成预演
          </ElButton>
          <ElButton
            v-if="snapshot && !approved && !stale && canApprove"
            :loading="acting"
            type="primary"
            @click="approve"
          >
            确认预演
          </ElButton>
          <ElButton
            v-if="approved && !stale"
            type="primary"
            @click="$router.push(`/studio/${projectId}/generate`)"
          >
            进入 M3 占位
          </ElButton>
        </div>
      </header>

      <section v-if="stale" class="vc-animatic__stale">
        <div>
          <strong>当前预演是历史只读版本</strong>
          <p>
            上游剧本/分镜/视觉规范已变化，旧快照不能进入
            M3。你可以查看影响详情，回到对应阶段复核。
          </p>
        </div>
        <ElButton size="small" @click="openStaleImpact">查看影响详情</ElButton>
      </section>

      <JobProgress v-if="job" :job="job" title="预演构建任务" />

      <GenerationSpecPreview
        :aspect-ratio="_props.project?.aspectRatio"
        :can-enter-m3="productionReadiness?.canEnterM3 ?? false"
        :project-id="projectId"
        :snapshot-id="snapshot?.id"
        :total-duration-ms="totalMs"
      />

      <section v-if="!snapshot" class="vc-animatic__panel vc-m2-empty">
        <h2>
          {{
            storyboard?.status === 'APPROVED'
              ? '分镜已全部确认，可以生成预演'
              : '分镜已被修改，需重新确认后才能生成预演'
          }}
        </h2>
        <p class="vc-m2-muted">
          预演会冻结 StoryboardSnapshot、VisualBible
          版本和每镜头参考图，不会自动修改任何分镜。
        </p>
        <ElButton
          :disabled="storyboard?.status !== 'APPROVED' || !canEdit"
          type="primary"
          :loading="acting"
          @click="build"
        >
          生成预演
        </ElButton>
      </section>

      <div v-else class="vc-animatic__grid">
        <aside class="vc-animatic__panel vc-animatic__shots">
          <div class="vc-animatic__panel-head">
            <h3>镜头目录</h3>
            <p class="vc-m2-muted">{{ shots.length }} 镜 · 点击跳转</p>
          </div>
          <div class="vc-animatic__shot-list">
            <button
              v-for="shot in shots"
              :key="shot.shotId"
              :class="{ 'is-active': shot.shotId === currentShot?.shotId }"
              type="button"
              @click="
                seek(
                  timeline.segments.find(
                    (segment) => segment.shotId === shot.shotId,
                  )?.startMs ?? 0,
                )
              "
            >
              <span class="vc-animatic__shot-index">{{
                String(shot.order).padStart(2, '0')
              }}</span>
              <span class="vc-animatic__shot-title">{{ shot.title }}</span>
              <ElTag
                :type="shot.reviewStatus === 'APPROVED' ? 'success' : 'warning'"
                size="small"
                effect="plain"
              >
                {{ shot.reviewStatus }}
              </ElTag>
            </button>
          </div>
        </aside>

        <main class="vc-animatic__main">
          <div ref="playerEl" class="vc-player">
            <div class="vc-player__stage" :style="{ aspectRatio: '9 / 16' }">
              <img
                v-if="currentImage"
                :alt="currentShot?.title"
                :src="currentImage.mockUrl"
              />
              <div v-else class="vc-player__empty">当前镜头没有可用参考图</div>
              <div v-if="subtitlesOn" class="vc-player__subtitle">
                {{
                  currentShot?.subtitles[currentShot?.subtitles.length - 1] ||
                  currentShot?.narration ||
                  '（无字幕）'
                }}
              </div>
              <div class="vc-player__hud">
                镜头 {{ currentShot?.order ?? '—' }} / {{ shots.length }} ·
                {{ formatMsPrecise(currentTimeMs) }}
              </div>
            </div>
            <div class="vc-player__toolbar">
              <div class="vc-player__controls">
                <ElButton size="small" @click="jump(-1)">上一镜</ElButton>
                <ElButton size="small" type="primary" @click="togglePlay">
                  {{ playing ? '暂停' : '播放' }}
                </ElButton>
                <ElButton size="small" @click="jump(1)">下一镜</ElButton>
                <ElButton size="small" @click="subtitlesOn = !subtitlesOn">
                  {{ subtitlesOn ? '关闭字幕' : '显示字幕' }}
                </ElButton>
                <ElButton size="small" @click="muted = !muted">
                  {{ muted ? '取消静音（无音轨）' : '静音' }}
                </ElButton>
                <ElButton size="small" @click="fullscreen">全屏</ElButton>
              </div>
              <div class="vc-player__scrub">
                <span>{{ formatMs(currentTimeMs) }}</span>
                <input
                  :max="totalMs"
                  :min="0"
                  :step="100"
                  :value="currentTimeMs"
                  aria-label="预演进度"
                  type="range"
                  @input="
                    seek(Number(($event.target as HTMLInputElement).value))
                  "
                />
                <span>{{ formatMs(totalMs) }}</span>
              </div>
              <p class="vc-player__note">
                无音频素材：M2 不生成配音，仅播放字幕与图片时间线。
              </p>
            </div>
          </div>

          <section class="vc-animatic__panel vc-animatic__timeline">
            <div class="vc-animatic__panel-head">
              <h3>总时间轴</h3>
              <p class="vc-m2-muted">
                {{ shots.length }} 镜头 · 净时长 {{ formatMs(totalMs) }} ·
                默认无交叠转场
              </p>
            </div>
            <div class="vc-animatic__segments">
              <button
                v-for="segment in timeline.segments"
                :key="segment.shotId"
                :class="{
                  'is-active': segment.shotId === currentSegment?.shotId,
                }"
                :style="{
                  width: `${Math.max(3, (segment.durationMs / Math.max(1, totalMs)) * 100)}%`,
                }"
                type="button"
                @click="seek(segment.startMs)"
              >
                {{
                  shots.find((shot) => shot.shotId === segment.shotId)?.order
                }}
              </button>
            </div>
          </section>

          <section class="vc-animatic__panel vc-animatic__feedback">
            <div class="vc-animatic__panel-head">
              <h3>时间戳反馈</h3>
              <p class="vc-m2-muted">
                记录到当前时间点 · {{ formatMsPrecise(currentTimeMs) }}
              </p>
            </div>
            <div class="vc-animatic__input">
              <ElInput
                v-model="feedback"
                placeholder="例如：镜头 07 太快，纸张破碎动作看不清"
              />
              <ElButton
                :disabled="!canEdit && !isReviewer"
                :loading="acting"
                type="primary"
                @click="submitFeedback"
              >
                记录反馈
              </ElButton>
            </div>
            <p
              v-if="(snapshot.comments?.length ?? 0) === 0"
              class="vc-animatic__empty"
            >
              暂无时间戳反馈
            </p>
            <ul v-else class="vc-animatic__comments">
              <li v-for="comment in snapshot.comments" :key="comment.id">
                <strong
                  >{{ formatMs(comment.atMs) }} · {{ comment.shotId }}</strong
                >
                <span>{{ comment.text }}</span>
              </li>
            </ul>
          </section>
        </main>

        <aside class="vc-animatic__side">
          <section class="vc-animatic__panel">
            <div class="vc-animatic__panel-head">
              <h3>预演信息</h3>
              <p class="vc-m2-muted">当前快照引用</p>
            </div>
            <div class="vc-animatic__meta">
              <div>
                <span>快照</span>
                <code :title="snapshot.id">{{ snapshot.id }}</code>
              </div>
              <div>
                <span>分镜</span>
                <code :title="snapshot.storyboardRevisionId">{{
                  snapshot.storyboardRevisionId
                }}</code>
              </div>
              <div>
                <span>视觉规范</span>
                <code :title="snapshot.visualBibleVersionId">{{
                  snapshot.visualBibleVersionId
                }}</code>
              </div>
              <div>
                <span>时长</span>
                <strong
                  >{{ formatMs(totalMs) }}
                  <em>（{{ snapshot.totalDurationMs }}ms）</em></strong
                >
              </div>
              <div>
                <span>状态</span>
                <strong>{{ snapshot.status }}</strong>
              </div>
            </div>
            <ElButton
              v-if="approved && !stale"
              class="vc-animatic__side-btn"
              type="primary"
              @click="$router.push(`/studio/${projectId}/generate`)"
            >
              进入 M3
            </ElButton>
          </section>

          <section class="vc-animatic__panel">
            <div class="vc-animatic__panel-head">
              <h3>质量提醒</h3>
              <p class="vc-m2-muted">确认前快速自检</p>
            </div>
            <ul class="vc-animatic__checklist">
              <li>前 3 秒必须有钩子</li>
              <li>连续 20 秒无新信息需重新检查</li>
              <li>品牌/Logo 真实素材缺失会影响可信度</li>
              <li>确认后修改上游会使本快照过期</li>
            </ul>
          </section>

          <section class="vc-animatic__panel">
            <div class="vc-animatic__panel-head">
              <h3>返回修改</h3>
              <p class="vc-m2-muted">上游变更会使预演过期</p>
            </div>
            <div class="vc-animatic__nav">
              <ElButton
                class="vc-animatic__side-btn"
                @click="$router.push(`/studio/${projectId}/storyboard`)"
              >
                回到分镜工作台
              </ElButton>
              <ElButton
                class="vc-animatic__side-btn"
                @click="$router.push(`/studio/${projectId}/script`)"
              >
                回到剧本
              </ElButton>
            </div>
          </section>
        </aside>
      </div>

      <div v-if="handoff" class="vc-m2-footer">
        <span class="vc-m2-muted"
          >已生成 M2 → M3 交接引用 · 15 镜头 · MockOnly</span
        >
        <div class="vc-m2-footer__actions">
          <ElButton
            type="primary"
            @click="$router.push(`/studio/${projectId}/generate`)"
          >
            查看 M3 交接
          </ElButton>
        </div>
      </div>
    </template>

    <StaleImpactDrawer
      v-model:open="staleOpen"
      :items="staleImpact?.items ?? []"
      :summary="staleImpact?.summary"
    />
  </div>
</template>

<style scoped>
.vc-animatic {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 88px;
}

.vc-m2-loading {
  padding: 24px;
  font-size: 13px;
  color: var(--vc-text-weak);
  background: var(--el-bg-color-overlay, #fff);
  border: 1px dashed var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-animatic__hero {
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

.vc-animatic__hero-copy {
  min-width: 0;
  max-width: 760px;
}

.vc-m2-eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-brand);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.vc-animatic__hero h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
  letter-spacing: -0.02em;
}

.vc-m2-sub,
.vc-m2-muted {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
}

.vc-m2-head__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.vc-animatic__panel {
  box-sizing: border-box;
  padding: 16px 18px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-animatic__panel-head {
  margin-bottom: 12px;
}

.vc-animatic__panel-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-animatic__panel-head .vc-m2-muted {
  margin-top: 4px;
}

.vc-m2-empty,
.vc-m2-error {
  padding: 28px 20px;
  text-align: center;
}

.vc-m2-empty h2,
.vc-m2-error h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.vc-animatic__stale {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--vc-mock-banner-bg, #fff8eb);
  border: 1px solid var(--vc-mock-banner-border, #f0d9a8);
  border-radius: var(--vc-border-radius);
}

.vc-animatic__stale strong {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 650;
  color: #8a4b00;
}

.vc-animatic__stale p {
  max-width: 68ch;
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #8a4b00;
}

.vc-animatic__grid {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 260px;
  gap: 16px;
  align-items: start;
}

.vc-animatic__shots {
  position: sticky;
  top: 12px;
  max-height: calc(100vh - 140px);
  overflow: auto;
}

.vc-animatic__shot-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vc-animatic__shot-list button {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 10px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease;
}

.vc-animatic__shot-list button:hover {
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
}

.vc-animatic__shot-list button.is-active {
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand);
  box-shadow: 0 0 0 2px rgb(103 87 215 / 14%);
}

.vc-animatic__shot-index {
  flex-shrink: 0;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-brand);
}

.vc-animatic__shot-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-regular, #4b5563);
  white-space: nowrap;
}

.vc-animatic__main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.vc-player {
  overflow: hidden;
  background: #151821;
  border: 1px solid #242836;
  border-radius: var(--vc-border-radius);
}

.vc-player__stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 480px;
  margin: 0 auto;
  overflow: hidden;
  background: #0c0e14;
}

.vc-player__stage img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.vc-player__empty {
  padding: 24px;
  font-size: 13px;
  color: #8b93a7;
}

.vc-player__subtitle {
  position: absolute;
  right: 8%;
  bottom: 8%;
  left: 8%;
  padding: 8px 12px;
  font-size: 15px;
  line-height: 1.45;
  color: #fff;
  text-align: center;
  background: rgb(0 0 0 / 55%);
  border-radius: 8px;
}

.vc-player__hud {
  position: absolute;
  top: 10px;
  left: 12px;
  padding: 4px 8px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: rgb(255 255 255 / 78%);
  background: rgb(0 0 0 / 35%);
  border-radius: 6px;
}

.vc-player__toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px 14px;
}

.vc-player__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.vc-player__scrub {
  display: flex;
  gap: 10px;
  align-items: center;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: #aeb6c8;
}

.vc-player__scrub input {
  flex: 1;
  min-width: 0;
  accent-color: var(--vc-brand);
}

.vc-player__note {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #8b93a7;
}

.vc-animatic__segments {
  display: flex;
  gap: 3px;
  height: 44px;
  overflow: hidden;
  border-radius: 10px;
}

.vc-animatic__segments button {
  min-width: 12px;
  font-size: 10px;
  font-weight: 650;
  color: var(--el-text-color-regular, #4b5563);
  cursor: pointer;
  background: var(--vc-brand-soft, #f1effc);
  border: 0;
  transition:
    background 0.16s ease,
    color 0.16s ease;
}

.vc-animatic__segments button:hover {
  background: var(--vc-brand-border, #d7d1f5);
}

.vc-animatic__segments button.is-active {
  color: #fff;
  background: var(--vc-brand);
}

.vc-animatic__input {
  display: flex;
  gap: 8px;
  align-items: center;
}

.vc-animatic__input :deep(.el-input) {
  flex: 1;
}

.vc-animatic__empty {
  padding: 12px;
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--vc-text-weak);
  text-align: center;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-animatic__comments {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 12px 0 0;
  list-style: none;
}

.vc-animatic__comments li {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-animatic__comments strong {
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-text-weak);
}

.vc-animatic__comments span {
  font-size: 12px;
  line-height: 1.55;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-animatic__side {
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vc-animatic__meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vc-animatic__meta > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-animatic__meta span {
  font-size: 11px;
  color: var(--vc-text-weak);
}

.vc-animatic__meta code,
.vc-animatic__meta strong {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-primary, #1f2937);
  word-break: break-all;
  overflow-wrap: anywhere;
}

.vc-animatic__meta code {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-animatic__meta strong em {
  font-style: normal;
  font-weight: 500;
  color: var(--vc-text-weak);
}

.vc-animatic__checklist {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-animatic__checklist li {
  position: relative;
  padding: 8px 10px 8px 28px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--el-text-color-regular, #4b5563);
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-animatic__checklist li::before {
  position: absolute;
  top: 8px;
  left: 10px;
  width: 12px;
  height: 12px;
  content: '';
  border: 1.5px solid var(--vc-brand-border);
  border-radius: 4px;
}

.vc-animatic__nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vc-animatic__side-btn {
  width: 100%;
}

.vc-m2-footer {
  position: sticky;
  bottom: 12px;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgb(255 255 255 / 92%);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
  backdrop-filter: blur(8px);
}

.vc-m2-footer .vc-m2-muted {
  margin: 0;
}

.vc-m2-footer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 1280px) {
  .vc-animatic__grid {
    grid-template-columns: 1fr;
  }

  .vc-animatic__shots,
  .vc-animatic__side {
    position: static;
    max-height: none;
  }
}

@media (max-width: 720px) {
  .vc-animatic__input {
    flex-direction: column;
    align-items: stretch;
  }

  .vc-m2-footer {
    bottom: 8px;
  }

  .vc-m2-footer__actions {
    width: 100%;
  }

  .vc-m2-footer__actions :deep(.el-button) {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vc-animatic__shot-list button,
  .vc-animatic__segments button {
    transition: none;
  }
}
</style>
