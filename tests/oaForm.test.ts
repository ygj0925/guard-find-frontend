import {
  createOaFormField,
  emptyOaFormSchema,
  oaAttachmentFileId,
  parseOaFormSchema,
  serializeOaFormSchema,
  validateOaFormSchema,
  validateOaFormValues,
} from '@/utils/oaForm';

const allTypesSchema = {
  version: 1,
  fields: [
    { id: 'f1', key: 'name', label: '姓名', type: 'text' as const },
    { id: 'f2', key: 'reason', label: '事由', type: 'textarea' as const },
    { id: 'f3', key: 'amount', label: '金额', type: 'number' as const },
    { id: 'f4', key: 'day', label: '日期', type: 'date' as const },
    {
      id: 'f5',
      key: 'kind',
      label: '类型',
      type: 'radio' as const,
      options: [
        { label: '事假', value: 'personal' },
        { label: '病假', value: 'sick' },
      ],
    },
    {
      id: 'f6',
      key: 'tags',
      label: '标签',
      type: 'checkbox' as const,
      options: [{ label: '紧急', value: 'urgent' }],
    },
    { id: 'f7', key: 'files', label: '附件', type: 'attachment' as const },
    { id: 'f8', key: 'owner', label: '负责人', type: 'person' as const },
  ],
};

