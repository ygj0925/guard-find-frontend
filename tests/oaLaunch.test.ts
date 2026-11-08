import dayjs from 'dayjs';
import type { OaFormField } from '@/utils/oaForm';
import {
  buildOaRequestId,
  formatOaFormValue,
  normalizeAssigneeType,
  oaPersonFieldOptions,
  parseOaLaunchScope,
  serializeOaLaunchScope,
  toOaSubmitFormData,
  validateAssigneeBindings,
} from '@/utils/oaLaunch';

describe('OA 发起工具', () => {
  it('解析与规范化可发起范围', () => {
    expect(parseOaLaunchScope(null)).toEqual({
      users: [],
      depts: [],
      roles: [],
    });
    expect(
      parseOaLaunchScope(
        '{"users":[101,"101","x"],"depts":[10,0],"roles":["hr"," hr ",""]}',
      ),
    ).toEqual({ users: [101], depts: [10], roles: ['hr'] });
    expect(parseOaLaunchScope('not json')).toEqual({
      users: [],
      depts: [],
      roles: [],
    });
  });

  it('全空范围序列化为 undefined，非空按三组输出', () => {
    expect(
      serializeOaLaunchScope({ users: [], depts: [], roles: [] }),
    ).toBeUndefined();
    expect(
      serializeOaLaunchScope({ users: [101], depts: [10], roles: ['hr'] }),
    ).toBe('{"users":[101],"depts":[10],"roles":["hr"]}');
  });

  it('生成不超过 64 字符的请求 ID', () => {
    const requestId = buildOaRequestId();
    expect(requestId).toBeTruthy();
    expect(requestId.length).toBeLessThanOrEqual(64);
    expect(buildOaRequestId()).not.toBe(requestId);
  });

  it('只把可见可写字段转成提交值', () => {
    const fields: OaFormField[] = [
      { id: 'f1', key: 'name', label: '姓名', type: 'text' },
      { id: 'f2', key: 'day', label: '日期', type: 'date' },
      { id: 'f3', key: 'tags', label: '标签', type: 'checkbox' },
      { id: 'f4', key: 'files', label: '附件', type: 'attachment' },
      { id: 'f5', key: 'owner', label: '负责人', type: 'person' },
      { id: 'f6', key: 'secret', label: '隐藏', type: 'text', hidden: true },
      {
        id: 'f7',
        key: 'applicant',
        label: '申请人',
        type: 'text',
        readonly: true,
      },
    ];
    const formData = toOaSubmitFormData(fields, {
      name: '张三',
      day: dayjs('2026-11-06'),
      tags: ['urgent'],
      files: [
        { uid: 'u1', name: '证明.pdf', response: { id: '501' } },
        { uid: 'u2', name: '上传中.pdf', status: 'uploading' },
      ],
      owner: ' 102 ',
      secret: 'x',
      applicant: '101',
    });

    expect(formData).toEqual({
      name: '张三',
      day: '2026-11-06',
      tags: ['urgent'],
      files: [{ uid: 'u1', name: '证明.pdf', fileId: 501 }],
      owner: '102',
    });
  });

  it('校验审批人变量绑定与人员字段选项', () => {
    const fields: OaFormField[] = [
      { id: 'f1', key: 'owner', label: '负责人', type: 'person' },
      {
        id: 'f2',
        key: 'readonlyOwner',
        label: '只读人',
        type: 'person',
        readonly: true,
      },
      { id: 'f3', key: 'name', label: '姓名', type: 'text' },
    ];
    expect(oaPersonFieldOptions(fields)).toEqual([
      { value: 'owner', label: '负责人（owner）' },
    ]);
    expect(normalizeAssigneeType('dept_leader')).toBe('DEPT_LEADER');
    expect(normalizeAssigneeType('unknown')).toBeUndefined();
    expect(normalizeAssigneeType('supervisor')).toBe('SUPERVISOR');

    const variables = [
      { name: 'supervisor' },
      { name: 'approver' },
      {
        name: 'reviewer',
        suggestedType: 'FORM_FIELD',
        suggestedValue: 'owner',
      },
    ];
    expect(
      validateAssigneeBindings(variables, {
        supervisor: { type: 'SUPERVISOR' },
        approver: { type: 'EMPLOYEE', value: '' },
        reviewer: { type: 'FORM_FIELD', value: 'owner' },
      }),
    ).toEqual({ approver: '请输入员工 ID' });
  });

  it('详情展示数组与附件', () => {
    expect(
      formatOaFormValue(
        { id: 'f1', key: 'files', label: '附件', type: 'attachment' },
        [{ uid: 'u1', name: '证明.pdf' }, { url: 'https://x/y.png' }],
      ),
    ).toBe('证明.pdf、https://x/y.png');
    expect(
      formatOaFormValue(
        { id: 'f2', key: 'tags', label: '标签', type: 'checkbox' },
        ['urgent', 'normal'],
      ),
    ).toBe('urgent、normal');
    expect(
      formatOaFormValue(
        { id: 'f3', key: 'name', label: '姓名', type: 'text' },
        undefined,
      ),
    ).toBe('—');
  });
});
