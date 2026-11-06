<script setup lang="ts">
import {ref,watch,onUnmounted} from 'vue';
import {ElButton} from 'element-plus';
const props=defineProps<{src:string;label?:string}>();const video=ref<HTMLVideoElement>();const failed=ref(false);const duration=ref(0);watch(()=>props.src,()=>failed.value=false);onUnmounted(()=>video.value?.pause());
async function play(){if(!video.value||failed.value)throw Error('媒体尚未就绪');await video.value.play();}
function pause(){video.value?.pause();}
function seek(time:number){if(video.value&&Number.isFinite(time))video.value.currentTime=Math.min(Math.max(0,time),Number.isFinite(video.value.duration)?video.value.duration:time);}
defineExpose({play,pause,seek,duration});
</script>
<template><div class="mock-video"><video v-if="!failed" ref="video" :src="src" controls preload="metadata" playsinline :aria-label="label || 'Mock 演示视频'" @error="failed=true" @loadedmetadata="duration=video?.duration || 0"/><div v-else role="alert"><p>演示媒体无法播放，请检查文件或重试。</p><ElButton @click="failed=false">重新加载</ElButton></div><small>预置程序演示片段 · 非 AI 生成结果，长度与当前镜头报价无关</small></div></template>
<style scoped>.mock-video{background:#12182a;border-radius:10px;padding:10px;color:#b8c1d8}video{width:100%;max-height:360px}small{display:block;padding:10px;font-size:11px}</style>
