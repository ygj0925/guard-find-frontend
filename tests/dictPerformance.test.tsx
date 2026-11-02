import { act, render, screen, waitFor } from '@testing-library/react';
import { DictProvider, useDictContext } from '@/components/Dict/DictProvider';
import { createDictStore } from '@/components/Dict/store';
import { useDict } from '@/components/Dict/useDict';
import { dict } from '@/services/web/system';

type SysDictData = import('@/services/web/system').SysDictData;

jest.mock('@/services/web/system', () => ({ dict: { dictData: jest.fn() } }));

const CONTROL_IDS = Array.from(
  { length: 20 },
  (_, index) => `control-${index}`,
);

function data(
  code: string,
  valueType: 1 | 2 | 3 = 2,
  value = '1',
): SysDictData {
  return {
    dictCode: code,
    hashCode: '',
    valueType,
    loading: false,
    dictItems: [
      { id: 1, name: `${code} label`, value, realVal: value, attributes: {} },
    ],
  };
}

test('many controls share one request, and loading another code never renders them', async () => {
  const renders = jest.fn();
  let resolveB!: (response: any) => void;
  jest.mocked(dict.dictData).mockImplementation(async ([code]) => {
    if (code === 'B')
      return new Promise((resolve) => {
        resolveB = resolve;
      });
    return { data: [data(code)] } as any;
  });
  function Control({ code, count = false }: { code: string; count?: boolean }) {
    const { dictData, loading } = useDict(code);
    if (count) renders();
    return (
      <span>
        {code}:{loading ? 'loading' : dictData?.dictItems[0].name}
      </span>
    );
  }
  function Page({ showB = false }) {
    return (
      <>
        {CONTROL_IDS.map((id) => (
          <Control key={id} code="A" count />
        ))}
        {showB && <Control code="B" />}
      </>
    );
  }
  const page = <Page />;
  const view = render(<DictProvider>{page}</DictProvider>);
  await waitFor(() =>
    expect(screen.getAllByText('A:A label')).toHaveLength(20),
  );
  expect(dict.dictData).toHaveBeenCalledTimes(1);
  const beforeOtherCode = renders.mock.calls.length;
  // Keep the A subtree identical; the dictionary subscription is the behavior under test.
  view.rerender(
    <DictProvider>
      {page}
      <Control code="B" />
    </DictProvider>,
  );
  await waitFor(() => expect(resolveB).toBeDefined());
  expect(renders).toHaveBeenCalledTimes(beforeOtherCode);
  const beforeCompletion = renders.mock.calls.length;
  await act(async () => {
    resolveB({ data: [data('B')] });
  });
  expect(screen.getByText('B:B label')).toBeTruthy();
  expect(renders).toHaveBeenCalledTimes(beforeCompletion);
  expect(dict.dictData).toHaveBeenCalledTimes(2);
});

test('a failed code does not discard another code, and an explicit retry succeeds', async () => {
  let failing = true;
  const store = createDictStore(async ([code]) => {
    if (code === 'bad' && failing) throw new Error('offline');
    return [data(code)];
  });
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await store.ensureDictData(['good', 'bad']);
    expect(store.getCodeSnapshot('good').data?.dictCode).toBe('good');
    expect(store.getCodeSnapshot('good').loading).toBe(false);
    expect(store.getCodeSnapshot('bad').loading).toBe(false);
    expect(store.getSnapshot().loading).toBe(false);
    failing = false;
    await store.ensureDictData(['bad']);
    expect(store.getCodeSnapshot('bad').data?.dictCode).toBe('bad');
  } finally {
    log.mockRestore();
  }
});

test('concurrent disjoint responses merge and refresh only replaces the requested code', async () => {
  let resolveA!: (items: SysDictData[]) => void;
  let resolveB!: (items: SysDictData[]) => void;
  const load = jest.fn(
    ([code]: string[]) =>
      new Promise<SysDictData[]>((resolve) => {
        if (code === 'A') resolveA = resolve;
        else resolveB = resolve;
      }),
  );
  const store = createDictStore(load);
  const a = store.ensureDictData(['A']);
  const b = store.ensureDictData(['B']);
  await Promise.resolve();
  resolveB([data('B', 3, 'false')]);
  await b;
  const snapshotB = store.getCodeSnapshot('B');
  resolveA([data('A', 1, '12')]);
  await a;
  expect(store.getDictItem('A', '12')?.realVal).toBe(12);
  expect(store.getDictItem('B', 'false')?.realVal).toBe(false);
  expect(store.getCodeSnapshot('B')).toBe(snapshotB);
  await store.ensureDictData(['A', 'B']);
  expect(load).toHaveBeenCalledTimes(2);
  load.mockResolvedValueOnce([data('A', 1, '13')]);
  await store.refreshDict(['A']);
  expect(store.getDictItem('A', '13')?.realVal).toBe(13);
  expect(store.getCodeSnapshot('B')).toBe(snapshotB);
});

test('each provider has its own cache, and the full-context API still observes refreshes', async () => {
  jest
    .mocked(dict.dictData)
    .mockImplementation(async ([code]) => ({ data: [data(code)] }) as any);
  function Legacy() {
    const { dictMap, loading } = useDictContext();
    return <span>{loading ? 'pending' : Object.keys(dictMap).join(',')}</span>;
  }
  const view = render(
    <DictProvider dictCodes={['A']}>
      <Legacy />
    </DictProvider>,
  );
  await waitFor(() => expect(screen.getByText('A')).toBeTruthy());
  view.rerender(
    <DictProvider key="other-user" dictCodes={['B']}>
      <Legacy />
    </DictProvider>,
  );
  await waitFor(() => expect(screen.getByText('B')).toBeTruthy());
  expect(screen.queryByText('A')).toBeNull();
});
