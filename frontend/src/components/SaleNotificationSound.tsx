'use client';

import { useEffect, useRef } from 'react';

const SALE_SOUND_MESSAGE = 'GOUPAY_SALE_NOTIFICATION_SOUND';
const MIN_INTERVAL_MS = 1200;

function createAudioContext() {
    const AudioContextClass =
        window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return AudioContextClass ? new AudioContextClass() : null;
}

function playTone(
    context: AudioContext,
    frequency: number,
    startsAt: number,
    duration: number,
    volume: number
) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startsAt);

    gain.gain.setValueAtTime(0.0001, startsAt);
    gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startsAt);
    oscillator.stop(startsAt + duration + 0.03);
}

export function SaleNotificationSound() {
    const audioContextRef = useRef<AudioContext | null>(null);
    const lastPlayedAtRef = useRef(0);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

        const unlockAudio = () => {
            try {
                const context = audioContextRef.current || createAudioContext();
                if (!context) return;
                audioContextRef.current = context;
                if (context.state === 'suspended') {
                    void context.resume();
                }
            } catch {
                // Se o navegador bloquear audio, a notificacao nativa continua funcionando.
            }
        };

        const playSaleChime = async () => {
            const nowMs = Date.now();
            if (nowMs - lastPlayedAtRef.current < MIN_INTERVAL_MS) return;
            lastPlayedAtRef.current = nowMs;

            try {
                const context = audioContextRef.current || createAudioContext();
                if (!context) return;
                audioContextRef.current = context;

                if (context.state === 'suspended') {
                    await context.resume();
                }

                const now = context.currentTime + 0.02;
                playTone(context, 880, now, 0.11, 0.12);
                playTone(context, 1174.66, now + 0.1, 0.13, 0.14);
                playTone(context, 1567.98, now + 0.23, 0.18, 0.11);
            } catch {
                // Nao deixa audio afetar nenhuma funcionalidade do app.
            }
        };

        const onServiceWorkerMessage = (event: MessageEvent) => {
            if (event.data?.type === SALE_SOUND_MESSAGE) {
                void playSaleChime();
            }
        };

        const interactionEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
        interactionEvents.forEach((eventName) => {
            window.addEventListener(eventName, unlockAudio, { passive: true });
        });

        navigator.serviceWorker?.addEventListener('message', onServiceWorkerMessage);

        return () => {
            interactionEvents.forEach((eventName) => {
                window.removeEventListener(eventName, unlockAudio);
            });
            navigator.serviceWorker?.removeEventListener('message', onServiceWorkerMessage);
        };
    }, []);

    return null;
}
