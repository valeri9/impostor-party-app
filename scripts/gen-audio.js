/**
 * Generates the app's sound effects as 16-bit PCM WAV files.
 *
 * The output is committed so a fresh clone builds without extra steps; this
 * script exists so the effects can be tweaked and reproduced deterministically
 * rather than being opaque binaries.
 *
 *   node scripts/gen-audio.js
 */
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'audio');

function writeWav(filename, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => {
    const clamped = Math.max(-1, Math.min(1, s));
    data.writeInt16LE(Math.round(clamped * 32767), i * 2);
  });

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // format = PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  const out = path.join(OUT_DIR, filename);
  fs.writeFileSync(out, Buffer.concat([header, data]));
  console.log(`wrote ${out} (${(header.length + data.length) / 1024 | 0} KB)`);
}

const square = (t, freq) => (Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1);
const sine = (t, freq) => Math.sin(2 * Math.PI * freq * t);

/** Short fade at both ends kills the click a hard cut would produce. */
function edgeFade(i, total, fadeSamples = 400) {
  return Math.min(1, i / fadeSamples, (total - i) / fadeSamples);
}

/** Two-tone descending buzz — round over. */
function buzzer() {
  const duration = 0.55;
  const total = Math.floor(SAMPLE_RATE * duration);
  const samples = new Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const freq = t < duration / 2 ? 233 : 175;
    // Blend a soft sine under the square so it buzzes without being harsh.
    const wave = 0.55 * square(t, freq) + 0.45 * sine(t, freq * 2);
    samples[i] = wave * 0.35 * edgeFade(i, total, 600);
  }
  return samples;
}

/** Rising two-note blip — action confirmed. */
function chime() {
  const duration = 0.24;
  const total = Math.floor(SAMPLE_RATE * duration);
  const samples = new Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const freq = t < duration / 2 ? 880 : 1318.5;
    const decay = Math.exp(-6 * (t % (duration / 2)));
    samples[i] = sine(t, freq) * 0.3 * decay * edgeFade(i, total, 200);
  }
  return samples;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
writeWav('buzzer.wav', buzzer());
writeWav('chime.wav', chime());
