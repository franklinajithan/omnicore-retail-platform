import type {EmployeeStatus} from '@prisma/client';
export type StoreAccessInput={
 employee:{id:string;status:EmployeeStatus;role:string};
 assignedStoreIds:string[];
 temporaryGrants:{storeId:string;validFrom:Date;validUntil:Date;revokedAt:Date|null}[];
 requestedStoreId:string;
 device:{storeId:string;enabled:boolean}|null;
 now:Date;
};
export function checkStoreLoginAccess(input:StoreAccessInput):{allowed:boolean;reason:string}{
 if(input.employee.status!=='ACTIVE')return{allowed:false,reason:'EMPLOYEE_INACTIVE'};
 if(!input.device||!input.device.enabled)return{allowed:false,reason:'DEVICE_NOT_REGISTERED'};
 if(input.device.storeId!==input.requestedStoreId)return{allowed:false,reason:'DEVICE_STORE_MISMATCH'};
 if(input.assignedStoreIds.includes(input.requestedStoreId))return{allowed:true,reason:'ASSIGNED_STORE'};
 const grant=input.temporaryGrants.some(g=>g.storeId===input.requestedStoreId&&!g.revokedAt&&g.validFrom<=input.now&&g.validUntil>input.now);
 return grant?{allowed:true,reason:'TEMPORARY_ACCESS'}:{allowed:false,reason:'STORE_NOT_ASSIGNED'};
}
