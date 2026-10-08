import {randomUUID} from 'crypto';import {getDb} from './database';export function openSession(storeId:string,tillId:string,cashierId:string,openingFloat=0){
  if(!storeId?.trim()||!tillId?.trim()||!cashierId?.trim())throw new Error('Store, till and cashier are required');
  if(!Number.isSafeInteger(openingFloat)||openingFloat<0)throw new RangeError('Opening float must be non-negative integer pence');
  const db=getDb();
  return db.transaction(()=>{
    const existing:any=db.prepare("SELECT * FROM till_sessions WHERE store_id=? AND till_id=? AND status='OPEN' LIMIT 1").get(storeId,tillId);
    if(existing){if(existing.cashier_id!==cashierId)throw new Error('Till is already open under another cashier');return existing;}
    const row={id:randomUUID(),storeId,tillId,cashierId,openingFloat,openedAt:new Date().toISOString()};
    db.prepare("INSERT INTO till_sessions(id,store_id,till_id,cashier_id,status,opening_float,opened_at) VALUES(?,?,?,?,?,?,?)").run(row.id,storeId,tillId,cashierId,'OPEN',openingFloat,row.openedAt);
    return row;
  })();
}
/**
 * Close an open till using payments recorded since its opening.
 * All amounts are integer pence; card payments never count as cash.
 * The report is returned to the caller, while the existing closing_cash
 * column retains the operator's physical cash count.
 */
