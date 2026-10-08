import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(){
 const base=process.env.OMNICORE_API_URL;
 const token=process.env.OMNICORE_HO_TOKEN;
 const tenantId=process.env.OMNICORE_TENANT_ID;
 if(!base||!token||!tenantId)return NextResponse.json({error:'Head Office API configuration is missing. Set OMNICORE_API_URL, OMNICORE_HO_TOKEN and OMNICORE_TENANT_ID on the web deployment.'},{status:503});
 try{
  const headers={authorization:`Bearer ${token}`};
  const [promotions,zones]=await Promise.all([
   fetch(`${base.replace(/\\/$/,'')}/retail/v1/promotions?tenantId=${encodeURIComponent(tenantId)}`,{headers,cache:'no-store'}),
   fetch(`${base.replace(/\\/$/,'')}/retail/v1/zones?tenantId=${encodeURIComponent(tenantId)}`,{headers,cache:'no-store'})
  ]);
  if(!promotions.ok||!zones.ok)return NextResponse.json({error:`API request failed (promotions ${promotions.status}, zones ${zones.status})`},{status:502});
  return NextResponse.json({promotions:await promotions.json(),zones:await zones.json()});
 }catch{return NextResponse.json({error:'Unable to reach OmniCore API'},{status:502})}
}
