import { Button, Checkbox, Modal, message, Select, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useState } from 'react';
import { getFieldConfig, saveFieldConfig } from '@/services/web/code/generator';
import type {
  GeneratorFieldDto,
  GeneratorFieldVo,
} from '@/services/web/code/typings';

interface FieldConfigProps {
  visible: boolean;
  tableName: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const formTypeOptions = [
  { label: 'Input', value: 'input' },
  { label: 'Textarea', value: 'textarea' },
  { label: 'Select', value: 'select' },
  { label: 'Radio', value: 'radio' },
  { label: 'Checkbox', value: 'checkbox' },
  { label: 'Date', value: 'date' },
  { label: 'DateTime', value: 'datetime' },
  { label: 'Upload', value: 'upload' },
];

const queryTypeOptions = [
  { label: 'EQ', value: 'EQ' },
  { label: 'NE', value: 'NE' },
  { label: 'LIKE', value: 'LIKE' },
  { label: 'GT', value: 'GT' },
  { label: 'GE', value: 'GE' },
  { label: 'LT', value: 'LT' },
  { label: 'LE', value: 'LE' },
  { label: 'BETWEEN', value: 'BETWEEN' },
];

const FieldConfig: React.FC<FieldConfigProps> = ({
  visible,
  tableName,
  onCancel,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<GeneratorFieldVo[]>([]);

  useEffect(() => {
    if (visible && tableName) {
      fetchFields();
    }
    if (!visible) {
      setFields([]);
    }
  }, [visible, tableName]);

  const fetchFields = async () => {
    if (!tableName) return;
    setLoading(true);
    try {
      const response = await getFieldConfig(tableName);
      setFields(response.data || []);
    } catch (error) {
      console.error('Fetch fields failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (
    index: number,
    key: keyof GeneratorFieldVo,
    value: any,
  ) => {
    const newFields = [...fields];
    (newFields[index] as any)[key] = value;
    setFields(newFields);
  };

  const handleSave = async () => {
    if (!tableName) return;
    setSaving(true);
    try {
      const data: GeneratorFieldDto[] = fields.map((field) => ({
        id: field.id,
        columnComment: field.columnComment,
        formType: field.formType,
        queryType: field.queryType,
        isRequired: field.isRequired,
        isListVisible: field.isListVisible,
        isFormVisible: field.isFormVisible,
        isQueryVisible: field.isQueryVisible,
        sort: field.sort,
      }));
      await saveFieldConfig(tableName, data);
      message.success('字段配置保存成功');
      onSuccess();
    } catch (error) {
      console.error('Save fields failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<GeneratorFieldVo> = [
    {
      title: '字段名',
      dataIndex: 'columnName',
      width: 120,
      ellipsis: true,
    },
    {
      title: '字段注释',
      dataIndex: 'columnComment',
      width: 140,
      render: (text, _, index) => (
        <input
          value={text}
          onChange={(e) =>
            handleFieldChange(index, 'columnComment', e.target.value)
          }
          style={{
            width: '100%',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            padding: '4px 8px',
          }}
        />
      ),
    },
    {
      title: '表单类型',
      dataIndex: 'formType',
      width: 120,
      render: (text, _, index) => (
        <Select
          value={text}
          options={formTypeOptions}
          onChange={(val) => handleFieldChange(index, 'formType', val)}
          style={{ width: '100%' }}
          size="small"
        />
      ),
    },
    {
      title: '查询方式',
      dataIndex: 'queryType',
      width: 110,
      render: (text, _, index) => (
        <Select
          value={text}
          options={queryTypeOptions}
          onChange={(val) => handleFieldChange(index, 'queryType', val)}
          style={{ width: '100%' }}
          size="small"
        />
      ),
    },
    {
      title: '必填',
      dataIndex: 'isRequired',
      width: 60,
      align: 'center',
      render: (val, _, index) => (
        <Checkbox
          checked={val}
          onChange={(e) =>
            handleFieldChange(index, 'isRequired', e.target.checked)
          }
        />
      ),
    },
    {
      title: '列表',
      dataIndex: 'isListVisible',
      width: 60,
      align: 'center',
      render: (val, _, index) => (
        <Checkbox
          checked={val}
          onChange={(e) =>
            handleFieldChange(index, 'isListVisible', e.target.checked)
          }
        />
      ),
    },
    {
      title: '表单',
      dataIndex: 'isFormVisible',
      width: 60,
      align: 'center',
      render: (val, _, index) => (
        <Checkbox
          checked={val}
          onChange={(e) =>
            handleFieldChange(index, 'isFormVisible', e.target.checked)
          }
        />
      ),
    },
    {
      title: '查询',
      dataIndex: 'isQueryVisible',
      width: 60,
      align: 'center',
      render: (val, _, index) => (
        <Checkbox
          checked={val}
          onChange={(e) =>
            handleFieldChange(index, 'isQueryVisible', e.target.checked)
          }
        />
      ),
    },
  ];

  return (
    <Modal
      title="字段配置"
      open={visible}
      onCancel={onCancel}
      width={900}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>
          保存
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        <Table<GeneratorFieldVo>
          columns={columns}
          dataSource={fields}
          rowKey="id"
          pagination={false}
          scroll={{ x: 800, y: 400 }}
          size="small"
        />
      </Spin>
    </Modal>
  );
};

export default FieldConfig;
