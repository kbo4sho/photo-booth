import {
  Aperture,
  Camera,
  Crown,
  Download,
  GalleryHorizontal,
  Gamepad2,
  Images,
  Palette,
  PartyPopper,
  RefreshCw,
  Rocket,
  SlidersHorizontal,
  Sparkles,
  Video,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { propMixes, themePacks } from "./booth/config";
import {
  computeCoverRect,
  drawFaceProps,
  drawThemeBase,
  drawThemeOverlay,
  drawWaitingScene,
  getFaceCenter,
  isMouthOpen,
  isSmiling,
  mapFaceLandmarks,
  spawnConfetti,
  updateAndDrawParticles,
} from "./booth/drawing";
import type {
  Capture,
  CaptureLayout,
  FacePoint,
  FaceSnapshot,
  Particle,
  PropId,
  ThemeId,
  ThemePack,
} from "./booth/types";

type CameraStatus = "requesting" | "ready" | "denied" | "missing" | "unsupported" | "error";
type TrackerStatus = "loading" | "ready" | "error";

const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const wasmUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";

const themeIcons: Record<ThemeId, LucideIcon> = {
  "birthday-stage": PartyPopper,
  "space-party": Rocket,
  "arcade-party": Gamepad2,
  "royal-party": Crown,
};

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const lastResultsRef = useRef<FaceLandmarkerResult | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const particlesRef = useRef<Particle[]>([]);
  const lastFrameTimeRef = useRef(performance.now());
  const expressionGateRef = useRef<Record<string, number>>({});
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("requesting");
  const [cameraError, setCameraError] = useState("");
  const [trackerStatus, setTrackerStatus] = useState<TrackerStatus>("loading");
  const [themeIndex, setThemeIndex] = useState(0);
  const [propMixIndex, setPropMixIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [shotProgress, setShotProgress] = useState({ current: 0, total: 0 });
  const [flash, setFlash] = useState(false);
  const [preview, setPreview] = useState<Capture | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [captureMode, setCaptureMode] = useState<CaptureLayout>("single");
  const [controlsOpen, setControlsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const activeTheme = themePacks[themeIndex];
  const activePropMix = propMixes[propMixIndex];
  const activePropIds = useMemo<PropId[]>(() => {
    return activePropMix.props === "theme" ? activeTheme.props : activePropMix.props;
  }, [activePropMix, activeTheme]);

  const requestCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("unsupported");
      setCameraError("This browser does not support camera access.");
      return;
    }

    setCameraStatus("requesting");
    setCameraError("");

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        return;
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      setCameraStatus("ready");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraStatus("denied");
        setCameraError("Camera permission was denied.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setCameraStatus("missing");
        setCameraError("No camera was found on this device.");
      } else {
        setCameraStatus("error");
        setCameraError(error instanceof Error ? error.message : "Camera could not start.");
      }
    }
  }, []);

  useEffect(() => {
    void requestCamera();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [requestCamera]);

  useEffect(() => {
    let active = true;

    async function loadTracker() {
      try {
        setTrackerStatus("loading");
        const fileset = await FilesetResolver.forVisionTasks(wasmUrl);
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: modelUrl,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 6,
          outputFaceBlendshapes: true,
        });

        if (!active) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setTrackerStatus("ready");
      } catch (error) {
        console.error(error);
        if (active) {
          setTrackerStatus("error");
        }
      }
    }

    void loadTracker();

    return () => {
      active = false;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let animationFrame = 0;

    const resizeCanvas = (canvas: HTMLCanvasElement) => {
      const stage = stageRef.current;
      const rect = stage?.getBoundingClientRect();
      const cssWidth = Math.max(1, Math.floor(rect?.width ?? 960));
      const cssHeight = Math.max(1, Math.floor(rect?.height ?? 540));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.floor(cssWidth * dpr);
      const pixelHeight = Math.floor(cssHeight * dpr);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
    };

    const render = (time: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");

      if (!canvas || !ctx) {
        animationFrame = requestAnimationFrame(render);
        return;
      }

      resizeCanvas(canvas);
      const width = canvas.width;
      const height = canvas.height;
      const deltaMs = Math.min(48, time - lastFrameTimeRef.current);
      lastFrameTimeRef.current = time;

      const video = videoRef.current;
      const videoReady =
        cameraStatus === "ready" &&
        video &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0;

      if (!videoReady || !video) {
        drawWaitingScene(ctx, activeTheme, width, height, time);
        updateAndDrawParticles(ctx, particlesRef.current, deltaMs);
        animationFrame = requestAnimationFrame(render);
        return;
      }

      const coverRect = computeCoverRect(video.videoWidth, video.videoHeight, width, height);

      drawThemeBase(ctx, activeTheme, width, height, time);
      ctx.save();
      ctx.globalAlpha = 0.94;
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, coverRect.x, coverRect.y, coverRect.width, coverRect.height);
      ctx.restore();

      let faces: FaceSnapshot[] = [];
      if (trackerStatus === "ready" && landmarkerRef.current) {
        try {
          if (video.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = video.currentTime;
            lastResultsRef.current = landmarkerRef.current.detectForVideo(video, time);
          }

          faces = readFaces(lastResultsRef.current, coverRect, width);
        } catch (error) {
          console.warn("Face tracking skipped for this frame.", error);
        }
      }

      faces.forEach((face, index) => {
        const center = getFaceCenter(face);
        const smileKey = `smile-${index}`;
        const mouthKey = `mouth-${index}`;

        if (isSmiling(face) && time - (expressionGateRef.current[smileKey] ?? 0) > 1150) {
          expressionGateRef.current[smileKey] = time;
          spawnConfetti(particlesRef.current, center.x, center.y - 20, activeTheme, 24);
        }

        if (isMouthOpen(face) && time - (expressionGateRef.current[mouthKey] ?? 0) > 1350) {
          expressionGateRef.current[mouthKey] = time;
          spawnConfetti(particlesRef.current, center.x, center.y - 40, activeTheme, 18);
        }

        drawFaceProps(ctx, face, activePropIds, activeTheme, time);
      });

      updateAndDrawParticles(ctx, particlesRef.current, deltaMs);
      drawThemeOverlay(ctx, activeTheme, width, height, time, faces.length);
      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrame);
  }, [activePropIds, activeTheme, cameraStatus, trackerStatus]);

  const runCapture = useCallback(
    async (layout: CaptureLayout) => {
      if (isCapturing || cameraStatus !== "ready") {
        return;
      }

      setIsCapturing(true);
      const total = layout === "strip" ? 3 : 1;
      const shots: string[] = [];

      for (let shot = 1; shot <= total; shot += 1) {
        setShotProgress({ current: shot, total });

        for (let value = 3; value >= 1; value -= 1) {
          setCountdown(value);
          await wait(760);
        }

        setCountdown(null);
        setFlash(true);
        spawnConfetti(
          particlesRef.current,
          (canvasRef.current?.width ?? 960) / 2,
          (canvasRef.current?.height ?? 540) * 0.32,
          activeTheme,
          42,
        );
        await wait(120);

        const dataUrl = canvasRef.current?.toDataURL("image/png");
        if (dataUrl) {
          shots.push(dataUrl);
        }

        await wait(160);
        setFlash(false);

        if (shot < total) {
          await wait(620);
        }
      }

      const dataUrl =
        layout === "strip" ? await composePhotoStrip(shots, activeTheme) : shots[0] ?? "";

      if (dataUrl) {
        const capture: Capture = {
          id: crypto.randomUUID(),
          dataUrl,
          timestamp: Date.now(),
          themeId: activeTheme.id,
          layout,
          shotCount: total,
        };

        setPreview(capture);
        setCaptures((current) => [capture, ...current].slice(0, 10));
      }

      setCountdown(null);
      setShotProgress({ current: 0, total: 0 });
      setIsCapturing(false);
    },
    [activeTheme, cameraStatus, isCapturing],
  );

  const downloadPreview = useCallback(() => {
    if (!preview) {
      return;
    }

    const anchor = document.createElement("a");
    const date = new Date(preview.timestamp).toISOString().slice(0, 19).replace(/[:T]/g, "-");
    anchor.href = preview.dataUrl;
    anchor.download = `birthday-magic-mirror-${preview.layout}-${date}.png`;
    anchor.click();
  }, [preview]);

  const retake = useCallback(() => {
    setGalleryOpen(false);
  }, []);

  useEffect(() => {
    if (!controlsOpen && !galleryOpen) {
      return;
    }

    const closeOverlay = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setControlsOpen(false);
        setGalleryOpen(false);
      }
    };

    window.addEventListener("keydown", closeOverlay);
    return () => window.removeEventListener("keydown", closeOverlay);
  }, [controlsOpen, galleryOpen]);

  const statusLabel = getStatusLabel(cameraStatus, trackerStatus, cameraError);

  return (
    <div className="app-shell">
      <video ref={videoRef} className="camera-feed" aria-hidden="true" />
      <main ref={stageRef} className={`stage ${flash ? "is-flashing" : ""}`} aria-label="Live photo booth preview">
        <canvas ref={canvasRef} className="booth-canvas" />

        {cameraStatus !== "ready" && (
          <div className="permission-panel" role="status">
            <div className="permission-icon">
              <Video size={30} aria-hidden="true" />
            </div>
            <h2>{cameraStatus === "requesting" ? "Starting camera" : "Camera needs attention"}</h2>
            <p>{cameraError || "Allow camera access to start the booth."}</p>
            {cameraStatus !== "requesting" && (
              <button className="primary-action" type="button" onClick={() => void requestCamera()}>
                <RefreshCw size={18} aria-hidden="true" />
                Try again
              </button>
            )}
          </div>
        )}

        {countdown !== null && <div className="countdown-pop">{countdown}</div>}

        {isCapturing && shotProgress.total > 1 && (
          <div className="shot-progress">
            Shot {shotProgress.current} of {shotProgress.total}
          </div>
        )}
      </main>

      <header className="camera-top-bar">
        <div className="booth-identity">
          <span className="booth-mark">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <span>
            <strong>Magic Mirror</strong>
            <small>{activeTheme.shortName}</small>
          </span>
        </div>

        <div className="camera-top-actions">
          <div className={`camera-status status-${cameraStatus}`} aria-live="polite">
            <span className="status-dot" />
            <span className="status-copy">{statusLabel}</span>
          </div>
          <button
            className="glass-button"
            type="button"
            aria-label="Open photo booth controls"
            aria-expanded={controlsOpen}
            onClick={() => {
              setGalleryOpen(false);
              setControlsOpen(true);
            }}
          >
            <SlidersHorizontal size={20} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="camera-bottom-bar">
        <div className="capture-modes" aria-label="Capture mode">
          <button
            className={captureMode === "single" ? "is-active" : ""}
            type="button"
            title="Photo"
            aria-label="Photo mode"
            aria-pressed={captureMode === "single"}
            onClick={() => setCaptureMode("single")}
          >
            <Camera size={20} aria-hidden="true" />
            <span className="visually-hidden">Photo</span>
          </button>
          <button
            className={captureMode === "strip" ? "is-active" : ""}
            type="button"
            title="Photo strip"
            aria-label="Photo strip mode"
            aria-pressed={captureMode === "strip"}
            onClick={() => setCaptureMode("strip")}
          >
            <GalleryHorizontal size={21} aria-hidden="true" />
            <span className="visually-hidden">Photo strip</span>
          </button>
        </div>

        <div className="capture-actions">
          <button
            className={`gallery-button ${preview ? "has-preview" : ""}`}
            type="button"
            aria-label="Open recent captures"
            disabled={!preview}
            onClick={() => {
              setControlsOpen(false);
              setGalleryOpen(true);
            }}
          >
            {preview ? <img src={preview.dataUrl} alt="Latest capture" /> : <Images size={23} aria-hidden="true" />}
          </button>

          <button
            className="shutter-button"
            type="button"
            aria-label={captureMode === "strip" ? "Take a three-photo strip" : "Take a photo"}
            disabled={cameraStatus !== "ready" || isCapturing}
            onClick={() => void runCapture(captureMode)}
          >
            <Aperture size={31} strokeWidth={1.8} aria-hidden="true" />
          </button>

          <button
            className="effects-button"
            type="button"
            aria-label="Choose theme and props"
            onClick={() => {
              setGalleryOpen(false);
              setControlsOpen(true);
            }}
          >
            <WandSparkles size={23} aria-hidden="true" />
          </button>
        </div>
      </div>

      {controlsOpen && (
        <>
          <button
            className="overlay-scrim"
            type="button"
            aria-label="Close photo booth controls"
            onClick={() => setControlsOpen(false)}
          />
          <aside className="control-sheet" role="dialog" aria-modal="true" aria-labelledby="controls-title">
            <header className="sheet-header">
              <div>
                <span className="sheet-kicker">Make it yours</span>
                <h2 id="controls-title">Look tools</h2>
              </div>
              <button className="sheet-close" type="button" aria-label="Close controls" onClick={() => setControlsOpen(false)}>
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <section className="control-section" aria-labelledby="theme-title">
              <div className="control-section-heading">
                <span><Palette size={17} aria-hidden="true" /> Theme</span>
                <strong id="theme-title">{activeTheme.name}</strong>
              </div>
              <div className="option-grid theme-options">
                {themePacks.map((theme, index) => {
                  const Icon = themeIcons[theme.id];
                  return (
                    <button
                      key={theme.id}
                      className={`option-card ${index === themeIndex ? "is-active" : ""}`}
                      type="button"
                      aria-pressed={index === themeIndex}
                      onClick={() => setThemeIndex(index)}
                    >
                      <span className="option-icon"><Icon size={21} aria-hidden="true" /></span>
                      <span>{theme.shortName}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="control-section" aria-labelledby="props-title">
              <div className="control-section-heading">
                <span><WandSparkles size={17} aria-hidden="true" /> Props</span>
                <strong id="props-title">{activePropMix.name}</strong>
              </div>
              <div className="option-grid prop-options">
                {propMixes.map((mix, index) => (
                  <button
                    key={mix.id}
                    className={`option-card prop-option ${index === propMixIndex ? "is-active" : ""}`}
                    type="button"
                    aria-pressed={index === propMixIndex}
                    onClick={() => setPropMixIndex(index)}
                  >
                    <WandSparkles size={19} aria-hidden="true" />
                    <span>{mix.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </>
      )}

      {galleryOpen && preview && (
        <section className="capture-viewer" role="dialog" aria-modal="true" aria-label="Captured photo">
          <header className="viewer-header">
            <button className="viewer-icon-button" type="button" aria-label="Back to camera" onClick={retake}>
              <X size={22} aria-hidden="true" />
            </button>
            <div>
              <strong>{preview.layout === "strip" ? "Photo Strip" : "Photo"}</strong>
              <span>{new Date(preview.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
            </div>
            <button className="viewer-icon-button" type="button" aria-label="Download photo" onClick={downloadPreview}>
              <Download size={21} aria-hidden="true" />
            </button>
          </header>

          <div className="viewer-image-wrap">
            <img src={preview.dataUrl} alt="Selected photo booth capture" />
          </div>

          <footer className="viewer-footer">
            {captures.length > 1 && (
              <div className="capture-strip" aria-label="Recent captures">
                {captures.slice(0, 8).map((capture) => (
                  <button
                    key={capture.id}
                    className={`capture-thumb ${preview.id === capture.id ? "is-active" : ""}`}
                    type="button"
                    aria-label="Open capture"
                    onClick={() => setPreview(capture)}
                  >
                    <img src={capture.dataUrl} alt="" />
                  </button>
                ))}
              </div>
            )}
            <div className="viewer-actions">
              <button type="button" onClick={retake}>
                <Camera size={18} aria-hidden="true" />
                Back to camera
              </button>
              <button className="viewer-save" type="button" onClick={downloadPreview}>
                <Download size={18} aria-hidden="true" />
                Save photo
              </button>
            </div>
          </footer>
        </section>
      )}
    </div>
  );
}

function readFaces(
  results: FaceLandmarkerResult | null,
  coverRect: ReturnType<typeof computeCoverRect>,
  canvasWidth: number,
): FaceSnapshot[] {
  if (!results?.faceLandmarks?.length) {
    return [];
  }

  return results.faceLandmarks.map((landmarks, index) => {
    const points: FacePoint[] = mapFaceLandmarks(landmarks, coverRect, canvasWidth);
    const blendshapes: Record<string, number> = {};
    const categories = results.faceBlendshapes?.[index]?.categories ?? [];

    categories.forEach((category) => {
      blendshapes[category.categoryName] = category.score;
    });

    return { points, blendshapes };
  });
}

async function composePhotoStrip(shots: string[], theme: ThemePack): Promise<string> {
  const images = await Promise.all(shots.map(loadImage));
  const width = 900;
  const height = 1460;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;

  if (!ctx) {
    return shots[0] ?? "";
  }

  drawThemeBase(ctx, theme, width, height, performance.now());
  ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
  roundedRect(ctx, 52, 42, width - 104, height - 84, 34);
  ctx.fill();

  ctx.fillStyle = theme.ink;
  ctx.font = "900 56px Inter, ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Birthday Magic Mirror", width / 2, 112);
  ctx.font = "700 30px Inter, ui-sans-serif, system-ui";
  ctx.fillStyle = theme.accent;
  ctx.fillText(theme.frameLabel, width / 2, 154);

  const imageX = 100;
  const imageWidth = width - 200;
  const imageHeight = 330;
  const gap = 34;
  const firstY = 200;

  images.forEach((image, index) => {
    const y = firstY + index * (imageHeight + gap);
    ctx.fillStyle = theme.accent;
    roundedRect(ctx, imageX - 12, y - 12, imageWidth + 24, imageHeight + 24, 24);
    ctx.fill();
    drawImageCover(ctx, image, imageX, y, imageWidth, imageHeight);
  });

  ctx.fillStyle = theme.ink;
  ctx.font = "700 24px Inter, ui-sans-serif, system-ui";
  ctx.fillText(new Date().toLocaleDateString(), width / 2, height - 94);

  return canvas.toDataURL("image/png");
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.save();
  roundedRect(ctx, x, y, width, height, 16);
  ctx.clip();
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Capture image could not load."));
    image.src = src;
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getStatusLabel(
  cameraStatus: CameraStatus,
  trackerStatus: TrackerStatus,
  cameraError: string,
): string {
  if (cameraStatus === "ready" && trackerStatus === "ready") {
    return "Camera ready";
  }
  if (cameraStatus === "ready" && trackerStatus === "loading") {
    return "Camera ready, props loading";
  }
  if (cameraStatus === "ready" && trackerStatus === "error") {
    return "Camera ready, props offline";
  }
  if (cameraStatus === "requesting") {
    return "Starting camera";
  }

  return cameraError || "Camera unavailable";
}

export default App;
