import { Button, Empty, Input, Modal, Tabs, theme } from 'antd';
import React, { useMemo, useState } from 'react';
import Icon, { normalizeIconName, resolveIconComponent } from './Icon';
import icons from './icons';
import './IconSelect.less';

// Derive the palette from the same registry as the sidebar: every offered icon
// can render, and registered icons cannot disappear from the picker.
const allIcons = Object.keys(icons).map(normalizeIconName).sort();
const commonIcons = [
  'home',
  'appstore',
  'menu',
  'setting',
  'user',
  'team',
  'apartment',
  'dashboard',
  'folder',
  'file',
  'table',
  'database',
  'calendar',
  'notification',
  'mail',
  'safety',
  'tool',
  'code',
  'cloud',
  'shop',
];
const categories = [
  { key: 'common', label: '常用图标', icons: commonIcons },
  { key: 'all', label: '全部图标', icons: allIcons },
];

export type IconSelectProps = {
  id?: string;
  value?: string | null;
  onChange?: (value: string) => void;
  disabled?: boolean;
};

const IconSelect = ({ id, value, onChange, disabled }: IconSelectProps) => {
  const { token } = theme.useToken();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [activeTab, setActiveTab] = useState('common');
  const [search, setSearch] = useState('');
  const selectedName = normalizeIconName(value);
  const validValue = resolveIconComponent(value);
  const query = search.trim().toLowerCase();
  const filteredIcons = useMemo(() => {
    if (!open) return [];
    // Searching always covers the entire registry, regardless of the tab.
    const source = query
      ? allIcons
      : categories.find((category) => category.key === activeTab)?.icons || [];
    return source.filter(
      (name) =>
        !query ||
        `${name} ${name.replaceAll('-', '')}Outlined`
          .toLowerCase()
          .includes(query),
    );
  }, [open, activeTab, query]);

  const openPicker = () => {
    if (disabled) return;
    setDraft(validValue ? selectedName : '');
    setActiveTab(
      commonIcons.includes(selectedName) || !selectedName ? 'common' : 'all',
    );
    setSearch('');
    setOpen(true);
  };

  return (
    <>
      <Input
        id={id}
        readOnly
        value={value || ''}
        disabled={disabled}
        placeholder="请选择图标"
        title={value && !validValue ? '当前图标不可用，请重新选择' : '选择图标'}
        aria-haspopup="dialog"
        aria-expanded={open}
        prefix={validValue ? <Icon type={selectedName} /> : undefined}
        suffix={
          <>
            {value && (
              <Button
                type="text"
                size="small"
                aria-label="清空图标"
                disabled={disabled}
                icon={<Icon type="close" />}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange?.('');
                }}
              />
            )}
            <Button
              type="text"
              size="small"
              aria-label="选择图标"
              disabled={disabled}
              icon={<Icon type="appstore" />}
              onClick={(event) => {
                event.stopPropagation();
                openPicker();
              }}
            />
          </>
        }
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPicker();
          }
        }}
      />
      <Modal
        title="选择图标"
        open={open}
        width={760}
        destroyOnHidden
        okText="确定"
        cancelText="取消"
        okButtonProps={{ disabled: !draft }}
        onCancel={() => setOpen(false)}
        onOk={() => {
          onChange?.(draft);
          setOpen(false);
        }}
      >
        <div
          className="icon-picker"
          style={
            {
              '--icon-picker-primary': token.colorPrimary,
              '--icon-picker-selected': token.colorPrimaryBg,
              '--icon-picker-border': token.colorBorderSecondary,
              '--icon-picker-hover': token.colorFillTertiary,
            } as React.CSSProperties
          }
        >
          <Input
            placeholder="搜索图标名称，如 user、setting"
            value={search}
            allowClear
            prefix={<Icon type="search" />}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={categories.map(({ key, label }) => ({ key, label }))}
          />
          <fieldset className="icon-picker-grid" aria-label="可选图标">
            {filteredIcons.map((name) => (
              <button
                type="button"
                key={name}
                className="icon-picker-option"
                title={name}
                aria-label={name}
                aria-pressed={draft === name}
                onClick={() => setDraft(name)}
              >
                <Icon type={name} />
                <span className="icon-picker-name">{name}</span>
                {draft === name && (
                  <Icon className="icon-picker-check" type="check-circle" />
                )}
              </button>
            ))}
          </fieldset>
          {filteredIcons.length === 0 && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="未找到匹配的图标"
            />
          )}
          <div className="icon-picker-preview" aria-live="polite">
            {draft ? (
              <>
                <Icon type={draft} />
                <span>已选：{draft}</span>
              </>
            ) : (
              <span>请选择一个图标</span>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default IconSelect;
