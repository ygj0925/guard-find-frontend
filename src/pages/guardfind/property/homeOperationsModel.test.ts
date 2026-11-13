import type { PropertyHome } from '@/services/web/guardfind/property';
import {
  isOptionalHttpUrl,
  toHomeFormValues,
  toPropertyHome,
  validatePropertyHome,
} from './homeOperationsModel';

function configuration(): PropertyHome {
  return {
    supportPhone: null,
    serviceHours: null,
    banners: [
      {
        id: 'main',
        title: '首页',
        subtitle: null,
        imageUrl: null,
        targetType: 'activity',
        targetId: 'stay',
        enabled: true,
      },
    ],
    activities: [
      {
        id: 'stay',
        title: '住宿活动',
        description: null,
        imageUrl: null,
        startsAt: '2026-12-01 09:00:00',
        endsAt: '2026-12-31 18:00:00',
        enabled: false,
        propertyIds: [42],
      },
    ],
  };
}

test('complete configuration round trips with date strings and preserved empty optional fields', () => {
  const home = configuration();
  expect(toPropertyHome(toHomeFormValues(home))).toEqual({
    ...home,
    activities: [{ ...home.activities[0], propertyIds: ['42'] }],
  });
  expect(
    toPropertyHome(
      toHomeFormValues({
        supportPhone: null,
        serviceHours: null,
        banners: [],
        activities: [],
      }),
    ),
  ).toEqual({
    supportPhone: null,
    serviceHours: null,
    banners: [],
    activities: [],
  });
});

test('all/recommended targets clear stale target IDs and optional dates may have an empty end', () => {
  const values = toHomeFormValues(configuration());
  values.banners[0].targetType = 'recommended';
  values.activities[0].dateRange = ['2026-12-01 09:00:00', null];
  expect(toPropertyHome(values).banners[0].targetId).toBeNull();
  expect(toPropertyHome(values).activities[0].endsAt).toBeNull();
});

test.each([
  null,
  '',
  'http://example.com/a.jpg',
  'https://example.com/a.jpg',
  'http://localhost/a.jpg',
  'http://127.0.0.1/a.jpg',
  'https://[::1]/a.jpg',
])('optional HTTP(S) image URL accepts %s', (value) => {
  expect(isOptionalHttpUrl(value)).toBe(true);
});

test.each([
  'ftp://example.com/a.jpg',
  'https://example.com/a b.jpg',
  'https://',
  'https:///example.com/a.jpg',
  'https://user@example.com/a.jpg',
  'https://:password@example.com/a.jpg',
  'https://user:password@example.com/a.jpg',
  'https://@example.com/a.jpg',
  'https://bad_host.example/a.jpg',
  'https://%65xample.com/a.jpg',
  'https://例子.com/a.jpg',
  'https://-example.com/a.jpg',
  'https://example-.com/a.jpg',
  'https://example..com/a.jpg',
  'https://example.com\\evil.com/a.jpg',
  `https://example.com/${'a'.repeat(1000)}`,
])('invalid image URL rejects %s', (value) => {
  expect(isOptionalHttpUrl(value)).toBe(false);
  const home = configuration();
  home.banners[0].imageUrl = value;
  expect(() => validatePropertyHome(home)).toThrow('图片地址');
  home.banners[0].imageUrl = null;
  home.activities[0].imageUrl = value;
  expect(() => validatePropertyHome(home)).toThrow('图片地址');
});

test('image URLs enforce the exact 1000-character boundary', () => {
  const prefix = 'https://example.com/';
  const url = prefix + 'a'.repeat(1000 - prefix.length);
  expect(isOptionalHttpUrl(url)).toBe(true);
  expect(isOptionalHttpUrl(`${url}a`)).toBe(false);
});

test('slug IDs are unique per collection and limited to lower-case letters, digits and hyphens', () => {
  const home = configuration();
  home.banners.push({ ...home.banners[0] });
  expect(() => validatePropertyHome(home)).toThrow('不能重复');
  home.banners.pop();
  home.banners[0].id = 'Invalid ID';
  expect(() => validatePropertyHome(home)).toThrow('小写字母');
  home.banners[0].id = 'a'.repeat(41);
  expect(() => validatePropertyHome(home)).toThrow('1–40');
});

test('banner, activity and associated property limits are enforced', () => {
  const home = configuration();
  home.banners = Array.from({ length: 6 }, (_, i) => ({
    ...home.banners[0],
    id: `banner-${i}`,
  }));
  expect(() => validatePropertyHome(home)).toThrow('横幅最多 5');
  home.banners = [];
  home.activities = Array.from({ length: 21 }, (_, i) => ({
    ...home.activities[0],
    id: `activity-${i}`,
  }));
  expect(() => validatePropertyHome(home)).toThrow('活动最多 20');
  home.activities = [home.activities[0]];
  home.activities[0].propertyIds = Array.from({ length: 101 }, (_, i) => i + 1);
  expect(() => validatePropertyHome(home)).toThrow('最多关联 100');
  home.activities[0].propertyIds.pop();
  expect(() => validatePropertyHome(home)).not.toThrow();
});

