/**
 * Character roster - 8 original racers. Stats are 0..1 and trade off by weight
 * class: light = agile/quick off the line, heavy = fast top end but ponderous.
 */
import type { CharacterDef } from '../core/types';

export const CHARACTERS: CharacterDef[] = [
  // --- light ---------------------------------------------------------------
  {
    id: 'zippy',
    name: '新星·疾风',
    color: 0x1fd6ee,
    accent: 0xff3fb4,
    driverColor: 0xf7f9ff,
    weightClass: 'light',
    stats: { speed: 0.18, acceleration: 0.95, handling: 0.9, weight: 0.12, miniTurbo: 0.9 },
    tagline: '眨眼之间，她已领先两个弯道。',
  },
  {
    id: 'pixel',
    name: '像素甜心',
    color: 0xff4fa3,
    accent: 0x4dffc3,
    driverColor: 0xfff1a8,
    weightClass: 'light',
    stats: { speed: 0.12, acceleration: 0.9, handling: 0.95, weight: 0.08, miniTurbo: 0.85 },
    tagline: '糖分满满的操控，弯道是她的糖果。',
  },
  {
    id: 'fennec',
    name: '耳廓狐·疾电',
    color: 0xffcf1f,
    accent: 0xff6a00,
    driverColor: 0x2b1b12,
    weightClass: 'light',
    stats: { speed: 0.25, acceleration: 0.85, handling: 0.8, weight: 0.2, miniTurbo: 0.95 },
    tagline: '耳朵越大，迷你涡轮越强。',
  },
  // --- medium --------------------------------------------------------------
  {
    id: 'max',
    name: '全能·旋风',
    color: 0xe32222,
    accent: 0xffd23f,
    driverColor: 0xffffff,
    weightClass: 'medium',
    stats: { speed: 0.55, acceleration: 0.55, handling: 0.55, weight: 0.5, miniTurbo: 0.55 },
    tagline: '全能选手，每一圈都是高光时刻。',
  },
  {
    id: 'juno',
    name: '朱诺·惊雷',
    color: 0x7c3aed,
    accent: 0xffb020,
    driverColor: 0x161326,
    weightClass: 'medium',
    stats: { speed: 0.6, acceleration: 0.45, handling: 0.5, weight: 0.55, miniTurbo: 0.65 },
    tagline: '每次漂移都蓄满雷霆之力。',
  },
  {
    id: 'kai',
    name: '凯·潮汐',
    color: 0x1e6bff,
    accent: 0xff7a1a,
    driverColor: 0xdff6ff,
    weightClass: 'medium',
    stats: { speed: 0.5, acceleration: 0.6, handling: 0.65, weight: 0.45, miniTurbo: 0.5 },
    tagline: '如深水般冷静，似浪涌般顺滑。',
  },
  // --- heavy ---------------------------------------------------------------
  {
    id: 'bram',
    name: '巨石·布兰',
    color: 0x1f9a4b,
    accent: 0xd88a3c,
    driverColor: 0x5a3b21,
    weightClass: 'heavy',
    stats: { speed: 0.92, acceleration: 0.2, handling: 0.25, weight: 0.95, miniTurbo: 0.3 },
    tagline: '起步虽慢，却坚不可摧。',
  },
  {
    id: 'rosa',
    name: '重卡·萝莎',
    color: 0xff6a00,
    accent: 0x19d3c5,
    driverColor: 0x2a2a34,
    weightClass: 'heavy',
    stats: { speed: 1.0, acceleration: 0.15, handling: 0.3, weight: 0.9, miniTurbo: 0.35 },
    tagline: '四轮卡丁，十八轮的霸气。',
  },
];

export function getCharacter(id: string): CharacterDef {
  for (let i = 0; i < CHARACTERS.length; i++) {
    if (CHARACTERS[i].id === id) return CHARACTERS[i];
  }
  return CHARACTERS[0];
}
