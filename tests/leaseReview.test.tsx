import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LeaseReviewPanel from '@/pages/guardfind/leases/LeaseReviewPanel';
import { replyLeaseReview } from '@/services/web/guardfind/leases';

type LeaseDetail = import('@/services/web/guardfind/leases').LeaseDetail;

let mockCanEdit = true;
jest.mock('@/hooks/useAccess', () => ({
  useAccess: () => ({ hasPermission: () => mockCanEdit }),
}));
jest.mock('@/services/web/guardfind/leases', () => ({
  replyLeaseReview: jest.fn(),
}));
const lease = {
  id: '51',
  status: 'PENDING_SIGNATURE',
  publishedVersion: 4,
  contentHash: 'hash',
  unresolvedReviews: 1,
  reviews: [
    {
      id: '81',
      clauseLabel: '押金退款',
      content: '请说明退款日期',
      authorRole: 'TENANT',
      status: 'OPEN',
      currentRound: true,
      version: 1,
      createTime: '2026-11-18',
    },
  ],
} as LeaseDetail;
beforeEach(() => {
  mockCanEdit = true;
  jest
    .mocked(replyLeaseReview)
    .mockReset()
    .mockResolvedValue({ data: undefined } as never);
});
it('replies with the exact issue version and leaves confirmation to its author', async () => {
  const changed = jest.fn();
  render(<LeaseReviewPanel lease={lease} onChanged={changed} />);
  expect(screen.getByText(/双方暂不能继续签署/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '回复意见' }));
  fireEvent.change(screen.getByLabelText('处理说明'), {
    target: { value: '交接后7天内退还' },
  });
  fireEvent.click(screen.getByRole('button', { name: '发送回复' }));
  await waitFor(() =>
    expect(replyLeaseReview).toHaveBeenCalledWith('51', {
      action: 'REPLY',
      publishedVersion: 4,
      contentHash: 'hash',
      reviewId: '81',
      version: 1,
      content: '交接后7天内退还',
    }),
  );
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
});
it('does not expose reply actions without edit permission or for historical issues', () => {
  mockCanEdit = false;
  const { rerender } = render(
    <LeaseReviewPanel lease={lease} onChanged={jest.fn()} />,
  );
  expect(screen.queryByRole('button', { name: '回复意见' })).toBeNull();
  mockCanEdit = true;
  rerender(
    <LeaseReviewPanel
      lease={{
        ...lease,
        reviews: lease.reviews!.map((item) => ({
          ...item,
          currentRound: false,
        })),
      }}
      onChanged={jest.fn()}
    />,
  );
  expect(screen.queryByRole('button', { name: '回复意见' })).toBeNull();
});
