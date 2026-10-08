# 手机端适配与触控方案

## 摘要

为游戏补充移动端（触屏）操作支持：新增一套**屏幕内虚拟按键/滑块**，并满足关键诉求——**油门可拖拽到指定速度，松手后保持（无需持续按住）**。键盘/手柄逻辑保持不变，触控作为第三种输入来源合并进统一的 `InputState`。

核心发现：`InputState.throttle` 已是 0..1 模拟量，[Kart.updateSpeed](file:///d:/gitWork/turbo-kart-rush-main/src/kart/Kart.ts) 用 `target = top * throttle` 计算目标速度——因此「锁存油门值」即可自然实现"松手继续走"，无需改动物理层。所有改动集中在：新增触控 UI 模块、`InputManager` 合并触控、`Game` 接线、CSS/HTML 移动端适配。

---

## 现状分析

- [InputManager.ts](file:///d:/gitWork/turbo-kart-rush-main/src/kart/InputManager.ts)：唯一产出 `InputState` 的地方，当前仅合成键盘 + 手柄。`update()` 每帧调用，边缘字段（`useItem/pause/confirm/back/menu*`）只在一帧内有效。
- [Game.ts](file:///d:/gitWork/turbo-kart-rush-main/src/game/Game.ts)：持有 `InputManager`，在 `loop()` 里调用 `input.update()` 得到 `input`，然后 `frame()` 分发到菜单/比赛；`step()` 将 `input` 写入 `playerInput` 再 `player.setInput()`。
- [dom.ts](file:///d:/gitWork/turbo-kart-rush-main/src/ui/dom.ts)：`el()`/`button()`/`TextField` 等 DOM 助手；`button()` 已绑定 `click`（触屏 tap 即触发）。
- [MainMenu.ts](file:///d:/gitWork/turbo-kart-rush-main/src/ui/MainMenu.ts)：菜单按钮/卡片已用 `click` 处理，触屏可点；标题页有键盘操作说明（`controls-legend`），移动端需隐藏或替换为触屏提示。
- [style.css](file:///d:/gitWork/turbo-kart-rush-main/src/style.css)：`#ui` `pointer-events:none`，交互元素各自 `pointer-events:auto`；已有 `max-height/max-width` 响应用媒体查询，但无触屏/粗指针适配。
- [index.html](file:///d:/gitWork/turbo-kart-rush-main/index.html)：已有 `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`，但未禁止捏合/双击缩放。

---

## 改动方案

### 1. 新增 `src/ui/TouchControls.ts`（触控层，核心）

新建模块，职责：检测触屏、渲染虚拟按键/油门滑块、捕获指针事件、维护一份可锁存的触控 `InputState`、每帧消费边缘字段。

公开接口：

```ts
export class TouchControls {
  readonly active: boolean;      // 是否触屏设备
  readonly state: InputState;    // 触控合成结果（复用 createEmptyInput）
  update(): void;                // 清空边缘字段（与 InputManager.pressed 语义一致）
  reset(): void;                 // 比赛开始时清空油门/刹车/转向等持续值
  setVisible(v: boolean): void;  // 显示/隐藏覆盖层（仅比赛时显示）
  dispose(): void;
}
```

实现要点：

- **触屏检测**：`('ontouchstart' in window) || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches`；命中则 `document.documentElement.classList.add('touch')` 以启用 `.touch` 作用域样式。
- **覆盖层**：向 `root` 追加一个 `div.touch-controls`，容器 `pointer-events:none`；每个控件单独 `pointer-events:auto`，并设 `touch-action:none` 避免触屏滚动/缩放。
- **控件布局**（`active` 为真时渲染，`setVisible` 控制是否显示）：
  - 左下：转向 `◀` / `▶` 两个大圆钮；其上方/侧边一个「漂移」按钮（按住=跳跃+漂移，松开触发漂移加速，与键盘 Space 一致）。
  - 右下：垂直**油门滑块**（核心诉求）+「刹车」按钮 +「道具」按钮 + 小「后视」按钮。
  - 右上角：小「暂停」按钮。
- **油门滑块（关键逻辑）**：
  - 垂直拖拽：指针在滑块内的 Y → `throttle = clamp01(1 - (y - top)/height)`，即拖到顶部=全速、底部=0。
  - **松手后 `throttle` 保持最后值（锁存），不归零** —— 满足"不用一直按着"。滑块上有一个指示当前档位的填充/拇指。
  - 单击顶部区域=直接全速 `1`；单击底部=归零 `0`（提供快捷复位）。
  - 不改动「刹车/倒车」（刹车按钮按住即可，`Kart.updateSpeed` 中 `brake>throttle` 且低速会进入倒车）。
- **转向**：左/右按住分别给出 `steer=-1/+1`，内部用与键盘一致的 `rampToward` 平滑（复用 [InputManager](file:///d:/gitWork/turbo-kart-rush-main/src/kart/InputManager.ts) 里的 ramp 思路，即上升 ~0.12s / 回中 ~0.08s）。
- **其余按钮到 InputState 映射**：
  - `漂移` 按住 → `drift=true`；按住时触发 `hop`（与键盘等价）。
  - `刹车` 按住 → `brake=1`（同时充当道具后抛，与 keyboard `brake>0.5` 判定一致）。
  - `道具` → `useItem=true`（边缘）+ `useItemHeld=true`（按住）。
  - `后视` 按住 → `lookBack=true`。
  - `暂停` → `pause=true`（边缘）。
- **`update()`**：按帧重算持续值（steer/brake/drift/lookBack/useItemHeld），并把边缘字段清零（`useItem/pause`）。
- **`reset()`**：将 `throttle/brake/steer/drift/lookBack` 归零（每局开赛前调用，防止上一局油门残留导致偷跑/火箭起步误触发）。

### 2. `src/kart/InputManager.ts` —— 合并触控

- 增加私有字段 `private touch: { state: InputState; update(): void } | null = null;`
- 新增方法 `attachTouch(src: { state: InputState; update(): void } | null): void`。
- 在 `update()` 末尾 `return s` 前合并：

```ts
if (this.touch) {
  this.touch.update();
  const t = this.touch.state;
  s.throttle = Math.max(s.throttle, t.throttle);
  s.brake    = Math.max(s.brake, t.brake);
  s.steer    = clamp(this.keyboardSteer + padSteer + t.steer, -1, 1); // 调整：合并三项
  s.drift    = s.drift || t.drift;
  s.useItemHeld = s.useItemHeld || t.useItemHeld;
  s.lookBack = s.lookBack || t.lookBack;
  s.useItem  = s.useItem  || t.useItem;
  s.pause    = s.pause    || t.pause;
}
```

> 注意：`s.steer` 现由 `this.keyboardSteer + padSteer` 计算；为合并触控转向，把触控的 `t.steer` 也叠加进去（触控本身已用 ramp 平滑，叠加后统一 `clamp(-1,1)`）。具体实现时保持键盘 ramp 变量名兼容，仅追加 `t.steer`。

### 3. `src/game/Game.ts` —— 接线与生命周期

- 构造中（`this.input = new InputManager()` 之后）创建并挂接：
  ```ts
  this.touchControls = new TouchControls(this.uiRoot);
  this.input.attachTouch(this.touchControls);
  ```
- 声明并持有 `private readonly touchControls: TouchControls;`。
- `setState()` 或状态分发处，按状态控制可见性：`countdown/racing/finished` 显示，其余（含 `paused`、menu、`results`）隐藏。建议在 `setState()` 中调用 `this.touchControls.setVisible(next === 'countdown' || next === 'racing' || next === 'finished')`。
- `startRace()` / `buildRaceInner()`（比赛真正开始时）调用 `this.touchControls.reset()`，并把油门归零。
- `dispose()` 中 `this.touchControls.dispose()`。
- 保持现有 `onGesture`（audio init）不变；触屏首次 `pointerdown` 同样能触发它。

### 4. `index.html` —— 视口缩放

将 viewport meta 更新为禁止缩放/双击缩放（游戏固定比例）：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

### 5. `src/style.css` —— 触屏样式与移动端布局

新增 `.touch-controls` 及其控件样式（均为 `pointer-events:auto; touch-action:none;`，控件命中区 ≥ 56px 便于拇指操作，玻璃质感复用现有 `--glass-*` 变量），并加移动端适配：

- 基座：
  ```css
  .touch-controls { position: fixed; inset: 0; pointer-events: none; z-index: 30; display: none; }
  .touch .touch-controls { display: block; }
  .touch-controls .btn-touch,
  .touch-controls .throttle-slider { position: absolute; pointer-events: auto; touch-action: none; user-select: none; -webkit-user-select: none; }
  ```
- 控件定位示例（左下转向+漂移；右下油门滑块+刹车+道具+后视；右上暂停），尺寸用 `clamp()` 保证小屏可用。
- **`.touch` 作用域 HUD/菜单适配**：
  - `.touch .controls-legend { display:none; }`（移动端隐藏键盘说明）。
  - 新增 `.touch-hint`（标题页触屏提示）与 `.touch .touch-hint { display:block; }`。
  - HUD 速度表/名次/小地图在触屏上上移或缩小，避免被右下油门滑块遮挡（如给 `hud-speed` 在触屏下 `bottom` 上移、`hud-minimap` 缩小）。
- 全局防缩放/滚动：`html, body { touch-action: manipulation; }`；`.touch-controls * { touch-action: none; }`。

### 6. `src/ui/MainMenu.ts` —— 触屏提示文字

- 标题页在 `controls-legend` 旁新增一条触屏提示（默认隐藏，`.touch` 时显示）：
  ```ts
  el('div', 'touch-hint', '触屏操作：左侧 ◀▶ 转向 · 右侧滑块油门（松手保持）· 按钮 漂移/刹车/道具', title);
  ```
  （`press-start-text` 已有的「按回车 / 点击开始」在触屏下依然适用，可保留。）
- 其余菜单按钮/卡片已支持 `click`，无需额外触屏逻辑。

---

## 假设与决策

- 触屏转向采用**屏幕按键（◀/▶）**，不做陀螺仪倾斜（用户明确要求"按键或提示语"）。
- 油门采用**垂直滑块 + 松手锁存**；刹车保持"按住"语义（不锁存）；倒车由刹车按钮在低速时自动触发（沿用现有物理）。
- 触控只在比赛状态显示，菜单仍用原生 tap（菜单按钮已可点）。
- 键盘/手柄路径与既有行为完全不变，触控作为叠加来源（`Math.max` / `||` 合并），回退安全。
- 不引入 i18n/框架；所有文案按现有中文化约定直接写中文。

---

## 验证步骤

1. `npm run typecheck` 通过（新增模块类型、`attachTouch`、Game 字段接线无误）。
2. `npm run dev` 后，在浏览器 DevTools 切到移动视口 / 真机打开：
   - 标题页出现触屏提示，键盘说明隐藏；点击进入角色/赛道选择，按钮可点。
   - 比赛开始：出现虚拟按键与油门滑块。
   - **油门**：拖滑块到中间档位松手 → 卡丁车持续以对应速度前进（无需按住）；拖到顶部=全速；拖到底部/点底部=停车；刹车按钮可减速并倒车。
   - 转向：按住 ◀/▶ 左转右转顺滑；漂移按钮按住进入漂移、松手获得迷你涡轮。
   - 道具按钮使用道具；按住刹车+道具或后视按钮可向后抛；后视按钮可回头。
   - 右上暂停按钮可暂停/继续。
   - 捏合/双击不缩放、不滚动；触屏区域无系统回弹。
3. 桌面端（无触屏）行为与之前完全一致，无任何虚拟按键出现。