<script setup lang="ts">
import { ref } from 'vue';
import { ElInput, ElInputNumber, ElButton, ElMessage, ElMessageBox, ElTag } from 'element-plus';
import { brandApi } from '#/api/creative-video/settings';
import { allowed } from '#/api/creative-video/permissions';
const settings=ref(brandApi.load());
async function save(){try{await ElMessageBox.confirm('修改全局规范将使所有项目分镜需要重新审核，历史视频和成片保留。','确认影响范围');const count=brandApi.save(settings.value);ElMessage.success(`已保存 R${settings.value.revision}，${count} 个项目需复核`);}catch(e){if(e instanceof Error)ElMessage.warning(e.message);}}
</script>
<template><section class="brand-settings"><ElTag type="warning">全局 Mock 规范 · R{{ settings.revision }}</ElTag><h1>品牌与全片视觉规范</h1><p>约束角色、场景、品牌和音频的一致性。修改后需重新审核相关项目。</p><fieldset :disabled="!allowed('edit')"><label>品牌名称<ElInput v-model="settings.name"/></label><label>品牌主色<input v-model="settings.color" type="color"/></label><label v-for="field in (['characters','scenes','visualStyle','voice','forbidden'] as const)" :key="field">{{ {characters:'角色与禁止变化项',scenes:'场景与光线',visualStyle:'视觉风格',voice:'旁白与音乐规范',forbidden:'禁用元素与真实性约束'}[field] }}<ElInput v-model="settings[field]" type="textarea"/></label><label>默认画幅<select v-model="settings.aspect"><option>9:16</option><option>16:9</option><option>1:1</option></select></label><label>帧率<ElInputNumber v-model="settings.fps" :min="24" :max="60"/></label><label>字幕安全区百分比<ElInputNumber v-model="settings.safeArea" :min="0" :max="30"/></label><ElButton type="primary" @click="save">保存并标记项目需复核</ElButton></fieldset></section></template>
<style scoped>.brand-settings{margin:24px;padding:32px;background:var(--el-bg-color);border-radius:14px;max-width:1000px}h1{font-size:28px;font-weight:700;margin:20px 0}p{color:var(--el-text-color-secondary)}fieldset{border:0;padding:0}label{display:block;margin:20px 0}select{margin-left:12px}</style>
