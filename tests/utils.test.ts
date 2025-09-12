import { describe, it, expect } from 'vitest';
import { formatDuration, audioBufferToWav } from '../utils.ts';

describe('formatDuration', () => {
  it('formats seconds into mm:ss', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  it('handles edge cases', () => {
    expect(formatDuration(-1)).toBe('0:00');
    expect(formatDuration(Number.NaN)).toBe('0:00');
  });
});

describe('audioBufferToWav', () => {
  it('creates a WAV blob from an AudioBuffer', () => {
    const sampleRate = 44100;
    const length = sampleRate;
    const channelData = new Float32Array(length).fill(0);
    const buffer = {
      numberOfChannels: 1,
      length,
      sampleRate,
      getChannelData: () => channelData,
    } as unknown as AudioBuffer;

    const blob = audioBufferToWav(buffer);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(length * 2 + 44);
  });
});
