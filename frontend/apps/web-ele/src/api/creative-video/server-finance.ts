import {generationApi} from './generation';
import {applyFinance} from './finance-projection';
import type {Production} from './production';
export {applyFinance};
export type {FinanceState} from './finance-projection';
export async function refreshFinance(projectId:number,p:Production){return applyFinance(projectId,p,await generationApi.state());}
