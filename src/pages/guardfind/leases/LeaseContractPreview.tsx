import { Tag } from 'antd';
import { leaseStatusLabels } from '@/services/web/guardfind/leases';
import styles from './index.less';

type LeaseDetail = import('@/services/web/guardfind/leases').LeaseDetail;

export function SigningProgress({ lease }: { lease: Partial<LeaseDetail> }) {
  return (
    <div className={styles.signers}>
      {(['landlord', 'tenant'] as const).map((party) => {
        const signed = lease[`${party}SignedAt`];
        return (
          <div key={party} className={styles.signer}>
            <span className={styles.eyebrow}>
              {party === 'landlord' ? '出租方 · 甲方' : '承租方 · 乙方'}
            </span>
            <div className={styles.signerName}>
              {lease[`${party}Name`] || '待填写'}
              <Tag color={signed ? 'success' : 'default'}>
                {signed ? '已签署' : '待签署'}
              </Tag>
            </div>
            <span className={styles.muted}>
              {signed || '本人在小程序阅读并手写签署'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function LeaseContractPreview({
  lease,
}: {
  lease: Partial<LeaseDetail>;
}) {
  return (
    <article className={styles.paper} aria-label="合同全文预览">
      <header className={styles.paperHeader}>
        <span className={styles.eyebrow}>房屋租赁 · 线上签约</span>
        <h2>{lease.title || '房屋租赁合同'}</h2>
        <span className={styles.muted}>
          合同编号 {lease.id || '草稿保存后生成'}
        </span>
        <div>
          <Tag>
            {lease.status ? leaseStatusLabels[lease.status] : '草稿预览'}
          </Tag>
        </div>
      </header>
      <dl className={styles.facts}>
        <dt>出租方（甲方）</dt>
        <dd>{lease.landlordName || '待填写'}</dd>
        <dt>承租方（乙方）</dt>
        <dd>{lease.tenantName || '待填写'}</dd>
        <dt>房源与地址</dt>
        <dd>
          {lease.propertyTitle || '待选择房源'}
          <br />
          {lease.propertyAddress}
        </dd>
        <dt>租赁期限</dt>
        <dd>
          {lease.startDate || '待填写'} 至 {lease.endDate || '待填写'}
        </dd>
        <dt>月租金 / 押金</dt>
        <dd>
          ¥{lease.monthlyRent ?? '—'} / ¥{lease.deposit ?? '—'}
        </dd>
      </dl>
      <section className={styles.terms}>
        <h3>合同条款</h3>
        <div>{lease.terms || '请填写双方认可的完整合同正文。'}</div>
      </section>
      <section className={styles.signatureSection}>
        <h3>双方签署</h3>
        <SigningProgress lease={lease} />
        <div className={styles.signatures}>
          {(['LANDLORD', 'TENANT'] as const).map((role) => {
            const record = lease.signatures?.find((s) => s.signerRole === role);
            const signedAt =
              role === 'LANDLORD'
                ? lease.landlordSignedAt
                : lease.tenantSignedAt;
            return (
              <div key={role} className={styles.signatureImage}>
                {record ? (
                  <>
                    <img
                      src={`data:image/png;base64,${record.imageBase64}`}
                      alt={`${role === 'LANDLORD' ? '出租方' : '承租方'}手写签名`}
                    />
                    {record.sealBase64 ? (
                      <img
                        className={styles.seal}
                        src={`data:image/png;base64,${record.sealBase64}`}
                        alt="签约人加盖的印章图片"
                      />
                    ) : null}
                    <p className={styles.hash}>
                      签署记录校验值：{record.recordHash}
                    </p>
                  </>
                ) : (
                  <span className={styles.muted}>
                    {signedAt
                      ? '历史账号确认记录，当时未采集手写签名'
                      : '等待本人签署'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <footer className={styles.paperFooter}>
        <p className={styles.hash}>
          合同内容校验值：{lease.contentHash || '发布后生成'}
        </p>
        <p>
          双方通过小程序账号完成手写签署。印章为本人上传的图片；未接入第三方实名认证或
          CA 证书。
        </p>
      </footer>
    </article>
  );
}
