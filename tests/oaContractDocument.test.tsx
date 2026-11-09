import {
  configure,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { history } from '@umijs/max';
import dayjs from 'dayjs';
import ContractManagePage from '@/pages/oa/contract';
import MyContractPage from '@/pages/oa/contract/mine';
import DocumentManagePage from '@/pages/oa/document';
import DocumentInboxPage from '@/pages/oa/document/inbox';
import SealManagePage from '@/pages/oa/seal';
import {
  ackOaDocument,
  archiveOaContract,
  createOaContractTemplate,
  createOaSeal,
  executeOaSealRequest,
  getMyOaContract,
  getOaDocument,
  queryKeeperOaSealRequests,
  queryMyOaContracts,
  queryMyOaSealRequests,
  queryOaContracts,
  queryOaDocumentInbox,
  queryOaDocuments,
  queryOaEmployeeOptions,
  queryOaSealRequests,
  queryOaSeals,
  readOaDocument,
  revokeOaDocument,
  signOaContract,
  updateOaSeal,
} from '@/services/web/guardfind/oa';
import {
  audienceText,
  expiryHint,
  inboxState,
  percent,
  sealNeedsGm,
} from '@/utils/oaContract';

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
  ackOaDocument: jest.fn(),
  archiveOaContract: jest.fn(),
  createOaContractTemplate: jest.fn(),
  createOaDocumentTemplate: jest.fn(),
  createOaSeal: jest.fn(),
  createOaSealTemplate: jest.fn(),
  executeOaSealRequest: jest.fn(),
  getMyOaContract: jest.fn(),
  getOaContract: jest.fn(),
  getOaDocument: jest.fn(),
  queryKeeperOaSealFiles: jest.fn(),
  queryKeeperOaSealRequests: jest.fn(),
  queryMyOaContracts: jest.fn(),
  queryMyOaSealFiles: jest.fn(),
  queryMyOaSealRequests: jest.fn(),
  queryOaContracts: jest.fn(),
  queryOaDocumentInbox: jest.fn(),
  queryOaDocuments: jest.fn(),
  queryOaEmployeeOptions: jest.fn(),
  queryOaSealRequestFiles: jest.fn(),
  queryOaSealRequests: jest.fn(),
  queryOaSeals: jest.fn(),
  readOaDocument: jest.fn(),
  revokeOaDocument: jest.fn(),
  signOaContract: jest.fn(),
  updateOaSeal: jest.fn(),
}));

const today = dayjs().format('YYYY-MM-DD');

const contractBase = {
  title: '年度服务合同',
  counterparty: '某某科技',
  contractType: 'SERVICE',
  amount: '120000.00',
  startDate: '2026-01-01',
  ownerId: 101,
  ownerName: '张三',
  currentVersion: 1,
  currentApplicationId: 90,
  applicationStatus: 'APPROVED',
};

const pendingContract = {
  ...contractBase,
  id: 1,
  contractNo: 'HT-261109-0001',
  endDate: '2027-12-31',
  status: 'PENDING_SIGN',
};

const signedContract = {
  ...contractBase,
  id: 2,
  contractNo: 'HT-261109-0002',
  endDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
  status: 'SIGNED',
  signedDate: today,
  signatories: '我方张三',
  signedBy: 102,
};

const seal = {
  id: 7,
  code: 'HT-01',
  name: '合同专用章',
  sealType: 'CONTRACT',
  keeperId: '547889293968801825',
  keeperName: '李四',
  status: 'ENABLED',
  version: 3,
};

const sealRequest = {
  id: 61,
  applicationId: 96,
  title: '服务合同用印',
  applicantId: 101,
  applicantName: '张三',
  sealId: 7,
  sealCode: 'HT-01',
  sealName: '合同专用章',
  sealType: 'CONTRACT',
  keeperId: 102,
  keeperName: '李四',
  contractNo: 'HT-261109-0001',
  copies: 3,
  useDate: today,
  status: 'PENDING_SEAL',
};

