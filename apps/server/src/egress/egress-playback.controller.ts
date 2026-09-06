import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  Controller,
  Get,
  Inject,
  Injectable,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { SkipAuthGuard } from 'src/auth/skip-auth.guard';
import { EGRESS_HLS_DIR } from './egress.config';

/** Minimal shape of the injected express response this controller needs. */
interface RawFileResponse {
  setHeader(name: string, value: string): void;
  sendFile(path: string): void;
}

/** Injection token for the HLS root directory (overridable in tests). */
export const EGRESS_HLS_ROOT = 'EGRESS_HLS_ROOT';

/** cuid-shaped room-independent session directory name. */
const EGRESS_ID_PATTERN = /^[a-z0-9]{10,40}$/;

/** Playlist or segment file name; rejects any path separators or traversal. */
const FILE_NAME_PATTERN = /^[\w.-]+\.(m3u8|ts)$/;

/**
 * Public playback surface for egress HLS output. Access control is the
 * unguessable per-session directory id (documented v1 stance); no platform
 * credentials are required to watch a live or finished stream.
 */
@Injectable()
@Controller('egress/hls')
export class EgressPlaybackController {
  constructor(
    @Inject(EGRESS_HLS_ROOT) private readonly hlsRoot: string = EGRESS_HLS_DIR,
  ) {}

  @SkipAuthGuard()
  @Get(':egressId/:file')
  serve(
    @Param('egressId') egressId: string,
    @Param('file') file: string,
    @Res() res: RawFileResponse,
  ): void {
    if (!EGRESS_ID_PATTERN.test(egressId) || !FILE_NAME_PATTERN.test(file)) {
      throw new NotFoundException();
    }
    const absolute = join(this.hlsRoot, egressId, file);
    if (!existsSync(absolute)) {
      throw new NotFoundException();
    }
    if (file.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    res.sendFile(absolute);
  }
}