export function recordCashMovement(storeId:string,tillId:string,cashierId:string,kind:'PAID_IN'|'PAID_OUT',amount:number,reason:string){
  if(!storeId?.trim()||!tillId?.trim()||!cashierId?.trim())throw new Error('Store, till and cashier are required');
  if(kind!=='PAID_IN'&&kind!=='PAID_OUT')throw new Error('Invalid cash movement type');
  if(!Number.isSafeInteger(amount)||amount<=0)throw new RangeError('Amount must be positive integer pence');
  if(typeof reason!=='string'||reason.trim().length<3||reason.trim().length>500)throw new Error('Reason must be 3 to 500 characters');
  const db=getDb();
  return db.transaction(()=>{
    const session:any=db.prepare("SELECT id FROM till_sessions WHERE store_id=? AND till_id=? AND status='OPEN' LIMIT 1").get(storeId,tillId);
    if(!session)throw new Error('No open till session');
    const owner:any=db.prepare('SELECT cashier_id FROM till_sessions WHERE id=?').get(session.id);
    if(owner.cashier_id!==cashierId)throw new Error('Cashier does not own open till session');
    const entry={id:randomUUID(),sessionId:session.id,storeId,tillId,cashierId,kind,amount,reason:reason.trim(),createdAt:new Date().toISOString()};
    db.prepare('INSERT INTO till_cash_movements(id,session_id,store_id,till_id,cashier_id,kind,amount,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(entry.id,entry.sessionId,storeId,tillId,cashierId,kind,amount,entry.reason,entry.createdAt);
    return entry;
  })();
}
export function closeSession(storeId:string,tillId:string,cashierId:string,closingCash:number){
  if(!storeId?.trim()||!tillId?.trim()||!cashierId?.trim())throw new Error('Store, till and cashier are required');
  if(!Number.isSafeInteger(closingCash)||closingCash<0)throw new RangeError('Counted cash must be non-negative integer pence');
  const db=getDb();
  return db.transaction(()=>{
    const session:any=db.prepare("SELECT * FROM till_sessions WHERE store_id=? AND till_id=? AND status='OPEN' ORDER BY opened_at DESC LIMIT 1").get(storeId,tillId);
    if(!session)throw new Error('No open till session to close');
    if(session.cashier_id!==cashierId)throw new Error('Cashier does not own open till session');
    const totals:any=db.prepare(`
      SELECT
        COALESCE(SUM(t.cash_tendered),0) cashTendered,
        COALESCE(SUM(CASE WHEN t.cash_tendered>0 THEN t.change_due ELSE 0 END),0) changeGiven,
        COALESCE(SUM(t.non_cash_tendered),0) nonCashTendered,
        COUNT(*) saleCount
      FROM (
        SELECT s.id,s.change_due,
          SUM(CASE WHEN p.method='CASH' THEN p.amount ELSE 0 END) cash_tendered,
          SUM(CASE WHEN p.method<>'CASH' THEN p.amount ELSE 0 END) non_cash_tendered
        FROM sales s JOIN payments p ON p.sale_id=s.id
        WHERE s.store_id=? AND s.till_id=?
          AND s.created_at>=? AND s.status='COMPLETED'
        GROUP BY s.id,s.change_due
      ) t
    `).get(storeId,tillId,session.opened_at);
    const movements:any=db.prepare("SELECT COALESCE(SUM(CASE WHEN kind='PAID_IN' THEN amount ELSE 0 END),0) paidIn,COALESCE(SUM(CASE WHEN kind='PAID_OUT' THEN amount ELSE 0 END),0) paidOut FROM till_cash_movements WHERE session_id=?").get(session.id);
    const paidIn=Number(movements.paidIn),paidOut=Number(movements.paidOut);
    const cashTendered=Number(totals.cashTendered),changeGiven=Number(totals.changeGiven);
    const expectedCash=Number(session.opening_float)+cashTendered-changeGiven+paidIn-paidOut;
    if(!Number.isSafeInteger(expectedCash)||expectedCash<0)throw new Error('Invalid expected cash balance');
    const closedAt=new Date().toISOString();
    const result=db.prepare("UPDATE till_sessions SET status='CLOSED',closed_at=?,closing_cash=? WHERE id=? AND status='OPEN'").run(closedAt,closingCash,session.id);
    if(result.changes!==1)throw new Error('Till session changed while closing');
    return {sessionId:session.id,storeId,tillId,cashierId:session.cashier_id,openedAt:session.opened_at,closedAt,openingFloat:session.opening_float,cashTendered,changeGiven,paidIn,paidOut,nonCashTendered:Number(totals.nonCashTendered),saleCount:Number(totals.saleCount),expectedCash,countedCash:closingCash,variance:closingCash-expectedCash};
  })();
}
export function holdSale(storeId:string,tillId:string,cashierId:string,lines:any[],label?:string){
  if(!storeId?.trim()||!tillId?.trim()||!cashierId?.trim())throw new Error('Store, till and cashier required');
  if(!Array.isArray(lines)||lines.length===0)throw new Error('Cannot hold an empty sale');
  const db=getDb();
  return db.transaction(()=>{
    const session:any=db.prepare("SELECT cashier_id FROM till_sessions WHERE store_id=? AND till_id=? AND status='OPEN' LIMIT 1").get(storeId,tillId);
    if(!session||session.cashier_id!==cashierId)throw new Error('Cashier has no open till session');
    const id=randomUUID();
    db.prepare("INSERT INTO held_sales(id,store_id,till_id,cashier_id,label,lines_json,created_at) VALUES(?,?,?,?,?,?,?)")
      .run(id,storeId,tillId,cashierId,label||null,JSON.stringify(lines),new Date().toISOString());
    return{id};
  })();
}
export function heldSales(storeId:string,tillId:string,cashierId:string){
  return getDb().prepare("SELECT id,label,created_at createdAt,lines_json linesJson FROM held_sales WHERE store_id=? AND till_id=? AND cashier_id=? ORDER BY created_at DESC")
    .all(storeId,tillId,cashierId);
}
export function recallSale(id:string,storeId:string,tillId:string,cashierId:string){
  if(!id||!storeId||!tillId||!cashierId)throw new Error('Held sale context required');
  const db=getDb();
  return db.transaction(()=>{
    const session:any=db.prepare("SELECT cashier_id FROM till_sessions WHERE store_id=? AND till_id=? AND status='OPEN' LIMIT 1").get(storeId,tillId);
    if(!session||session.cashier_id!==cashierId)throw new Error('Cashier has no open till session');
    const row:any=db.prepare("SELECT * FROM held_sales WHERE id=? AND store_id=? AND till_id=? AND cashier_id=?").get(id,storeId,tillId,cashierId);
    if(!row)return null;
    const lines=JSON.parse(row.lines_json);
    if(!Array.isArray(lines))throw new Error('Invalid held sale data');
    const deleted=db.prepare("DELETE FROM held_sales WHERE id=? AND store_id=? AND till_id=? AND cashier_id=?").run(id,storeId,tillId,cashierId);
    if(deleted.changes!==1)throw new Error('Held sale was already recalled');
    return {...row,lines};
  })();
}