const publishedDoc = {
  id: 81,
  docNo: 'GW-261109-0001',
  docType: 'NOTICE',
  title: '关于调整作息的通知',
  category: '行政',
  ownerId: 101,
  ownerName: '张三',
  status: 'PUBLISHED',
  publishedVersion: 1,
  latestVersion: 1,
  pendingApplicationId: null,
  requireAck: true,
  publishTime: '2026-11-09 10:00:00',
  receiptCount: 4,
  readCount: 3,
  ackCount: 1,
};

const revisingDoc = {
  ...publishedDoc,
  id: 82,
  docNo: 'GW-261109-0002',
  title: '报销制度说明',
  docType: 'KNOWLEDGE',
  latestVersion: 2,
  pendingApplicationId: 99,
  requireAck: false,
};

const inboxItem = {
  documentId: 81,
  docNo: 'GW-261109-0001',
  docType: 'NOTICE',
  title: '关于调整作息的通知',
  category: '行政',
  versionNo: 1,
  ownerName: '张三',
  publishTime: '2026-11-09 10:00:00',
  requireAck: true,
  readTime: null,
  ackTime: null,
};

jest.setTimeout(90000);
configure({ asyncUtilTimeout: 15000 });

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

describe('合同用印工具函数', () => {
  it('用印风险、到期提示、发布范围与阅读状态', () => {
    expect(sealNeedsGm('OFFICIAL', 1)).toBe(true);
    expect(sealNeedsGm('CONTRACT', 10)).toBe(false);
    expect(sealNeedsGm('CONTRACT', 11)).toBe(true);
    const base = dayjs('2026-11-09');
    expect(expiryHint('SIGNED', '2026-11-19', base)).toBe('10 天后到期');
    expect(expiryHint('ARCHIVED', '2026-11-09', base)).toBe('今日到期');
    expect(expiryHint('SIGNED', '2026-11-01', base)).toBe('已到期');
    expect(expiryHint('SIGNED', '2026-12-31', base)).toBeNull();
    expect(expiryHint('PENDING_SIGN', '2026-11-10', base)).toBeNull();
    expect(audienceText({ all: true })).toBe('全员');
    expect(audienceText({ all: false, depts: [1, 2], users: [3] })).toBe(
      '2 个部门（含下级）、1 名人员',
    );
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
    expect(
      inboxState({ requireAck: true, readTime: 'x', ackTime: null }).text,
    ).toBe('待签收');
    expect(
      inboxState({ requireAck: false, readTime: null, ackTime: null }).text,
    ).toBe('未读');
  });
});

describe('合同管理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaContracts).mockResolvedValue({
      data: { list: [pendingContract, signedContract], total: 2 },
    } as any);
  });

  it('登记签署失败重试复用同一请求号', async () => {
    jest
      .mocked(signOaContract)
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce({ data: {} } as any);
    render(<ContractManagePage />);
    await screen.findByText('HT-261109-0001');
    expect(
      within(rowOf('HT-261109-0002')).getByText('5 天后到期'),
    ).toBeTruthy();

    fireEvent.click(
      within(rowOf('HT-261109-0001')).getByRole('button', {
        name: '登记签署',
      }),
    );
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    fireEvent.change(within(dialog).getByLabelText('签署方代表'), {
      target: { value: ' 我方张三，对方王五 ' },
    });
    const submit = within(dialog).getByRole('button', { name: /确认签署/ });
    fireEvent.click(submit);
    await waitFor(() => expect(signOaContract).toHaveBeenCalledTimes(1));
    fireEvent.click(submit);
    await waitFor(() => expect(signOaContract).toHaveBeenCalledTimes(2));

    const [first, second] = jest.mocked(signOaContract).mock.calls;
    expect(first[0]).toBe(1);
    expect(first[1]).toMatchObject({
      signedDate: today,
      signatories: '我方张三，对方王五',
    });
    expect(first[1].requestId).toMatch(/^contract-sign-/);
    expect(second[1].requestId).toBe(first[1].requestId);
    await waitFor(() => expect(queryOaContracts).toHaveBeenCalledTimes(2));
  });

  it('登记归档必须填写档案号', async () => {
    jest.mocked(archiveOaContract).mockResolvedValue({ data: {} } as any);
    render(<ContractManagePage />);
    await screen.findByText('HT-261109-0002');

    fireEvent.click(
      within(rowOf('HT-261109-0002')).getByRole('button', {
        name: '登记归档',
      }),
    );
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    const submit = within(dialog).getByRole('button', { name: /确认归档/ });
    fireEvent.click(submit);
    expect(
      await within(dialog).findByText('请输入档案号', {}, { timeout: 15000 }),
    ).toBeTruthy();
    expect(archiveOaContract).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText('档案号'), {
      target: { value: 'DA-2026-001' },
    });
    fireEvent.click(submit);
    await waitFor(() => expect(archiveOaContract).toHaveBeenCalledTimes(1));
    expect(jest.mocked(archiveOaContract).mock.calls[0][1]).toMatchObject({
      archiveNo: 'DA-2026-001',
      location: undefined,
    });
  });

  it('生成合同模板后进入流程设计', async () => {
    jest.mocked(createOaContractTemplate).mockResolvedValue({
      data: { formId: 9, modelId: 19, modelKey: 'contract_pilot' },
    } as any);
    render(<ContractManagePage />);
    await screen.findByText('HT-261109-0001');

    fireEvent.click(screen.getByRole('button', { name: /生成合同模板/ }));
    const confirm = await screen.findByText('生成合同模板？');
    const popover = confirm.closest('.ant-popover') as HTMLElement;
    fireEvent.click(within(popover).getByRole('button', { name: /生\s*成/ }));

    await waitFor(() =>
      expect(history.push).toHaveBeenCalledWith('/oa/process/design?id=19'),
    );
  });
});

