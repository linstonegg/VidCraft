<script lang="ts" setup>
import type {
  AssetRef,
  AssetUsageRef,
  ShotRevision,
  VisualBibleRevision,
} from '#/types/creative-video';

import { computed, onMounted, ref, watch } from 'vue';

import { getAssetUsage, getIngestion } from '#/api/creative-video';

const props = defineProps<{
  bible: null | VisualBibleRevision;
  projectId: string;
  shots: ShotRevision[];
}>();

const emit = defineEmits<{ selectShot: [shotId: string] }>();

const characters = computed(() =>
  (props.bible?.characters ?? []).map((character) => ({
    label: character.name,
    shots: props.shots.filter((shot) =>
      (shot.characterIds ?? []).includes(character.id),
    ),
  })),
);

const scenes = computed(() =>
  (props.bible?.scenes ?? []).map((scene) => ({
    label: scene.name,
    shots: props.shots.filter((shot) =>
      (shot.sceneIds ?? []).includes(scene.id),
    ),
  })),
);

const brandAssets = computed(() => props.bible?.brandLogoAssetIds ?? []);
const brandUsage = ref<Record<string, AssetUsageRef[]>>({});
const allAssets = ref<Array<{ asset: AssetRef; usage: AssetUsageRef[] }>>([]);

async function loadBrandUsage() {
  const next: Record<string, AssetUsageRef[]> = {};
  for (const id of brandAssets.value) {
    try {
      next[id] = await getAssetUsage(props.projectId, id);
    } catch {
      next[id] = [];
    }
  }
  brandUsage.value = next;
}

async function loadAllAssets() {
  try {
    const ingestion = await getIngestion(props.projectId);
    allAssets.value = await Promise.all(
      ingestion.assets.map(async (asset) => ({
        asset,
        usage: await getAssetUsage(props.projectId, asset.id).catch(() => []),
      })),
    );
  } catch {
    allAssets.value = [];
  }
}

const nodeOffsets = ref<Record<string, { x: number; y: number }>>({});
const assetNodeKey = (id: string) => `asset:${id}`;
const shotNodeKey = (id: string) => `shot:${id}`;
function nodeOffset(key: string) {
  return nodeOffsets.value[key] ?? { x: 0, y: 0 };
}

const layoutMode = ref<'FORCE' | 'LAYERED' | 'RADIAL'>('LAYERED');

