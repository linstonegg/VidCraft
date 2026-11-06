import type { Production, Ledger } from './production.ts';
export function recordLedger(p:Production,jobId:number,kind:Ledger['kind'],amount:number,reason:string){
 const transactionId=`${jobId}:${kind}`;if(p.ledger.some(l=>l.transactionId===transactionId||(!l.transactionId&&l.jobId===jobId&&l.kind===kind)))return false;
 if((kind==='结算'||kind==='释放')&&p.ledger.some(l=>l.jobId===jobId&&(l.kind==='结算'||l.kind==='释放')))throw Error('该冻结订单已完成结算或释放');
 if(!Number.isFinite(amount)||amount<=0)throw Error('积分金额无效');const before=p.balance;
 if(kind==='冻结'){if(before<amount)throw Error('可用积分不足');p.balance-=amount;}
 if(kind==='释放'||kind==='演示充值')p.balance+=amount;
 p.ledger.push({jobId,kind,amount,transactionId,created:new Date().toISOString(),balanceBefore:before,balanceAfter:p.balance,reason});return true;
}
