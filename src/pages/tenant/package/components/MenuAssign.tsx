import { Button, Modal, message, Space, Spin, Tree } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { assignMenus, getMenuTree } from '@/services/web/tenant/package';

interface MenuAssignProps {
  visible: boolean;
  packageId: number | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const MenuAssign: React.FC<MenuAssignProps> = ({
  visible,
  packageId,
  onCancel,
  onSuccess,
}) => {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const convertToTreeData = (items: any[]): any[] => {
    return items.map((item) => ({
      title: item.title || item.name,
      key: item.id,
      children: item.children ? convertToTreeData(item.children) : [],
    }));
  };

  const loadMenuTree = useCallback(async () => {
    if (!packageId) return;
    setLoading(true);
    try {
      const response = await getMenuTree();
      if (response?.data) {
        const data = convertToTreeData(response.data);
        setTreeData(data);
      }
    } catch (error) {
      console.error('Failed to load menu tree:', error);
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    if (visible) {
      loadMenuTree();
      setCheckedKeys([]);
    }
  }, [visible, loadMenuTree]);

  const handleCheck = (checked: any) => {
    if (Array.isArray(checked)) {
      setCheckedKeys(checked as number[]);
    } else {
      setCheckedKeys(checked.checked as number[]);
    }
  };

  const handleSubmit = async () => {
    if (!packageId) return;
    setSubmitting(true);
    try {
      await assignMenus(packageId, checkedKeys);
      message.success('分配菜单成功');
      onSuccess();
    } catch (error) {
      console.error('Assign menus failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="分配菜单"
      open={visible}
      onCancel={onCancel}
      footer={
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            确定
          </Button>
        </Space>
      }
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Tree
          checkable
          defaultExpandAll
          treeData={treeData}
          checkedKeys={checkedKeys}
          onCheck={handleCheck}
        />
      </Spin>
    </Modal>
  );
};

export default MenuAssign;
