'use client';

import { useEffect, useState } from 'react';
import { FiArrowRight, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { StoreBannerSection } from '@/lib/store-builder';

export default function StoreBannerCarousel({
    section,
    accent,
    surface,
    border,
    onNavigate
}: {
    section: StoreBannerSection;
    accent: string;
    surface: string;
    border: string;
    onNavigate: (url: string) => void;
}) {
    const [activeSlide, setActiveSlide] = useState(0);
    const slideCount = section.slides.length;

    useEffect(() => {
        if (slideCount <= 1) return;
        const timer = window.setInterval(() => {
            setActiveSlide(current => (current + 1) % slideCount);
        }, 5500);
        return () => window.clearInterval(timer);
    }, [slideCount]);

    const previous = () => setActiveSlide(current => (current - 1 + slideCount) % slideCount);
    const next = () => setActiveSlide(current => (current + 1) % slideCount);
    const safeActiveSlide = Math.min(activeSlide, Math.max(0, slideCount - 1));

    return (
        <section className="store-banner-carousel" style={{ background: surface, borderColor: border }} aria-label={section.title || 'Destaques da loja'}>
            {section.slides.map((slide, index) => (
                <div
                    key={slide.id}
                    className={`store-banner-slide ${index === safeActiveSlide ? 'active' : ''}`}
                    style={{
                        backgroundImage: `linear-gradient(90deg,rgba(30,27,24,.88) 0%,rgba(30,27,24,.58) 52%,rgba(30,27,24,.08) 100%),url("${slide.image_url}")`
                    }}
                    aria-hidden={index !== safeActiveSlide}
                >
                    <div className="store-banner-copy">
                        <span style={{ color: accent }}>{section.title || 'DESTAQUE DA LOJA'}</span>
                        {slide.title && <h2>{slide.title}</h2>}
                        {slide.description && <p>{slide.description}</p>}
                        {slide.button_text && slide.button_url && (
                            <button type="button" onClick={() => onNavigate(slide.button_url)} style={{ background: accent }}>
                                {slide.button_text} <FiArrowRight style={{ marginLeft: 6, verticalAlign: 'middle' }} />
                            </button>
                        )}
                    </div>
                </div>
            ))}
            {slideCount > 1 && (
                <>
                    <div className="store-banner-dots">
                        {section.slides.map((slide, index) => (
                            <button
                                type="button"
                                key={slide.id}
                                className={index === safeActiveSlide ? 'active' : ''}
                                onClick={() => setActiveSlide(index)}
                                aria-label={`Exibir banner ${index + 1}`}
                            />
                        ))}
                    </div>
                    <div className="store-banner-controls">
                        <button type="button" onClick={previous} aria-label="Banner anterior"><FiChevronLeft /></button>
                        <button type="button" onClick={next} aria-label="Próximo banner"><FiChevronRight /></button>
                    </div>
                </>
            )}
            <style jsx>{`
                .store-banner-carousel {
                    position: relative;
                    min-height: 340px;
                    border-radius: 4px 48px 4px 4px;
                    overflow: hidden;
                    border: 1px solid;
                    box-shadow: 0 20px 48px rgba(39,32,27,.12);
                }
                .store-banner-slide {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: flex-end;
                    padding: 34px;
                    background-position: center;
                    background-size: cover;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity .45s ease;
                }
                .store-banner-slide.active {
                    opacity: 1;
                    pointer-events: auto;
                }
                .store-banner-copy {
                    max-width: 600px;
                    color: white;
                }
                .store-banner-copy span {
                    display: block;
                    font-size: 10px;
                    font-weight: 900;
                    letter-spacing: .16em;
                    margin-bottom: 10px;
                }
                .store-banner-copy h2 {
                    max-width: 620px;
                    font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
                    font-size: clamp(30px, 4vw, 48px);
                    line-height: 1;
                    font-weight: 500;
                    letter-spacing: -.035em;
                    margin-bottom: 12px;
                }
                .store-banner-copy p {
                    max-width: 540px;
                    color: rgba(255,255,255,.80);
                    font-size: 14px;
                    line-height: 1.55;
                }
                .store-banner-copy button {
                    margin-top: 18px;
                    border: none;
                    border-radius: 3px 12px 3px 3px;
                    padding: 12px 16px;
                    color: white;
                    font-weight: 900;
                    cursor: pointer;
                }
                .store-banner-controls {
                    position: absolute;
                    right: 18px;
                    bottom: 18px;
                    z-index: 3;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .store-banner-controls button {
                    width: 36px;
                    height: 36px;
                    border: 1px solid rgba(255,255,255,.24);
                    border-radius: 2px 10px 2px 2px;
                    display: grid;
                    place-items: center;
                    color: white;
                    background: rgba(9,9,11,.62);
                    backdrop-filter: blur(10px);
                    cursor: pointer;
                }
                .store-banner-dots {
                    position: absolute;
                    left: 34px;
                    bottom: 18px;
                    z-index: 3;
                    display: flex;
                    gap: 5px;
                }
                .store-banner-dots button {
                    width: 7px;
                    height: 7px;
                    border: none;
                    border-radius: 99px;
                    padding: 0;
                    background: rgba(255,255,255,.44);
                    cursor: pointer;
                    transition: width .2s ease;
                }
                .store-banner-dots button.active {
                    width: 23px;
                    background: white;
                }
                @media (max-width: 620px) {
                    .store-banner-carousel {
                        min-height: 240px;
                        border-radius: 3px 28px 3px 3px;
                    }
                    .store-banner-slide {
                        padding: 22px 18px 42px;
                    }
                    .store-banner-copy p {
                        font-size: 12px;
                    }
                    .store-banner-controls {
                        right: 12px;
                        bottom: 10px;
                    }
                    .store-banner-controls button {
                        width: 32px;
                        height: 32px;
                    }
                    .store-banner-dots {
                        left: 18px;
                        bottom: 15px;
                    }
                }
            `}</style>
        </section>
    );
}