const graph = computed(() => {
  const shotIds = [
    ...new Set(
      allAssets.value.flatMap((entry) =>
        entry.usage.map((usage) => usage.targetId),
      ),
    ),
  ];
  const assetNodes: Array<{
    id: string;
    key: string;
    label: string;
    x: number;
    y: number;
  }> = [];
  const shotNodes: Array<{
    id: string;
    key: string;
    label: string;
    x: number;
    y: number;
  }> = [];

  if (layoutMode.value === 'FORCE') {
    const forceNodes = [
      ...allAssets.value.map((entry, index) => ({
        id: entry.asset.id,
        key: assetNodeKey(entry.asset.id),
        label: entry.asset.filename,
        type: 'asset' as const,
        x: 20 + (index % 2) * 130,
        y: 30 + index * 32,
      })),
      ...shotIds.map((id, index) => ({
        id,
        key: shotNodeKey(id),
        label: props.shots.find((shot) => shot.shotId === id)?.title ?? id,
        type: 'shot' as const,
        x: 240,
        y: 30 + index * 32,
      })),
    ];
    const links = allAssets.value.flatMap((entry) =>
      entry.usage.flatMap((usage) => {
        const asset = forceNodes.find(
          (node) => node.type === 'asset' && node.id === entry.asset.id,
        );
        const shot = forceNodes.find(
          (node) => node.type === 'shot' && node.id === usage.targetId,
        );
        return asset && shot ? [{ asset, shot }] : [];
      }),
    );
    for (let iteration = 0; iteration < 140; iteration += 1) {
      const forces = forceNodes.map(() => ({ x: 0, y: 0 }));
      const addForce = (index: number, x: number, y: number) => {
        const force = forces[index];
        if (!force) return;
        force.x += x;
        force.y += y;
      };
      for (let left = 0; left < forceNodes.length; left += 1) {
        for (let right = left + 1; right < forceNodes.length; right += 1) {
          const a = forceNodes[left];
          const b = forceNodes[right];
          if (!a || !b) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.max(24, Math.hypot(dx, dy));
          const strength = 1400 / (distance * distance);
          const fx = (dx / distance) * strength;
          const fy = (dy / distance) * strength;
          addForce(left, fx, fy);
          addForce(right, -fx, -fy);
          if (Math.abs(dx) < 126 && Math.abs(dy) < 28) {
            const push = (28 - Math.abs(dy)) / 2 + 0.5;
            addForce(left, 0, dy >= 0 ? push : -push);
            addForce(right, 0, dy >= 0 ? -push : push);
          }
        }
      }
      for (const link of links) {
        const left = forceNodes.indexOf(link.asset);
        const right = forceNodes.indexOf(link.shot);
        if (left === -1 || right === -1) continue;
        const dx = link.shot.x - link.asset.x;
        const dy = link.shot.y - link.asset.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const spring = (distance - 150) * 0.012;
        addForce(left, (dx / distance) * spring, (dy / distance) * spring);
        addForce(right, -(dx / distance) * spring, -(dy / distance) * spring);
      }
      forceNodes.forEach((node, index) => {
        addForce(index, (210 - node.x) * 0.002, (180 - node.y) * 0.002);
        const force = forces[index] ?? { x: 0, y: 0 };
        node.x = Math.min(
          296,
          Math.max(4, node.x + Math.max(-6, Math.min(6, force.x))),
        );
        node.y = Math.min(
          320,
          Math.max(18, node.y + Math.max(-6, Math.min(6, force.y))),
        );
      });
    }
    forceNodes.forEach((node) => {
      const offset = nodeOffset(node.key);
      const target = node.type === 'asset' ? assetNodes : shotNodes;
      target.push({
        id: node.id,
        key: node.key,
        label: node.label,
        x: node.x + offset.x,
        y: node.y + offset.y,
      });
    });
  } else if (layoutMode.value === 'RADIAL') {
    const centerX = 210;
    const centerY = 160;
    const assetRadius = 120;
    const shotRadius = 112;
    allAssets.value.forEach((entry, index) => {
      const angle =
        allAssets.value.length === 1
          ? Math.PI
          : Math.PI *
            (2 / 3 + (index / (allAssets.value.length - 1)) * (2 / 3));
      const offset = nodeOffset(assetNodeKey(entry.asset.id));
      assetNodes.push({
        id: entry.asset.id,
        key: assetNodeKey(entry.asset.id),
        label: entry.asset.filename,
        x: centerX + Math.cos(angle) * assetRadius - 59 + offset.x,
        y: centerY + Math.sin(angle) * assetRadius - 12 + offset.y,
      });
    });
    shotIds.forEach((id, index) => {
      const angle =
        shotIds.length === 1
          ? 0
          : -Math.PI / 3 + ((index / (shotIds.length - 1)) * (Math.PI * 2)) / 3;
      const offset = nodeOffset(shotNodeKey(id));
      shotNodes.push({
        id,
        key: shotNodeKey(id),
        label: props.shots.find((shot) => shot.shotId === id)?.title ?? id,
        x: centerX + Math.cos(angle) * shotRadius - 59 + offset.x,
        y: centerY + Math.sin(angle) * shotRadius - 11 + offset.y,
      });
    });
  } else {
    const kinds = [
      ...new Set(allAssets.value.map((entry) => entry.asset.kind)),
    ];
    const columns = kinds.slice(0, 2);
    const rowByColumn = new Map<string, number>();
    allAssets.value.forEach((entry) => {
      const column = columns.indexOf(entry.asset.kind) === 1 ? 1 : 0;
      const row = rowByColumn.get(String(column)) ?? 0;
      rowByColumn.set(String(column), row + 1);
      const offset = nodeOffset(assetNodeKey(entry.asset.id));
      assetNodes.push({
        id: entry.asset.id,
        key: assetNodeKey(entry.asset.id),
        label: entry.asset.filename,
        x: 4 + column * 132 + offset.x,
        y: 24 + row * 34 + offset.y,
      });
    });
    shotIds.forEach((id, index) => {
      const offset = nodeOffset(shotNodeKey(id));
      shotNodes.push({
        id,
        key: shotNodeKey(id),
        label: props.shots.find((shot) => shot.shotId === id)?.title ?? id,
        x: 288 + offset.x,
        y: 20 + index * 28 + offset.y,
      });
    });
  }

  const edges = assetNodes.flatMap((node) => {
    const usage =
      allAssets.value.find((entry) => entry.asset.id === node.id)?.usage ?? [];
    return usage.flatMap((item) => {
      const target = shotNodes.find((shot) => shot.id === item.targetId);
      return target
        ? [
            {
              fromX: node.x + 118,
              fromY: node.y,
              toX: target.x,
              toY: target.y,
            },
          ]
        : [];
    });
  });
  return {
    assetNodes,
    edges,
    height:
      layoutMode.value === 'RADIAL' || layoutMode.value === 'FORCE'
        ? 360
        : Math.max(120, assetNodes.length * 34, shotNodes.length * 28),
    shotNodes,
  };
});

