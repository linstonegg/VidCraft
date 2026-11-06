import assert from 'node:assert/strict';
const base=process.env.VIDCRAFT_URL||'http://localhost:5777/api';
async function post(path,body,token,role='owner'){const response=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{ }),'x-mock-role':role},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};}
const login=await post('/auth/login',{username:'vben',password:'123456'});const token=login.body.data.accessToken;
const input={id:7,revision:1,text:'纸张破碎',seconds:8};
const board=await post('/creative-video/resources',{action:'read',projectId:0,kind:'storyboard'},token);await post('/creative-video/resources',{action:'save',projectId:0,kind:'storyboard',expectedRevision:board.body.data.current?.revision??0,confirm:true,payload:{targetSeconds:8,shots:[{...input,approvedRevision:1}]}},token);
assert.equal((await post('/creative-video/generation',{action:'quote',input})).status,401);
assert.equal((await post('/creative-video/generation',{action:'quote',input},token,'reviewer')).status,403);
const quoted=await post('/creative-video/generation',{action:'quote',input},token);assert.equal(quoted.status,200);assert.equal(quoted.body.data.cost,24);
const request={action:'submit',input,quoteId:quoted.body.data.id,idempotencyKey:`test-${Date.now()}`};
const first=await post('/creative-video/generation',request,token);const repeated=await post('/creative-video/generation',request,token);assert.equal(first.status,200);assert.deepEqual(first.body,repeated.body);
assert.equal((await post('/creative-video/generation',{...request,input:{...input,text:'不同请求'}},token)).status,409);
console.log('通过：HTTP鉴权、角色限制、8秒报价、幂等提交与冲突');
