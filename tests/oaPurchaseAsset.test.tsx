import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { history } from '@umijs/max';
import dayjs from 'dayjs';
import AssetManagePage from '@/pages/oa/asset';
import MyAssetPage from '@/pages/oa/asset/mine';
import PurchaseManagePage from '@/pages/oa/purchase';
import {
  closeOaStocktake,
  countOaStocktake,
  createOaAssetTemplate,
  createOaPurchaseTemplate,
  getMyOaAsset,
  getMyOaPurchase,
  getOaPurchase,
  getOaStocktake,
  getOaSupplyRequest,
  issueOaSupplyRequest,
  operateOaAsset,
  orderOaPurchase,
  queryMyOaAssets,
  queryMyOaPurchases,
  queryOaAssets,
  queryOaEmployeeOptions,
  queryOaPurchaseBudgets,
  queryOaPurchaseDepts,
  queryOaPurchases,
  queryOaStocktakes,
  queryOaSupplyItems,
  queryOaSupplyRequests,
  receiveOaPurchase,
  saveOaPurchaseBudget,
  stockInOaSupply,
} from '@/services/web/guardfind/oa';
import {
  assetActionNeedsHolder,
  assetActions,
  pendingQty,
  stocktakeVariance,
} from '@/utils/oaAsset';

jest.mock('@umijs/max', () => ({
  history: { push: jest.fn() },
}));

jest.mock('@/hooks/useAccess', () => ({
  useAccess: () => ({
    permissions: [],
    roles: [],
    isAdmin: true,
    hasPermission: () => true,
    hasRole: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
  }),
}));

jest.mock('@/services/web/guardfind/oa', () => ({
  closeOaStocktake: jest.fn(),
  countOaStocktake: jest.fn(),
  createOaAsset: jest.fn(),
  createOaAssetTemplate: jest.fn(),
  createOaPurchaseTemplate: jest.fn(),
  createOaStocktake: jest.fn(),
  createOaSupplyItem: jest.fn(),
  executeOaAssetScrap: jest.fn(),
  getMyOaAsset: jest.fn(),
  getMyOaPurchase: jest.fn(),
  getMyOaSupplyRequest: jest.fn(),
  getOaAsset: jest.fn(),
  getOaPurchase: jest.fn(),
  getOaStocktake: jest.fn(),
  getOaSupplyRequest: jest.fn(),
  issueOaSupplyRequest: jest.fn(),
  operateOaAsset: jest.fn(),
  orderOaPurchase: jest.fn(),
  queryMyOaAssets: jest.fn(),
  queryMyOaAssetScraps: jest.fn(),
  queryMyOaPurchases: jest.fn(),
  queryMyOaSupplyRequests: jest.fn(),
  queryOaAssets: jest.fn(),
  queryOaAssetScraps: jest.fn(),
  queryOaEmployeeOptions: jest.fn(),
  queryOaPurchaseBudgetLedger: jest.fn(),
  queryOaPurchaseBudgets: jest.fn(),
  queryOaPurchaseDepts: jest.fn(),
  queryOaPurchases: jest.fn(),
  queryOaStocktakes: jest.fn(),
  queryOaSupplyItems: jest.fn(),
  queryOaSupplyLedger: jest.fn(),
  queryOaSupplyRequests: jest.fn(),
  receiveOaPurchase: jest.fn(),
  saveOaPurchaseBudget: jest.fn(),
  stockInOaSupply: jest.fn(),
  stockOutOaSupply: jest.fn(),
  updateOaSupplyItem: jest.fn(),
}));

const today = dayjs().format('YYYY-MM-DD');

const purchaseBase = {
  applicationId: 90,
  applicationStatus: 'APPROVED',
  applicantId: 101,
  applicantName: '张三',
  deptId: 5,
  deptName: '行政部',
  totalAmount: '7025.00',
  itemCount: 2,
};

