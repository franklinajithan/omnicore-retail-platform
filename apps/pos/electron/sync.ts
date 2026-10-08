import {getDb,pendingSales} from './database';

type SyncResult={synced:number;pending:number};
let inFlight:Promise<SyncResult>|null=null;

/** Serialise background and cashier-triggered sync so a sale is never uploaded concurrently. */
export function syncPending(apiUrl:string,token?:string):Promise<SyncResult>{
  if(inFlight)return inFlight;
  const job=performSync(apiUrl,token);
  inFlight=job;
  void job.then(()=>{if(inFlight===job)inFlight=null},()=>{if(inFlight===job)inFlight=null});
  return job;
}

async function performSync(apiUrl:string,token?:string):Promise<SyncResult>{
  if(!apiUrl)return{synced:0,pending:pendingSales().length};
  const db=getDb();
  let synced=0;
  for(const sale of pendingSales(100)){
    try{
      const lines=db.prepare('SELECT * FROM sale_lines WHERE sale_id=?').all(sale.id);
      const payments=db.prepare('SELECT * FROM payments WHERE sale_id=?').all(sale.id);
      const res=await fetch(apiUrl.replace(/\/$/,'')+'/pos/v1/sales',{
        method:'POST',
        headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},
        body:JSON.stringify({idempotencyKey:sale.id,sale,lines,payments})
      });
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      db.prepare("UPDATE sales SET sync_status='SYNCED',last_sync_error=NULL WHERE id=?").run(sale.id);
      synced++;
    }catch(e:any){
      db.prepare("UPDATE sales SET sync_status='RETRY',sync_attempts=sync_attempts+1,last_sync_error=? WHERE id=?")
        .run(String(e?.message||e),sale.id);
    }
  }
  return{synced,pending:pendingSales().length};
}
