/**
 * 结构化条件构建器：把字段/操作符/值编译成服务端允许的受限表达式。
 * 复杂表达式仍需在条件输入框手写，编译结果会做同一套安全校验。
 */
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Divider,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Typography,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import {
  compileOaConditionRule,
  type OaConditionOperator,
  parseOaConditionValue,
} from '@/utils/oaBpmn';

const OPERATOR_OPTIONS: { value: OaConditionOperator; label: string }[] = [
  { value: 'EQ', label: '等于' },
  { value: 'NE', label: '不等于' },
  { value: 'GT', label: '大于' },
  { value: 'GE', label: '大于等于' },
  { value: 'LT', label: '小于' },
  { value: 'LE', label: '小于等于' },
  { value: 'IN', label: '属于集合' },
  { value: 'NOT_IN', label: '不属于集合' },
];

type BuilderItem = {
  key: string;
  field: string;
  operator: OaConditionOperator;
  value: string;
};

let sequence = 0;
function newItem(): BuilderItem {
  sequence += 1;
  return { key: `item-${sequence}`, field: '', operator: 'EQ', value: '' };
}

function isListOperator(operator: OaConditionOperator) {
  return operator === 'IN' || operator === 'NOT_IN';
}

type OaConditionBuilderProps = {
  open: boolean;
  currentExpression?: string;
  onCancel: () => void;
  onSubmit: (expression: string) => void;
};

const OaConditionBuilder: React.FC<OaConditionBuilderProps> = ({
  open,
  currentExpression,
  onCancel,
  onSubmit,
}) => {
  const [combinator, setCombinator] = useState<'AND' | 'OR'>('AND');
  const [items, setItems] = useState<BuilderItem[]>([newItem()]);

  useEffect(() => {
    if (!open) return;
    setCombinator('AND');
    setItems([newItem()]);
  }, [open]);

  const compiled = useMemo(() => {
    try {
      const expression = compileOaConditionRule({
        combinator,
        items: items.map((item) => ({
          field: item.field,
          operator: item.operator,
          value: parseOaConditionValue(
            item.value,
            isListOperator(item.operator),
          ),
        })),
      });
      return { expression, error: '' };
    } catch (error) {
      return {
        expression: '',
        error: error instanceof Error ? error.message : '条件不合法',
      };
    }
  }, [combinator, items]);

  const updateItem = (key: string, patch: Partial<BuilderItem>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (key: string) => {
    setItems((current) =>
      current.length > 1 ? current.filter((item) => item.key !== key) : current,
    );
  };

  return (
    <Modal
      open={open}
      title="条件构建器"
      width={720}
      onCancel={onCancel}
      onOk={() => {
        if (!compiled.error) onSubmit(compiled.expression);
      }}
      okText="应用到连线"
      cancelText="取消"
      okButtonProps={{ disabled: Boolean(compiled.error) }}
      destroyOnHidden
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {currentExpression ? (
          <Typography.Text type="secondary">
            当前条件：
            <Typography.Text code>{currentExpression}</Typography.Text>
          </Typography.Text>
        ) : null}
        <Space>
          <span>条件组合</span>
          <Radio.Group
            value={combinator}
            onChange={(event) => setCombinator(event.target.value)}
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: '全部满足 (AND)', value: 'AND' },
              { label: '任一满足 (OR)', value: 'OR' },
            ]}
          />
        </Space>
        {items.map((item, index) => {
          const list = isListOperator(item.operator);
          return (
            <Space key={item.key} align="start" wrap>
              <span style={{ width: 28, lineHeight: '32px' }}>
                {index + 1}.
              </span>
              <Input
                aria-label={`字段 ${index + 1}`}
                placeholder="字段，如 amount"
                style={{ width: 180 }}
                value={item.field}
                onChange={(event) =>
                  updateItem(item.key, { field: event.target.value })
                }
              />
              <Select
                aria-label={`操作符 ${index + 1}`}
                style={{ width: 140 }}
                value={item.operator}
                options={OPERATOR_OPTIONS}
                onChange={(operator: OaConditionOperator) =>
                  updateItem(item.key, { operator })
                }
              />
              <Input
                aria-label={`条件值 ${index + 1}`}
                placeholder={
                  list ? '多个值用英文逗号分隔' : '数字、布尔或普通文本'
                }
                style={{ width: 220 }}
                value={item.value}
                onChange={(event) =>
                  updateItem(item.key, { value: event.target.value })
                }
              />
              <Button
                aria-label={`删除条件 ${index + 1}`}
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={items.length === 1}
                onClick={() => removeItem(item.key)}
              />
            </Space>
          );
        })}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setItems((current) => [...current, newItem()])}
        >
          添加条件
        </Button>
        <Divider style={{ margin: '4px 0' }} />
        {compiled.error ? (
          <Alert type="error" showIcon message={compiled.error} />
        ) : (
          <Alert
            type="success"
            showIcon
            message="编译结果"
            description={
              <Typography.Text code copyable>
                {compiled.expression}
              </Typography.Text>
            }
          />
        )}
        <Typography.Text type="secondary">
          首版只允许变量、数字、布尔、字符串与比较/集合判断；不支持函数调用与嵌套花括号。
        </Typography.Text>
      </Space>
    </Modal>
  );
};

export default OaConditionBuilder;
