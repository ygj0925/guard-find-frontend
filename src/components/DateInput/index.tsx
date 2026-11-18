import { DatePicker } from 'antd';
import zhCN from 'antd/es/date-picker/locale/zh_CN';
import dayjs from 'dayjs';

type PickerProps = import('antd').DatePickerProps;
type Props = Omit<
  PickerProps,
  'value' | 'onChange' | 'defaultValue' | 'minDate' | 'maxDate'
> & {
  value?: string | null;
  onChange?: (value?: string) => void;
  min?: string;
  max?: string;
};

/** Keep date-only API values as strings, with the shared Ant Design calendar UI. */
export default function DateInput({
  value,
  onChange,
  min,
  max,
  style,
  ...props
}: Props) {
  const date = value ? dayjs(value) : null;
  return (
    <DatePicker
      locale={zhCN}
      format="YYYY-MM-DD"
      placeholder="请选择日期"
      {...props}
      style={{ width: '100%', ...style }}
      value={date?.isValid() ? date : null}
      minDate={min ? dayjs(min) : undefined}
      maxDate={max ? dayjs(max) : undefined}
      onChange={(selected) =>
        onChange?.(selected ? selected.format('YYYY-MM-DD') : undefined)
      }
    />
  );
}
