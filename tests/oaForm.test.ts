import {
  createOaFormField,
  emptyOaFormSchema,
  parseOaFormSchema,
  serializeOaFormSchema,
  validateOaFormSchema,
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
});
