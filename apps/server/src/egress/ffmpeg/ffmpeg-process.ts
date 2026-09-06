import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';

/** Number of stderr lines kept in `stderrTail` for failure reporting. */
const STDERR_TAIL_LIMIT = 20;

/**
 * Event-emitter wrapper around one spawned FFmpeg process.
 *
 * Events:
 * - `stderr` `(line: string)` - one stderr line at a time.
 * - `progress` `(line: string)` - raw `-progress pipe:1` stdout line whenever
 *   it contains `out_time_ms=`, serving as the liveness heartbeat.
 * - `exit` `(code: number | null, signal: string | null)` - emitted exactly
 *   once when the process and its stdio have fully closed.
 */
export class FFmpegProcess extends EventEmitter {
  private readonly child: ChildProcess;
  private readonly stdoutBuffer: LineBuffer;
  private readonly stderrBuffer: LineBuffer;
  private readonly tail: string[] = [];
  private stopPromise: Promise<void> | null = null;

  private constructor(child: ChildProcess) {
    super();
    this.child = child;
    this.stdoutBuffer = new LineBuffer((line) => {
      if (line.includes('out_time_ms=')) {
        this.emit('progress', line);
      }
    });
    this.stderrBuffer = new LineBuffer((line) => this.onStderrLine(line));
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => this.stdoutBuffer.push(chunk));
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => this.stderrBuffer.push(chunk));
    child.once('close', (code, signal) => {
      this.stdoutBuffer.flush();
      this.stderrBuffer.flush();
      this.emit('exit', code, signal);
    });
  }

  /** Spawn `bin` with `args`; stdout/stderr are piped and parsed. */
  static spawn(bin: string, args: string[]): FFmpegProcess {
    return new FFmpegProcess(
      spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] }),
    );
  }

  /** Last ~20 stderr lines, newline-joined (bounded context for failures). */
  get stderrTail(): string {
    return this.tail.join('\n');
  }

  /**
   * Stop the process: SIGINT first, then SIGKILL after `graceMs`. Resolves on
   * exit; idempotent - later calls return the original promise.
   */
  stop(graceMs: number): Promise<void> {
    if (this.stopPromise !== null) {
      return this.stopPromise;
    }
    const { promise, resolve } = Promise.withResolvers<void>();
    const child = this.child;
    const killer = setTimeout(() => child.kill('SIGKILL'), graceMs);
    const settled = (): void => {
      clearTimeout(killer);
      child.removeListener('close', settled);
      resolve();
    };
    child.once('close', settled);
    if (child.exitCode !== null || child.signalCode !== null) {
      settled();
    } else {
      child.kill('SIGINT');
      if (child.exitCode !== null || child.signalCode !== null) {
        settled();
      }
    }
    this.stopPromise = promise;
    return promise;
  }

  private onStderrLine(line: string): void {
    this.emit('stderr', line);
    if (this.tail.length === STDERR_TAIL_LIMIT) {
      this.tail.shift();
    }
    this.tail.push(line);
  }
}

/**
 * Splits streamed text into complete lines on `\n`, `\r\n` or `\r`, keeping
 * the trailing partial line buffered until more data (or `flush`) arrives.
 */
class LineBuffer {
  private pending = '';

  constructor(private readonly onLine: (line: string) => void) {}

  push(chunk: string): void {
    this.pending += chunk;
    let index: number;
    while ((index = this.pending.search(/\r\n|\n|\r/)) !== -1) {
      const separatorLength = this.pending.startsWith('\r\n', index) ? 2 : 1;
      this.onLine(this.pending.slice(0, index));
      this.pending = this.pending.slice(index + separatorLength);
    }
  }

  /** Emit whatever partial line remains (process closed mid-line). */
  flush(): void {
    if (this.pending.length > 0) {
      this.onLine(this.pending);
    }
    this.pending = '';
  }
}
