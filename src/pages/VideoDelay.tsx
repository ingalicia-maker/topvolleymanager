import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Camera,
  FlipHorizontal2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RefreshCw,
  SwitchCamera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import '@/lib/scout/i18n';

// Delayed camera: the screen shows what the camera saw N seconds ago, so players can
// watch their own movement right after doing it. Frames are kept in a ring of small
// canvases (memory stays bounded); pausing freezes the buffer to review it frame by frame.

const MIN_DELAY = 2;
const MAX_DELAY = 30;
const DELAY_STEP = 2;

/** Longer delays keep more frames, so they use fewer frames per second and smaller
 *  frames to keep memory around 100–130 MB. */
function profile(delay: number): { fps: number; width: number } {
  if (delay <= 10) return { fps: 20, width: 512 };
  if (delay <= 20) return { fps: 12, width: 448 };
  return { fps: 10, width: 400 };
}
const SPEEDS = [1, 0.5, 0.25];

interface Ring {
  canvases: HTMLCanvasElement[];
  times: number[];
  write: number;
  w: number;
  h: number;
  fps: number;
}

export default function VideoDelay() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const displayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ringRef = useRef<Ring | null>(null);
  const rafRef = useRef<number>(0);
  const lastCapture = useRef(0);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [delay, setDelay] = useState(4);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [mirror, setMirror] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fill, setFill] = useState(0);
  // Review mode (paused)
  const [paused, setPaused] = useState(false);
  const [order, setOrder] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const delayRef = useRef(delay);
  delayRef.current = delay;
  const mirrorRef = useRef(mirror);
  mirrorRef.current = mirror;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const makeRing = useCallback((vw: number, vh: number, seconds: number): Ring => {
    const { fps, width } = profile(seconds);
    const w = Math.min(width, vw);
    const h = Math.round((w * vh) / vw);
    const n = Math.ceil(seconds * fps) + fps;
    const canvases: HTMLCanvasElement[] = [];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      canvases.push(c);
    }
    return { canvases, times: new Array(n).fill(0), write: 0, w, h, fps };
  }, []);

  const draw = useCallback((src: HTMLCanvasElement | null) => {
    const out = displayRef.current;
    if (!out) return;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    if (!src) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, out.width, out.height);
      return;
    }
    if (out.width !== src.width || out.height !== src.height) {
      out.width = src.width;
      out.height = src.height;
    }
    ctx.save();
    if (mirrorRef.current) {
      ctx.translate(out.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(src, 0, 0);
    ctx.restore();
  }, []);

  const loop = useCallback(() => {
    rafRef.current = requestAnimationFrame(loop);
    const video = videoRef.current;
    const ring = ringRef.current;
    if (!video || !ring || pausedRef.current || video.readyState < 2) return;
    const now = performance.now();
    if (now - lastCapture.current >= 1000 / ring.fps - 2) {
      lastCapture.current = now;
      const i = ring.write % ring.canvases.length;
      ring.canvases[i].getContext('2d')?.drawImage(video, 0, 0, ring.w, ring.h);
      ring.times[i] = now;
      ring.write++;
    }
    // Show the newest frame that is at least `delay` seconds old.
    const target = now - delayRef.current * 1000;
    let best = -1;
    let bestT = -1;
    let oldest = Infinity;
    for (let k = 0; k < ring.times.length; k++) {
      const tk = ring.times[k];
      if (!tk) continue;
      if (tk < oldest) oldest = tk;
      if (tk <= target && tk > bestT) {
        bestT = tk;
        best = k;
      }
    }
    draw(best >= 0 ? ring.canvases[best] : null);
    const have = oldest === Infinity ? 0 : (now - oldest) / 1000;
    setFill((f) => {
      const v = Math.min(1, have / Math.max(0.1, delayRef.current));
      return Math.abs(v - f) > 0.02 || (v === 1 && f !== 1) ? v : f;
    });
  }, [draw]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    ringRef.current = null;
    wakeRef.current?.release().catch(() => {});
    wakeRef.current = null;
    setRunning(false);
    setPaused(false);
    setPlaying(false);
    setFill(0);
  }, []);

  const start = useCallback(
    async (face: 'environment' | 'user' = facing) => {
      stop();
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t('scout.vd.unsupported'));
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: face, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: false,
        });
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        ringRef.current = makeRing(video.videoWidth || 1280, video.videoHeight || 720, delayRef.current);
        lastCapture.current = 0;
        setMirror(face === 'user');
        setRunning(true);
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wakeRef.current = await (navigator as any).wakeLock?.request('screen');
        } catch {
          /* screen may dim; not critical */
        }
        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        const name = (e as Error)?.name;
        setError(name === 'NotAllowedError' ? t('scout.vd.denied') : t('scout.vd.noCamera'));
      }
    },
    [facing, loop, makeRing, stop, t],
  );

  useEffect(() => () => stop(), [stop]);

  // A new delay needs a buffer of the right length: rebuild it (the countdown starts again).
  useEffect(() => {
    const video = videoRef.current;
    if (!running || paused || !video || !ringRef.current) return;
    ringRef.current = makeRing(video.videoWidth || 1280, video.videoHeight || 720, delay);
    lastCapture.current = 0;
    setFill(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay]);

  // Review mode: freeze the buffer and step through it.
  const pause = () => {
    const ring = ringRef.current;
    if (!ring) return;
    const idx = ring.times
      .map((tm, i) => [tm, i] as const)
      .filter(([tm]) => tm > 0)
      .sort((a, b) => a[0] - b[0])
      .map(([, i]) => i);
    // Start at the frame that was on screen.
    const target = performance.now() - delay * 1000;
    let p = 0;
    idx.forEach((i, k) => {
      if (ring.times[i] <= target) p = k;
    });
    setOrder(idx);
    setPos(p);
    setPaused(true);
    setPlaying(false);
    draw(ring.canvases[idx[p]] ?? null);
  };

  const resume = () => {
    const ring = ringRef.current;
    if (ring) {
      ring.times.fill(0);
      ring.write = 0;
    }
    setPaused(false);
    setPlaying(false);
    setFill(0);
  };

  useEffect(() => {
    if (!paused) return;
    const ring = ringRef.current;
    if (ring && order[pos] !== undefined) draw(ring.canvases[order[pos]]);
  }, [paused, pos, order, draw, mirror]);

  // Replay the frozen clip at the chosen speed.
  useEffect(() => {
    if (!paused || !playing) return;
    const ring = ringRef.current;
    if (!ring || order.length < 2) return;
    let raf = 0;
    let p = pos;
    let clipT = ring.times[order[p]];
    let last = performance.now();
    const step = () => {
      const now = performance.now();
      clipT += (now - last) * speed;
      last = now;
      while (p < order.length - 1 && ring.times[order[p + 1]] <= clipT) p++;
      setPos(p);
      if (p >= order.length - 1) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, paused, speed]);

  const clipSeconds =
    paused && order.length > 1 && ringRef.current
      ? (ringRef.current.times[order[pos]] - ringRef.current.times[order[order.length - 1]]) / 1000
      : 0;

  const controls = (
    <div className="space-y-3">
      {!paused ? (
        <>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">{t('scout.vd.delay')}</span>
              <span className="font-bold tabular-nums">{delay} s</span>
            </div>
            <Slider
              min={MIN_DELAY}
              max={MAX_DELAY}
              step={DELAY_STEP}
              value={[delay]}
              onValueChange={(v) => setDelay(v[0])}
            />
          </div>
          {running && fill < 1 && (
            <p className="text-xs text-muted-foreground">
              {t('scout.vd.buffering', { n: Math.max(1, Math.ceil(delay * (1 - fill))) })}
            </p>
          )}
        </>
      ) : (
        <div className="space-y-2">
          <Slider
            min={0}
            max={Math.max(0, order.length - 1)}
            step={1}
            value={[pos]}
            onValueChange={(v) => {
              setPlaying(false);
              setPos(v[0]);
            }}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
            <span>{clipSeconds.toFixed(1)} s</span>
            <div className="flex gap-1">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`rounded px-2 py-0.5 border ${speed === s ? 'bg-primary text-primary-foreground border-primary' : ''}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!running ? (
          <Button className="flex-1 gap-1" onClick={() => start()}>
            <Camera className="h-4 w-4" /> {t('scout.vd.start')}
          </Button>
        ) : paused ? (
          <>
            <Button variant="outline" className="gap-1" onClick={() => {
              if (pos >= order.length - 1) setPos(0);
              setPlaying((p) => !p);
            }}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? t('scout.vd.stopReplay') : t('scout.vd.replay')}
            </Button>
            <Button className="flex-1 gap-1" onClick={resume}>
              <RefreshCw className="h-4 w-4" /> {t('scout.vd.live')}
            </Button>
          </>
        ) : (
          <>
            <Button className="flex-1 gap-1" onClick={pause} disabled={fill < 0.2}>
              <Pause className="h-4 w-4" /> {t('scout.vd.pause')}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={t('scout.vd.switchCamera')}
              onClick={() => {
                const next = facing === 'environment' ? 'user' : 'environment';
                setFacing(next);
                start(next);
              }}
            >
              <SwitchCamera className="h-4 w-4" />
            </Button>
          </>
        )}
        {running && (
          <>
            <Button
              variant={mirror ? 'default' : 'outline'}
              size="icon"
              aria-label={t('scout.vd.mirror')}
              onClick={() => setMirror((m) => !m)}
            >
              <FlipHorizontal2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={t('scout.vd.fullscreen')}
              onClick={() => setFullscreen((f) => !f)}
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </>
        )}
      </div>
    </div>
  );

  const screen = (
    <div className={`relative bg-black ${fullscreen ? 'flex-1 min-h-0' : 'rounded-xl overflow-hidden aspect-video'}`}>
      <canvas ref={displayRef} className="w-full h-full object-contain" width={16} height={9} />
      {running && !paused && fill < 1 && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-5xl font-black">
          {Math.max(1, Math.ceil(delay * (1 - fill)))}
        </div>
      )}
      {running && (
        <span className="absolute top-2 left-2 rounded bg-black/60 text-white text-xs font-semibold px-2 py-0.5">
          {paused ? t('scout.vd.review') : `−${delay} s`}
        </span>
      )}
      {!running && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 text-sm gap-2 p-6 text-center">
          <Camera className="h-8 w-8" />
          {error ?? t('scout.vd.idle')}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* The live camera feed only feeds the buffer; it is never shown. */}
      <video ref={videoRef} playsInline muted autoPlay className="fixed -left-[9999px] w-px h-px opacity-0" />

      {fullscreen ? (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {screen}
          <div className="bg-background p-3">{controls}</div>
        </div>
      ) : (
        <>
          <div
            className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground px-4 pb-6"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
          >
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('common.back')}
                className="-ml-2 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                onClick={() => {
                  stop();
                  navigate('/coach');
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{t('scout.vd.title')}</h1>
                <p className="text-primary-foreground/80 text-sm">{t('scout.vd.subtitle')}</p>
              </div>
            </div>
          </div>
          <div className="px-4 mt-4 space-y-4 max-w-3xl mx-auto">
            {screen}
            {controls}
            <p className="text-xs text-muted-foreground">{t('scout.vd.tip')}</p>
          </div>
        </>
      )}
    </div>
  );
}
