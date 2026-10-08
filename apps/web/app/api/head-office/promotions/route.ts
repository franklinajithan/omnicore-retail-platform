import {NextResponse} from 'next/server';
export async function GET(){
 return NextResponse.json({error:'Head Office promotions require authenticated, role-checked employee sessions. Access is disabled until that integration is complete.'},{status:403});
}
