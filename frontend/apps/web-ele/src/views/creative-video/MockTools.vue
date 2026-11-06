<script setup lang="ts">
import {ref} from 'vue';
import {requestClient} from '#/api/request';
import {generationApi} from '#/api/creative-video/generation';
import type {FinanceState} from '#/api/creative-video/server-finance';
import { ElButton, ElMessage, ElMessageBox } from 'element-plus';
import { installSeeds } from '#/api/creative-video/fixtures';
import { currentRole } from '#/api/creative-video/permissions';
const enabled=import.meta.env.DEV&&import.meta.env.VITE_APP_MOCK_TOOLS==='true'&&currentRole()==='owner';
const jobs=ref<FinanceState['jobs']>([]);const selected=ref<number>();const result=ref('');
async function load(){try{jobs.value=(await generationApi.state()).jobs;}catch{ElMessage.warning('无法读取任务');}}
async function simulate(scenario:'success'|'failure'|'unknown'|'duplicate'){if(!selected.value)return;try{const state=await requestClient.post<FinanceState&{duplicateUnchanged?:boolean}>('/creative-video/scenario',{jobId:selected.value,scenario},{headers:{'x-mock-role':currentRole()}});jobs.value=state.jobs;result.value=scenario==='duplicate'?`重复回调未重复扣费或创建候选：${state.duplicateUnchanged?'是':'否（任务可能刚完成，请在终态再次检查）'}`:'服务端状态已推进，Studio和任务中心将读取结果';}catch{ElMessage.warning('场景执行失败，可能任务已结束或无开发权限');}}
async function install(reset=false){try{if(reset)await ElMessageBox.confirm('仅重置四个内置项目及其模拟钱包流水，保留你创建的项目。','重置演示种子');installSeeds(reset);window.location.reload();}catch(e){if(e instanceof Error)ElMessage.warning(e.message);}}
</script>
<template><details v-if="enabled" class="mock-tools"><summary>开发演示工具（仅开发环境）</summary><p>固定样例包含四种产品；3D 简历为15镜头、120秒，镜头07保留V1/V2候选。</p><ElButton @click="install()">添加缺失演示项目</ElButton><ElButton @click="install(true)">重置内置项目</ElButton><hr style="margin:18px 0"/><h3>任务异常模拟（可选择不同任务先后完成，验证乱序）</h3><ElButton @click="load">刷新当前账号任务</ElButton><select v-model="selected"><option v-for="j in jobs" :key="j.id" :value="j.id">#{{ j.id }} · 项目{{ j.projectId }} · 镜头{{ j.shotId }} · {{ j.status }}</option></select><div><ElButton :disabled="!selected" @click="simulate('success')">立即成功</ElButton><ElButton :disabled="!selected" @click="simulate('failure')">明确失败并释放</ElButton><ElButton :disabled="!selected" @click="simulate('unknown')">进入费用核对</ElButton><ElButton :disabled="!selected" @click="simulate('duplicate')">重复回调检查</ElButton></div><p role="status">{{ result }}</p></details></template>
<style scoped>.mock-tools{border:1px dashed var(--el-border-color);border-radius:8px;padding:16px;margin:16px 0}p{margin:12px 0;color:var(--el-text-color-secondary)}</style>
