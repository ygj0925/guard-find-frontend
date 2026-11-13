import { Descriptions, Image, Modal, Tag } from 'antd';
import type { PropertyVo } from '@/services/web/guardfind/property';
import { formatPropertyPrice, RENTAL_MODE_LABELS } from './propertyPricing';

export default function PropertyDetails({
  record,
  open,
  onClose,
}: {
  record: PropertyVo;
  open: boolean;
  onClose: () => void;
}) {
  const items: [string, string | null][] = [
    [
      '房东',
      record.userId == null
        ? '未绑定房东，由后台管理'
        : `${record.ownerNickname || ''}（${record.userId}）`,
    ],
    ['价格', formatPropertyPrice(record)],
    ['首页推荐', record.recommended ? '推荐' : '未推荐'],
    ['小区', record.community],
    [
      '地址',
      [record.city, record.district, record.address].filter(Boolean).join(' '),
    ],
    ['户型', record.layout],
    ['面积', record.areaSqm ? `${record.areaSqm}㎡` : ''],
    ['楼层', record.floorInfo],
    ['朝向', record.orientation],
    ['装修', record.decoration],
    [
      '租赁方式',
      record.priceType === 'rent' && record.rentalMode
        ? RENTAL_MODE_LABELS[record.rentalMode]
        : '',
    ],
    ['可入住日期', record.availableFrom],
    ['联系人', record.contactName],
    ['联系电话', record.contactPhone],
    ['描述', record.description],
  ];
  return (
    <Modal
      title={record.title}
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Descriptions
        column={{ xs: 1, sm: 2 }}
        items={items.map(([label, value]) => ({
          key: label,
          label,
          children: value || '—',
        }))}
      />
      <div style={{ marginBottom: 16 }}>
        {record.facilities.map((f) => (
          <Tag key={f}>{f}</Tag>
        ))}
      </div>
      <Image.PreviewGroup>
        {record.images.map((url) => (
          <Image
            key={url}
            src={url}
            width={120}
            height={90}
            style={{ objectFit: 'cover', margin: 4 }}
          />
        ))}
      </Image.PreviewGroup>
    </Modal>
  );
}