const graphView = ref({ scale: 1, x: 0, y: 0 });
const dragState = ref<null | {
  originX: number;
  originY: number;
  startX: number;
  startY: number;
}>(null);
function startGraphDrag(event: PointerEvent) {
  if (event.button !== 0) return;
  dragState.value = {
    originX: graphView.value.x,
    originY: graphView.value.y,
    startX: event.clientX,
    startY: event.clientY,
  };
  (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
}
function moveGraphDrag(event: PointerEvent) {
  if (!dragState.value) return;
  graphView.value = {
    ...graphView.value,
    x: dragState.value.originX + event.clientX - dragState.value.startX,
    y: dragState.value.originY + event.clientY - dragState.value.startY,
  };
}
function endGraphDrag() {
  dragState.value = null;
}

function startNodeDrag(event: PointerEvent, key: string) {
  if (event.button !== 0) return;
  event.stopPropagation();
  event.preventDefault();
  const origin = nodeOffset(key);
  const startX = event.clientX;
  const startY = event.clientY;
  const move = (moveEvent: PointerEvent) => {
    nodeOffsets.value = {
      ...nodeOffsets.value,
      [key]: {
        x: origin.x + (moveEvent.clientX - startX) / graphView.value.scale,
        y: origin.y + (moveEvent.clientY - startY) / graphView.value.scale,
      },
    };
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

function autoLayoutGraph() {
  nodeOffsets.value = {};
  resetGraph();
}

function setGraphLayout(mode: 'FORCE' | 'LAYERED' | 'RADIAL') {
  layoutMode.value = mode;
  nodeOffsets.value = {};
  resetGraph();
}

function zoomGraph(delta: number) {
  graphView.value = {
    ...graphView.value,
    scale: Math.min(2.5, Math.max(0.5, graphView.value.scale + delta * 0.15)),
  };
}
function resetGraph() {
  graphView.value = { scale: 1, x: 0, y: 0 };
}

onMounted(() => {
  void loadBrandUsage();
  void loadAllAssets();
});
watch(brandAssets, loadBrandUsage);
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <section class="vc-relations">
    <header class="vc-relations__head">
      <div>
        <h3>资产 / 角色关系</h3>
        <p class="vc-relations__desc">
          从 Visual Bible 与镜头引用派生；点击镜头编号只定位，不修改正式绑定。
        </p>
      </div>
      <span class="vc-relations__badge">只读索引</span>
    </header>

    <div class="vc-relations__section">
      <h4 class="vc-relations__section-title">角色与场景引用</h4>
      <div class="vc-relations__index">
        <div
          v-for="item in characters"
          :key="`char-${item.label}`"
          class="vc-relations__group"
        >
          <div class="vc-relations__group-label">
            <span class="vc-relations__kind">角色</span>
            <strong>{{ item.label }}</strong>
          </div>
          <div class="vc-relations__chips">
            <button
              v-for="shot in item.shots"
              :key="shot.shotId"
              type="button"
              @click="emit('selectShot', shot.shotId)"
            >
              {{ String(shot.order).padStart(2, '0') }}
            </button>
            <span v-if="item.shots.length === 0" class="vc-relations__empty"
              >暂无镜头引用</span
            >
          </div>
        </div>

        <div
          v-for="item in scenes"
          :key="`scene-${item.label}`"
          class="vc-relations__group"
        >
          <div class="vc-relations__group-label">
            <span class="vc-relations__kind vc-relations__kind--scene"
              >场景</span
            >
            <strong>{{ item.label }}</strong>
          </div>
          <div class="vc-relations__chips">
            <button
              v-for="shot in item.shots"
              :key="shot.shotId"
              type="button"
              @click="emit('selectShot', shot.shotId)"
            >
              {{ String(shot.order).padStart(2, '0') }}
            </button>
            <span v-if="item.shots.length === 0" class="vc-relations__empty"
              >暂无镜头引用</span
            >
          </div>
        </div>
      </div>
    </div>

    <div v-if="graph.assetNodes.length > 0" class="vc-relations__section">
      <div class="vc-relations__section-head">
        <h4 class="vc-relations__section-title">关系图</h4>
        <div class="vc-relations__graph-controls">
          <button aria-label="放大关系图" type="button" @click="zoomGraph(1)">
            +
          </button>
          <button aria-label="缩小关系图" type="button" @click="zoomGraph(-1)">
            −
          </button>
          <button
            :class="{ 'is-active': layoutMode === 'LAYERED' }"
            aria-label="分层布局关系图"
            type="button"
            @click="setGraphLayout('LAYERED')"
          >
            分层
          </button>
          <button
            :class="{ 'is-active': layoutMode === 'RADIAL' }"
            aria-label="环绕布局关系图"
            type="button"
            @click="setGraphLayout('RADIAL')"
          >
            环绕
          </button>
          <button
            :class="{ 'is-active': layoutMode === 'FORCE' }"
            aria-label="力导向布局关系图"
            type="button"
            @click="setGraphLayout('FORCE')"
          >
            力导向
          </button>
          <button
            aria-label="自动布局关系图"
            type="button"
            @click="autoLayoutGraph"
          >
            自动布局
          </button>
          <button aria-label="重置关系图" type="button" @click="resetGraph">
            重置
          </button>
        </div>
      </div>
      <div class="vc-relations__graph-canvas">
        <svg
          :viewBox="`0 0 420 ${graph.height}`"
          data-testid="asset-graph"
          role="img"
          @pointerdown="startGraphDrag"
          @pointerleave="endGraphDrag"
          @pointermove="moveGraphDrag"
          @pointerup="endGraphDrag"
          @wheel.prevent="zoomGraph($event.deltaY < 0 ? 1 : -1)"
        >
          <g
            :transform="`translate(${graphView.x} ${graphView.y}) scale(${graphView.scale})`"
          >
            <line
              v-for="(edge, index) in graph.edges"
              :key="index"
              :x1="edge.fromX"
              :x2="edge.toX"
              :y1="edge.fromY"
              :y2="edge.toY"
              stroke="#c4b5fd"
              stroke-width="1.5"
            />
            <g
              v-for="node in graph.assetNodes"
              :key="node.id"
              :data-node-key="node.key"
              class="vc-relations__graph-asset"
              @pointerdown.stop="startNodeDrag($event, node.key)"
            >
              <rect
                :x="node.x"
                :y="node.y - 12"
                fill="#eef2ff"
                height="24"
                rx="6"
                stroke="#c7d2fe"
                width="118"
              />
              <text
                :x="node.x + 6"
                :y="node.y + 4"
                fill="#4338ca"
                font-size="9"
              >
                {{ node.label.slice(0, 16) }}
              </text>
            </g>
            <g
              v-for="node in graph.shotNodes"
              :key="node.id"
              :data-node-key="node.key"
              class="vc-relations__graph-shot"
              @click="emit('selectShot', node.id)"
              @pointerdown.stop="startNodeDrag($event, node.key)"
            >
              <rect
                :x="node.x"
                :y="node.y - 11"
                fill="#fff7ed"
                height="22"
                rx="6"
                stroke="#fdba74"
                width="126"
              />
              <text
                :x="node.x + 6"
                :y="node.y + 3"
                fill="#9a3412"
                font-size="9"
              >
                {{ node.label.slice(0, 18) }}
              </text>
            </g>
          </g>
        </svg>
      </div>
    </div>

    <div class="vc-relations__section">
      <h4 class="vc-relations__section-title">全部资产关系</h4>
      <div v-if="allAssets.length === 0" class="vc-relations__empty-block">
        暂无资产引用记录
      </div>
      <div v-else class="vc-relations__asset-list">
        <article
          v-for="entry in allAssets"
          :key="entry.asset.id"
          class="vc-relations__asset-card"
        >
          <div class="vc-relations__asset-main">
            <strong>{{ entry.asset.filename }}</strong>
            <code>{{ entry.asset.id }}</code>
          </div>
          <div class="vc-relations__usage">
            <button
              v-for="usage in entry.usage"
              :key="usage.id"
              type="button"
              @click="
                usage.targetType === 'SHOT_REVISION' &&
                emit('selectShot', usage.targetId)
              "
            >
              <span>{{ usage.targetType }}</span>
              <em>{{ usage.targetId }}</em>
            </button>
            <span v-if="entry.usage.length === 0" class="vc-relations__empty"
              >暂无引用</span
            >
          </div>
        </article>
      </div>
    </div>

    <div v-if="brandAssets.length > 0" class="vc-relations__section">
      <h4 class="vc-relations__section-title">品牌素材</h4>
      <div class="vc-relations__asset-list">
        <article
          v-for="id in brandAssets"
          :key="id"
          class="vc-relations__asset-card"
        >
          <div class="vc-relations__asset-main">
            <strong>品牌 Logo</strong>
            <code>{{ id }}</code>
          </div>
          <div class="vc-relations__usage">
            <button
              v-for="usage in brandUsage[id] ?? []"
              :key="usage.id"
              type="button"
              @click="
                usage.targetType === 'SHOT_REVISION' &&
                emit('selectShot', usage.targetId)
              "
            >
              <span>{{ usage.targetType }}</span>
              <em>{{ usage.targetId }}</em>
            </button>
            <span
              v-if="(brandUsage[id] ?? []).length === 0"
              class="vc-relations__empty"
              >暂无引用</span
            >
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.vc-relations {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-relations__head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
}

.vc-relations__head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-relations__desc {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--vc-text-weak);
}

.vc-relations__badge {
  flex: none;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-brand);
  white-space: nowrap;
  background: var(--vc-brand-soft);
  border: 1px solid var(--vc-brand-border);
  border-radius: 999px;
}

.vc-relations__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--vc-border);
}