describe('用印管理', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaSeals).mockResolvedValue({ data: [seal] } as any);
    jest.mocked(queryOaEmployeeOptions).mockResolvedValue({
      data: [
        { userId: '547889293968801825', nickname: '李四', deptName: '行政部' },
      ],
    } as any);
    jest.mocked(queryOaSealRequests).mockResolvedValue({
      data: { list: [sealRequest], total: 1 },
    } as any);
    jest.mocked(queryKeeperOaSealRequests).mockResolvedValue({
      data: { list: [sealRequest], total: 1 },
    } as any);
  });

  it('编辑印章携带版本号，保管人雪花 ID 原样提交', async () => {
    jest.mocked(updateOaSeal).mockResolvedValue({ data: seal } as any);
    render(<SealManagePage />);
    await screen.findByText('合同专用章', {}, { timeout: 15000 });

    fireEvent.click(
      within(rowOf('合同专用章')).getByRole('button', { name: /编\s*辑/ }),
    );
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    fireEvent.change(within(dialog).getByLabelText('印章名称'), {
      target: { value: ' 合同章（新） ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(updateOaSeal).toHaveBeenCalledTimes(1));
    expect(jest.mocked(updateOaSeal).mock.calls[0]).toEqual([
      7,
      {
        code: 'HT-01',
        name: '合同章（新）',
        sealType: 'CONTRACT',
        keeperId: '547889293968801825',
        status: 'ENABLED',
        remark: undefined,
        version: 3,
      },
    ]);
    await waitFor(() => expect(queryOaSeals).toHaveBeenCalledTimes(2));
  }, 60000);

  it('新建印章校验编码格式', async () => {
    jest.mocked(createOaSeal).mockResolvedValue({ data: seal } as any);
    render(<SealManagePage />);
    await screen.findByText('合同专用章', {}, { timeout: 15000 });

    fireEvent.click(screen.getByRole('button', { name: /新建印章/ }));
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    fireEvent.change(within(dialog).getByLabelText('印章编码'), {
      target: { value: '公章 01' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /保\s*存/ }));
    expect(
      await within(dialog).findByText(
        '只能包含字母、数字、下划线和短横线',
        {},
        { timeout: 15000 },
      ),
    ).toBeTruthy();
    expect(createOaSeal).not.toHaveBeenCalled();
  }, 60000);

  it('保管人登记用印默认审批份数并携带请求号', async () => {
    jest.mocked(executeOaSealRequest).mockResolvedValue({ data: {} } as any);
    render(<SealManagePage />);
    await screen.findByText('合同专用章', {}, { timeout: 15000 });
    fireEvent.click(screen.getByRole('tab', { name: '待我用印' }));
    await screen.findByText('服务合同用印', {}, { timeout: 15000 });

    fireEvent.click(
      within(rowOf('服务合同用印')).getByRole('button', { name: '登记用印' }),
    );
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    expect(
      (within(dialog).getByLabelText('实际用印份数') as HTMLInputElement).value,
    ).toBe('3');
    fireEvent.click(within(dialog).getByRole('button', { name: /确认用印/ }));

    await waitFor(() => expect(executeOaSealRequest).toHaveBeenCalledTimes(1));
    const [id, data] = jest.mocked(executeOaSealRequest).mock.calls[0];
    expect(id).toBe(61);
    expect(data).toMatchObject({ usedCopies: 3, usedDate: today });
    expect(data.requestId).toMatch(/^seal-execute-/);
  }, 60000);
});

describe('公文知识', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(queryOaDocuments).mockResolvedValue({
      data: { list: [publishedDoc, revisingDoc], total: 2 },
    } as any);
  });

  it('修订审批中的公文不能撤稿，撤稿必须填写原因', async () => {
    jest.mocked(revokeOaDocument).mockResolvedValue({ data: {} } as any);
    render(<DocumentManagePage />);
    await screen.findByText('GW-261109-0001');
    expect(
      within(rowOf('GW-261109-0001')).getByText('已签收 1/4'),
    ).toBeTruthy();
    expect(
      within(rowOf('GW-261109-0002')).queryByRole('button', {
        name: /撤\s*稿/,
      }),
    ).toBeNull();

    fireEvent.click(
      within(rowOf('GW-261109-0001')).getByRole('button', { name: /撤\s*稿/ }),
    );
    const dialog = await screen.findByRole('dialog', {}, { timeout: 15000 });
    const submit = within(dialog).getByRole('button', { name: /确认撤稿/ });
    fireEvent.click(submit);
    expect(
      await within(dialog).findByText('请填写撤稿原因', {}, { timeout: 15000 }),
    ).toBeTruthy();
    expect(revokeOaDocument).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText('撤稿原因'), {
      target: { value: ' 内容有误 ' },
    });
    fireEvent.click(submit);
    await waitFor(() => expect(revokeOaDocument).toHaveBeenCalledTimes(1));
    expect(jest.mocked(revokeOaDocument).mock.calls[0]).toEqual([
      81,
      { reason: '内容有误' },
    ]);
  });

  it('详情展示发布范围与阅读回执', async () => {
    jest.mocked(getOaDocument).mockResolvedValue({
      data: {
        document: publishedDoc,
        versions: [
          {
            id: 1,
            versionNo: 1,
            applicationId: 98,
            title: publishedDoc.title,
            content: '自下周起 9 点上班',
            audience: { all: false, depts: [5], users: [] },
            requireAck: true,
            status: 'PUBLISHED',
            applicantId: 101,
            audienceCount: 4,
          },
          {
            id: 2,
            versionNo: 2,
            applicationId: 99,
            title: publishedDoc.title,
            content: '修订稿',
            audience: { all: true, depts: [], users: [] },
            requireAck: true,
            status: 'APPROVING',
            applicantId: 101,
            audienceCount: 0,
          },
        ],
        receipts: [
          { userId: 201, userName: '王五', deptName: '研发部', readTime: null },
        ],
        files: [
          { applicationId: 98, fileId: 7, name: '原稿.pdf', size: 10 },
          { applicationId: 99, fileId: 8, name: '修订稿.pdf', size: 12 },
        ],
      },
    } as any);
    render(<DocumentManagePage />);
    await screen.findByText('GW-261109-0001');

    fireEvent.click(
      within(rowOf('GW-261109-0001')).getByRole('button', { name: /详\s*情/ }),
    );
    const drawer = await screen.findByRole('dialog', {}, { timeout: 15000 });
    expect(
      await within(drawer).findAllByText(
        '1 个部门（含下级）',
        {},
        { timeout: 15000 },
      ),
    ).toHaveLength(2);
    expect(within(drawer).getByLabelText('发布正文').textContent).toBe(
      '自下周起 9 点上班',
    );
    const receipts = within(drawer).getByLabelText('阅读回执');
    expect(within(receipts).getByText('王五')).toBeTruthy();
    expect(within(receipts).getByText('未签收')).toBeTruthy();
    expect(
      within(drawer).getByRole('button', { name: /v1 · 原稿\.pdf/ }),
    ).toBeTruthy();
    expect(
      within(drawer).getByRole('button', { name: /v2 · 修订稿\.pdf/ }),
    ).toBeTruthy();
  });
});

