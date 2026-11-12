<script lang="ts" setup>
import type {
  AssetContentVersion,
  AssetRef,
  ShotRevision,
  VisualBibleRevision,
} from '#/types/creative-video';

import { onMounted, ref, watch } from 'vue';

import {
  ElAlert,
  ElButton,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
} from 'element-plus';

import {
  createShotRevision,
  forkVisualBible,
  getAssetContentVersions,
  getIngestion,
  writeAssetReference,
} from '#/api/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';

type PickTarget = ShotRevision | VisualBibleRevision;

const props = defineProps<{
  projectId: string;
  target: PickTarget;
  targetType: 'SHOT_REVISION' | 'VISUAL_BIBLE_REVISION';
}>();
const emit = defineEmits<{ changed: [target: PickTarget] }>();

const assets = ref<AssetRef[]>([]);
const versions = ref<AssetContentVersion[]>([]);
const assetId = ref('');
const versionId = ref('');
const usageRole = ref('品牌视觉参考');
const loading = ref(false);
const adding = ref(false);
const result = ref('');

const currentBindings = () => (props.target as any).assetContentBindings ?? [];
const isShot = () => props.targetType === 'SHOT_REVISION';

async function loadAssets() {
  const ingestion = await getIngestion(props.projectId);
  assets.value = ingestion.assets.filter((asset) =>
    ['image', 'logo'].includes(asset.kind),
  );
  assetId.value = assets.value[0]?.id ?? '';
}

async function loadVersions() {
  versions.value = [];
  versionId.value = '';
  if (!assetId.value) return;
  versions.value = await getAssetContentVersions(
    props.projectId,
    assetId.value,
  );
  versionId.value =
    versions.value.findLast((item) => item.status === 'READY')?.id ?? '';
}

async function addReference() {
  if (!versionId.value) {
    ElMessage.warning('请选择可用内容版本');
    return;
  }
  adding.value = true;
  try {
    let target: any = props.target;
    if (isShot()) {
      const shot = target as ShotRevision;
      if (shot.reviewStatus === 'APPROVED') {
        target = await createShotRevision(props.projectId, shot.shotId, {
          baseRevisionId: shot.id,
          expectedVersion: shot.version,
          patch: {},
        });
      }
    } else if ((target as VisualBibleRevision).status === 'APPROVED') {
      target = await forkVisualBible(props.projectId, target.id);
    }
    const record = await writeAssetReference(props.projectId, assetId.value, {
      assetVersionId: versionId.value,
      targetId: target.id,
      targetRevisionId: target.id,
      targetType: props.targetType,
      usageRole: usageRole.value,
    });
    result.value = `已写入 ${record.targetLabel} 草稿 ${target.id}；旧批准版不变`;
    ElMessage.success(`资产引用已写入${isShot() ? '镜头' : '视觉规范'}草稿`);
    emit('changed', target);
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    adding.value = false;
  }
}

watch(assetId, loadVersions);

onMounted(async () => {
  loading.value = true;
  try {
    await loadAssets();
    await loadVersions();
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <section class="vc-asset-picker">
    <h4>角色/场景/品牌资产引用</h4>
    <ElAlert
      :closable="false"
      show-icon
      title="只能写入视觉规范草稿；已批准版本会先 Fork。不会自动替换旧 Logo 或旧镜头。"
      type="info"
    />
    <div class="vc-asset-picker__form">
      <ElSelect v-model="assetId" :loading="loading" placeholder="选择素材">
        <ElOption
          v-for="asset in assets"
          :key="asset.id"
          :label="asset.filename"
          :value="asset.id"
        />
      </ElSelect>
      <ElSelect v-model="versionId" placeholder="选择内容版本">
        <ElOption
          v-for="version in versions"
          :key="version.id"
          :disabled="version.status !== 'READY'"
          :label="`v${version.contentRevisionNo} · ${version.status}`"
          :value="version.id"
        />
      </ElSelect>
      <ElInput
        v-model="usageRole"
        placeholder="用途：品牌 Logo / 角色参考 / 场景参考"
      />
      <ElButton :loading="adding" type="primary" @click="addReference">
        预览并写入草稿引用
      </ElButton>
    </div>
    <p v-if="result" class="vc-asset-picker__result">{{ result }}</p>
    <ul v-if="currentBindings().length > 0" class="vc-asset-picker__list">
      <li v-for="binding in currentBindings()" :key="binding.assetVersionId">
        {{ binding.usageRole }} · {{ binding.assetId }} ·
        {{ binding.assetVersionId }}
      </li>
    </ul>
  </section>
</template>

<style scoped>
.vc-asset-picker {
  padding-top: 12px;
  margin-top: 14px;
  border-top: 1px solid var(--vc-border);
}

.vc-asset-picker h4 {
  margin: 0 0 8px;
  font-size: 13px;
}

.vc-asset-picker__form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.vc-asset-picker__result {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--el-color-success);
}

.vc-asset-picker__list {
  padding: 0;
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--vc-text-weak);
  word-break: break-all;
  list-style: none;
}
</style>
