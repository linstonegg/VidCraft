<script setup lang="ts">
import MockVideoPlayer from './MockVideoPlayer.vue';
import { computed, ref, onUnmounted }
from 'vue';
import { ElButton, ElMessage } from 'element-plus';

import type { Version } from '#/api/creative-video/production';
const props=defineProps<{versions:Version[];adopted?:number}>();
const expanded=ref(false);
const players=ref<InstanceType<typeof MockVideoPlayer>[]>([]);const position=ref(0);const duration=computed(()=>{const durations=players.value.map(p=>p.duration).filter(d=>Number.isFinite(d)&&d>0);return durations.length?Math.min(...durations):4;});
async function playBoth(){players.value.forEach(p=>{p.pause();p.seek(position.value);});const results=await Promise.allSettled(players.value.map(p=>p.play()));if(results.some(r=>r.status==='rejected'))ElMessage.warning('部分媒体尚未就绪，请加载后重试');}
function pauseBoth(){players.value.forEach(p=>p.pause());}
function seekBoth(){pauseBoth();players.value.forEach(p=>p.seek(position.value));}
onUnmounted(pauseBoth);
const left=ref(props.adopted||props.versions[0]?.id);const right=ref(props.versions.at(-1)?.id);
const compared=computed(()=>[props.versions.find(v=>v.id===left.value),props.versions.find(v=>v.id===right.value)]);
</script>
<template><details class="compare" :open="expanded"><summary @click.prevent="expanded=!expanded">版本对比（{{ versions.length }} 个候选）</summary><div><ElButton @click="playBoth">同步播放两版</ElButton><ElButton @click="pauseBoth">暂停两版</ElButton><label>共同起点<input v-model.number="position" type="range" min="0" :max="duration" step="0.1" @input="seekBoth"/>{{ position.toFixed(1) }} 秒</label></div><div class="columns"><section v-for="(v,i) in compared" :key="i"><label>{{ i===0?'原版 / 正式版':'候选版' }}<select v-if="i===0" v-model="left"><option v-for="(item,index) in versions" :key="item.id" :value="item.id">V{{ index+1 }} · R{{ item.revision }}</option></select><select v-else v-model="right"><option v-for="(item,index) in versions" :key="item.id" :value="item.id">V{{ index+1 }} · R{{ item.revision }}</option></select></label><template v-if="v"><MockVideoPlayer ref="players" :src="v.videoUrl || (i===0?'/mock-media/demo-a.mp4':'/mock-media/demo-b.mp4')" :label="`候选 ${v.id} 演示媒体`"/><p>候选 #{{ v.id }} · 分镜 R{{ v.revision }}</p><p>{{ v.prompt }}</p><strong>{{ v.rejected?'已拒绝':v.id===adopted?'当前正式引用':'待审候选' }}</strong></template></section></div><p>可同步启动、暂停或定位两侧预置演示媒体；对应文字为候选生成时的输入快照。</p></details></template>
<style scoped>.compare{margin:20px 0;padding:16px;border:1px solid var(--el-border-color);border-radius:10px}.columns{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:16px}section{background:var(--el-fill-color-light);padding:16px;border-radius:8px}p{line-height:1.8;margin:12px 0;color:var(--el-text-color-secondary)}select{margin-left:10px}@media(max-width:700px){.columns{grid-template-columns:1fr}}</style>