describe('公文阅读与我的合同', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('阅读需签收公文后确认签收并刷新列表', async () => {
    jest.mocked(queryOaDocumentInbox).mockResolvedValue({
      data: { list: [inboxItem], total: 1 },
    } as any);
    jest.mocked(readOaDocument).mockResolvedValue({
      data: {
        item: { ...inboxItem, readTime: '2026-11-09 11:00:00' },
        content: '自下周起 9 点上班',
        changeNote: null,
        files: [],
      },
    } as any);
    jest.mocked(ackOaDocument).mockResolvedValue({
      data: {
        ...inboxItem,
        readTime: '2026-11-09 11:00:00',
        ackTime: '2026-11-09 11:01:00',
      },
    } as any);
    render(<DocumentInboxPage />);
    await screen.findByText('GW-261109-0001');
    expect(within(rowOf('GW-261109-0001')).getByText('未读')).toBeTruthy();

    fireEvent.click(
      within(rowOf('GW-261109-0001')).getByRole('button', { name: /阅\s*读/ }),
    );
    const drawer = await screen.findByRole('dialog', {}, { timeout: 15000 });
    expect((await within(drawer).findByLabelText('公文正文')).textContent).toBe(
      '自下周起 9 点上班',
    );
    fireEvent.click(within(drawer).getByRole('button', { name: /确认签收/ }));

    await waitFor(() => expect(ackOaDocument).toHaveBeenCalledWith(81));
    await waitFor(() =>
      expect(
        within(drawer).queryByRole('button', { name: /确认签收/ }),
      ).toBeNull(),
    );
    expect(within(drawer).getByText('已签收')).toBeTruthy();

    fireEvent.click(document.querySelector('.ant-drawer-close') as HTMLElement);
    await waitFor(() => expect(queryOaDocumentInbox).toHaveBeenCalledTimes(2));
  });

  it('只看未读或待签收切换时带上过滤参数', async () => {
    jest.mocked(queryOaDocumentInbox).mockResolvedValue({
      data: { list: [inboxItem], total: 1 },
    } as any);
    render(<DocumentInboxPage />);
    await screen.findByText('GW-261109-0001');
    fireEvent.click(screen.getByRole('switch', { name: '只看未读或待签收' }));
    await waitFor(() =>
      expect(
        jest.mocked(queryOaDocumentInbox).mock.calls.at(-1)?.[0],
      ).toMatchObject({ pendingOnly: true }),
    );
  });

  it('我的合同详情与我的用印申请', async () => {
    jest.mocked(queryMyOaContracts).mockResolvedValue({
      data: { list: [signedContract], total: 1 },
    } as any);
    jest.mocked(getMyOaContract).mockResolvedValue({
      data: {
        contract: signedContract,
        versions: [],
        files: [],
        sealRequests: [sealRequest],
      },
    } as any);
    jest.mocked(queryMyOaSealRequests).mockResolvedValue({
      data: { list: [sealRequest], total: 1 },
    } as any);
    render(<MyContractPage />);
    await screen.findByText('HT-261109-0002');

    fireEvent.click(
      within(rowOf('HT-261109-0002')).getByRole('button', { name: /详\s*情/ }),
    );
    const drawer = await screen.findByRole('dialog', {}, { timeout: 15000 });
    expect(
      await within(drawer).findByText(
        '合同5 天后到期，请及时续签或归档处理',
        {},
        { timeout: 15000 },
      ),
    ).toBeTruthy();
    expect(
      within(within(drawer).getByLabelText('用印记录')).getByText('合同专用章'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: '我的用印申请' }));
    expect(
      await screen.findByText('服务合同用印', {}, { timeout: 15000 }),
    ).toBeTruthy();
  }, 60000);
});