describe('OA 表单 schema 工具', () => {
  it('接受八类字段', () => {
    expect(validateOaFormSchema(allTypesSchema, true).valid).toBe(true);
  });

  it('拒绝重复 key、非法类型与缺少选项', () => {
    const result = validateOaFormSchema(
      {
        version: 1,
        fields: [
          { id: 'f1', key: 'amount', label: '金额', type: 'number' },
          { id: 'f2', key: 'amount', label: '金额2', type: 'radio' },
          {
            id: 'f3',
            key: 'bad',
            label: '错误',
            type: 'signature' as any,
          },
        ],
      },
      true,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.join('；')).toContain('字段 key 重复');
    expect(result.errors.join('；')).toContain('至少需要一个选项');
    expect(result.errors.join('；')).toContain('类型不支持');
  });

  it('草稿允许空字段，发布要求至少一个字段', () => {
    expect(validateOaFormSchema(emptyOaFormSchema(), false).valid).toBe(true);
    expect(validateOaFormSchema(emptyOaFormSchema(), true).errors).toContain(
      '表单至少需要一个字段才能发布',
    );
  });

  it('创建字段时生成唯一 id 与 key 并带默认选项', () => {
    const first = createOaFormField('radio', []);
    const second = createOaFormField('radio', [first]);
    expect(first.id).not.toBe(second.id);
    expect(first.key).not.toBe(second.key);
    expect(first.options).toHaveLength(2);
  });

  it('序列化后可按原结构解析回来', () => {
    const parsed = parseOaFormSchema(serializeOaFormSchema(allTypesSchema));
    expect(parsed.fields).toHaveLength(8);
    expect(parsed.fields[4]).toMatchObject({
      key: 'kind',
      type: 'radio',
      options: allTypesSchema.fields[4].options,
    });
  });

  it('非法 JSON 回退为空表单', () => {
    expect(parseOaFormSchema('{broken').fields).toEqual([]);
  });

  it('保留只读与隐藏策略并在序列化时省略 false', () => {
    const schema = {
      version: 1,
      fields: [
        {
          id: 'f1',
          key: 'dept',
          label: '部门',
          type: 'text' as const,
          readonly: true,
        },
        {
          id: 'f2',
          key: 'internal',
          label: '内部',
          type: 'text' as const,
          hidden: true,
        },
        { id: 'f3', key: 'name', label: '姓名', type: 'text' as const },
      ],
    };
    const parsed = parseOaFormSchema(serializeOaFormSchema(schema));
    expect(parsed.fields[0].readonly).toBe(true);
    expect(parsed.fields[1].hidden).toBe(true);
    const serialized = JSON.parse(serializeOaFormSchema(schema));
    expect(serialized.fields[0]).toMatchObject({ readonly: true });
    expect(serialized.fields[1]).toMatchObject({ hidden: true });
    expect(serialized.fields[2]).not.toHaveProperty('readonly');
    expect(serialized.fields[2]).not.toHaveProperty('hidden');
  });

  it('拒绝必填与只读/隐藏冲突及全隐藏发布', () => {
    const conflict = validateOaFormSchema(
      {
        version: 1,
        fields: [
          {
            id: 'f1',
            key: 'dept',
            label: '部门',
            type: 'text',
            required: true,
            readonly: true,
          },
        ],
      },
      true,
    );
    expect(conflict.valid).toBe(false);
    expect(conflict.errors.join('；')).toContain('不能同时设为必填与只读/隐藏');

    const allHidden = validateOaFormSchema(
      {
        version: 1,
        fields: [
          {
            id: 'f1',
            key: 'internal',
            label: '内部',
            type: 'text',
            hidden: true,
          },
        ],
      },
      true,
    );
    expect(allHidden.valid).toBe(false);
    expect(allHidden.errors).toContain('表单至少需要一个可见字段才能发布');
  });

  it('从上传响应中解析服务端文件 ID', () => {
    expect(oaAttachmentFileId({ response: { id: '501' } })).toBe('501');
    expect(oaAttachmentFileId({ fileId: 12 })).toBe('12');
    expect(oaAttachmentFileId({ response: { id: '909905811461898299' } })).toBe(
      '909905811461898299',
    );
    expect(oaAttachmentFileId({ response: { id: 0 } })).toBeUndefined();
    expect(oaAttachmentFileId({ response: { id: 'abc' } })).toBeUndefined();
    expect(oaAttachmentFileId({})).toBeUndefined();
  });

  it('上传中、失败或缺少文件 ID 的附件不能提交', () => {
    const fields = [
      {
        id: 'f1',
        key: 'files',
        label: '附件',
        type: 'attachment' as const,
        required: true,
      },
    ];
    expect(
      validateOaFormValues(fields, {
        files: [{ uid: 'u1', status: 'uploading' }],
      }).errors,
    ).toEqual({ files: '请等待附件上传完成' });
    expect(
      validateOaFormValues(fields, {
        files: [{ uid: 'u1', status: 'error' }],
      }).errors,
    ).toEqual({ files: '附件存在未完成的上传，请删除后重试' });
    expect(
      validateOaFormValues(fields, {
        files: [{ uid: 'u1', response: { id: '501' } }],
      }).valid,
    ).toBe(true);
    expect(validateOaFormValues(fields, {}).errors).toEqual({
      files: '请选择或上传附件',
    });
  });

  it('填写校验跳过只读与隐藏字段，并校验必填/数字/人员', () => {
    const fields = [
      {
        id: 'f1',
        key: 'name',
        label: '姓名',
        type: 'text' as const,
        required: true,
      },
      {
        id: 'f2',
        key: 'dept',
        label: '部门',
        type: 'text' as const,
        readonly: true,
      },
      {
        id: 'f3',
        key: 'internal',
        label: '内部',
        type: 'text' as const,
        hidden: true,
      },
      {
        id: 'f4',
        key: 'amount',
        label: '金额',
        type: 'number' as const,
      },
      {
        id: 'f5',
        key: 'owner',
        label: '负责人',
        type: 'person' as const,
      },
    ];
    expect(validateOaFormValues(fields, {}).errors).toEqual({
      name: '请填写姓名',
    });
    expect(
      validateOaFormValues(fields, {
        name: '张三',
        amount: '100' as unknown as number,
        owner: 'abc',
      }).errors,
    ).toEqual({
      amount: '请输入有效数字',
      owner: '请输入有效的员工 ID',
    });
    expect(
      validateOaFormValues(fields, {
        name: '张三',
        amount: 100,
        owner: '101',
      }).valid,
    ).toBe(true);
  });
});
