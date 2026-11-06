import type { RouteRecordRaw } from 'vue-router';
const routes:RouteRecordRaw[]=[{name:'Dashboard',path:'/dashboard',component:()=>import('#/views/creative-video/OverviewPanel.vue'),meta:{title:'工作台',icon:'lucide:layout-dashboard',order:-20}}];
export default routes;