test('phone, service hours, date validity, date ordering and deleted activity references are validated', () => {
  const home = configuration();
  home.supportPhone = 'abc';
  expect(() => validatePropertyHome(home)).toThrow('运营电话');
  home.supportPhone = '+86-021-12345678';
  home.serviceHours = 'a'.repeat(101);
  expect(() => validatePropertyHome(home)).toThrow('服务时间');
  home.serviceHours = null;
  home.activities[0].startsAt = '2026-02-30 09:00:00';
  expect(() => validatePropertyHome(home)).toThrow('日期格式');
  home.activities[0].startsAt = '2027-01-01 09:00:00';
  expect(() => validatePropertyHome(home)).toThrow('结束时间');
  home.activities = [];
  expect(() => validatePropertyHome(home)).toThrow('跳转活动不存在');
});

test.each([
  null,
  '',
  '123456',
  '1----1',
  '+86-021-12345678',
  '1'.repeat(20),
  `+${'1'.repeat(19)}`,
])('phone accepts the backend format and optional value %s', (supportPhone) => {
  const home = configuration();
  home.supportPhone = supportPhone;
  expect(() => toPropertyHome(toHomeFormValues(home))).not.toThrow();
});

test.each([
  '12345',
  '+12345',
  '1'.repeat(21),
  `+${'1'.repeat(20)}`,
  '+86 (021) 1234-5678',
  '123 456',
  '123(456)',
  '1+23456',
  '++123456',
  '-123456',
  '123456-',
  '123456+',
])('phone rejects invalid backend format %s', (supportPhone) => {
  const home = configuration();
  home.supportPhone = supportPhone;
  expect(() => validatePropertyHome(home)).toThrow('运营电话最多 20 位');
});

test.each(['2026-12-01 09:00:00', '2026-12-01 08:59:59'])(
  'activity end %s must be strictly later than start',
  (endsAt) => {
    const home = configuration();
    home.activities[0].endsAt = endsAt;
    expect(() => toPropertyHome(toHomeFormValues(home))).toThrow(
      '活动结束时间必须晚于开始时间',
    );
  },
);

test.each([
  [null, null],
  [null, '2026-12-01 09:00:00'],
  ['2026-12-01 09:00:00', null],
  ['2026-12-01 09:00:00', '2026-12-01 09:00:01'],
])('optional activity range [%s, %s] is valid', (startsAt, endsAt) => {
  const home = configuration();
  home.activities[0].startsAt = startsAt;
  home.activities[0].endsAt = endsAt;
  expect(() => validatePropertyHome(home)).not.toThrow();
});

test.each(['1', '9007199254740992', '9223372036854775807'])(
  'property target and association accept precise positive Long %s',
  (id) => {
    const home = configuration();
    home.banners[0].targetType = 'property';
    home.banners[0].targetId = id;
    home.activities[0].propertyIds = [id];
    expect(toPropertyHome(toHomeFormValues(home))).toEqual(home);
  },
);

test.each([
  '0',
  '-1',
  '+1',
  '01',
  '1.5',
  '1e3',
  'abc',
  ' 1',
  '1 ',
  '9223372036854775808',
  '9999999999999999999',
  '10000000000000000000',
])('property target rejects invalid positive Long %s', (id) => {
  const home = configuration();
  home.banners[0].targetType = 'property';
  home.banners[0].targetId = id;
  expect(() => toPropertyHome(toHomeFormValues(home))).toThrow(
    '横幅跳转房源 ID 须为正整数',
  );
});

test.each([
  0,
  -1,
  1.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.MAX_SAFE_INTEGER + 1,
  '',
  '0',
  '-1',
  '1.5',
  '1e3',
  'abc',
  '9223372036854775808',
  '10000000000000000000',
])('activity association rejects invalid positive Long %s', (id) => {
  const home = configuration();
  home.activities[0].propertyIds = [id];
  expect(() => validatePropertyHome(home)).toThrow(
    '活动关联房源 ID 须为正整数',
  );
});

test('activity associations follow Positive Long rather than banner slug or uniqueness rules', () => {
  const home = configuration();
  home.activities[0].propertyIds = [
    1,
    '1',
    '+1',
    '01',
    Number.MAX_SAFE_INTEGER,
  ];
  expect(() => validatePropertyHome(home)).not.toThrow();
  expect(
    toPropertyHome(toHomeFormValues(home)).activities[0].propertyIds,
  ).toEqual(['1', '1', '+1', '01', String(Number.MAX_SAFE_INTEGER)]);
  home.activities.push({ ...home.activities[0] });
  expect(() => validatePropertyHome(home)).toThrow('活动 ID 不能重复');
});
