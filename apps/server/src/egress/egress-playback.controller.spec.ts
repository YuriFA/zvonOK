import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NotFoundException } from '@nestjs/common';
import { EgressPlaybackController } from './egress-playback.controller';

describe('EgressPlaybackController', () => {
  const egressId = 'c0a8010test00000000abcdefgh';
  let root: string;
  let controller: EgressPlaybackController;
  let headers: Record<string, string>;
  let sentPath: string | undefined;

  function makeRes() {
    headers = {};
    sentPath = undefined;
    return {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
      sendFile: (path: string) => {
        sentPath = path;
      },
    };
  }

  function serve(file: string) {
    const res = makeRes();
    controller.serve(egressId, file, res);
    return { headers, sentPath };
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'egress-hls-test-'));
    mkdirSync(join(root, egressId));
    writeFileSync(join(root, egressId, 'index.m3u8'), '#EXTM3U\n');
    writeFileSync(join(root, egressId, 'seg_000.ts'), 'ts-bytes');
    controller = new EgressPlaybackController(root);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('serves the playlist with the HLS type and no-store caching', () => {
    const { headers: h, sentPath } = serve('index.m3u8');
    expect(sentPath).toBe(join(root, egressId, 'index.m3u8'));
    expect(h['Content-Type']).toBe('application/vnd.apple.mpegurl');
    expect(h['Cache-Control']).toBe('no-cache');
  });

  it('serves segments as MPEG-TS with cacheable headers', () => {
    const { headers: h, sentPath } = serve('seg_000.ts');
    expect(sentPath).toBe(join(root, egressId, 'seg_000.ts'));
    expect(h['Content-Type']).toBe('video/mp2t');
    expect(h['Cache-Control']).toBe('public, max-age=3600');
  });

  it('rejects path traversal and separators in the file name', () => {
    expect(() => serve('../secret.m3u8')).toThrow(NotFoundException);
    expect(() => serve('a/b.ts')).toThrow(NotFoundException);
  });

  it('rejects malformed session ids', () => {
    expect(() =>
      new EgressPlaybackController(root).serve(
        '../etc',
        'index.m3u8',
        makeRes(),
      ),
    ).toThrow(NotFoundException);
    expect(() =>
      new EgressPlaybackController(root).serve(
        'UPPER-CASE-ID-00',
        'index.m3u8',
        makeRes(),
      ),
    ).toThrow(NotFoundException);
  });

  it('rejects unknown files and sessions', () => {
    expect(() => serve('ghost.m3u8')).toThrow(NotFoundException);
    expect(() =>
      new EgressPlaybackController(root).serve(
        'c0a8010nonexistent0000aaa',
        'index.m3u8',
        makeRes(),
      ),
    ).toThrow(NotFoundException);
  });
});
