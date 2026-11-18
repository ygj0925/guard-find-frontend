import { request } from 'umi';
import type { R } from '@/typings';
export interface LeaseBill {
  id: string
  kind: 'RENT' | 'DEPOSIT' | 'OTHER'
  title: string
  periodStart: string
  periodEnd: string
  dueDate: string
  amount: number
  status: 'UNPAID' | 'OVERDUE' | 'PENDING_CONFIRMATION' | 'PAID' | 'VOID'
  version: number
  paymentReference?: string
  paymentFileId?: string
  paidDate?: string
  confirmedAt?: string
}
export interface LeaseDocument {
  id: string
  kind: 'CHECK_IN' | 'CHECK_OUT' | 'SETTLEMENT'
  status: 'PENDING' | 'DISPUTED' | 'CONFIRMED' | 'REFUND_PENDING' | 'REFUNDED' | 'CLOSED' | 'VOID'
  version: number
  contentHash: string
  tenantConfirmedAt?: string
  landlordConfirmedAt?: string
  refundReference?: string
  refundDate?: string
  refundReceivedAt?: string
  content: {
    date: string
    note: string
    inventory?: string
    condition?: string
    water?: string
    electricity?: string
    gas?: string
    keys?: number
    depositHeld?: number
    deductionTotal?: number
    refundAmount?: number
    deductions?: { title: string, amount: number }[]
    photos?: string[]
  }
}
export interface LeaseLifecycle { bills: LeaseBill[], documents: LeaseDocument[], amountDue: number, amountPaid: number, amountPending: number }
export interface LifecycleAction { action: string, version: number, reference?: string, paidDate?: string, reason?: string, contentHash?: string, fileId?: string }
export const billLabels = { UNPAID: '待缴费', OVERDUE: '已逾期', PENDING_CONFIRMATION: '付款待确认', PAID: '已收款', VOID: '已作废' }
export const documentLabels = { CHECK_IN: '入住交接单', CHECK_OUT: '退租交接单', SETTLEMENT: '押金结算单' }
export const documentStateLabels = { PENDING: '待双方确认', DISPUTED: '有异议，待处理', CONFIRMED: '双方已确认', REFUND_PENDING: '待退押金', REFUNDED: '已登记退款，待收款确认', CLOSED: '结算完成', VOID: '已作废' }
export interface BillInput { kind: 'RENT' | 'DEPOSIT' | 'OTHER'; title: string; periodStart: string; periodEnd: string; dueDate: string; amount: number }
export interface ScheduleInput { cycleMonths: number; dueDaysBefore: number; includeDeposit: boolean }
export interface DocumentInput { kind: LeaseDocument['kind']; date: string; inventory?: string; condition?: string; water?: string; electricity?: string; gas?: string; keys?: number; deductions?: { title: string; amount: number }[]; note: string; photos?: string[] }
export const queryLeaseLifecycle = (id: string) => request<R<LeaseLifecycle>>(`system/property/leases/${id}/lifecycle`);
export const reopenLeaseProperty = (id: string) => request<R<void>>(`system/property/leases/${id}/reopen`, { method: 'POST' });
export const createLeaseBill = (id: string, data: BillInput) => request<R<void>>(`system/property/leases/${id}/bills`, { method: 'POST', data });
export const generateLeaseBills = (id: string, data: ScheduleInput) => request<R<void>>(`system/property/leases/${id}/bills/generate`, { method: 'POST', data });
export const actOnLeaseBill = (id: string, billId: string, data: LifecycleAction) => request<R<void>>(`system/property/leases/${id}/bills/${billId}/action`, { method: 'POST', data });
export const createLeaseDocument = (id: string, data: DocumentInput) => request<R<void>>(`system/property/leases/${id}/documents`, { method: 'POST', data });
export const actOnLeaseDocument = (id: string, documentId: string, data: LifecycleAction) => request<R<void>>(`system/property/leases/${id}/documents/${documentId}/action`, { method: 'POST', data });
export const queryLeaseFile = (id: string, fileId: string) => request<R<{ mimeType: string; data: string }>>(`system/property/leases/${id}/files/${fileId}`);
export function uploadLeaseFile(id: string, file: File) {
  const data = new FormData(); data.append('file', file);
  return request<R<{ id: string }>>(`system/property/leases/${id}/files`, { method: 'POST', data });
}
