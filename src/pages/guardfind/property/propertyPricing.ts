import type {
  PriceUnit,
  PropertyVo,
  RentalMode,
} from '@/services/web/guardfind/property';

export const RENTAL_MODE_LABELS: Record<RentalMode, string> = {
  whole: '整租',
  shared: '合租',
  room: '单间',
  short: '民宿短租',
};

export function getPriceUnit(
  priceType: string,
  rentalMode?: RentalMode | null,
): PriceUnit {
  return priceType === 'rent'
    ? rentalMode === 'short'
      ? 'day'
      : 'month'
    : null;
}

export function formatPropertyPrice(
  record: Pick<PropertyVo, 'price' | 'priceType' | 'rentalMode'>,
) {
  const unit = getPriceUnit(record.priceType, record.rentalMode);
  return `¥${record.price}${
    unit === 'day' ? '/天' : unit === 'month' ? '/月' : ''
  }`;
}
