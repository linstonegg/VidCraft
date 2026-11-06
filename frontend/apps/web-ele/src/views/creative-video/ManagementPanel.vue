<script setup lang="ts">
import { studioStorage } from '#/api/creative-video/storage';
import { computed, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElDialog, ElButton, ElInput, ElMessage, ElTable, ElTableColumn, ElTag } from 'element-plus';
import { generationApi } from '#/api/creative-video/generation';
import { applyFinance } from '#/api/creative-video/server-finance';
import { loadWallet, walletTotals } from '#/api/creative-video/wallet';
import { assetApi } from '#/api/creative-video/assets';
import { projectApi } from '#/api/creative-video';
import { loadProduction, persist, settle } from '#/api/creative-video/production';
const detail=ref<{project:string;jobId:number;quote?:unknown;authorizedAt?:string;idempotencyKey?:string;status?:string;entries:unknown[]}>();
function showBill(projectId:number,jobId:number){const p=productions.value.find(p=>p.project.id===projectId);if(!p)return;const job=p.state.jobs.find(j=>j.id===jobId);detail.value={project:p.project.name,jobId,quote:job?.quote,authorizedAt:job?.authorizedAt,idempotencyKey:job?.idempotencyKey,status:job?.status,entries:p.state.ledger.filter(l=>l.jobId===jobId)};}
const route=useRoute();const query=ref('');const assets=ref(assetApi.list());
const models=ref(JSON.parse(studioStorage.getItem('vidcraft-models')||'{"video":"演示视频模型","resolution":"720p","brand":"VidCraft"}') as {video:string;resolution:string;brand:string});
function saveModels(){studioStorage.setItem('vidcraft-models',JSON.stringify(models.value));ElMessage.success('演示配置已保存');}
function scan(){return projectApi.list().map(p=>{const state=loadProduction(p.id,p.duration);settle(state);persist(p.id,state);return {project:p,state};});}
const productions=ref(scan());const timer=setInterval(()=>void refreshServer(),1500);onUnmounted(()=>clearInterval(timer));
const jobs=computed(()=>productions.value.flatMap(({project,state})=>state.jobs.map(j=>({...j,project:project.name,projectId:project.id}))).filter(j=>`${j.project} ${j.status}`.includes(query.value)));
const ledger=computed(()=>productions.value.flatMap(({project,state})=>state.ledger.map(l=>({...l,project:project.name,projectId:project.id}))).filter(l=>`${l.project} ${l.kind}`.includes(query.value)));
const wallet=computed(()=>{void productions.value;return walletTotals(loadWallet());});
const filtered=computed(()=>assets.value.filter(a=>a.name.includes(query.value)));
function removeAsset(id:number){try{assetApi.remove(id);assets.value=assetApi.list();}catch(e){ElMessage.warning((e as Error).message);}}
function upload(e:Event){try{assetApi.add(Array.from((e.target as HTMLInputElement).files||[]));assets.value=assetApi.list();ElMessage.success('已记录演示素材元数据，文件未上传');}catch(e){ElMessage.warning((e as Error).message);}}
async function refreshServer(){try{const server=await generationApi.state();const next=scan();for(const p of next){applyFinance(p.project.id,p.state,server);persist(p.project.id,p.state);}productions.value=next;}catch{/* 保留已有快照，下次轮询重试 */}}
void refreshServer();
async function resolveJob(id:number,projectId:number){try{await generationApi.action('reconcile',projectId,{jobId:id,outcome:'failed'});await refreshServer();}catch(e){ElMessage.warning((e as Error).message);}}
async function cancelJob(id:number,projectId:number){try{await generationApi.action('cancel',projectId,{jobId:id});await refreshServer();}catch(e){ElMessage.warning((e as Error).message);}}
</script>
<template><div class="management"><ElTag type="warning">Mock 演示 · 数据仅存当前浏览器</ElTag><h1>{{ route.path==='/assets'?'素材库':route.path==='/tasks'?'生成任务中心':route.path==='/billing'?'积分与账单':'模型与创作设置' }}</h1><ElInput v-model="query" placeholder="按名称或状态筛选" clearable style="max-width:360px;margin-bottom:24px"/>
<template v-if="route.path==='/assets'"><p>支持图片、录屏、PDF / Word；单文件最大 100 MB。请先脱敏，此处只保存文件名等元数据。</p><input type="file" multiple accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp4,.mov" @change="upload"/><ElTable :data="filtered"><ElTableColumn prop="name" label="素材名称"/><ElTableColumn prop="size" label="大小（字节）"/><ElTableColumn prop="created" label="添加时间"/><ElTableColumn label="操作"><template #default="{row}"><ElButton @click="removeAsset(row.id)">删除记录</ElButton></template></ElTableColumn></ElTable></template>
<template v-else-if="route.path==='/tasks'"><ElTable :data="jobs"><ElTableColumn prop="project" label="项目"/><ElTableColumn prop="id" label="任务"/><ElTableColumn prop="shotId" label="镜头"/><ElTableColumn prop="status" label="状态"/><ElTableColumn prop="stage" label="执行阶段（模拟）"/><ElTableColumn prop="cost" label="积分"/><ElTableColumn label="操作"><template #default="{row}"><ElButton :disabled="row.status!=='running'" @click="cancelJob(row.id,row.projectId)">申请取消 / 费用核对</ElButton><ElButton v-if="row.status==='reconciling'" @click="resolveJob(row.id,row.projectId)">模拟核对未收费并释放</ElButton></template></ElTableColumn></ElTable></template>
<template v-else-if="route.path==='/billing'"><p>账户级模拟钱包，以下为全部项目流水；充值仅用于演示，无真实支付。</p><p>总积分 {{ wallet.total }} · 可用 {{ wallet.available }} · 冻结 {{ wallet.held }} · 已消费 {{ wallet.spent }}</p><p v-if="wallet.available<0">历史项目额度迁移后存在负余额，请使用演示充值补足；历史流水完整保留。</p><ElTable :data="ledger"><ElTableColumn prop="project" label="项目"/><ElTableColumn prop="jobId" label="关联任务"/><ElTableColumn prop="kind" label="账务动作"/><ElTableColumn prop="amount" label="积分"/><ElTableColumn prop="created" label="日期"/><ElTableColumn prop="balanceBefore" label="可用余额（前）"/><ElTableColumn prop="balanceAfter" label="可用余额（后）"/><ElTableColumn label="详情"><template #default="{row}"><ElButton @click="showBill(row.projectId,row.jobId)">报价与流水</ElButton></template></ElTableColumn></ElTable></template>
<template v-else><p>仅配置 Mock 展示信息，不保存真实 API Key。</p><label>视频模型</label><select v-model="models.video"><option value="standard">示例模型 A（3积分/秒）</option><option value="premium">示例模型 B（5积分/秒）</option></select><label>清晰度</label><select v-model="models.resolution"><option>720p</option><option>1080p</option></select><label>品牌名称</label><ElInput v-model="models.brand"/><ElButton type="primary" @click="saveModels">保存设置</ElButton></template>
<ElDialog :model-value="!!detail" title="模拟订单与账单详情" width="min(800px,95vw)" @close="detail=undefined"><template v-if="detail"><p>{{ detail.project }} · 任务 #{{ detail.jobId }} · {{ detail.status || '演示充值' }}</p><p>授权时间：{{ detail.authorizedAt || '历史记录未保存' }}</p><p>幂等键：{{ detail.idempotencyKey || '历史记录未保存' }}</p><h3>报价快照</h3><pre>{{ JSON.stringify(detail.quote,null,2) }}</pre><h3>交易流水</h3><pre>{{ JSON.stringify(detail.entries,null,2) }}</pre></template></ElDialog></div></template>
<style scoped>.management{margin:28px;padding:32px;background:var(--el-bg-color);border-radius:12px}h1{font-size:28px;font-weight:700;margin:20px 0}p{color:#8790a0;margin:16px 0}label{display:block;margin:24px 0 8px}</style>
