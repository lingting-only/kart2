/**
 * Loading overlay shown while a Track is being built. Track name, theme colour
 * band, animated progress bar and rotating tips.
 */
import type { TrackDefinition } from '../core/types';
import { clamp01 } from '../core/math';
import { THEME_LABEL } from '../core/constants';
import { cssHex, el, TextField } from './dom';

const TIPS: readonly string[] = [
  '过弯时按住漂移（空格 / Shift），松开即可触发迷你涡轮。漂移越久，加速越强。',
  '倒计时到 1 的瞬间轻点油门即可火箭起步；按得太早会打滑失控。',
  '使用龟壳时按住刹车可向后投掷。',
  '按 Q 回头观察，扔香蕉前先看看身后有什么。',
  '加速带（发光箭头）免费提供 +45% 速度爆发，记得对准它们。',
  '道具概率取决于你的名次，落后的车手更容易拿到星星、闪电和蓝龟壳。',
  '星星让你无敌，并摧毁你碰到的任何障碍。',
  '待在赛道上很重要：偏离赛道会让最高速度几乎减半。',
  '在长直道上使用蘑菇，或是在被击中后用它迅速恢复。',
  '重型卡丁能把轻型卡丁撞开，请谨慎选择重量级别。',
  '在跳台顶点跳跃可获得一点着陆加速。',
  '随时按 M 静音。',
];

const TIP_INTERVAL = 2.4;

export class LoadingScreen {
  private readonly rootNode: HTMLElement;
  private readonly title: TextField;
  private readonly subtitle: TextField;
  private readonly band: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly tipNode: HTMLElement;
  private readonly tipText: TextField;
  private tipTimer = 0;
  private tipIndex = 0;
  private progress = 0;
  private visible = false;

  constructor(root: HTMLElement) {
    this.rootNode = el('div', 'screen loading hidden', undefined, root);
    const panel = el('div', 'loading-panel', undefined, this.rootNode);
    this.band = el('div', 'loading-band', undefined, panel);
    const inner = el('div', 'loading-inner', undefined, panel);
    el('div', 'loading-kicker', '正在加载', inner);
    this.title = new TextField(el('h2', 'loading-title', '', inner));
    this.subtitle = new TextField(el('div', 'loading-subtitle', '', inner));
    const track = el('div', 'loading-track', undefined, inner);
    this.bar = el('div', 'loading-bar', undefined, track);
    el('div', 'loading-bar-shimmer', undefined, this.bar);
    this.tipNode = el('div', 'loading-tip', undefined, inner);
    el('span', 'loading-tip-label', '提示', this.tipNode);
    this.tipText = new TextField(el('span', 'loading-tip-text', '', this.tipNode));
  }

  show(def: TrackDefinition): void {
    this.title.set(def.name.toUpperCase());
    const stars = '★'.repeat(def.difficulty) + '☆'.repeat(3 - def.difficulty);
    this.subtitle.set(`${def.laps} 圈　·　${stars}　·　${THEME_LABEL[def.theme]}`);
    const env = def.environment;
    this.band.style.background = `linear-gradient(90deg, ${cssHex(env.skyTop)}, ${cssHex(env.skyHorizon)}, ${cssHex(
      def.palette.road,
    )})`;
    this.tipIndex = Math.floor(Math.random() * TIPS.length);
    this.tipText.set(TIPS[this.tipIndex]);
    this.tipTimer = 0;
    this.setProgress(0);
    this.rootNode.classList.remove('hidden');
    this.visible = true;
  }

  hide(): void {
    this.rootNode.classList.add('hidden');
    this.visible = false;
  }

  setProgress(p: number): void {
    p = clamp01(p);
    if (Math.abs(p - this.progress) < 0.002) return;
    this.progress = p;
    this.bar.style.transform = `scaleX(${p.toFixed(3)})`;
  }

  update(dt: number): void {
    if (!this.visible) return;
    this.tipTimer += dt;
    if (this.tipTimer >= TIP_INTERVAL) {
      this.tipTimer = 0;
      this.tipIndex = (this.tipIndex + 1) % TIPS.length;
      this.tipText.set(TIPS[this.tipIndex]);
      this.tipNode.classList.remove('tip-in');
      void this.tipNode.offsetWidth;
      this.tipNode.classList.add('tip-in');
    }
  }

  dispose(): void {
    this.rootNode.remove();
  }
}
