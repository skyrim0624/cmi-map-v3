import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCmiEventCreatePath, getCmiEventPath } from '@/lib/paths';
import './cmi-community-entrance.css';

const referenceImageUrl = '/cmi-home/community-entry-reference.png';
const linkeQrImageUrl = '/cmi-home/qr-linke.jpg';
const featuredEventId = 'cmi-secondhand-auction-2026-06-06';

type ContactModalType = 'booking' | 'partner';

const contactModalCopy: Record<ContactModalType, { eyebrow: string; title: string; hint: string }> = {
  booking: {
    eyebrow: 'CMI INN',
    title: '欢迎入住清迈客栈！',
    hint: '扫码添加林可，确认房型、日期和入住安排。',
  },
  partner: {
    eyebrow: 'CMI COLLAB',
    title: '合作事宜请扫码',
    hint: '活动共创、场地合作、社区资源对接都可以从这里开始。',
  },
};

export default function CmiCommunityEntrance() {
  const [contactModalType, setContactModalType] = useState<ContactModalType | null>(null);
  const activeContactModal = contactModalType ? contactModalCopy[contactModalType] : null;

  useEffect(() => {
    if (!contactModalType) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContactModalType(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contactModalType]);

  return (
    <div className="cmi-community-page">
      <h1 className="sr-only">CMI 社区统一入口</h1>
      <main className="cmi-reference-entry" aria-label="CMI 社区统一入口">
        <img className="cmi-reference-image" src={referenceImageUrl} alt="" decoding="async" />
        <Link
          className="cmi-reference-hotspot cmi-reference-hotspot--event"
          to={getCmiEventPath(featuredEventId)}
          aria-label="查看活动：清迈客栈 CMI 社区二手物品拍卖大会"
        />
        <a
          className="cmi-reference-hotspot cmi-reference-hotspot--map"
          href="https://cmimap.com/map"
          aria-label="CMI MAP"
        />
        <a
          className="cmi-reference-hotspot cmi-reference-hotspot--swap"
          href="https://cmiswap.com"
          aria-label="CMI SWAP"
        />
        <Link
          className="cmi-reference-hotspot cmi-reference-hotspot--create"
          to={getCmiEventCreatePath()}
          aria-label="发起活动"
        />
        <button
          type="button"
          className="cmi-reference-hotspot cmi-reference-hotspot--booking"
          aria-label="一键订房"
          onClick={() => setContactModalType('booking')}
        />
        <button
          type="button"
          className="cmi-reference-hotspot cmi-reference-hotspot--partner"
          aria-label="相关合作"
          onClick={() => setContactModalType('partner')}
        />
      </main>

      {activeContactModal && (
        <div
          className="cmi-contact-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cmi-contact-title"
          onClick={() => setContactModalType(null)}
        >
          <div className="cmi-contact-panel" onClick={event => event.stopPropagation()}>
            <button
              type="button"
              className="cmi-contact-close"
              aria-label="关闭弹窗"
              onClick={() => setContactModalType(null)}
            >
              <X aria-hidden="true" />
            </button>
            <span className="cmi-contact-eyebrow">{activeContactModal.eyebrow}</span>
            <h2 id="cmi-contact-title">{activeContactModal.title}</h2>
            <div className="cmi-contact-qr">
              <img src={linkeQrImageUrl} alt="林可微信二维码" decoding="async" />
            </div>
            <p>{activeContactModal.hint}</p>
            <strong>林可微信</strong>
          </div>
        </div>
      )}
    </div>
  );
}
