export function calculateRmsLevel(analyser: AnalyserNode): number {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(dataArray);

  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = (dataArray[i] - 128) / 128;
    sum += normalized * normalized;
  }

  // return Math.sqrt(sum / dataArray.length);
  const rms = Math.sqrt(sum / dataArray.length);
  if (rms < 1e-10) return 0;
  const db = 20 * Math.log10(rms);           // ~-40..-5 dB для речи
  const normalized = (db + 60) / 60;         // маппим -60..0 dB → 0..1
  return Math.max(0, Math.min(1, normalized));
}
