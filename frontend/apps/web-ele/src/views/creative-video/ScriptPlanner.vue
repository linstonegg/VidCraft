<script setup lang="ts">
import ResourceRecovery from './ResourceRecovery.vue';
import { resourceApi } from '#/api/creative-video/resources';
import { studioStorage } from '#/api/creative-video/storage';
import { planBeats } from '#/api/creative-video/story';
import type { StoryBeat } from '#/api/creative-video/story';
import { loadScript, saveScript, scriptText } from '#/api/creative-video/script';
import { computed, ref } from 'vue';
import { ElInput, ElInputNumber, ElButton, ElMessage, ElTag } from 'element-plus';
const props=defineProps<{projectId:number;duration:number;title:string;angle:number}>();
const emit=defineEmits<{duration:[number]}>();const document=ref(loadScript(props.projectId));const strategy=ref(document.value.strategy);const beats=ref<StoryBeat[]>(JSON.parse(JSON.stringify(document.value.beats)) as StoryBeat[]);
const creative=JSON.parse(studioStorage.getItem(`vidcraft-creative-${props.projectId}`)||'{}') as {note?:string;understandingRevision?:number};
const total=computed(()=>beats.value.reduce((n,b)=>n+b.seconds,0));const text=computed(()=>scriptText(beats.value));
function dirty(){studioStorage.setItem(`vidcraft-script-dirty-${props.projectId}`,'true');}
const syncStatus=ref('本地草稿');const saving=ref(false);
async function save(){if(saving.value)return;saving.value=true;try{document.value=saveScript(props.projectId,strategy.value,beats.value,props.duration);dirty();syncStatus.value='正在同步剧本';const fingerprint=JSON.stringify(beats.value);const result=await resourceApi.save(props.projectId,'script',{...document.value,targetSeconds:props.duration});if(JSON.stringify(beats.value)!==fingerprint){dirty();syncStatus.value='节拍在同步期间已变化，请重新保存';return;}studioStorage.removeItem(`vidcraft-script-dirty-${props.projectId}`);syncStatus.value=`服务端剧本 R${result.revision} 已保存`;ElMessage.success(syncStatus.value);}catch(e){dirty();syncStatus.value='剧本未同步或校验失败，本地修改保留';ElMessage.warning((e as Error).message);}finally{saving.value=false;}}
function generate(){beats.value=planBeats(props.angle,props.duration,strategy.value==='多章节影片');save();}
function restore(revision:number){const old=document.value.history.find(h=>h.revision===revision);if(!old)return;beats.value=JSON.parse(JSON.stringify(old.beats)) as StoryBeat[];strategy.value=old.strategy;save();}
</script>
<template><section><ResourceRecovery :project-id="projectId" kind="script"/><p role="status">{{ syncStatus }}</p><ElTag>剧本修订 R{{ document.revision }}</ElTag><p>{{ title }} · 引用产品理解 R{{ creative.understandingRevision || 0 }}</p><p v-if="creative.note">创意约束：{{ creative.note }}</p><p v-if="duration>30">当前切口适合30秒，请选择长片适配方式。</p><div v-if="duration>30"><label v-for="s in ['完整故事扩写','多章节影片','保留短片']" :key="s"><input v-model="strategy" type="radio" :value="s" @change="s==='保留短片'&&emit('duration',30)"/>{{ s }}</label></div><p>目标 {{ duration }} 秒 · 剧本 {{ total }} 秒 <ElTag v-if="total!==duration" type="warning">时长不匹配</ElTag></p><ElButton @click="generate">生成故事节拍与剧本（Mock）</ElButton><article v-for="(b,i) in beats" :key="i"><b>故事节拍 {{ i+1 }}</b><ElInput v-model="b.text" type="textarea" @input="dirty" @change="save"/><ElInputNumber v-model="b.seconds" :min="1" :max="300" @change="dirty();save()"/> 秒 <ElButton @click="beats.splice(i,1);dirty()">删除节拍</ElButton></article><ElButton @click="beats.push({text:'新增故事节拍',seconds:5});dirty()">增加节拍</ElButton><ElButton type="primary" @click="save">校验并保存剧本修订</ElButton><details><summary>完整剧本预览（由节拍同步生成）</summary><pre>{{ text }}</pre></details><details><summary>剧本修订历史</summary><div v-for="h in document.history" :key="h.revision"><p>R{{ h.revision }} · {{ h.date }} · {{ h.strategy }}</p><ElButton @click="restore(h.revision)">恢复为新修订</ElButton></div></details></section></template>
<style scoped>section{padding-top:20px}p,label{margin:14px 0;line-height:1.8}label{margin-right:18px}article{border:1px solid var(--el-border-color);border-radius:10px;padding:18px;margin:16px 0}.el-textarea{margin:12px 0}details{margin:20px 0;padding:16px;background:var(--el-fill-color-light)}pre{white-space:pre-wrap;line-height:1.8;margin-top:18px}</style>
