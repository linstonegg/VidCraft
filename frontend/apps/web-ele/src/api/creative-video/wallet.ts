import { studioStorage } from './storage.ts';
import type { Ledger } from './production.ts';
export interface AccountEntry extends Ledger {projectId:number;key:string}
export interface AccountWallet {revision:number;entries:AccountEntry[]}
const key='vidcraft-account-wallet-v1';
export function walletTotals(wallet:AccountWallet){const topup=wallet.entries.filter(e=>e.kind==='演示充值').reduce((n,e)=>n+e.amount,0);const spent=wallet.entries.filter(e=>e.kind==='结算').reduce((n,e)=>n+e.amount,0);const held=wallet.entries.filter(e=>e.kind==='冻结').reduce((n,e)=>n+e.amount,0)-wallet.entries.filter(e=>e.kind==='结算'||e.kind==='释放').reduce((n,e)=>n+e.amount,0);return {total:120+topup,available:120+topup-spent-held,held,spent};}
function entryKey(projectId:number,l:Ledger){return `${projectId}:${l.transactionId??`${l.jobId}:${l.kind}`}`;}
export function loadWallet():AccountWallet{
 const raw=studioStorage.getItem(key);if(raw)return JSON.parse(raw) as AccountWallet;
 const projects=JSON.parse(studioStorage.getItem('vidcraft-projects-v1')||'[]') as {id:number}[];const entries:AccountEntry[]=[];
 for(const p of projects){const production=JSON.parse(studioStorage.getItem(`production-${p.id}`)||'{}') as {ledger?:Ledger[]};for(const l of production.ledger??[]){const id=entryKey(p.id,l);if(!entries.some(e=>e.key===id))entries.push({...l,projectId:p.id,key:id});}}
 const wallet={revision:1,entries};studioStorage.setItem(key,JSON.stringify(wallet));return wallet;
}
export function commitWallet(projectId:number,ledger:Ledger[],expected?:number){const wallet=loadWallet();if(studioStorage.getItem('vidcraft-finance-instance'))return wallet;const added=ledger.filter(l=>!wallet.entries.some(e=>e.key===entryKey(projectId,l)));if(!added.length)return wallet;if(expected!==undefined&&wallet.revision!==expected)throw Error('账户钱包已被其他项目更新，请重新加载后再确认');const next={revision:wallet.revision+1,entries:[...wallet.entries,...added.map(l=>({...l,projectId,key:entryKey(projectId,l)}))]};if(walletTotals(next).available<0&&walletTotals(wallet).available>=0)throw Error('账户可用积分不足');studioStorage.setItem(key,JSON.stringify(next));return next;}
