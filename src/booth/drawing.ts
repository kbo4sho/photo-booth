import { faceProps } from "./config";
import type { FacePoint, FaceProp, FaceSnapshot, Particle, PropId, ThemePack } from "./types";

interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const landmark = {
  forehead: 10,
  chin: 152,
  nose: 1,
  eyeLeftOuter: 33,
  eyeRightOuter: 263,
  mouthTop: 13,
  mouthBottom: 14,
  cheekLeft: 234,
  cheekRight: 454,
  mouthLeft: 61,
  mouthRight: 291,
};

export function computeCoverRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): LayoutRect {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  };
}

export function mapFaceLandmarks(
  landmarks: FacePoint[],
  coverRect: LayoutRect,
  canvasWidth: number,
): FacePoint[] {
  return landmarks.map((point) => ({
    x: canvasWidth - (coverRect.x + point.x * coverRect.width),
    y: coverRect.y + point.y * coverRect.height,
    z: point.z,
  }));
}

export function drawWaitingScene(
  ctx: CanvasRenderingContext2D,
  theme: ThemePack,
  width: number,
  height: number,
  time: number,
): void {
  drawThemeBase(ctx, theme, width, height, time);
  drawThemeOverlay(ctx, theme, width, height, time, 0);

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  roundRect(ctx, width * 0.24, height * 0.34, width * 0.52, height * 0.3, 26);
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.font = `700 ${Math.max(26, width * 0.035)}px Inter, ui-sans-serif, system-ui`;
  ctx.textAlign = "center";
  ctx.fillText("Birthday Magic Mirror", width / 2, height * 0.45);
  ctx.font = `600 ${Math.max(15, width * 0.017)}px Inter, ui-sans-serif, system-ui`;
  ctx.fillStyle = "rgba(36, 30, 45, 0.74)";
  ctx.fillText("Camera preview appears here", width / 2, height * 0.53);
  ctx.restore();
}

