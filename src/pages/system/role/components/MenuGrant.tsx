import { useIntl, useModel } from '@umijs/max';
import { Button, Drawer, message, Space, Tree } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { role } from '@/services/web/system';

interface MenuGrantProps {
  visible: boolean;
  /** 角色 ID：后端权限接口以 id 定位（`/system/role/{id}/permission`） */
  roleId: number;
  onCancel: () => void;
  onSuccess?: () => void;
}

interface TreeNode {
  title: string;
  key: number;
  children?: TreeNode[];
}

const convertToTreeData = (items: any[]): TreeNode[] => {
  return (items || []).map((item) => ({
    title: item.title,
    key: item.id,
    children: item.children ? convertToTreeData(item.children) : undefined,
  }));
};

const MenuGrant: React.FC<MenuGrantProps> = ({
  visible,
  roleId,
  onCancel,
  onSuccess,
}) => {
  const intl = useIntl();
  const { refreshAuthorization } = useModel('authorization');
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadMenuGrant = useCallback(async () => {
    if (!roleId) return;

    setLoading(true);
    try {
      // 权限树 + 角色详情里的 menuIds，均为后端真实接口
      const [treeResponse, idsResponse] = await Promise.all([
        role.getPermissionTree(),
        role.getPermissionIds(roleId),
      ]);

      setTreeData(convertToTreeData(treeResponse?.data || []));
      setCheckedKeys((idsResponse?.data || []) as number[]);
    } catch (error) {
      console.error('Failed to load menu grant:', error);
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    if (visible) {
      loadMenuGrant();
    }
  }, [visible, loadMenuGrant]);

  const handleCheck = (checked: any) => {
    // checkStrictly 下 onCheck 返回 {checked, halfChecked}
    const keys = Array.isArray(checked) ? checked : checked?.checked;
    setCheckedKeys((keys || []) as number[]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await role.updatePermissionIds(roleId, checkedKeys);
      await refreshAuthorization();
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      onSuccess?.();
      onCancel();
    } catch (error) {
      console.error('Menu grant failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title={intl.formatMessage({ id: 'system.role.menu.grant' })}
      open={visible}
      onClose={onCancel}
      width={400}
      extra={
        <Space>
          <Button onClick={onCancel}>
            {intl.formatMessage({ id: 'common.operation.cancel' })}
          </Button>
          <Button
            type="primary"
            loading={submitting || loading}
            onClick={handleSubmit}
          >
            {intl.formatMessage({ id: 'common.operation.save' })}
          </Button>
        </Space>
      }
    >
      <Tree
        checkable
        checkStrictly
        defaultExpandAll
        treeData={treeData}
        checkedKeys={checkedKeys}
        onCheck={handleCheck}
      />
    </Drawer>
  );
};

export default MenuGrant;
