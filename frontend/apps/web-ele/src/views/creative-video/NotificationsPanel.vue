<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElButton, ElTag } from 'element-plus';
import { notificationApi } from '#/api/creative-video/notifications';
const router=useRouter();const notices=ref(notificationApi.scan());const timer=setInterval(()=>notices.value=notificationApi.scan(),2000);onUnmounted(()=>clearInterval(timer));
function read(id?:string){notificationApi.read(id);notices.value=notificationApi.list();}
</script>
<template><section class="notifications"><h1>创作通知 <ElTag>{{ notices.filter(n=>!n.read).length }} 未读</ElTag></h1><ElButton @click="read()">全部标为已读</ElButton><p v-if="!notices.length">暂无通知。生成、失败、费用核对及合成完成后会出现在这里。</p><article v-for="n in notices" :key="n.id"><ElTag :type="n.read?'info':'warning'">{{ n.read?'已读':'未读' }}</ElTag><strong>{{ n.title }}</strong><p>{{ n.created }}</p><ElButton @click="read(n.id);router.push(n.path)">查看关联镜头 / 成片</ElButton></article></section></template>
<style scoped>.notifications{margin:24px;padding:32px;background:var(--el-bg-color);border-radius:14px}h1{font-size:28px;font-weight:700;margin-bottom:24px}article{padding:24px;border-bottom:1px solid var(--el-border-color)}strong{margin-left:12px}p{color:var(--el-text-color-secondary);margin:16px 0}</style>
