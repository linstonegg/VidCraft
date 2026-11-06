let account:string|undefined;
export function bindStudioAccount(username?:string){account=username;}
function scopedKey(key:string){return account?`vidcraft-user:${encodeURIComponent(account)}:${key}`:key;}
export const studioStorage={
 getItem(key:string){return localStorage.getItem(scopedKey(key));},
 setItem(key:string,value:string){localStorage.setItem(scopedKey(key),value);},
 removeItem(key:string){localStorage.removeItem(scopedKey(key));}
};
export function migrateLegacyAccount(username:string){if(username!=='vben')return;const marker='vidcraft-migration-v1';if(studioStorage.getItem(marker))return;const prefixes=['vidcraft-','production-','storyboard-approved-'];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&!key.startsWith('vidcraft-user:')&&prefixes.some(prefix=>key.startsWith(prefix))){const value=localStorage.getItem(key);if(value!==null&&studioStorage.getItem(key)===null)studioStorage.setItem(key,value);}}studioStorage.setItem(marker,'done');}

const syncAllowed=(key:string)=>/^(vidcraft-(resource-revision-|projects-v1|project-sequence|reached|assets|intake-|understanding-|creative-|script-|approvals-|account-wallet-v1|brand|models|notifications)|production-|storyboard-approved-)/.test(key);
export function exportStudioWorkspace(){const prefix=account?`vidcraft-user:${encodeURIComponent(account)}:`:'';const entries:Record<string,string>={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key||!key.startsWith(prefix))continue;const relative=key.slice(prefix.length);if(syncAllowed(relative)){const value=localStorage.getItem(key);if(value!==null)entries[relative]=value;}}return entries;}
export function importStudioWorkspace(data:Record<string,string>){if(Object.entries(data).some(([key,value])=>!syncAllowed(key)||typeof value!=='string'))throw Error('服务端数据包含不支持的字段');const old=exportStudioWorkspace();try{Object.keys(old).forEach(key=>studioStorage.removeItem(key));Object.entries(data).forEach(([key,value])=>studioStorage.setItem(key,value));}catch(e){Object.keys(data).forEach(key=>studioStorage.removeItem(key));Object.entries(old).forEach(([key,value])=>studioStorage.setItem(key,value));throw e;}}
