import {NextRequest,NextResponse} from 'next/server';
import {createHmac,timingSafeEqual} from 'node:crypto';
const cookie='omnicore_catalog_pilot';
function secret(){return process.env.OMNICORE_CATALOG_ADMIN_TOKEN||''}
function sig(expires:string){return createHmac('sha256',secret()).update('catalog-pilot:'+expires).digest('hex')}
function valid(req:NextRequest){const [expires,signature]=(req.cookies.get(cookie)?.value||'').split('.');if(!secret()||!expires||!signature||!/^\\d{13}$/.test(expires)||Number(expires)<Date.now())return false;const a=Buffer.from(sig(expires)),b=Buffer.from(signature);return a.length===b.length&&timingSafeEqual(a,b)}
function sameOrigin(req:NextRequest){const origin=req.headers.get('origin');return !!origin&&origin===new URL(req.url).origin}
export async function GET(req:NextRequest){return NextResponse.json({authenticated:valid(req),configured:!!secret()&&!!process.env.OMNICORE_CATALOG_API_URL},{headers:{'cache-control':'no-store'}})}
export async function POST(req:NextRequest){if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});const pass=(await req.json().catch(()=>({}))).password;if(typeof pass!=='string'||!secret())return NextResponse.json({error:'Invalid credentials'},{status:401});const a=Buffer.from(pass),b=Buffer.from(secret());if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'Invalid credentials'},{status:401});const expires=String(Date.now()+60*60*1000);const res=NextResponse.json({authenticated:true});res.cookies.set(cookie,expires+'.'+sig(expires),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:3600});return res}
export async function DELETE(req:NextRequest){if(!sameOrigin(req))return NextResponse.json({error:'Origin rejected'},{status:403});const res=NextResponse.json({authenticated:false});res.cookies.delete(cookie);return res}
