type PropertyHome = import('@/services/web/guardfind/property').PropertyHome;
type PropertyInput = import('@/services/web/guardfind/property').PropertyInput;

import { request } from 'umi';
import {
  queryPropertyHome,
  queryPropertyPage,
  saveProperty,
  savePropertyHome,
  updatePropertyRecommended,
} from '@/services/web/guardfind/property';

jest.mock('umi', () => ({
  request: jest.fn().mockResolvedValue({ data: null }),
}));
const mockRequest = jest.mocked(request);
beforeEach(() => jest.clearAllMocks());

const emptyHome: PropertyHome = {
  supportPhone: null,
  serviceHours: null,
  banners: [],
  activities: [],
};

test('home operations use GET and PUT with the complete configuration body', async () => {
  await queryPropertyHome();
  expect(mockRequest).toHaveBeenLastCalledWith('system/property/home', {
    method: 'GET',
  });
  await savePropertyHome(emptyHome);
  expect(mockRequest).toHaveBeenLastCalledWith('system/property/home', {
    method: 'PUT',
    data: emptyHome,
  });
});

test.each([true, false])(
  'recommendation uses a dedicated POST boolean parameter: %s',
  async (recommended) => {
    await updatePropertyRecommended('42', recommended);
    expect(mockRequest).toHaveBeenLastCalledWith(
      'system/property/42/recommended',
      {
        method: 'POST',
        params: { recommended },
      },
    );
  },
);

test('paged property choices use only supported query parameters', async () => {
  await queryPropertyPage({ page: 2, size: 50 });
  expect(mockRequest).toHaveBeenLastCalledWith('system/property/page', {
    method: 'GET',
    params: { page: 2, size: 50 },
  });
});

test('property writes keep priceUnit, without adding recommended to PropertyInput', async () => {
  const input = {
    priceType: 'rent',
    rentalMode: 'short',
    priceUnit: 'day',
  } as PropertyInput;
  type RecommendedIsExcluded = 'recommended' extends keyof PropertyInput
    ? never
    : true;
  const excluded: RecommendedIsExcluded = true;
  expect(excluded).toBe(true);
  await saveProperty('42', input);
  expect(mockRequest).toHaveBeenLastCalledWith('system/property/42', {
    method: 'PUT',
    data: input,
  });
});
