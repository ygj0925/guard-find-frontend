/**
 * 采购资产试点的前端工具：与后端 OaPurchaseHook/OaSupplyRequestHook/OaAssetScrapHook 约定的状态、动作文案。
 */
import type { OaAssetAction } from '@/services/web/guardfind/oa';

type Meta = Record<string, { text: string; color: string }>;

export const PURCHASE_STATUS_META: Meta = {
  APPROVING: { text: '审批中', color: 'processing' },
  PENDING_ORDER: { text: '待下单', color: 'orange' },
  ORDERED: { text: '已下单', color: 'blue' },
  PARTIAL: { text: '部分验收', color: 'gold' },
  RECEIVED: { text: '已验收', color: 'green' },
  CLOSED: { text: '已关闭', color: 'default' },
};

export const PURCHASE_CATEGORY_META: Meta = {
  SUPPLY: { text: '用品', color: 'cyan' },
  ASSET: { text: '资产', color: 'purple' },
  OTHER: { text: '其他', color: 'default' },
};

export const BUDGET_LEDGER_ACTION_META: Meta = {
  GRANT: { text: '下达', color: 'blue' },
  ADJUST: { text: '调整', color: 'geekblue' },
  OCCUPY: { text: '占用', color: 'orange' },
  RELEASE: { text: '释放', color: 'default' },
  USE: { text: '核定使用', color: 'green' },
};

export const SUPPLY_REQUEST_STATUS_META: Meta = {
  APPROVING: { text: '审批中', color: 'processing' },
  PENDING_ISSUE: { text: '待发放', color: 'orange' },
  ISSUED: { text: '已发放', color: 'green' },
  CLOSED: { text: '已关闭', color: 'default' },
};

export const SUPPLY_STATUS_META: Meta = {
  ENABLED: { text: '启用', color: 'green' },
  DISABLED: { text: '停用', color: 'default' },
};

export const SUPPLY_LEDGER_ACTION_META: Meta = {
  IN: { text: '入库', color: 'green' },
  OUT: { text: '出库', color: 'orange' },
  ADJUST: { text: '盘点调整', color: 'purple' },
};

export const SUPPLY_REF_TEXT: Record<string, string> = {
  MANUAL: '手工',
  PURCHASE: '采购验收',
  ISSUE: '领用发放',
  STOCKTAKE: '盘点',
};

export const ASSET_STATUS_META: Meta = {
  IN_STOCK: { text: '在库', color: 'blue' },
  IN_USE: { text: '在用', color: 'green' },
  REPAIR: { text: '维修中', color: 'orange' },
  SCRAPPED: { text: '已报废', color: 'default' },
};

export const ASSET_LOG_ACTION_META: Meta = {
  IN: { text: '入库建卡', color: 'blue' },
  ASSIGN: { text: '领用', color: 'green' },
  RETURN: { text: '归还', color: 'cyan' },
  TRANSFER: { text: '调拨', color: 'geekblue' },
  REPAIR: { text: '送修', color: 'orange' },
  REPAIRED: { text: '修复', color: 'lime' },
  SCRAP: { text: '报废', color: 'red' },
  CHECK: { text: '盘点', color: 'purple' },
};

export const SCRAP_STATUS_META: Meta = {
  APPROVING: { text: '审批中', color: 'processing' },
  PENDING_SCRAP: { text: '待执行', color: 'orange' },
  SCRAPPED: { text: '已报废', color: 'default' },
  CLOSED: { text: '已关闭', color: 'default' },
};

export const STOCKTAKE_STATUS_META: Meta = {
  OPEN: { text: '盘点中', color: 'processing' },
  CLOSED: { text: '已完成', color: 'green' },
};

export const ASSET_ACTION_TEXT: Record<OaAssetAction, string> = {
  ASSIGN: '领用',
  RETURN: '归还',
  TRANSFER: '调拨',
  REPAIR: '送修',
  REPAIRED: '修复',
};

/** 与 OaAssetService.operate 的状态约束一致：在库可领用/送修，在用可归还/调拨/送修，维修中可修复 */
export function assetActions(status: string): OaAssetAction[] {
  switch (status) {
    case 'IN_STOCK':
      return ['ASSIGN', 'REPAIR'];
    case 'IN_USE':
      return ['RETURN', 'TRANSFER', 'REPAIR'];
    case 'REPAIR':
      return ['REPAIRED'];
    default:
      return [];
  }
}

export function assetActionNeedsHolder(action?: OaAssetAction) {
  return action === 'ASSIGN' || action === 'TRANSFER';
}

/** 待验收数量 = 采购数量 − 已验收 */
export function pendingQty(item: { quantity: number; receivedQty: number }) {
  return Math.max(0, item.quantity - item.receivedQty);
}

/** 盘点差异：未录入返回 null，资产账面恒为 1 */
export function stocktakeVariance(line: {
  bookQty: number;
  countedQty?: number | null;
}) {
  if (line.countedQty === null || line.countedQty === undefined) return null;
  return line.countedQty - line.bookQty;
}
