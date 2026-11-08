import { fireEvent, render, screen } from '@testing-library/react';
import dayjs from 'dayjs';
import { useState } from 'react';
import OaFormRenderer from '@/pages/oa/form/components/OaFormRenderer';
import {
  createOaFormColumn,
  createOaFormField,
  parseOaFormSchema,
  serializeOaFormSchema,
  validateOaFormSchema,
  validateOaFormValues,
} from '@/utils/oaForm';
import {
  formatOaFormValue,
  fromOaSubmitFormData,
  toOaSubmitFormData,
} from '@/utils/oaLaunch';

jest.mock('@/services/web/guardfind/oa', () => ({
  uploadOaAttachment: jest.fn(),
}));
jest.mock('@/pages/oa/components/OaStaffSelects', () => ({
  OaEmployeeSelect: () => null,
}));

const itemsField = {
  id: 'f1',
  key: 'items',
  label: '报销明细',
  type: 'table' as const,
  required: true,
  maxRows: 2,
  columns: [
    {
      id: 'c1',
      key: 'item',
      label: '项目',
      type: 'text' as const,
      required: true,
    },
    {
      id: 'c2',
      key: 'amount',
      label: '金额',
      type: 'number' as const,
      required: true,
    },
    { id: 'c3', key: 'day', label: '日期', type: 'date' as const },
    {
      id: 'c4',
      key: 'kind',
      label: '类别',
      type: 'radio' as const,
      options: [
        { label: '交通', value: 'TRAFFIC' },
        { label: '餐饮', value: 'MEAL' },
      ],
    },
  ],
};

function RendererHarness({ onValue }: { onValue: (value: unknown) => void }) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  return (
    <OaFormRenderer
      fields={[itemsField]}
      values={values}
      onChange={(key, value) => {
        onValue(value);
        setValues((current) => ({ ...current, [key]: value }));
      }}
    />
  );
}

describe('OA 明细表字段', () => {
  it('新建明细字段带默认列，序列化往返保留列与行数上限', () => {
    const field = createOaFormField('table', []);
    expect(field.maxRows).toBe(50);
    expect(field.columns?.map((column) => column.key)).toEqual([
      'item',
      'amount',
    ]);
    const next = createOaFormColumn(field.columns ?? []);
    expect(next.key).toBe('col_3');

    const parsed = parseOaFormSchema(
      serializeOaFormSchema({ version: 1, fields: [itemsField] }),
    );
    expect(parsed.fields[0]).toMatchObject({
      key: 'items',
      type: 'table',
      maxRows: 2,
    });
    expect(parsed.fields[0].columns?.[3]).toMatchObject({
      key: 'kind',
      type: 'radio',
      options: itemsField.columns?.[3].options,
    });
    expect(validateOaFormSchema(parsed, true).valid).toBe(true);
  });

  it('schema 校验拒绝空列、重复列 key 与缺少选项的单选列', () => {
    const errors = validateOaFormSchema(
      {
        version: 1,
        fields: [
          { ...itemsField, key: 'empty', columns: [] },
          {
            ...itemsField,
            key: 'dup',
            columns: [
              { key: 'a', label: 'A', type: 'text' as const },
              { key: 'a', label: 'B', type: 'radio' as const },
            ],
          },
        ],
      },
      true,
    ).errors.join('；');
    expect(errors).toContain('至少需要一列');
    expect(errors).toContain('列 key 重复');
    expect(errors).toContain('至少需要一个选项');
  });

  it('填写校验忽略空行，并按行号报告必填、数字与超行', () => {
    expect(
      validateOaFormValues([itemsField], { items: [{}] }).errors.items,
    ).toBe('请至少填写一行报销明细');
    expect(
      validateOaFormValues([itemsField], {
        items: [{ item: '打车' }, {}],
      }).errors.items,
    ).toBe('第 1 行请填写金额');
    expect(
      validateOaFormValues([itemsField], {
        items: [
          { item: 'a', amount: 1 },
          { item: 'b', amount: 2 },
          { item: 'c', amount: 3 },
        ],
      }).errors.items,
    ).toBe('报销明细不能超过 2 行');
    expect(
      validateOaFormValues([itemsField], {
        items: [{ item: '打车', amount: 12.5 }],
      }).errors.items,
    ).toBeUndefined();
  });

  it('提交值丢弃空行并格式化日期，还原后可读展示', () => {
    const formData = toOaSubmitFormData([itemsField], {
      items: [
        { item: '打车', amount: 32, day: dayjs('2026-11-02'), kind: 'TRAFFIC' },
        { item: '  ', amount: undefined },
        { item: '午餐', amount: 45, kind: '' },
      ],
    });
    expect(formData.items).toEqual([
      { item: '打车', amount: 32, day: '2026-11-02', kind: 'TRAFFIC' },
      { item: '午餐', amount: 45 },
    ]);

    const values = fromOaSubmitFormData([itemsField], formData);
    const rows = values.items as Record<string, unknown>[];
    expect(dayjs.isDayjs(rows[0].day)).toBe(true);
    expect(toOaSubmitFormData([itemsField], values)).toEqual(formData);

    expect(formatOaFormValue(itemsField, formData.items)).toContain(
      '第 1 行 项目：打车，金额：32，日期：2026-11-02，类别：交通',
    );
  });

  it('渲染器可添加、填写与删除明细行，并受最多行数限制', () => {
    const changes: unknown[] = [];
    render(<RendererHarness onValue={(value) => changes.push(value)} />);

    const addButton = screen.getByRole('button', { name: '添加报销明细行' });
    fireEvent.click(addButton);
    fireEvent.change(screen.getByLabelText('报销明细第 1 行项目'), {
      target: { value: '打车' },
    });
    expect(changes[changes.length - 1]).toEqual([{ item: '打车' }]);

    fireEvent.click(addButton);
    expect(screen.getByLabelText('报销明细第 2 行项目')).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: '添加报销明细行',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    fireEvent.click(
      screen.getByRole('button', { name: '删除报销明细第 1 行' }),
    );
    expect(changes[changes.length - 1]).toEqual([{}]);
    expect(screen.queryByLabelText('报销明细第 2 行项目')).toBeNull();
  });
});
