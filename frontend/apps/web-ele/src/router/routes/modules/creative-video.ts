import type { RouteRecordRaw } from 'vue-router';
const routes: RouteRecordRaw[] = [
{ name:'CreativeVideo',path:'/creative-video',alias:'/projects',component:()=>import('#/views/creative-video/index.vue'),meta:{title:'创意视频工作台',icon:'lucide:clapperboard',order:-10}},
{name:'CreativeProjectDetail',path:'/projects/:id',component:()=>import('#/views/creative-video/OverviewPanel.vue'),meta:{title:'项目详情',hideInMenu:true}},
{name:'CreativeProjectNew',path:'/projects/new',component:()=>import('#/views/creative-video/index.vue'),meta:{title:'新建项目',hideInMenu:true}},
{name:'CreativeStudio',path:'/studio/:projectId/:step',component:()=>import('#/views/creative-video/index.vue'),meta:{title:'创作工作台',hideInMenu:true}},
{name:'CreativeBrandSettings',path:'/settings/brand',component:()=>import('#/views/creative-video/BrandSettings.vue'),meta:{title:'品牌与视觉规范',icon:'lucide:palette'}},
{name:'CreativeNotifications',path:'/notifications',component:()=>import('#/views/creative-video/NotificationsPanel.vue'),meta:{title:'创作通知',icon:'lucide:bell'}},
...['assets','tasks','billing','settings/models'].map((path,index)=>({name:`CreativeManagement${index}`,path:`/${path}`,component:()=>import('#/views/creative-video/ManagementPanel.vue'),meta:{title:['素材库','任务中心','积分与账单','模型与创作设置'][index]!,icon:['lucide:folder','lucide:list-checks','lucide:wallet','lucide:settings'][index]!}}))
];
export default routes;
