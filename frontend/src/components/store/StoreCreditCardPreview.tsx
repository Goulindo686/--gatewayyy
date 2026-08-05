'use client';

import { FiCreditCard, FiWifi } from 'react-icons/fi';

type StoreCreditCardPreviewProps = {
    accent: string;
    number: string;
    holder: string;
    expMonth: string;
    expYear: string;
    flipped?: boolean;
};

function cardBrand(value: string) {
    const digits = value.replace(/\D/g, '');
    if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(digits)) return 'ELO';
    if (/^4/.test(digits)) return 'VISA';
    if (/^(5[1-5]|2[2-7])/.test(digits)) return 'MASTERCARD';
    if (/^3[47]/.test(digits)) return 'AMEX';
    return 'GOU PAY';
}

function visibleNumber(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 19);
    if (!digits) return '0000 0000 0000 0000';
    return digits.replace(/(.{4})/g, '$1 ').trim();
}

export default function StoreCreditCardPreview({
    accent,
    number,
    holder,
    expMonth,
    expYear,
    flipped = false,
}: StoreCreditCardPreviewProps) {
    const brand = cardBrand(number);
    const expiration = `${expMonth || 'MM'}/${expYear || 'AA'}`;

    return (
        <div className={`store-card-preview ${flipped ? 'is-flipped' : ''}`} aria-live="polite">
            <div className="store-card-preview-inner">
                <div className="store-card-face store-card-front" style={{ '--card-accent': accent } as React.CSSProperties}>
                    <div className="store-card-topline">
                        <span className="store-card-chip"><i /><i /><i /></span>
                        <FiWifi className="store-card-contactless" />
                    </div>
                    <div className="store-card-number">{visibleNumber(number)}</div>
                    <div className="store-card-footer">
                        <div><small>NOME NO CARTÃO</small><strong>{holder.trim() || 'SEU NOME'}</strong></div>
                        <div><small>VALIDADE</small><strong>{expiration}</strong></div>
                        <b>{brand}</b>
                    </div>
                </div>
                <div className="store-card-face store-card-back" style={{ '--card-accent': accent } as React.CSSProperties}>
                    <div className="store-card-stripe" />
                    <div className="store-card-signature"><span>ASSINATURA</span><b>•••</b></div>
                    <div className="store-card-back-copy"><FiCreditCard /><span>O código de segurança não é exibido.</span></div>
                </div>
            </div>

            <style jsx>{`
                .store-card-preview { width: min(100%, 390px); aspect-ratio: 1.59; margin: 0 auto 24px; perspective: 1100px; }
                .store-card-preview-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform .5s cubic-bezier(.2,.75,.25,1); }
                .store-card-preview.is-flipped .store-card-preview-inner { transform: rotateY(180deg); }
                .store-card-face { position: absolute; inset: 0; overflow: hidden; border-radius: 22px; padding: 25px 27px; color: white; backface-visibility: hidden; box-shadow: 0 22px 55px color-mix(in srgb, var(--card-accent) 24%, rgba(15,23,42,.38)); }
                .store-card-face::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 82% 5%, color-mix(in srgb, var(--card-accent) 76%, white 8%), transparent 38%), linear-gradient(138deg, #0f172a 0%, color-mix(in srgb, var(--card-accent) 52%, #0f172a) 55%, #111827 100%); }
                .store-card-face::after { content: ''; position: absolute; width: 260px; height: 260px; right: -100px; bottom: -155px; border: 1px solid rgba(255,255,255,.18); border-radius: 50%; box-shadow: 0 0 0 35px rgba(255,255,255,.035), 0 0 0 72px rgba(255,255,255,.025); }
                .store-card-face > * { position: relative; z-index: 1; }
                .store-card-topline { display: flex; align-items: center; justify-content: space-between; }
                .store-card-chip { width: 46px; height: 34px; border-radius: 8px; display: grid; grid-template-columns: repeat(3,1fr); overflow: hidden; background: linear-gradient(135deg,#f5d77a,#b88d31); box-shadow: inset 0 0 0 1px rgba(77,49,0,.28); }
                .store-card-chip i { border-right: 1px solid rgba(72,45,0,.25); }
                .store-card-contactless { font-size: 26px; transform: rotate(90deg); opacity: .82; }
                .store-card-number { margin-top: 43px; font-size: clamp(18px, 2.25vw, 23px); font-weight: 750; letter-spacing: .12em; white-space: nowrap; text-shadow: 0 2px 6px rgba(0,0,0,.25); }
                .store-card-footer { margin-top: 25px; display: grid; grid-template-columns: minmax(0,1fr) auto auto; gap: 24px; align-items: end; }
                .store-card-footer div { min-width: 0; display: grid; gap: 3px; }
                .store-card-footer small { color: rgba(255,255,255,.66); font-size: 7px; letter-spacing: .14em; }
                .store-card-footer strong { overflow: hidden; font-size: 10px; letter-spacing: .07em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
                .store-card-footer b { font-size: 12px; font-style: italic; letter-spacing: .04em; }
                .store-card-back { padding: 28px 0; transform: rotateY(180deg); }
                .store-card-stripe { height: 48px; margin-top: 6px; background: rgba(2,6,23,.82); }
                .store-card-signature { height: 42px; margin: 24px 28px 0; padding: 0 12px; display: flex; align-items: center; justify-content: space-between; color: #111827; background: repeating-linear-gradient(0deg,#f8fafc,#f8fafc 5px,#e2e8f0 6px); border-radius: 5px; }
                .store-card-signature span { font-size: 8px; letter-spacing: .08em; }
                .store-card-signature b { font-size: 13px; }
                .store-card-back-copy { margin: 18px 28px 0; display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,.72); font-size: 9px; }
                @media (max-width: 520px) {
                    .store-card-face { border-radius: 18px; padding: 20px; }
                    .store-card-number { margin-top: 30px; font-size: 16px; }
                    .store-card-footer { margin-top: 18px; gap: 12px; }
                    .store-card-chip { width: 39px; height: 29px; }
                }
            `}</style>
        </div>
    );
}
