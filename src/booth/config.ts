import type { FaceProp, PropMix, ThemePack } from "./types";

export const themePacks: ThemePack[] = [
  {
    id: "birthday-stage",
    name: "Birthday Stage",
    shortName: "Stage",
    scene: "stage",
    accent: "#ff4f7b",
    accentAlt: "#15b8a6",
    ink: "#2b2230",
    paper: "#fff4d7",
    frameLabel: "Birthday Star",
    props: ["party-hat", "star-glasses", "cheek-stars"],
  },
  {
    id: "space-party",
    name: "Space Party",
    shortName: "Space",
    scene: "space",
    accent: "#29d3ff",
    accentAlt: "#ffd166",
    ink: "#161b33",
    paper: "#eaf8ff",
    frameLabel: "Moon Crew",
    props: ["space-helmet", "sparkle-halo", "cheek-stars"],
  },
  {
    id: "arcade-party",
    name: "Arcade Party",
    shortName: "Arcade",
    scene: "arcade",
    accent: "#67e867",
    accentAlt: "#ffcf24",
    ink: "#17171f",
    paper: "#efffea",
    frameLabel: "High Score",
    props: ["pixel-shades", "hero-mask", "cheek-stars"],
  },
  {
    id: "royal-party",
    name: "Royal Party",
    shortName: "Royal",
    scene: "royal",
    accent: "#f3b63f",
    accentAlt: "#4ecdc4",
    ink: "#2b2138",
    paper: "#fff2f8",
    frameLabel: "Party Royalty",
    props: ["crown", "sparkle-halo", "cheek-stars"],
  },
];

export const faceProps: Record<string, FaceProp> = {
  "party-hat": {
    id: "party-hat",
    label: "Party hat",
    kind: "partyHat",
  },
  "star-glasses": {
    id: "star-glasses",
    label: "Star glasses",
    kind: "starGlasses",
  },
  "cheek-stars": {
    id: "cheek-stars",
    label: "Cheek stars",
    kind: "cheekStars",
  },
  "space-helmet": {
    id: "space-helmet",
    label: "Space helmet",
    kind: "spaceHelmet",
  },
  "pixel-shades": {
    id: "pixel-shades",
    label: "Pixel shades",
    kind: "pixelShades",
  },
  crown: {
    id: "crown",
    label: "Crown",
    kind: "crown",
  },
  "hero-mask": {
    id: "hero-mask",
    label: "Hero mask",
    kind: "heroMask",
  },
  "sparkle-halo": {
    id: "sparkle-halo",
    label: "Sparkle halo",
    kind: "sparkleHalo",
  },
};

export const propMixes: PropMix[] = [
  {
    id: "theme",
    name: "Theme Kit",
    props: "theme",
  },
  {
    id: "birthday",
    name: "Cake Crew",
    props: ["party-hat", "star-glasses", "cheek-stars"],
  },
  {
    id: "space",
    name: "Moon Crew",
    props: ["space-helmet", "sparkle-halo", "cheek-stars"],
  },
  {
    id: "arcade",
    name: "Power Up",
    props: ["pixel-shades", "hero-mask", "cheek-stars"],
  },
  {
    id: "royal",
    name: "Royal",
    props: ["crown", "sparkle-halo", "cheek-stars"],
  },
];