const pendingPurchase = {
  ...purchaseBase,
  id: 1,
  title: '办公电脑采购',
  purchaseNo: 'PO-20261109-0001',
  status: 'PENDING_ORDER',
};

const orderedPurchase = {
  ...purchaseBase,
  id: 2,
  title: '签字笔采购',
  purchaseNo: 'PO-20261109-0002',
  status: 'ORDERED',
  supplier: '京东',
};

const purchaseItems = [
  {
    id: 11,
    lineNo: 1,
    itemName: '笔记本电脑',
    category: 'ASSET',
    quantity: 2,
    unitPrice: '3500.00',
    amount: '7000.00',
    receivedQty: 0,
  },
  {
    id: 12,
    lineNo: 2,
    itemName: '签字笔',
    category: 'SUPPLY',
    supplyCode: 'PEN',
    quantity: 10,
    unitPrice: '2.50',
    amount: '25.00',
    receivedQty: 4,
  },
];

const budget = {
  id: 7,
  deptId: 5,
  deptName: '行政部',
  budgetYear: dayjs().year(),
  amount: '50000.00',
  usedAmount: '7025.00',
  occupiedAmount: '0.00',
  availableAmount: '42975.00',
  remark: null,
  version: 2,
};

const supply = {
  id: 21,
  code: 'PEN',
  name: '签字笔',
  unit: '支',
  stock: 6,
  safetyStock: 10,
  belowSafety: true,
  status: 'ENABLED',
  version: 0,
};

const assetBase = {
  category: '电脑',
  originalValue: '3500.00',
  scrapPending: false,
  version: 0,
};

const stockAsset = {
  ...assetBase,
  id: 31,
  assetNo: 'AS-0001',
  name: '笔记本电脑',
  status: 'IN_STOCK',
};

const usedAsset = {
  ...assetBase,
  id: 32,
  assetNo: 'AS-0002',
  name: '显示器',
  status: 'IN_USE',
  holderId: 101,
  holderName: '张三',
  location: '三楼',
};

