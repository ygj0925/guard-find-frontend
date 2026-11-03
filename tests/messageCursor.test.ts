import { compareIds, mergeMessages } from '../src/utils/messageCursor';

describe('message cursor', () => {
  it('orders Java Long identifiers without numeric precision loss', () => {
    expect(compareIds('9007199254740992', '9007199254740993')).toBeLessThan(0);
    expect(compareIds('99', '100')).toBeLessThan(0);
  });
  it('deduplicates send responses against concurrent polling', () => {
    expect(
      mergeMessages(
        [{ id: '9007199254740993', content: 'sent' }],
        [
          { id: '9007199254740992', content: 'peer' },
          { id: '9007199254740993', content: 'sent' },
        ],
      ).map((m) => m.id),
    ).toEqual(['9007199254740992', '9007199254740993']);
  });
  it('deduplicates small IDs received as numbers and strings', () => {
    expect(mergeMessages([{ id: 1 }], [{ id: '1' }])).toEqual([{ id: '1' }]);
  });
});
