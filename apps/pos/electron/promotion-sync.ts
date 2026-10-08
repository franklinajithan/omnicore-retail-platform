import {getDb} from './database';
export async function syncPromotions(apiUrl:string,storeId:string,token?:string){
 if(!apiUrl||!token)return{complete:false,error:'PROMOTION_API_NOT_CONFIGURED'};
 const url=new URL(apiUrl.replace(/\/$/,'')+'/retail/v1/stores/'+encodeURIComponent(storeId)+'/promotions');
 const response=await fetch(url,{headers:{authorization:'Bearer '+token}});
 if(!response.ok)throw new Error('Promotion sync HTTP '+response.status);
 const rows:any[]=await response.json();
 if(!Array.isArray(rows))throw new Error('Invalid promotion payload');
 const now=new Date().toISOString(),db=getDb();
 // Validate the complete response before replacing the last known-good offline cache.
 for(const p of rows){
  if(typeof p.id!=='string'||!Number.isSafeInteger(Number(p.priority??0))||!['APPROVED','ACTIVE'].includes(p.status)||!Array.isArray(p.products)||!['ALL_STORES','ZONES','STORES'].includes(p.scope)||!['FIXED_PRICE','PERCENT_OFF','AMOUNT_OFF','MULTIBUY_FIXED_PRICE'].includes(p.type)||!Number.isFinite(Date.parse(p.startsAt))||!Number.isFinite(Date.parse(p.endsAt))||Date.parse(p.startsAt)>=Date.parse(p.endsAt))throw new Error('Invalid promotion response; existing cache retained');
  for(const line of p.products){if(typeof line.productId!=='string'||!Number.isFinite(Number(line.value))||Number(line.value)<0||(p.type==='PERCENT_OFF'&&Number(line.value)>100)||(p.type==='MULTIBUY_FIXED_PRICE'&&(!Number.isSafeInteger(line.requiredQuantity)||line.requiredQuantity<2)))throw new Error('Invalid promotion rule; existing cache retained');}
 }

 const update=db.transaction(()=>{
  db.prepare('DELETE FROM promotion_rules WHERE store_id=?').run(storeId);
  const insert=db.prepare('INSERT INTO promotion_rules(promotion_id,product_id,store_id,scope,type,value,required_quantity,priority,starts_at,ends_at) VALUES(?,?,?,?,?,?,?,?,?,?)');
  let count=0;
  for(const p of rows)for(const line of p.products||[]){
   if(!['ALL_STORES','ZONES','STORES'].includes(p.scope)||!['FIXED_PRICE','PERCENT_OFF','AMOUNT_OFF','MULTIBUY_FIXED_PRICE'].includes(p.type))continue;
   if(!Number.isFinite(Number(line.value))||Number(line.value)<0)continue;
   insert.run(p.id,line.productId,storeId,p.scope,p.type,Number(line.value),line.requiredQuantity??null,p.priority??0,new Date(p.startsAt).toISOString(),new Date(p.endsAt).toISOString());
   count++;
  }
  db.prepare("INSERT INTO sync_state(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").run('promotions_last_sync:'+storeId,String(count),now);
  return count;
 });
 const updated=update();
 return{complete:true,updated};
}
export function localPromotionRules(storeId:string,productId:string){
 return getDb().prepare('SELECT promotion_id promotionId,product_id productId,scope,type,value,required_quantity requiredQuantity,priority,starts_at startsAt,ends_at endsAt FROM promotion_rules WHERE store_id=? AND product_id=?').all(storeId,productId);
}
