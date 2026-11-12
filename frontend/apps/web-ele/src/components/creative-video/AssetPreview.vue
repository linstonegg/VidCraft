<script setup lang="ts">
import type { AssetRef } from '#/types/creative-video';

import { computed, ref, watch } from 'vue';

import { ElAlert, ElMessage } from 'element-plus';

import { useCreativeVideoIngestionStore } from '#/stores/creative-video';
const props = defineProps<{
  asset: AssetRef;
  end?: number;
  start?: number;
  summary?: string;
}>();
const store = useCreativeVideoIngestionStore();
const unsupported = ref(false);
const url = computed(
  () =>
    store.getPreviewUrl(props.asset.id) ||
    (props.asset.previewUrl?.startsWith('/demo-assets/')
      ? props.asset.previewUrl
      : ''),
);
watch(url, () => {
  unsupported.value = false;
});
function reselect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    store.reselectAsset(props.asset, file);
    ElMessage.success('已重新关联本地文件，素材 ID 和来源保持不变');
  } catch (error) {
    ElMessage.error(
      error instanceof Error ? error.message : '无法重新关联文件',
    );
  }
  input.value = '';
}
function seek(event: Event) {
  if (props.start !== undefined)
    (event.target as HTMLVideoElement).currentTime = props.start;
}
function limit(event: Event) {
  const video = event.target as HTMLVideoElement;
  if (props.end !== undefined && video.currentTime >= props.end) video.pause();
}
</script>
<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-media-preview">
    <img
      v-if="url && !unsupported && ['image', 'logo'].includes(asset.kind)"
      :src="url"
      :alt="asset.filename"
      @error="unsupported = true"
    />
    <video
      v-else-if="url && !unsupported && asset.kind === 'video'"
      :src="url"
      controls
      @loadedmetadata="seek"
      @timeupdate="limit"
      @error="unsupported = true"
    ></video>
    <ElAlert
      v-else-if="asset.kind !== 'document'"
      :closable="false"
      :title="
        unsupported
          ? '浏览器不支持预览，文件元数据仍保留'
          : '需要重新选择本地文件（NEEDS_RESELECT）'
      "
      description="仅保存元数据，请选择原本地文件恢复预览，不会新增素材或上传文件内容。"
      type="info"
    />
    <p v-if="asset.kind === 'document'">
      模拟文档摘录：{{ summary || '暂无摘录，未进行真实解析' }}
    </p>
    <p v-if="start !== undefined">
      {{ url ? '证据片段' : '示例时间戳（暂无真实媒体）' }}：{{ start }}s–{{
        end ?? start
      }}s
    </p>
    <label v-if="!url || unsupported"
      >重新选择本地文件
      <input
        type="file"
        :aria-label="`重新选择 ${asset.filename}`"
        @change="reselect"
    /></label>
  </div>
</template>
<style scoped>
.vc-media-preview img,
.vc-media-preview video {
  max-width: 100%;
  max-height: 360px;
}
</style>