.vc-relations__section-head {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.vc-relations__section-title {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--vc-text-weak);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.vc-relations__index {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vc-relations__group {
  padding: 10px 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-relations__group-label {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
}

.vc-relations__group-label strong {
  font-size: 12px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-relations__kind {
  display: inline-flex;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 650;
  color: var(--vc-brand);
  background: #fff;
  border: 1px solid var(--vc-brand-border);
  border-radius: 999px;
}

.vc-relations__kind--scene {
  color: #9a3412;
  border-color: #fdba74;
}

.vc-relations__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.vc-relations__chips button {
  min-width: 28px;
  height: 26px;
  padding: 0 6px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-brand);
  cursor: pointer;
  background: #fff;
  border: 1px solid var(--vc-brand-border);
  border-radius: 8px;
  transition:
    background 0.16s ease,
    color 0.16s ease,
    border-color 0.16s ease;
}

.vc-relations__chips button:hover {
  color: #fff;
  background: var(--vc-brand);
  border-color: var(--vc-brand);
}

.vc-relations__empty {
  font-size: 11px;
  color: var(--vc-text-weak);
}

.vc-relations__empty-block {
  padding: 12px;
  font-size: 12px;
  color: var(--vc-text-weak);
  text-align: center;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-relations__graph-controls {
  display: flex;
  gap: 4px;
}

.vc-relations__graph-controls button {
  min-width: 28px;
  height: 26px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 650;
  color: var(--el-text-color-regular, #4b5563);
  cursor: pointer;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-border);
  border-radius: 8px;
}

.vc-relations__graph-controls button.is-active {
  color: #fff;
  background: var(--el-color-primary);
}

.vc-relations__graph-controls button:hover {
  color: var(--vc-brand);
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
}

.vc-relations__graph-canvas {
  overflow: hidden;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-border);
  border-radius: 10px;
}

.vc-relations__graph-canvas svg {
  display: block;
  width: 100%;
  min-height: 140px;
  touch-action: none;
  cursor: grab;
  user-select: none;
  background: #fff;
}

.vc-relations__graph-asset,
.vc-relations__graph-shot {
  cursor: grab;
}

.vc-relations__graph-shot {
  cursor: pointer;
}

.vc-relations__asset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vc-relations__asset-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-relations__asset-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.vc-relations__asset-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
  white-space: nowrap;
}

.vc-relations__asset-main code {
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: ui-monospace, monospace;
  font-size: 10px;
  color: var(--vc-text-weak);
  white-space: nowrap;
}

.vc-relations__usage {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.vc-relations__usage button {
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
  align-items: flex-start;
  max-width: 100%;
  padding: 6px 8px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid var(--vc-border);
  border-radius: 8px;
}

.vc-relations__usage button:hover {
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
}

.vc-relations__usage span {
  font-size: 10px;
  font-weight: 650;
  color: var(--vc-brand);
}

.vc-relations__usage em {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 10px;
  font-style: normal;
  color: var(--vc-text-weak);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .vc-relations__chips button {
    transition: none;
  }
}
</style>
