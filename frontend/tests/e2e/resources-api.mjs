import assert from 'node:assert/strict';
const base='http://localhost:5777/api';async function post(path,body,token,role='owner'){const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{ }),'x-mock-role':role},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}const login=async username=>(await post('/auth/login',{username,password:'123456'})).body.data.accessToken;const a=await login('vben'),b=await login('admin');const projectId=Date.now();await post('/creative-video/resources',{action:'save',projectId,kind:'intake',expectedRevision:0,confirm:true,payload:{revision:1,redacted:true,needsLogin:false,assets:[],evidence:[{id:1,statement:'提供了网址',source:'https://example.com',level:'事实'}]}},a);const payload={intakeServerRevision:1,positioning:'演示产品',insights:Array.from({length:5},(_,id)=>({id,level:'hypothesis'}))};const request={action:'save',projectId,kind:'understanding',expectedRevision:0,payload,confirm:true};assert.equal((await post('/creative-video/resources',request)).status,401);assert.equal((await post('/creative-video/resources',request,a,'editor')).status,403);const saved=await post('/creative-video/resources',request,a);assert.equal(saved.status,200);assert.equal(saved.body.data.confirmed,true);assert.equal((await post('/creative-video/resources',request,a)).status,409);const other=await post('/creative-video/resources',{action:'read',projectId,kind:'understanding'},b);assert.equal(other.body.data.current,null);assert.equal((await post('/creative-video/resources',{action:'save',projectId,kind:'script',expectedRevision:0,payload:{beats:[{text:'剧情',seconds:8}],targetSeconds:30}},a)).status,400);console.log('通过：子资源鉴权、审核权限、修订冲突、账号隔离与剧本时长校验');

const creative={action:'save',projectId,kind:'creative',expectedRevision:0,confirm:true,payload:{index:0,concept:{title:'测试创意'},note:'禁止夸大',understandingServerRevision:999}};
assert.equal((await post('/creative-video/resources',creative,a)).status,409);
creative.payload.understandingServerRevision=1;assert.equal((await post('/creative-video/resources',creative,a)).status,200);
await post('/creative-video/resources',{...request,expectedRevision:1,confirm:false},a);
assert.equal((await post('/creative-video/resources',{...creative,expectedRevision:1},a)).status,409);
console.log('通过：创意锁定依赖已确认理解、错误引用拒绝、上游变化使锁定失效');

const shot={id:9,revision:1,text:'分镜门禁验证',seconds:8};
const unapproved={action:'save',projectId,kind:'storyboard',expectedRevision:0,confirm:true,payload:{targetSeconds:8,shots:[shot]}};
assert.equal((await post('/creative-video/resources',unapproved,a)).status,409);
assert.equal((await post('/creative-video/resources',{...unapproved,confirm:false},a)).status,200);
const quote=(await post('/creative-video/generation',{action:'quote',input:shot},a)).body.data;
assert.equal((await post('/creative-video/generation',{action:'submit',projectId,input:shot,quoteId:quote.id,idempotencyKey:`board-${Date.now()}`},a)).status,409);
console.log('通过：未审镜头阻止整组确认、仅草稿分镜不能提交付费生成');

const reviewerPayload={targetSeconds:8,shots:[{...shot,approvedRevision:1}]};
assert.equal((await post('/creative-video/resources',{action:'save',projectId,kind:'storyboard',expectedRevision:1,payload:reviewerPayload},a,'reviewer')).status,200);
assert.equal((await post('/creative-video/resources',{action:'save',projectId,kind:'storyboard',expectedRevision:2,payload:{targetSeconds:8,shots:[{...shot,text:'审核者修改剧情',approvedRevision:1}]}},a,'reviewer')).status,403);
console.log('通过：审核者可以确认已有分镜，但不能修改镜头剧情');

const badIntake={action:'save',projectId:projectId+1,kind:'intake',expectedRevision:0,confirm:true,payload:{revision:1,redacted:false,needsLogin:true,authorized:false,assets:[],evidence:[{id:1,statement:'输入记录',source:'演示',level:'事实'}]}};
assert.equal((await post('/creative-video/resources',badIntake,a)).status,409);
assert.equal((await post('/creative-video/resources',{...request,projectId:projectId+1},a)).status,409);
console.log('通过：服务端资料脱敏授权门禁、未确认资料不得确认产品理解');