beforeAll(() => {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function rowOf(text: string) {
  return screen.getByText(text).closest('tr') as HTMLElement;
}

describe('采购资产工具函数', () => {
  it('资产动作与状态约束一致，待验收与盘点差异按数量计算', () => {
    expect(assetActions('IN_STOCK')).toEqual(['ASSIGN', 'REPAIR']);
    expect(assetActions('IN_USE')).toEqual(['RETURN', 'TRANSFER', 'REPAIR']);
    expect(assetActions('REPAIR')).toEqual(['REPAIRED']);
    expect(assetActions('SCRAPPED')).toEqual([]);
    expect(assetActionNeedsHolder('TRANSFER')).toBe(true);
    expect(assetActionNeedsHolder('RETURN')).toBe(false);
    expect(pendingQty({ quantity: 10, receivedQty: 4 })).toBe(6);
    expect(pendingQty({ quantity: 2, receivedQty: 3 })).toBe(0);
    expect(stocktakeVariance({ bookQty: 6, countedQty: null })).toBeNull();
    expect(stocktakeVariance({ bookQty: 6, countedQty: 4 })).toBe(-2);
  });
});

describe('采购管理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaPurchases).mockResolvedValue({
      data: { list: [pendingPurchase, orderedPurchase], total: 2 },
    } as any);
    jest.mocked(queryOaPurchaseBudgets).mockResolvedValue({
      data: [budget],
    } as any);
    jest.mocked(queryOaPurchaseDepts).mockResolvedValue({
      data: [{ id: 5, name: '行政部' }],
    } as any);
  });

  it('登记下单只提交供应商与日期', async () => {
    jest.mocked(orderOaPurchase).mockResolvedValue({ data: {} } as any);
    render(<PurchaseManagePage />);
    await screen.findByText('PO-20261109-0001');

    fireEvent.click(
      within(rowOf('PO-20261109-0001')).getByRole('button', {
        name: '登记下单',
      }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('供应商'), {
      target: { value: ' 京东 ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /确认下单/ }));

    await waitFor(() => expect(orderOaPurchase).toHaveBeenCalledTimes(1));
    expect(jest.mocked(orderOaPurchase).mock.calls[0]).toEqual([
      1,
      { supplier: '京东', orderNo: undefined, orderDate: today },
    ]);
    await waitFor(() => expect(queryOaPurchases).toHaveBeenCalledTimes(2));
  });

  it('分批验收默认待验收数量，失败重试复用同一请求号', async () => {
    jest.mocked(getOaPurchase).mockResolvedValue({
      data: {
        purchase: orderedPurchase,
        items: purchaseItems,
        receipts: [],
        assets: [],
      },
    } as any);
    jest
      .mocked(receiveOaPurchase)
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce({
        data: { purchase: { ...orderedPurchase, status: 'PARTIAL' } },
      } as any);
    render(<PurchaseManagePage />);
    await screen.findByText('PO-20261109-0002');

    fireEvent.click(
      within(rowOf('PO-20261109-0002')).getByRole('button', {
        name: '登记验收',
      }),
    );
    const dialog = await screen.findByRole('dialog');
    const laptop = within(dialog).getByLabelText(
      '笔记本电脑验收数量',
    ) as HTMLInputElement;
    expect(laptop.value).toBe('2');
    expect(
      (within(dialog).getByLabelText('签字笔验收数量') as HTMLInputElement)
        .value,
    ).toBe('6');
    fireEvent.change(laptop, { target: { value: '1' } });

    const submit = within(dialog).getByRole('button', { name: /确认验收/ });
    fireEvent.click(submit);
    await waitFor(() => expect(receiveOaPurchase).toHaveBeenCalledTimes(1));
    fireEvent.click(submit);
    await waitFor(() => expect(receiveOaPurchase).toHaveBeenCalledTimes(2));

    const [first, second] = jest.mocked(receiveOaPurchase).mock.calls;
    expect(first[0]).toBe(2);
    expect(first[1]).toMatchObject({
      receiveDate: today,
      lines: [
        { itemId: 11, quantity: 1 },
        { itemId: 12, quantity: 6 },
      ],
    });
    expect(first[1].requestId).toMatch(/^receive-/);
    expect(second[1].requestId).toBe(first[1].requestId);
  });

  it('调整部门预算携带版本号', async () => {
    jest.mocked(saveOaPurchaseBudget).mockResolvedValue({ data: {} } as any);
    render(<PurchaseManagePage />);
    await screen.findByText('PO-20261109-0001');
    fireEvent.click(screen.getByRole('tab', { name: '部门预算' }));

    fireEvent.click(
      await screen.findByRole('button', { name: '调整' }, { timeout: 15000 }),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('预算额度'), {
      target: { value: '60000' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(saveOaPurchaseBudget).toHaveBeenCalledTimes(1));
    expect(jest.mocked(saveOaPurchaseBudget).mock.calls[0][0]).toEqual({
      deptId: 5,
      budgetYear: dayjs().year(),
      amount: 60000,
      remark: undefined,
      version: 2,
    });
  });

  it('生成采购模板后进入流程设计', async () => {
    jest.mocked(createOaPurchaseTemplate).mockResolvedValue({
      data: { formId: 8, modelId: 18, modelKey: 'purchase_pilot' },
    } as any);
    render(<PurchaseManagePage />);
    await screen.findByText('PO-20261109-0001');

    fireEvent.click(screen.getByRole('button', { name: /生成采购模板/ }));
    const confirm = await screen.findByText('生成采购模板？');
    const popover = confirm.closest('.ant-popover') as HTMLElement;
    fireEvent.click(within(popover).getByRole('button', { name: /生\s*成/ }));

    await waitFor(() =>
      expect(history.push).toHaveBeenCalledWith('/oa/process/design?id=18'),
    );
  });
});

describe('资产用品', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaSupplyItems).mockResolvedValue({
      data: [supply],
    } as any);
    jest.mocked(queryOaAssets).mockResolvedValue({
      data: { list: [stockAsset, usedAsset], total: 2 },
    } as any);
    jest.mocked(queryOaEmployeeOptions).mockResolvedValue({
      data: [
        { userId: '547889293968801825', nickname: '李四', deptName: '研发部' },
      ],
    } as any);
    jest.mocked(queryOaSupplyRequests).mockResolvedValue({
      data: {
        list: [
          {
            id: 41,
            applicationId: 95,
            title: '签字笔领用',
            applicantId: 101,
            applicantName: '张三',
            itemCount: 1,
            totalQuantity: 3,
            status: 'PENDING_ISSUE',
          },
        ],
        total: 1,
      },
    } as any);
    jest.mocked(queryOaStocktakes).mockResolvedValue({
      data: {
        list: [
          {
            id: 51,
            title: '11月盘点',
            status: 'OPEN',
            lineCount: 2,
            countedCount: 0,
            varianceCount: 0,
            createUser: 1,
          },
        ],
        total: 1,
      },
    } as any);
  });

  it('手工入库携带请求号并刷新库存', async () => {
    jest.mocked(stockInOaSupply).mockResolvedValue({ data: supply } as any);
    render(<AssetManagePage />);
    expect(await screen.findByText('6 支（低于安全库存）')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /入\s*库/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('变动数量'), {
      target: { value: '20' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /确认入库/ }));

    await waitFor(() => expect(stockInOaSupply).toHaveBeenCalledTimes(1));
    const [id, data] = jest.mocked(stockInOaSupply).mock.calls[0];
    expect(id).toBe(21);
    expect(data).toMatchObject({ quantity: 20, remark: undefined });
    expect(data.requestId).toMatch(/^stock-in-/);
    await waitFor(() => expect(queryOaSupplyItems).toHaveBeenCalledTimes(2));
  });

  it('登记发放：库存不足时禁止提交', async () => {
    jest.mocked(getOaSupplyRequest).mockResolvedValue({
      data: {
        request: {
          id: 41,
          applicationId: 95,
          applicantId: 101,
          itemCount: 1,
          totalQuantity: 8,
          status: 'PENDING_ISSUE',
        },
        items: [
          {
            itemId: 21,
            code: 'PEN',
            name: '签字笔',
            unit: '支',
            quantity: 8,
            stock: 6,
          },
        ],
      },
    } as any);
    render(<AssetManagePage />);
    await screen.findByText('6 支（低于安全库存）', {}, { timeout: 15000 });
    fireEvent.click(screen.getByRole('tab', { name: '领用发放' }));
    await screen.findByText('签字笔领用', {}, { timeout: 15000 });

    fireEvent.click(screen.getByRole('button', { name: '登记发放' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('签字笔 库存不足，请先入库再发放'),
    ).toBeTruthy();
    const submit = within(dialog).getByRole('button', {
      name: /确认发放/,
    }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(issueOaSupplyRequest).not.toHaveBeenCalled();
  });

  it('资产领用需选择使用人，雪花 ID 原样以字符串提交', async () => {
    jest.mocked(operateOaAsset).mockResolvedValue({ data: {} } as any);
    render(<AssetManagePage />);
    await screen.findByText('6 支（低于安全库存）', {}, { timeout: 15000 });
    fireEvent.click(screen.getByRole('tab', { name: '资产卡片' }));
    await screen.findByText('AS-0001', {}, { timeout: 15000 });

    fireEvent.click(
      within(rowOf('AS-0001')).getByRole('button', { name: '登记变动' }),
    );
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    fireEvent.click(within(dialog).getByRole('button', { name: /确认登记/ }));
    expect(
      await within(dialog).findByText('请选择使用人', {}, { timeout: 15000 }),
    ).toBeTruthy();
    expect(operateOaAsset).not.toHaveBeenCalled();

    const holder = within(dialog).getByRole('combobox', { name: '使用人' });
    fireEvent.mouseDown(holder);
    fireEvent.click(
      await screen.findByText('李四 · 研发部', {}, { timeout: 15000 }),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: /确认登记/ }));

    await waitFor(() => expect(operateOaAsset).toHaveBeenCalledTimes(1), {
      timeout: 15000,
    });
    const [id, data] = jest.mocked(operateOaAsset).mock.calls[0];
    expect(id).toBe(31);
    expect(data).toMatchObject({
      action: 'ASSIGN',
      holderId: '547889293968801825',
    });
    expect(data.requestId).toMatch(/^asset-op-/);
  }, 90000);

  it('资产归还不提交使用人', async () => {
    jest.mocked(operateOaAsset).mockResolvedValue({ data: {} } as any);
    render(<AssetManagePage />);
    await screen.findByText('6 支（低于安全库存）', {}, { timeout: 15000 });
    fireEvent.click(screen.getByRole('tab', { name: '资产卡片' }));
    await screen.findByText('AS-0002', {}, { timeout: 15000 });

    fireEvent.click(
      within(rowOf('AS-0002')).getByRole('button', { name: '登记变动' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByLabelText('使用人')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: /确认登记/ }));

    await waitFor(() => expect(operateOaAsset).toHaveBeenCalledTimes(1));
    expect(jest.mocked(operateOaAsset).mock.calls[0][1]).toMatchObject({
      action: 'RETURN',
      holderId: undefined,
      location: '三楼',
    });
  });

  it('盘点录入实盘后保存，全部盘完才能完成', async () => {
    const lines = [
      {
        id: 61,
        targetType: 'SUPPLY',
        targetId: 21,
        targetCode: 'PEN',
        targetName: '签字笔',
        bookQty: 6,
        countedQty: null,
      },
      {
        id: 62,
        targetType: 'ASSET',
        targetId: 31,
        targetCode: 'AS-0001',
        targetName: '笔记本电脑',
        bookQty: 1,
        countedQty: null,
      },
    ];
    const stocktake = {
      id: 51,
      title: '11月盘点',
      status: 'OPEN',
      lineCount: 2,
      countedCount: 0,
      varianceCount: 0,
      createUser: 1,
    };
    jest.mocked(getOaStocktake).mockResolvedValue({
      data: { stocktake, lines },
    } as any);
    jest.mocked(countOaStocktake).mockResolvedValue({
      data: {
        stocktake: { ...stocktake, countedCount: 2, varianceCount: 1 },
        lines: [
          { ...lines[0], countedQty: 4 },
          { ...lines[1], countedQty: 1 },
        ],
      },
    } as any);
    jest.mocked(closeOaStocktake).mockResolvedValue({
      data: {
        stocktake: { ...stocktake, status: 'CLOSED', countedCount: 2 },
        lines: [
          { ...lines[0], countedQty: 4, adjustedQty: -2 },
          { ...lines[1], countedQty: 1, adjustedQty: 0 },
        ],
      },
    } as any);
    render(<AssetManagePage />);
    await screen.findByText('6 支（低于安全库存）', {}, { timeout: 15000 });
    fireEvent.click(screen.getByRole('tab', { name: '盘点' }));
    await screen.findByText('11月盘点', {}, { timeout: 15000 });

    fireEvent.click(screen.getByRole('button', { name: '录入' }));
    expect(await screen.findByText('还有 2 项未盘点')).toBeTruthy();
    const finish = screen.getByRole('button', {
      name: '完成盘点',
    }) as HTMLButtonElement;
    expect(finish.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('签字笔实盘数量'), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText('笔记本电脑实盘数量'), {
      target: { value: '1' },
    });
    expect(screen.getByText('盘亏 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '保存实盘' }));

    await waitFor(() => expect(countOaStocktake).toHaveBeenCalledTimes(1), {
      timeout: 15000,
    });
    expect(jest.mocked(countOaStocktake).mock.calls[0]).toEqual([
      51,
      {
        counts: [
          { lineId: 61, countedQty: 4 },
          { lineId: 62, countedQty: 1 },
        ],
      },
    ]);
    await waitFor(
      () =>
        expect(
          (
            screen.getByRole('button', {
              name: '完成盘点',
            }) as HTMLButtonElement
          ).disabled,
        ).toBe(false),
      { timeout: 15000 },
    );
    fireEvent.click(screen.getByRole('button', { name: '完成盘点' }));
    const confirm = await screen.findByText(
      '完成盘点？',
      {},
      { timeout: 15000 },
    );
    const popover = confirm.closest('.ant-popover') as HTMLElement;
    fireEvent.click(within(popover).getByRole('button', { name: /完\s*成/ }));
    await waitFor(() => expect(closeOaStocktake).toHaveBeenCalledWith(51), {
      timeout: 15000,
    });
  }, 90000);

  it('生成领用报废模板后进入领用流程设计', async () => {
    jest.mocked(createOaAssetTemplate).mockResolvedValue({
      data: {
        supplyFormId: 9,
        supplyModelId: 19,
        supplyModelKey: 'supply_pilot',
        scrapFormId: 10,
        scrapModelId: 20,
        scrapModelKey: 'scrap_pilot',
      },
    } as any);
    render(<AssetManagePage />);
    await screen.findByText('6 支（低于安全库存）', {}, { timeout: 15000 });

    fireEvent.click(screen.getByRole('button', { name: /生成领用报废模板/ }));
    const confirm = await screen.findByText('生成领用与报废模板？');
    const popover = confirm.closest('.ant-popover') as HTMLElement;
    fireEvent.click(within(popover).getByRole('button', { name: /生\s*成/ }));

    await waitFor(() =>
      expect(history.push).toHaveBeenCalledWith('/oa/process/design?id=19'),
    );
  });
});

describe('我的采购资产', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryMyOaAssets).mockResolvedValue({
      data: { list: [usedAsset], total: 1 },
    } as any);
    jest.mocked(queryMyOaPurchases).mockResolvedValue({
      data: { list: [orderedPurchase], total: 1 },
    } as any);
  });

  it('查看名下资产履历与本人采购单', async () => {
    jest.mocked(getMyOaAsset).mockResolvedValue({
      data: {
        asset: usedAsset,
        logs: [
          {
            id: 1,
            assetId: 32,
            action: 'ASSIGN',
            fromStatus: 'IN_STOCK',
            toStatus: 'IN_USE',
            toHolderId: 101,
            toHolderName: '张三',
            operatorId: 1,
            operatorName: '管理员王五',
          },
        ],
        scraps: [],
      },
    } as any);
    jest.mocked(getMyOaPurchase).mockResolvedValue({
      data: {
        purchase: orderedPurchase,
        items: purchaseItems,
        receipts: [],
        assets: [],
      },
    } as any);
    render(<MyAssetPage />);
    expect(await screen.findByText('AS-0002')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: '发起采购、领用或报废' }),
    );
    expect(history.push).toHaveBeenCalledWith('/oa/launch');

    fireEvent.click(screen.getByRole('button', { name: '详情' }));
    expect(await screen.findByText('管理员王五')).toBeTruthy();
    expect(getMyOaAsset).toHaveBeenCalledWith(32);
    expect(screen.getByText('在库 → 在用')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: '我的采购' }));
    await screen.findByText('PO-20261109-0002', {}, { timeout: 15000 });
    const detailButtons = screen.getAllByRole('button', { name: '详情' });
    fireEvent.click(detailButtons[detailButtons.length - 1]);
    await waitFor(() => expect(getMyOaPurchase).toHaveBeenCalledWith(2));
    expect(await screen.findByText('笔记本电脑')).toBeTruthy();
  });
});