export function drawThemeBase(
  ctx: CanvasRenderingContext2D,
  theme: ThemePack,
  width: number,
  height: number,
  time: number,
): void {
  const gradient = ctx.createLinearGradient(0, 0, width, height);

  if (theme.scene === "space") {
    gradient.addColorStop(0, "#11182d");
    gradient.addColorStop(0.55, "#263169");
    gradient.addColorStop(1, "#0c3a44");
  } else if (theme.scene === "arcade") {
    gradient.addColorStop(0, "#15151f");
    gradient.addColorStop(0.52, "#23273a");
    gradient.addColorStop(1, "#102b24");
  } else if (theme.scene === "royal") {
    gradient.addColorStop(0, "#fff3f6");
    gradient.addColorStop(0.5, "#edf9f7");
    gradient.addColorStop(1, "#fff8dd");
  } else {
    gradient.addColorStop(0, "#fff6dc");
    gradient.addColorStop(0.5, "#e9fbff");
    gradient.addColorStop(1, "#fff0f4");
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  if (theme.scene === "space") {
    drawStars(ctx, width, height, time);
  } else if (theme.scene === "arcade") {
    drawArcadeGrid(ctx, width, height, time);
  } else if (theme.scene === "royal") {
    drawRoyalWallpaper(ctx, width, height, theme);
  } else {
    drawBalloonBackdrop(ctx, width, height, theme, time);
  }
}

export function drawThemeOverlay(
  ctx: CanvasRenderingContext2D,
  theme: ThemePack,
  width: number,
  height: number,
  time: number,
  faceCount: number,
): void {
  ctx.save();

  if (theme.scene === "stage") {
    drawStageCurtains(ctx, width, height, theme, time);
  } else if (theme.scene === "space") {
    drawSpaceOverlay(ctx, width, height, theme, time);
  } else if (theme.scene === "arcade") {
    drawArcadeOverlay(ctx, width, height, theme, time);
  } else {
    drawRoyalOverlay(ctx, width, height, theme, time);
  }

  ctx.lineWidth = Math.max(8, width * 0.012);
  ctx.strokeStyle = theme.accent;
  roundRect(ctx, width * 0.015, height * 0.02, width * 0.97, height * 0.96, 30);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  roundRect(ctx, width * 0.035, height * 0.035, Math.min(width * 0.36, 360), 48, 18);
  ctx.fill();
  ctx.fillStyle = theme.ink;
  ctx.font = `800 ${Math.max(18, width * 0.023)}px Inter, ui-sans-serif, system-ui`;
  ctx.textBaseline = "middle";
  ctx.fillText(theme.frameLabel, width * 0.06, height * 0.035 + 24);

  if (faceCount > 0) {
    ctx.fillStyle = theme.accentAlt;
    ctx.beginPath();
    ctx.arc(width * 0.95, height * 0.07, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.ink;
    ctx.font = `900 18px Inter, ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(faceCount), width * 0.95, height * 0.07 + 1);
  }

  ctx.restore();
}

export function drawFaceProps(
  ctx: CanvasRenderingContext2D,
  face: FaceSnapshot,
  propIds: PropId[],
  theme: ThemePack,
  time: number,
): void {
  for (const propId of propIds) {
    const prop = faceProps[propId];
    if (!prop) {
      continue;
    }

    drawFaceProp(ctx, face, prop, theme, time);
  }
}

export function getFaceCenter(face: FaceSnapshot): FacePoint {
  const left = getPoint(face, landmark.cheekLeft);
  const right = getPoint(face, landmark.cheekRight);
  const nose = getPoint(face, landmark.nose);

  return {
    x: (left.x + right.x + nose.x) / 3,
    y: (left.y + right.y + nose.y) / 3,
  };
}

export function isSmiling(face: FaceSnapshot): boolean {
  const leftSmile = face.blendshapes.mouthSmileLeft ?? 0;
  const rightSmile = face.blendshapes.mouthSmileRight ?? 0;
  const mouthWidth = distance(getPoint(face, landmark.mouthLeft), getPoint(face, landmark.mouthRight));
  const faceWidth = getFaceMetrics(face).faceWidth;

  return (leftSmile + rightSmile) / 2 > 0.35 || mouthWidth / faceWidth > 0.36;
}

export function isMouthOpen(face: FaceSnapshot): boolean {
  const jawOpen = face.blendshapes.jawOpen ?? 0;
  const mouthHeight = distance(getPoint(face, landmark.mouthTop), getPoint(face, landmark.mouthBottom));
  const faceWidth = getFaceMetrics(face).faceWidth;

  return jawOpen > 0.28 || mouthHeight / faceWidth > 0.06;
}

export function spawnConfetti(
  particles: Particle[],
  x: number,
  y: number,
  theme: ThemePack,
  count = 32,
): void {
  const colors = [theme.accent, theme.accentAlt, "#ffffff", "#ffd166", "#4ecdc4", "#ff7a90"];

  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.35;
    const speed = 2.6 + Math.random() * 4.4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 1.4,
      age: 0,
      ttl: 850 + Math.random() * 650,
      size: 5 + Math.random() * 9,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.22,
      color: colors[index % colors.length],
      shape: index % 5 === 0 ? "star" : index % 2 === 0 ? "rect" : "circle",
    });
  }
}

export function updateAndDrawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  deltaMs: number,
): void {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.age += deltaMs;
    particle.vy += 0.008 * deltaMs;
    particle.x += particle.vx * (deltaMs / 16.67);
    particle.y += particle.vy * (deltaMs / 16.67);
    particle.rotation += particle.spin * (deltaMs / 16.67);

    const alpha = Math.max(0, 1 - particle.age / particle.ttl);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.fillStyle = particle.color;

    if (particle.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, particle.size * 0.48, 0, Math.PI * 2);
      ctx.fill();
    } else if (particle.shape === "star") {
      drawStar(ctx, 0, 0, particle.size * 0.34, particle.size * 0.72, 5);
      ctx.fill();
    } else {
      roundRect(ctx, -particle.size * 0.5, -particle.size * 0.22, particle.size, particle.size * 0.44, 2);
      ctx.fill();
    }

    ctx.restore();

    if (particle.age >= particle.ttl) {
      particles.splice(index, 1);
    }
  }
}

function drawFaceProp(
  ctx: CanvasRenderingContext2D,
  face: FaceSnapshot,
  prop: FaceProp,
  theme: ThemePack,
  time: number,
): void {
  if (prop.kind === "partyHat") {
    drawPartyHat(ctx, face, theme, time);
  } else if (prop.kind === "starGlasses") {
    drawStarGlasses(ctx, face, theme);
  } else if (prop.kind === "cheekStars") {
    drawCheekStars(ctx, face, theme, time);
  } else if (prop.kind === "spaceHelmet") {
    drawSpaceHelmet(ctx, face, theme);
  } else if (prop.kind === "pixelShades") {
    drawPixelShades(ctx, face, theme);
  } else if (prop.kind === "crown") {
    drawCrown(ctx, face, theme, time);
  } else if (prop.kind === "heroMask") {
    drawHeroMask(ctx, face, theme);
  } else {
    drawSparkleHalo(ctx, face, theme, time);
  }
}

function drawPartyHat(
  ctx: CanvasRenderingContext2D,
  face: FaceSnapshot,
  theme: ThemePack,
  time: number,
): void {
  const metrics = getFaceMetrics(face);
  const forehead = getPoint(face, landmark.forehead);
  const bob = Math.sin(time / 220) * metrics.faceWidth * 0.018;

  ctx.save();
  ctx.translate(forehead.x, forehead.y - metrics.faceWidth * 0.27 + bob);
  ctx.rotate(metrics.angle);

  const width = metrics.faceWidth * 0.62;
  const height = metrics.faceWidth * 0.78;

  ctx.beginPath();
  ctx.moveTo(0, -height);
  ctx.lineTo(-width / 2, 0);
  ctx.lineTo(width / 2, 0);
  ctx.closePath();
  ctx.fillStyle = theme.accent;
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = Math.max(8, metrics.faceWidth * 0.055);
  for (let y = -height * 0.8; y < height * 0.1; y += metrics.faceWidth * 0.17) {
    ctx.beginPath();
    ctx.moveTo(-width * 0.45, y);
    ctx.lineTo(width * 0.45, y + metrics.faceWidth * 0.14);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = theme.accentAlt;
  ctx.beginPath();
  ctx.arc(0, -height - metrics.faceWidth * 0.05, metrics.faceWidth * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, -width * 0.56, -metrics.faceWidth * 0.04, width * 1.12, metrics.faceWidth * 0.12, metrics.faceWidth * 0.05);
  ctx.fill();
  ctx.restore();
}

function drawStarGlasses(ctx: CanvasRenderingContext2D, face: FaceSnapshot, theme: ThemePack): void {
  const metrics = getFaceMetrics(face);
  const leftEye = getPoint(face, landmark.eyeLeftOuter);
  const rightEye = getPoint(face, landmark.eyeRightOuter);
  const center = midpoint(leftEye, rightEye);
  const eyeGap = distance(leftEye, rightEye);

  ctx.save();
  ctx.translate(center.x, center.y + metrics.faceWidth * 0.02);
  ctx.rotate(metrics.angle);
  ctx.lineWidth = Math.max(5, metrics.faceWidth * 0.035);
  ctx.strokeStyle = theme.ink;
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";

  drawStar(ctx, -eyeGap * 0.28, 0, eyeGap * 0.15, eyeGap * 0.31, 5);
  ctx.fill();
  ctx.stroke();
  drawStar(ctx, eyeGap * 0.28, 0, eyeGap * 0.15, eyeGap * 0.31, 5);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-eyeGap * 0.05, 0);
  ctx.lineTo(eyeGap * 0.05, 0);
  ctx.stroke();
  ctx.restore();
}

function drawCheekStars(
  ctx: CanvasRenderingContext2D,
  face: FaceSnapshot,
  theme: ThemePack,
  time: number,
): void {
  const metrics = getFaceMetrics(face);
  const cheeks = [getPoint(face, landmark.cheekLeft), getPoint(face, landmark.cheekRight)];
  const pulse = 1 + Math.sin(time / 260) * 0.08;

  cheeks.forEach((cheek, index) => {
    ctx.save();
    ctx.translate(cheek.x, cheek.y + metrics.faceWidth * 0.03);
    ctx.rotate(metrics.angle + (index === 0 ? -0.2 : 0.2));
    ctx.fillStyle = index === 0 ? theme.accent : theme.accentAlt;
    drawStar(ctx, 0, 0, metrics.faceWidth * 0.035 * pulse, metrics.faceWidth * 0.08 * pulse, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.beginPath();
    ctx.arc(metrics.faceWidth * 0.08, -metrics.faceWidth * 0.045, metrics.faceWidth * 0.018, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawSpaceHelmet(ctx: CanvasRenderingContext2D, face: FaceSnapshot, theme: ThemePack): void {
  const metrics = getFaceMetrics(face);
  const center = midpoint(getPoint(face, landmark.forehead), getPoint(face, landmark.chin));
  const radiusX = metrics.faceWidth * 0.64;
  const radiusY = metrics.faceWidth * 0.76;

  ctx.save();
  ctx.translate(center.x, center.y - metrics.faceWidth * 0.03);
  ctx.rotate(metrics.angle);
  ctx.fillStyle = "rgba(210, 247, 255, 0.18)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.88)";
  ctx.lineWidth = Math.max(6, metrics.faceWidth * 0.035);
  ctx.beginPath();
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = Math.max(3, metrics.faceWidth * 0.018);
  ctx.beginPath();
  ctx.arc(0, -radiusY * 0.12, radiusX * 0.78, Math.PI * 0.08, Math.PI * 0.92);
  ctx.stroke();

  ctx.fillStyle = theme.accentAlt;
  ctx.beginPath();
  ctx.arc(radiusX * 0.76, -radiusY * 0.35, metrics.faceWidth * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPixelShades(ctx: CanvasRenderingContext2D, face: FaceSnapshot, theme: ThemePack): void {
  const metrics = getFaceMetrics(face);
  const leftEye = getPoint(face, landmark.eyeLeftOuter);
  const rightEye = getPoint(face, landmark.eyeRightOuter);
  const center = midpoint(leftEye, rightEye);
  const width = distance(leftEye, rightEye) * 1.32;
  const block = Math.max(6, width / 12);

  ctx.save();
  ctx.translate(center.x, center.y + metrics.faceWidth * 0.02);
  ctx.rotate(metrics.angle);
  ctx.fillStyle = theme.ink;

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 12; col += 1) {
      const isBridge = row === 1 && (col === 5 || col === 6);
      const isLens = (col < 5 || col > 6) && !(row === 2 && (col === 0 || col === 11));
      if (isBridge || isLens) {
        ctx.fillRect(-width / 2 + col * block, -block * 1.4 + row * block, block * 0.92, block * 0.92);
      }
    }
  }

  ctx.fillStyle = theme.accentAlt;
  ctx.fillRect(-width * 0.41, -block * 0.92, block * 1.6, block * 0.38);
  ctx.fillRect(width * 0.21, -block * 0.92, block * 1.6, block * 0.38);
  ctx.restore();
}

function drawCrown(
  ctx: CanvasRenderingContext2D,
  face: FaceSnapshot,
  theme: ThemePack,
  time: number,
): void {
  const metrics = getFaceMetrics(face);
  const forehead = getPoint(face, landmark.forehead);
  const bob = Math.sin(time / 240) * metrics.faceWidth * 0.015;

  ctx.save();
  ctx.translate(forehead.x, forehead.y - metrics.faceWidth * 0.2 + bob);
  ctx.rotate(metrics.angle);

  const width = metrics.faceWidth * 0.78;
  const height = metrics.faceWidth * 0.36;

  ctx.beginPath();
  ctx.moveTo(-width / 2, height * 0.32);
  ctx.lineTo(-width * 0.38, -height * 0.4);
  ctx.lineTo(-width * 0.16, height * 0.02);
  ctx.lineTo(0, -height * 0.62);
  ctx.lineTo(width * 0.16, height * 0.02);
  ctx.lineTo(width * 0.38, -height * 0.4);
  ctx.lineTo(width / 2, height * 0.32);
  ctx.closePath();
  ctx.fillStyle = "#f5c84b";
  ctx.fill();
  ctx.lineWidth = Math.max(4, metrics.faceWidth * 0.025);
  ctx.strokeStyle = "rgba(75, 51, 24, 0.42)";
  ctx.stroke();

  [0, -width * 0.34, width * 0.34].forEach((x, index) => {
    ctx.fillStyle = index === 0 ? theme.accent : theme.accentAlt;
    ctx.beginPath();
    ctx.arc(x, index === 0 ? -height * 0.62 : -height * 0.4, metrics.faceWidth * 0.045, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
  roundRect(ctx, -width * 0.45, height * 0.18, width * 0.9, metrics.faceWidth * 0.07, metrics.faceWidth * 0.03);
  ctx.fill();
  ctx.restore();
}

function drawHeroMask(ctx: CanvasRenderingContext2D, face: FaceSnapshot, theme: ThemePack): void {
  const metrics = getFaceMetrics(face);
  const leftEye = getPoint(face, landmark.eyeLeftOuter);
  const rightEye = getPoint(face, landmark.eyeRightOuter);
  const center = midpoint(leftEye, rightEye);
  const eyeGap = distance(leftEye, rightEye);

  ctx.save();
  ctx.translate(center.x, center.y + metrics.faceWidth * 0.02);
  ctx.rotate(metrics.angle);
  ctx.fillStyle = theme.accent;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
  ctx.lineWidth = Math.max(4, metrics.faceWidth * 0.025);

  ctx.beginPath();
  ctx.moveTo(-eyeGap * 0.74, -eyeGap * 0.13);
  ctx.quadraticCurveTo(-eyeGap * 0.42, -eyeGap * 0.32, -eyeGap * 0.1, -eyeGap * 0.12);
  ctx.quadraticCurveTo(0, -eyeGap * 0.04, eyeGap * 0.1, -eyeGap * 0.12);
  ctx.quadraticCurveTo(eyeGap * 0.42, -eyeGap * 0.32, eyeGap * 0.74, -eyeGap * 0.13);
  ctx.quadraticCurveTo(eyeGap * 0.58, eyeGap * 0.3, eyeGap * 0.1, eyeGap * 0.24);
  ctx.quadraticCurveTo(0, eyeGap * 0.16, -eyeGap * 0.1, eyeGap * 0.24);
  ctx.quadraticCurveTo(-eyeGap * 0.58, eyeGap * 0.3, -eyeGap * 0.74, -eyeGap * 0.13);
  ctx.closePath();
  ctx.ellipse(-eyeGap * 0.28, 0, eyeGap * 0.16, eyeGap * 0.09, 0, 0, Math.PI * 2);
  ctx.ellipse(eyeGap * 0.28, 0, eyeGap * 0.16, eyeGap * 0.09, 0, 0, Math.PI * 2);
  ctx.fill("evenodd");
  ctx.stroke();
  ctx.restore();
}

function drawSparkleHalo(
  ctx: CanvasRenderingContext2D,
  face: FaceSnapshot,
  theme: ThemePack,
  time: number,
): void {
  const metrics = getFaceMetrics(face);
  const forehead = getPoint(face, landmark.forehead);

  ctx.save();
  ctx.translate(forehead.x, forehead.y - metrics.faceWidth * 0.58);
  ctx.rotate(metrics.angle);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
  ctx.lineWidth = Math.max(4, metrics.faceWidth * 0.025);
  ctx.beginPath();
  ctx.ellipse(0, 0, metrics.faceWidth * 0.46, metrics.faceWidth * 0.14, 0, 0, Math.PI * 2);
  ctx.stroke();

  const count = 7;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + time / 900;
    const x = Math.cos(angle) * metrics.faceWidth * 0.48;
    const y = Math.sin(angle) * metrics.faceWidth * 0.15;
    ctx.fillStyle = index % 2 === 0 ? theme.accent : theme.accentAlt;
    drawStar(ctx, x, y, metrics.faceWidth * 0.018, metrics.faceWidth * 0.045, 4);
    ctx.fill();
  }
  ctx.restore();
}

function getFaceMetrics(face: FaceSnapshot): {
  angle: number;
  faceWidth: number;
  eyeDistance: number;
} {
  const leftEye = getPoint(face, landmark.eyeLeftOuter);
  const rightEye = getPoint(face, landmark.eyeRightOuter);
  const leftCheek = getPoint(face, landmark.cheekLeft);
  const rightCheek = getPoint(face, landmark.cheekRight);
  const eyeDistance = distance(leftEye, rightEye);
  const cheekDistance = distance(leftCheek, rightCheek);
  const [screenLeftEye, screenRightEye] =
    leftEye.x <= rightEye.x ? [leftEye, rightEye] : [rightEye, leftEye];

  return {
    angle: Math.atan2(
      screenRightEye.y - screenLeftEye.y,
      screenRightEye.x - screenLeftEye.x,
    ),
    faceWidth: Math.max(cheekDistance, eyeDistance * 1.95, 80),
    eyeDistance,
  };
}

function getPoint(face: FaceSnapshot, index: number): FacePoint {
  return face.points[index] ?? { x: 0, y: 0 };
}

function midpoint(a: FacePoint, b: FacePoint): FacePoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function distance(a: FacePoint, b: FacePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
): void {
  ctx.save();
  for (let index = 0; index < 80; index += 1) {
    const x = ((index * 97) % width) + Math.sin(time / 1000 + index) * 3;
    const y = (index * 53) % height;
    const size = 1.2 + (index % 4);
    ctx.globalAlpha = 0.35 + ((index % 5) * 0.1);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawArcadeGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
): void {
  const spacing = Math.max(44, width * 0.055);
  ctx.save();
  ctx.strokeStyle = "rgba(103, 232, 103, 0.18)";
  ctx.lineWidth = 2;
  for (let x = (time / 30) % spacing; x < width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoyalWallpaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ThemePack,
): void {
  ctx.save();
  ctx.globalAlpha = 0.28;
  for (let y = 36; y < height; y += 92) {
    for (let x = 32; x < width; x += 110) {
      ctx.fillStyle = (x + y) % 2 === 0 ? theme.accent : theme.accentAlt;
      drawStar(ctx, x, y, 8, 22, 4);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawBalloonBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ThemePack,
  time: number,
): void {
  const balloons = [
    [0.1, 0.2, theme.accent],
    [0.88, 0.18, theme.accentAlt],
    [0.18, 0.78, "#ffd166"],
    [0.8, 0.74, "#4ecdc4"],
  ] as const;

  ctx.save();
  balloons.forEach(([xFactor, yFactor, color], index) => {
    const x = width * xFactor + Math.sin(time / 1000 + index) * 8;
    const y = height * yFactor + Math.cos(time / 900 + index) * 7;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.ellipse(x, y, width * 0.045, height * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + height * 0.08);
    ctx.bezierCurveTo(x - 18, y + 100, x + 16, y + 150, x, y + 210);
    ctx.stroke();
  });
  ctx.restore();
}

function drawStageCurtains(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ThemePack,
  time: number,
): void {
  const curtainWidth = width * 0.11;
  ctx.save();
  ctx.fillStyle = "rgba(255, 79, 123, 0.52)";
  ctx.fillRect(0, 0, curtainWidth, height);
  ctx.fillRect(width - curtainWidth, 0, curtainWidth, height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
  for (let y = 0; y < height; y += 42) {
    const offset = Math.sin(time / 400 + y / 45) * 7;
    ctx.beginPath();
    ctx.arc(curtainWidth * 0.5 + offset, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width - curtainWidth * 0.5 - offset, y + 18, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = theme.accentAlt;
  drawPennants(ctx, width * 0.24, height * 0.08, width * 0.52, 36, theme);
  ctx.restore();
}

function drawSpaceOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ThemePack,
  time: number,
): void {
  ctx.save();
  ctx.strokeStyle = "rgba(41, 211, 255, 0.42)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(width * 0.82, height * 0.2, width * 0.1, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = theme.accentAlt;
  ctx.beginPath();
  ctx.arc(width * 0.84 + Math.sin(time / 600) * 8, height * 0.2, width * 0.045, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
  ctx.beginPath();
  ctx.ellipse(width * 0.84, height * 0.2, width * 0.12, width * 0.035, -0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawArcadeOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ThemePack,
  time: number,
): void {
  ctx.save();
  const block = Math.max(14, width * 0.018);
  ctx.fillStyle = "rgba(255, 207, 36, 0.74)";
  for (let i = 0; i < 7; i += 1) {
    const x = width * 0.08 + i * block * 1.7;
    const y = height * 0.82 + Math.sin(time / 230 + i) * 8;
    ctx.fillRect(x, y, block, block);
  }
  ctx.fillStyle = theme.accent;
  ctx.font = `900 ${Math.max(24, width * 0.034)}px Inter, ui-sans-serif, system-ui`;
  ctx.textAlign = "right";
  ctx.fillText("1UP", width * 0.94, height * 0.14);
  ctx.restore();
}

function drawRoyalOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ThemePack,
  time: number,
): void {
  ctx.save();
  drawPennants(ctx, width * 0.2, height * 0.08, width * 0.6, 42, theme);
  const sparkleY = height * 0.82 + Math.sin(time / 500) * 5;
  ctx.fillStyle = theme.accent;
  for (let i = 0; i < 6; i += 1) {
    drawStar(ctx, width * (0.2 + i * 0.12), sparkleY + (i % 2) * 20, 7, 18, 4);
    ctx.fill();
  }
  ctx.restore();
}

function drawPennants(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  theme: ThemePack,
): void {
  const count = 8;
  ctx.save();
  ctx.strokeStyle = "rgba(43, 34, 48, 0.34)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + width / 2, y + height * 0.55, x + width, y);
  ctx.stroke();

  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const px = x + t * width;
    const py = y + Math.sin(t * Math.PI) * height * 0.46;
    ctx.fillStyle = index % 2 === 0 ? theme.accent : theme.accentAlt;
    ctx.beginPath();
    ctx.moveTo(px - 14, py);
    ctx.lineTo(px + 14, py);
    ctx.lineTo(px, py + height * 0.72);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  points: number,
): void {
  ctx.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = (index / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (index === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

function roundRect(
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
