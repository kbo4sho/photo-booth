export type ThemeId = "birthday-stage" | "space-party" | "arcade-party" | "royal-party";

export type PropId =
  | "party-hat"
  | "star-glasses"
  | "cheek-stars"
  | "space-helmet"
  | "pixel-shades"
  | "crown"
  | "hero-mask"
  | "sparkle-halo";

export type SceneKind = "stage" | "space" | "arcade" | "royal";

export interface ThemePack {
  id: ThemeId;
  name: string;
  shortName: string;
  scene: SceneKind;
  accent: string;
  accentAlt: string;
  ink: string;
  paper: string;
  frameLabel: string;
  props: PropId[];
}

export interface FaceProp {
  id: PropId;
  label: string;
  kind:
    | "partyHat"
    | "starGlasses"
    | "cheekStars"
    | "spaceHelmet"
    | "pixelShades"
    | "crown"
    | "heroMask"
    | "sparkleHalo";
}

export interface PropMix {
  id: string;
  name: string;
  props: PropId[] | "theme";
}

export interface FacePoint {
  x: number;
  y: number;
  z?: number;
}

export interface FaceSnapshot {
  points: FacePoint[];
  blendshapes: Record<string, number>;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  ttl: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  shape: "rect" | "circle" | "star";
}

export type CaptureLayout = "single" | "strip";

export interface Capture {
  id: string;
  dataUrl: string;
  timestamp: number;
  themeId: ThemeId;
  layout: CaptureLayout;
  shotCount: number;
}
