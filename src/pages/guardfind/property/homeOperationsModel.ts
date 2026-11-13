import dayjs from 'dayjs';
import type { Activity, PropertyHome } from '@/services/web/guardfind/property';

export const HOME_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const HOME_LIMITS = { banners: 5, activities: 20, propertyIds: 100 };
export const HOME_ID_PATTERN = /^[a-z0-9-]{1,40}$/;
export const HOME_PHONE_MAX_LENGTH = 20;
export const HOME_PHONE_PATTERN = /^\+?[0-9][0-9-]{4,18}[0-9]$/;
export const HOME_PHONE_MESSAGE =
  '运营电话最多 20 位，除开头可带 + 外，首尾须为数字，中间须为 4–18 位数字或连字符';

export type ActivityFormValues = Omit<Activity, 'startsAt' | 'endsAt'> & {
  dateRange: [string | null, string | null] | null;
};
export type HomeFormValues = Omit<PropertyHome, 'activities'> & {
  activities: ActivityFormValues[];
};

const nullableText = (value?: string | null) => value?.trim() || null;

function isPositiveLong(value: string | number) {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return false;
  const text = String(value);
  if (!/^\+?[0-9]+$/.test(text)) return false;
  const digits = text.replace(/^\+?0*/, '');
  return (
    digits.length > 0 &&
    (digits.length < 19 ||
      (digits.length === 19 && digits <= '9223372036854775807'))
  );
}

export function isOptionalHttpUrl(value?: string | null) {
  if (!value) return true;
  if (value.length > 1000 || /\s/.test(value)) return false;
  const authority = /^https?:\/\/([^/?#]+)/i.exec(value)?.[1];
  if (!authority || /[@\\%]|[^\x21-\x7e]/.test(authority)) return false;
  try {
    const url = new URL(value);
    const validHostname =
      /^\[[0-9a-f:]+\]$/i.test(url.hostname) ||
      /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.?$/i.test(
        url.hostname,
      );
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      validHostname
    );
  } catch {
    return false;
  }
}

export function validateHomeIds(
  entries: { id: string }[],
  limit: number,
  label: string,
) {
  if (entries.length > limit) throw new Error(`${label}最多 ${limit} 个`);
  const ids = new Set<string>();
  for (const entry of entries) {
    if (!HOME_ID_PATTERN.test(entry.id || ''))
      throw new Error(`${label} ID 仅支持 1–40 位小写字母、数字和连字符`);
    if (ids.has(entry.id)) throw new Error(`${label} ID 不能重复`);
    ids.add(entry.id);
  }
}

export function toHomeFormValues(home: PropertyHome): HomeFormValues {
  return {
    supportPhone: home.supportPhone,
    serviceHours: home.serviceHours,
    banners: home.banners.map((banner) => ({ ...banner })),
    activities: home.activities.map(({ startsAt, endsAt, ...activity }) => ({
      ...activity,
      propertyIds: activity.propertyIds.map(String),
      dateRange: startsAt || endsAt ? [startsAt, endsAt] : null,
    })),
  };
}

export function toPropertyHome(values: HomeFormValues): PropertyHome {
  const home: PropertyHome = {
    supportPhone: nullableText(values.supportPhone),
    serviceHours: nullableText(values.serviceHours),
    banners: values.banners.map((banner) => ({
      id: banner.id,
      title: banner.title.trim(),
      subtitle: nullableText(banner.subtitle),
      imageUrl: banner.imageUrl || null,
      enabled: banner.enabled,
      targetType: banner.targetType,
      targetId: ['activity', 'property'].includes(banner.targetType)
        ? banner.targetId || null
        : null,
    })),
    activities: values.activities.map(({ dateRange, ...activity }) => ({
      id: activity.id,
      title: activity.title.trim(),
      description: nullableText(activity.description),
      imageUrl: activity.imageUrl || null,
      enabled: activity.enabled,
      propertyIds: activity.propertyIds || [],
      startsAt: dateRange?.[0] || null,
      endsAt: dateRange?.[1] || null,
    })),
  };
  validatePropertyHome(home);
  return home;
}

export function validatePropertyHome(home: PropertyHome) {
  if (
    home.supportPhone &&
    (home.supportPhone.length > HOME_PHONE_MAX_LENGTH ||
      !HOME_PHONE_PATTERN.test(home.supportPhone))
  )
    throw new Error(HOME_PHONE_MESSAGE);
  if (home.serviceHours && home.serviceHours.length > 100)
    throw new Error('服务时间最多 100 字');
  validateHomeIds(home.banners, HOME_LIMITS.banners, '横幅');
  validateHomeIds(home.activities, HOME_LIMITS.activities, '活动');
  for (const item of [...home.banners, ...home.activities]) {
    if (!item.title?.trim()) throw new Error('请填写标题');
    if (!isOptionalHttpUrl(item.imageUrl))
      throw new Error('图片地址须为无空白的 HTTP(S) URL，最多 1000 字');
  }
  for (const activity of home.activities) {
    if (activity.propertyIds.length > HOME_LIMITS.propertyIds)
      throw new Error('每个活动最多关联 100 个房源');
    if (!activity.propertyIds.every(isPositiveLong))
      throw new Error('活动关联房源 ID 须为正整数，最大 9223372036854775807');
    for (const value of [activity.startsAt, activity.endsAt]) {
      if (
        value &&
        (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ||
          !dayjs(value).isValid() ||
          dayjs(value).format(HOME_DATE_FORMAT) !== value)
      )
        throw new Error('活动日期格式须为 yyyy-MM-dd HH:mm:ss');
    }
    if (
      activity.startsAt &&
      activity.endsAt &&
      activity.startsAt >= activity.endsAt
    )
      throw new Error('活动结束时间必须晚于开始时间');
  }
  for (const banner of home.banners) {
    if (
      ['activity', 'property'].includes(banner.targetType) &&
      !banner.targetId
    )
      throw new Error('请选择横幅跳转目标');
    if (
      banner.targetType === 'property' &&
      (!/^[1-9][0-9]{0,18}$/.test(banner.targetId || '') ||
        !isPositiveLong(banner.targetId || ''))
    )
      throw new Error('横幅跳转房源 ID 须为正整数，最大 9223372036854775807');
    if (
      banner.targetType === 'activity' &&
      !home.activities.some((activity) => activity.id === banner.targetId)
    )
      throw new Error('横幅跳转活动不存在，请重新选择');
  }
}
