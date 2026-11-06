import assert from 'node:assert/strict';
const base='http://localhost:5777/api';
async function post(path,body,token,role='owner'){const r=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{ }),'x-mock-role':role},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};}
const login=async username=>(await post('/auth/login',{username,password:'123456'})).body.data.accessToken;
const owner=await login('vben'),other=await login('admin');const read=await post('/creative-video/workspace',{action:'read'},owner);const revision=read.body.data.revision;
assert.equal((await post('/creative-video/workspace',{action:'read'})).status,401);
assert.equal((await post('/creative-video/workspace',{action:'write',expectedRevision:revision,data:{}},owner,'reviewer')).status,403);
const marker=`API-${Date.now()}`;const data={'vidcraft-projects-v1':JSON.stringify([{id:1,name:marker}])};const written=await post('/creative-video/workspace',{action:'write',expectedRevision:revision,data},owner);assert.equal(written.status,200);
assert.equal((await post('/creative-video/workspace',{action:'write',expectedRevision:revision,data},owner)).status,409);
const otherState=await post('/creative-video/workspace',{action:'read'},other);assert.ok(!JSON.stringify(otherState.body.data).includes(marker));
assert.equal((await post('/creative-video/workspace',{action:'write',expectedRevision:written.body.data.revision,data:{password:'secret'}},owner)).status,400);
assert.equal((await post('/creative-video/workspace',{action:'read'},owner)).body.data.data['vidcraft-projects-v1'],data['vidcraft-projects-v1']);
console.log('通过：Nitro工作区鉴权、账号隔离、CAS冲突、字段白名单和读写恢复');
