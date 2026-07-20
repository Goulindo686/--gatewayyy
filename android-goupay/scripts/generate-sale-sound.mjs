import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const androidRoot = path.resolve(scriptDirectory, '..');
const sampleRate = 44_100;
const durationSeconds = 1.16;
const sampleCount = Math.floor(sampleRate * durationSeconds);

// Assinatura sonora original GouPay: "ka-ching" de caixa/moeda e confirmação curta.
const coinHits = [
    {
        start: 0.055,
        gain: 0.55,
        partials: [
            [1180, 1.00, 17.0],
            [1975, 0.64, 13.5],
            [3220, 0.38, 11.0],
            [4860, 0.20, 9.0],
        ],
    },
    {
        start: 0.155,
        gain: 0.68,
        partials: [
            [1760, 1.00, 8.0],
            [2845, 0.58, 9.5],
            [4380, 0.31, 10.5],
            [6350, 0.14, 12.0],
        ],
    },
];

const confirmationNotes = [
    { start: 0.285, frequency: 1046.50, gain: 0.26, decay: 8.0 },
    { start: 0.365, frequency: 1318.51, gain: 0.28, decay: 7.0 },
    { start: 0.455, frequency: 1567.98, gain: 0.34, decay: 5.6 },
];

const samples = new Float64Array(sampleCount);
let randomState = 0x47505559;
let previousNoise = 0;

function deterministicNoise() {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return ((randomState >>> 0) / 0xFFFFFFFF) * 2 - 1;
}

for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    let mixed = 0;

    // Abertura seca do caixa: um clique curto com corpo grave.
    if (time < 0.09) {
        const noise = deterministicNoise();
        const highPassedNoise = noise - previousNoise * 0.84;
        previousNoise = noise;
        const clackEnvelope = Math.exp(-time * 48);
        const drawerBody =
            Math.sin(2 * Math.PI * 145 * time) * Math.exp(-time * 30) +
            0.42 * Math.sin(2 * Math.PI * 286 * time) * Math.exp(-time * 38);
        mixed += 0.30 * clackEnvelope * highPassedNoise + 0.22 * drawerBody;
    }

    // Duas batidas metálicas formam o "ching" de dinheiro entrando.
    for (const hit of coinHits) {
        const localTime = time - hit.start;
        if (localTime < 0) continue;

        const attack = 1 - Math.exp(-localTime * 1200);
        let metallic = 0;
        for (const [frequency, partialGain, decay] of hit.partials) {
            const slightDrop = frequency * (1 - 0.004 * Math.min(localTime, 0.18));
            metallic +=
                partialGain *
                Math.sin(2 * Math.PI * slightDrop * localTime) *
                Math.exp(-localTime * decay);
        }
        mixed += hit.gain * attack * metallic;
    }

    // Três notas discretas fecham o som com sensação de pagamento aprovado.
    for (const note of confirmationNotes) {
        const localTime = time - note.start;
        if (localTime < 0) continue;

        const attack = 1 - Math.exp(-localTime * 760);
        const envelope = attack * Math.exp(-localTime * note.decay);
        const phase = 2 * Math.PI * note.frequency * localTime;
        const bell =
            Math.sin(phase) +
            0.24 * Math.sin(phase * 2.006) * Math.exp(-localTime * 3.8) +
            0.09 * Math.sin(phase * 3.99) * Math.exp(-localTime * 6.0);

        mixed += note.gain * envelope * bell;
    }

    // Brilho final de moeda, audível sem prolongar demais a notificação.
    const glintTime = time - 0.49;
    if (glintTime >= 0) {
        const glintEnvelope = (1 - Math.exp(-glintTime * 900)) * Math.exp(-glintTime * 7.2);
        mixed += 0.12 * glintEnvelope * (
            Math.sin(2 * Math.PI * 2350 * glintTime) +
            0.36 * Math.sin(2 * Math.PI * 4720 * glintTime)
        );
    }

    samples[index] = Math.tanh(mixed * 1.08);
}

let peak = 0;
for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
const normalization = peak > 0 ? 0.95 / peak : 1;

const dataSize = sampleCount * 2;
const wav = Buffer.alloc(44 + dataSize);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + dataSize, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(dataSize, 40);

for (let index = 0; index < sampleCount; index += 1) {
    const fadeOutStart = durationSeconds - 0.12;
    const time = index / sampleRate;
    const fadeOut = time > fadeOutStart
        ? Math.max(0, (durationSeconds - time) / (durationSeconds - fadeOutStart))
        : 1;
    const value = Math.max(-1, Math.min(1, samples[index] * normalization * fadeOut));
    wav.writeInt16LE(Math.round(value * 32767), 44 + index * 2);
}

const androidOutput = path.join(androidRoot, 'app', 'src', 'main', 'res', 'raw', 'goupay_sale.wav');

await mkdir(path.dirname(androidOutput), { recursive: true });
await writeFile(androidOutput, wav);

console.log(`Som GouPay gerado (${durationSeconds.toFixed(2)}s, ${sampleRate} Hz).`);
