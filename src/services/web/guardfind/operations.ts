import { request } from 'umi';
import type { R } from '@/typings';
export interface OpsPage<T> { list:T[]; total:number }
export interface Customer { id:string; nickname:string; avatar?:string; accountStatus:number; isPropertyManager:number; createTime?:string }
export interface Reception { activeBookings?:number; propertyId?:string; managerId?:string|null; managerName?:string; availability:'ACTIVE'|'RENTED'|'SOLD'|'PAUSED'; reason?:string; reopenDate?:string; latitude?:number|null; longitude?:number|null; meetingPoint?:string; instructions?:string; version:number }
export interface BookingLog { id:string; actorType:string; action:string; fromStatus:number|null; toStatus:number; reason?:string; createTime:string }
export interface OpsBooking { id:string; propertyId:string; propertyTitle?:string; userId:string; contactName:string; contactPhone:string; bookingTime:string; status:number; remark?:string; managerName?:string }
export interface BookingDetail extends OpsBooking { logs:BookingLog[]; reception:Reception; property:{id:string;title:string;address:string}[] }
export interface Settings { operator:string; contact:string; policyVersion:string; effectiveDate:string; policiesPublished:boolean; userAgreement:string; privacyPolicy:string; subscriptionEnabled:boolean; templateId:string; titleField:string; timeField:string; statusField:string; reminderHours:number; expiryHours:number }
export interface Ticket { userId?:string; nickname?:string; ownerAdminId?:string|null; state:'OPEN'|'RESOLVED'; version:number; property?:{id:string;title:string}[]; logs?:{id:string;adminName?:string;action:string;note?:string;createTime:string}[] }
export interface Metrics { events:{eventType:string;total:number}[]; bookings:{status:number;total:number}[]; daily:{day:string;eventType:string;total:number}[]; pending:number; overdue:number; unresolved:number; managers:{managerId:string;nickname:string;bookings:number;completed:number}[]; properties:{id:string;title:string;events:number;consultations:number}[] }
export const bookingLabels:Record<number,string>={1:'待确认',2:'已确认',3:'已拒绝',4:'已取消',5:'已到访',6:'已完成',7:'未到访',8:'已过期'};
export const availabilityLabels={ACTIVE:'正常接待',RENTED:'已出租',SOLD:'已售出',PAUSED:'暂停接待'};
export const customerOptions=(keyword='',managers=false)=>request<R<OpsPage<Customer>>>(`system/property/operations/customer-options`,{params:{keyword,managers}});
export const customers=(params:Record<string,unknown>)=>request<R<OpsPage<Customer>>>(`system/property/operations/customers`,{params});
export const customerStatus=(id:string,status:number)=>request<R<void>>(`system/property/operations/customer/${id}/status`,{method:'POST',params:{status}});
export const reception=(id:string)=>request<R<Reception>>(`system/property/operations/property/${id}`);
export const saveReception=(id:string,data:Reception)=>request<R<void>>(`system/property/operations/property/${id}`,{method:'PUT',data});
export const bookings=(params:Record<string,unknown>)=>request<R<OpsPage<OpsBooking>>>(`system/property/operations/bookings`,{params});
export const bookingDetail=(id:string)=>request<R<BookingDetail>>(`system/property/operations/booking/${id}`);
export const bookingAction=(id:string,data:{action:string;reason?:string;bookingTime?:string})=>request<R<void>>(`system/property/operations/booking/${id}/action`,{method:'POST',data});
export const settings=()=>request<R<Settings>>(`system/property/operations/settings`);
export const saveSettings=(data:Settings)=>request<R<void>>(`system/property/operations/settings`,{method:'PUT',data});
export const metrics=(days:number)=>request<R<Metrics>>(`system/property/operations/stats`,{params:{days}});
export const notificationRecords=(params:Record<string,unknown>)=>request<R<OpsPage<{id:string;bookingId:string;userId:string;state:string;result:string;createTime:string}>>>(`system/property/operations/notifications`,{params});
export const ticket=(user:string)=>request<R<Ticket>>(`system/im/workflow/${user}`);
export const ticketAction=(user:string,data:{action:string;note?:string;ownerAdminId?:string;version:number})=>request<R<void>>(`system/im/workflow/${user}`,{method:'POST',data});
export const tickets=(params:Record<string,unknown>)=>request<R<OpsPage<Ticket>>>(`system/im/workflow`,{params});
export const adminOptions=()=>request<R<{id:string;nickname:string}[]>>('system/im/workflow-admins/options');
