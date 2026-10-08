import {randomUUID} from 'crypto';import {getDb} from './database';export function openSession(storeId:string,tillId:string,cashierId:string,openingFloat=0){const db=getDb();const existing=db.prepare("SELECT * FROM till_sessions WHERE store_id=? AND till_id=? AND status='OPEN' LIMIT 1").get(storeId,tillId);if(existing)return existing;const row={id:randomUUID(),storeId,tillId,cashierId,openingFloat:Math.round(openingFloat),openedAt:new Date().toISOString()};db.prepare("INSERT INTO till_sessions(id,store_id,till_id,cashier_id,status,opening_float,opened_at) VALUES(?,?,?,?,?,?,?)").run(row.id,storeId,tillId,cashierId,'OPEN',row.openingFloat,row.openedAt);return row}/**
 * Close an open till using payments recorded since its opening.
 * All amounts are integer pence; card payments never count as cash.
 * The report is returned to the caller, while the existing closing_cash
 * column retains the operator's physical cash count.
 */
export function closeSession(storeId:string,tillId:string,closingCash:number){
  if(!storeId?.trim()||!tillId?.trim())throw new Error('Store and till are required');
  if(!Number.isSafeInteger(closingCash)||closingCash<0)throw new RangeError('Counted cash must be non-negative integer pence');
  const db=getDb();
  return db.transaction(()=>{
    const session:any=db.prepare("SELECT * FROM till_sessions WHERE store_id=? AND till_id=? AND status='OPEN' ORDER BY opened_at DESC LIMIT 1").get(storeId,tillId);
    if(!session)throw new Error('No open till session to close');
    const totals:any=db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN p.method='CASH' THEN p.amount ELSE 0 END),0) cashTendered,
        COALESCE(SUM(CASE WHEN p.method='CASH' THEN s.change_due ELSE 0 END),0) changeGiven,
        COALESCE(SUM(CASE WHEN p.method<>'CASH' THEN p.amount ELSE 0 END),0) nonCashTendered,
        COUNT(DISTINCT s.id) saleCount
      FROM sales s JOIN payments p ON p.sale_id=s.id
      WHERE s.store_id=? AND s.till_id=?
        AND s.created_at>=? AND s.status='COMPLETED'
    `).get(storeId,tillId,session.opened_at);
    const cashTendered=Number(totals.cashTendered),changeGiven=Number(totals.changeGiven);
    const expectedCash=Number(session.opening_float)+cashTendered-changeGiven;
    if(!Number.isSafeInteger(expectedCash)||expectedCash<0)throw new Error('Invalid expected cash balance');
    const closedAt=new Date().toISOString();
    const result=db.prepare("UPDATE till_sessions SET status='CLOSED',closed_at=?,closing_cash=? WHERE id=? AND status='OPEN'").run(closedAt,closingCash,session.id);
    if(result.changes!==1)throw new Error('Till session changed while closing');
    return {sessionId:session.id,storeId,tillId,cashierId:session.cashier_id,openedAt:session.opened_at,closedAt,openingFloat:session.opening_float,cashTendered,changeGiven,nonCashTendered:Number(totals.nonCashTendered),saleCount:Number(totals.saleCount),expectedCash,countedCash:closingCash,variance:closingCash-expectedCash};
  })();
}
export function holdSale(storeId:string,tillId:string,cashierId:string,lines:any[],label?:string){const id=randomUUID();getDb().prepare("INSERT INTO held_sales(id,store_id,till_id,cashier_id,label,lines_json,created_at) VALUES(?,?,?,?,?,?,?)").run(id,storeId,tillId,cashierId,label||null,JSON.stringify(lines),new Date().toISOString());return{id}}export function heldSales(storeId:string,tillId:string){return getDb().prepare("SELECT id,label,created_at createdAt,lines_json linesJson FROM held_sales WHERE store_id=? AND till_id=? ORDER BY created_at DESC").all(storeId,tillId)}export function recallSale(id:string){const db=getDb(),row:any=db.prepare("SELECT * FROM held_sales WHERE id=?").get(id);if(!row)return null;db.prepare("DELETE FROM held_sales WHERE id=?").run(id);return{...row,lines:JSON.parse(row.lines_json)}}