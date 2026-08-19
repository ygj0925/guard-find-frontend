import type { TreeProps } from 'antd';
import { Input, Tree } from 'antd';
import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { SysOrganizationVo } from '@/services/web/system';
import { organization } from '@/services/web/system';

const { Search } = Input;

interface OrganizationTreeProps
  extends Omit<TreeProps, 'treeData' | 'loadData'> {
  showSearch?: boolean;
  onSelectOrganization?: (org: SysOrganizationVo | null) => void;
}

const OrganizationTree: React.FC<OrganizationTreeProps> = ({
  showSearch = true,
  onSelectOrganization,
  ...restProps
}) => {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [_loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const deferredSearchValue = useDeferredValue(searchValue);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  const loadTreeData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await organization.tree();
      if (response?.data) {
        const data = convertToTreeData(response.data);
        setTreeData(data);
        setExpandedKeys(getAllKeys(response.data));
      }
    } catch (error) {
      console.error('Failed to load organization tree:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const convertToTreeData = (data: SysOrganizationVo[]): any[] => {
    return data.map((item) => ({
      title: item.name,
      key: item.id,
      id: item.id,
      data: item,
      children: item.children ? convertToTreeData(item.children) : [],
    }));
  };

  const getAllKeys = (data: SysOrganizationVo[]): number[] => {
    const keys: number[] = [];
    const traverse = (items: SysOrganizationVo[]) => {
      items.forEach((item) => {
        keys.push(item.id);
        if (item.children) {
          traverse(item.children);
        }
      });
    };
    traverse(data);
    return keys;
  };

  const filteredTreeData = useMemo(() => {
    if (!deferredSearchValue) return treeData;
    const normalizedSearch = deferredSearchValue.toLowerCase();

    const filterTree = (nodes: any[]): any[] => {
      return nodes
        .map((node) => {
          const title = node.title as string;
          const match = title.toLowerCase().includes(normalizedSearch);
          const children = node.children ? filterTree(node.children) : [];
          if (match || children.length > 0) {
            return {
              ...node,
              title: match ? (
                <span>
                  {title.substring(
                    0,
                    title.toLowerCase().indexOf(normalizedSearch),
                  )}
                  <span style={{ color: '#f50' }}>{deferredSearchValue}</span>
                  {title.substring(
                    title.toLowerCase().indexOf(normalizedSearch) +
                      deferredSearchValue.length,
                  )}
                </span>
              ) : (
                title
              ),
              children,
            };
          }
          return null;
        })
        .filter(Boolean);
    };

    return filterTree(treeData);
  }, [deferredSearchValue, treeData]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    startTransition(() => {
      if (value) {
        setExpandedKeys(getExpandKeysBySearch(treeData, value));
      } else {
        setExpandedKeys(getAllKeys(treeData.map((item) => item.data)));
      }
    });
  };

  const getExpandKeysBySearch = (nodes: any[], searchStr: string): number[] => {
    const keys: number[] = [];
    const traverse = (items: any[]) => {
      items.forEach((item) => {
        const title = item.title as string;
        if (title.toLowerCase().includes(searchStr.toLowerCase())) {
          keys.push(item.key);
        }
        if (item.children) {
          traverse(item.children);
        }
      });
    };
    traverse(nodes);
    return keys;
  };

  const handleSelect: TreeProps['onSelect'] = (selectedKeys, info) => {
    if (selectedKeys.length > 0 && info.node) {
      onSelectOrganization?.(info.node as any as SysOrganizationVo);
    } else {
      onSelectOrganization?.(null);
    }
    restProps.onSelect?.(selectedKeys, info);
  };

  useEffect(() => {
    loadTreeData();
  }, [loadTreeData]);

  return (
    <div>
      {showSearch && (
        <Search
          style={{ marginBottom: 8 }}
          placeholder="搜索组织名称"
          onSearch={handleSearch}
          onChange={(e) => handleSearch(e.target.value)}
          allowClear
        />
      )}
      <Tree
        treeData={filteredTreeData}
        expandedKeys={expandedKeys}
        onExpand={(keys) => setExpandedKeys(keys)}
        onSelect={handleSelect}
        {...restProps}
      />
    </div>
  );
};

export default OrganizationTree;
