<script setup lang="ts">
import {ref,onMounted} from 'vue';
import {ElButton,ElMessage,ElMessageBox,ElTag} from 'element-plus';
import {workspaceApi} from '#/api/creative-video/workspace';
import type {WorkspaceSnapshot} from '#/api/creative-video/workspace';
import {exportStudioWorkspace,importStudioWorkspace,studioStorage} from '#/api/creative-video/storage';
import {allowed} from '#/api/creative-video/permissions';
const snapshot=ref<WorkspaceSnapshot>();const busy=ref(false);const error=ref('');
async function refresh(){try{snapshot.value=await workspaceApi.read();error.value='';const old=studioStorage.getItem('workspace-instance');if(old&&old!==snapshot.value.instance)ElMessage.warning('Mock 服务已重启，服务端内存快照已重置；本地数据保留');studioStorage.setItem('workspace-instance',snapshot.value.instance);}catch(e){error.value=e instanceof Error?e.message:'服务不可用';}}
onMounted(refresh);
async function upload(){if(!snapshot.value)return;busy.value=true;try{snapshot.value=await workspaceApi.write(exportStudioWorkspace(),snapshot.value.revision);ElMessage.success('当前账号工作区已保存到Nitro内存');}catch{ElMessage.warning('保存失败或服务端已有新版；请先刷新服务端版本，再决定保存或恢复');}finally{busy.value=false;}}
async function restore(){if(!snapshot.value?.revision)return;try{await ElMessageBox.confirm(`将用服务端 R${snapshot.value.revision} 替换当前账号本地工作区；当前未同步的修改会被替换。`,'恢复工作区');importStudioWorkspace(snapshot.value.data);window.location.reload();}catch(e){if(e instanceof Error)ElMessage.warning(e.message);}}
</script>
<template><section class="sync"><h3>Nitro 工作区快照（迁移阶段）</h3><p>按登录账号隔离。服务端内存重启会清空；当前仍以本地业务操作为主，不代表服务端权威账务。</p><ElTag v-if="snapshot">服务端 R{{ snapshot.revision }} · {{ snapshot.updated || '尚未保存' }}</ElTag><p v-if="error" role="alert">{{ error }}</p><ElButton :loading="busy" :disabled="!snapshot||!allowed('edit')" @click="upload">保存当前工作区到服务端</ElButton><ElButton :disabled="!snapshot?.revision||!allowed('edit')" @click="restore">从服务端恢复工作区</ElButton><ElButton @click="refresh">刷新服务端版本</ElButton></section></template>
<style scoped>.sync{padding:20px;border:1px solid var(--el-border-color);border-radius:12px;margin:24px 0}h3{font-size:18px;font-weight:600}p{line-height:1.8;margin:14px 0;color:var(--el-text-color-secondary)}.el-tag{margin-bottom:12px}</style>
