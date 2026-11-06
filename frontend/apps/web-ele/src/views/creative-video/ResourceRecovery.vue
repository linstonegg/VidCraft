<script setup lang="ts">
import {studioStorage} from '#/api/creative-video/storage';
import {projectDifferences} from '#/api/creative-video/project-diff';
import {ref,computed} from 'vue';
import {ElButton,ElDialog,ElMessage,ElMessageBox} from 'element-plus';
import {resourceApi} from '#/api/creative-video/resources';
import type {ResourceRecord} from '#/api/creative-video/resources';
import {restoreResourceDraft} from '#/api/creative-video/resource-recovery';
import type {ResourceKind} from '#/api/creative-video/resource-recovery';
import {allowed} from '#/api/creative-video/permissions';
const props=defineProps<{projectId:number;kind:ResourceKind}>();const open=ref(false);const loading=ref(false);const records=ref<ResourceRecord[]>([]);const selected=ref(0);
const differences=computed(()=>{const remote=records.value.find(r=>r.revision===selected.value)?.payload??{};const key=props.kind==='storyboard'?`production-${props.projectId}`:`vidcraft-${props.kind}-${props.projectId}`;const local=JSON.parse(studioStorage.getItem(key)||'{}') as Record<string,unknown>;return projectDifferences(local,remote);});
async function load(){loading.value=true;try{const result=await resourceApi.read(props.projectId,props.kind);records.value=result.history;selected.value=result.current?.revision??0;open.value=true;}catch{ElMessage.warning('远端修订读取失败，本地数据未变');}finally{loading.value=false;}}
async function restore(){const record=records.value.find(r=>r.revision===selected.value);const latest=records.value.at(-1);if(!record||!latest)return;try{await ElMessageBox.confirm('将所选远端内容恢复为本地待审草稿。当前本地内容会备份，任务、账务及成片保留；文件内容不包含在此元数据恢复中。','恢复资源草稿');restoreResourceDraft(props.projectId,props.kind,record.payload,latest.revision);window.location.reload();}catch(e){if(e instanceof Error)ElMessage.warning(e.message);}}
</script>
<template><ElButton :loading="loading" @click="load">查看远端修订 / 恢复</ElButton><ElDialog v-model="open" title="远端资源修订" width="min(960px,95vw)"><p>资源：{{ kind }}。恢复旧内容不会直接恢复审核通过状态。</p><p v-if="!records.length">服务端暂无记录，或Mock服务重启后内存已重置。本地内容仍保留。</p><select v-if="records.length" v-model="selected"><option v-for="r in records" :key="r.revision" :value="r.revision">R{{ r.revision }} · {{ r.actor }} · {{ r.date }} · {{ r.confirmed?'已确认':'草稿' }}</option></select><pre style="white-space:pre-wrap;max-height:55vh;overflow:auto">{{ JSON.stringify(records.find(r=>r.revision===selected)?.payload,null,2) }}</pre><details><summary>与本地内容的字段差异</summary><div v-for="d in differences" :key="d.field"><b>{{ d.field }}</b><pre style="white-space:pre-wrap;max-height:180px;overflow:auto">本地：{{ JSON.stringify(d.local) }}
远端：{{ JSON.stringify(d.remote) }}</pre></div></details><ElButton :disabled="!records.length || !allowed('edit')" type="primary" @click="restore">恢复所选内容为待审草稿</ElButton></ElDialog></template>
