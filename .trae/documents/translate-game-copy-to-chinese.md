# 游戏文案中文化翻译方案

## 摘要

将《Turbo Kart Rush》全部**用户可见文案**从英文翻译为中文。所有文案以字符串字面量形式分散在 UI 组件、角色/赛道数据、入口文件中，无现成 i18n 框架，因此采用**原地改写字符串字面量**的方式（不引入 i18n 抽象）。

用户已确认的两个决策：
1. 角色名/赛道名等专有名词 → **中文意译**。
2. 名次英文序数（1ST / 1ST PLACE）→ **改为中文格式「第N名」**。

代码注释、`README.md`、`CONTRACT.md` 等文档**不翻译**（属于开发者内容，非游戏文案）。

---

## 现状分析

文案分布（已通读确认）：
- 入口/框架：`index.html`（标题、lang）、`src/main.ts`（WebGL 失败页、启动失败页、运行时错误 toast）。
- 全局常量：`src/core/constants.ts`（`GAME_TITLE`）。
- 数据：`src/kart/roster.ts`（8 名角色名 + tagline）、`src/track/tracks/*.ts`（4 条赛道名称 + description + theme）。
- UI：`src/ui/MainMenu.ts`、`src/ui/HUD.ts`、`src/ui/ResultsScreen.ts`、`src/ui/PauseMenu.ts`、`src/ui/LoadingScreen.ts`。
- 引擎层：`src/game/Game.ts`（静音指示器、构建失败 toast）。
- 工具：`src/core/math.ts` 的 `ordinal()` 生成 `th/st/nd/rd` 后缀。
- 样式：`src/style.css` 的 `--display`/`--body` 字体栈为纯拉丁字体（需补充 CJK 回退，否则中文按系统默认渲染、失去紧凑风格）。

`ordinal()` 被 4 处消费：`HUD.ts`（名次数字/后缀拆分、名次变化闪屏）、`ResultsScreen.ts`（标题、排名行）。

---

## 改动方案

### 1. `src/core/constants.ts`

- `GAME_TITLE = 'TURBO KART RUSH'` → `'涡轮卡丁竞速'`（logo 按空格分词，中文为单行单词，逻辑不破）。
- 新增共享的赛道主题中文映射（供 `MainMenu` 与 `LoadingScreen` 复用）：

```ts
import type { TrackTheme } from './types';
export const THEME_LABEL: Record<TrackTheme, string> = {
  grassland: '草原', desert: '沙漠', snow: '雪地',
  beach: '海滩', volcano: '火山', neon: '霓虹',
};
```

### 2. `src/core/math.ts`

- `ordinal()` 改为返回中文名次：

```ts
export function ordinal(n: number): string {
  return `第${n}名`;
}
```

### 3. `src/kart/roster.ts`（名人名 + tagline 意译）

| id | name（中文） | tagline（中文） |
|---|---|---|
| zippy | 新星·疾风 | 眨眼之间，她已领先两个弯道。 |
| pixel | 像素甜心 | 糖分满满的操控，弯道是她的糖果。 |
| fennec | 耳廓狐·疾电 | 耳朵越大，迷你涡轮越强。 |
| max | 全能·旋风 | 全能选手，每一圈都是高光时刻。 |
| juno | 朱诺·惊雷 | 每次漂移都蓄满雷霆之力。 |
| kai | 凯·潮汐 | 如深水般冷静，似浪涌般顺滑。 |
| bram | 巨石·布兰 | 起步虽慢，却坚不可摧。 |
| rosa | 重卡·萝莎 | 四轮卡丁，十八轮的霸气。 |

### 4. `src/track/tracks/*.ts`（赛道名 + description）

| 文件 | name | description（中文） |
|---|---|---|
| sunnyCircuit.ts | 阳光赛道 | 起伏的绿色丘陵，一条超长起步直道，外加一个棘手的发夹弯。完美的热身赛道。 |
| duneDrift.ts | 沙丘漂移 | 夕阳下的高速弯道，穿行于高耸砂岩壁之间的峡谷，两个发夹弯专治贪快。 |
| frostbiteFalls.ts | 霜冻瀑布 | 急速下坠冲上冰湖堤道，脚下仅有薄冰与深渊一墙之隔。 |
| neonNexus.ts | 霓虹枢纽 | 三个发夹弯、一次屋顶飞跃，紫罗兰夜空下一条全速冲刺的霓虹直道。高手专属。 |

（`theme` 字段值保持不变，仅改变其**显示**层映射，见第 1、9、11 步。）

### 5. `src/ui/MainMenu.ts`

- `DIFFICULTY_LABEL`：`EASY/NORMAL/HARD` → `简单/普通/困难`。
- `DIFFICULTY_BLURB`：
  - easy → `轻松的对手，宽松的橡皮筋机制。`
  - normal → `经典的大奖赛挑战。`
  - hard → `冷酷的 AI，近乎完美的走线，毫不留情。`
- `STAT_KEYS` 的 label：`SPD/ACC/HND/WGT/MT` → `速度/加速/操控/重量/迷你涡轮`。
- 标题区：`ARCADE GRAND PRIX` → `街机大奖赛`；`PRESS ENTER / CLICK TO START` → `按回车 / 点击开始`。
- 操作说明（values 列）：`油门`、`刹车 / 倒车`、`转向`、`跳跃 · 漂移`、`使用道具（按住刹车可向后抛）`、`回头看`、`暂停`、`静音`。
- 版本行：`v1.0 · Three.js · 100% procedural · gamepad supported` → `v1.0 · Three.js · 100% 程序化生成 · 支持手柄`。
- `STEP 1 / 2` → `第 1 / 2 步`，`STEP 2 / 2` → `第 2 / 2 步`。
- `CHOOSE YOUR RACER` → `选择你的车手`，`PICK A CIRCUIT` → `选择赛道`。
- 按钮：`← BACK` → `← 返回`，`CONTINUE →` → `继续 →`，`START RACE` → `开始比赛`。
- `DIFFICULTY` → `难度`。
- `pill.title = 'Weight class'` → `'重量级别'`。
- 角色卡 `card-tag`、赛道卡 `card-tag` 已由数据层中文化，无需改（`c.name` / `t.description` 直接带出中文）。
- 赛道卡主题徽标 `t.theme.toUpperCase()` → 改用 `THEME_LABEL[t.theme]`（import 自 constants）。
- 赛道 meta：`` `${t.laps} LAPS` `` → `` `${t.laps} 圈` ``；`` `['ROOKIE','PRO','EXPERT'][...]` `` → `` `['新手','高手','专家'][...]` ``。

### 6. `src/ui/HUD.ts`

- `ITEM_LABEL`：
  `banana→香蕉`、`triple_banana→香蕉 ×3`、`green_shell→绿龟壳`、`triple_green_shell→绿龟壳 ×3`、`red_shell→红龟壳`、`triple_red_shell→红龟壳 ×3`、`blue_shell→蓝龟壳`、`mushroom→蘑菇`、`triple_mushroom→蘑菇 ×3`、`golden_mushroom→黄金蘑菇`、`star→星星`、`lightning→闪电`、`bob_omb→炸弹兵`。
- `LAP` → `圈`（上部圈数标签）。
- `WRONG WAY` → `逆行`。
- 事件文案：
  - `GO!` → `出发！`
  - `FINAL LAP!` → `最后一圈！`
  - `` `LAP ${e.lap}` `` → `` `第 ${e.lap} 圈` ``
  - `FINISH` → `冲线`
  - `` `${ordinal(e.place).toUpperCase()} PLACE` `` → `` `第 ${e.place} 名` ``
  - 名次变化 `` `${up ? '▲' : '▼'} ${ordinal(e.to).toUpperCase()}` `` → `` `${up ? '▲' : '▼'} 第 ${e.to} 名` ``。
- **名次数字展示**（唯一的结构性改动）：原逻辑用 `ordinal(place)` 拆出后缀 `ST/ND/RD/TH`。改为中文「第N名」需要「第」前缀 + 数字 + 「名」后缀：
  - 构造函数中在 `placeNum` 之前插入前缀节点：`el('span', 'place-prefix', '第', this.placeNode)`。
  - `update()` 中删除 `ordinal` 拆分逻辑，改为 `this.placeNum.set(String(place))`、`this.placeSuffix.set('名')`（`第` 为静态前缀，无需 TextField）。

### 7. `src/ui/ResultsScreen.ts`

- `RACE COMPLETE` → `比赛完成`。
- 标题：`` place === 1 ? 'VICTORY!' : `${ordinal(place).toUpperCase()} PLACE` `` → `` place === 1 ? '胜利！' : `第 ${place} 名` ``。
- 副标题：
  - `Untouchable. The crowd goes wild.` → `无人能敌，全场为之沸腾。`
  - `Podium finish. Champagne is on ice.` → `登上领奖台，香槟已在冰上备好。`
  - `Solid run. The podium is within reach.` → `稳健的表现，领奖台近在咫尺。`
  - `Rough race. Time for revenge.` → `表现不佳，是时候复仇了。`
- 按钮：`RACE AGAIN` → `再来一局`，`CHANGE TRACK` → `更换赛道`，`MAIN MENU` → `主菜单`。
- 排名行：`s.name + (s.isPlayer ? '  (YOU)' : '')` → `s.name + (s.isPlayer ? '（你）' : '')`。
- `` `DNF` `` → `未完成`。
- `ordinal(s.place)`（排名行）→ `第 ${s.place} 名`。

### 8. `src/ui/PauseMenu.ts`

- `RACE PAUSED` → `比赛已暂停`，`PAUSED` → `已暂停`。
- `RESUME` → `继续`，`RESTART RACE` → `重新开始`，`QUIT TO MENU` → `退出到菜单`。
- 底部提示：`ESC / P  resume   ·   ↑↓  navigate   ·   ENTER  select` → `ESC / P 继续　·　↑↓ 选择　·　ENTER 确认`。

### 9. `src/ui/LoadingScreen.ts`

- `NOW LOADING` → `正在加载`，`TIP` → `提示`。
- 副标题 `` `${def.laps} LAPS  ·  ${stars}  ·  ${def.theme.toUpperCase()}` `` → `` `${def.laps} 圈　·　${stars}　·　${THEME_LABEL[def.theme]}` ``（import `THEME_LABEL`）。
- `TIPS` 全部 12 条翻译：
  1. `过弯时按住漂移（空格 / Shift），松开即可触发迷你涡轮。漂移越久，加速越强。`
  2. `倒计时到 1 的瞬间轻点油门即可火箭起步；按得太早会打滑失控。`
  3. `使用龟壳时按住刹车可向后投掷。`
  4. `按 Q 回头观察，扔香蕉前先看看身后有什么。`
  5. `加速带（发光箭头）免费提供 +45% 速度爆发，记得对准它们。`
  6. `道具概率取决于你的名次，落后的车手更容易拿到星星、闪电和蓝龟壳。`
  7. `星星让你无敌，并摧毁你碰到的任何障碍。`
  8. `待在赛道上很重要：偏离赛道会让最高速度几乎减半。`
  9. `在长直道上使用蘑菇，或是在被击中后用它迅速恢复。`
  10. `重型卡丁能把轻型卡丁撞开，请谨慎选择重量级别。`
  11. `在跳台顶点跳跃可获得一点着陆加速。`
  12. `随时按 M 静音。`

### 10. `src/game/Game.ts`

- `` '🔇 MUTED' `` → `` '🔇 已静音' ``。
- toast：`Could not build the race. Check the console for details.` → `无法构建比赛，请查看控制台了解详情。`
- toast：`No tracks are available yet.` → `暂无可用赛道。`

### 11. `src/main.ts`

- `RELOAD` → `重新加载`。
- 无 WebGL2 页：标题 `WEBGL2 REQUIRED` → `需要 WebGL2`；正文 → `本游戏需要支持 WebGL 2 并开启硬件加速的浏览器。请使用最新版 Chrome、Edge、Firefox 或 Safari，并确保已开启 GPU 加速。`
- 启动失败页：`FAILED TO START` → `启动失败`；正文 → `游戏启动时出错。请打开开发者控制台查看详情，然后重新加载。`
- toast 前缀：`` `Runtime error: ${...}` `` → `` `运行时错误：${...}` ``；`` `Unhandled promise rejection: ${reason}` `` → `` `未处理的 Promise 拒绝：${reason}` ``。

### 12. `index.html`

- `<html lang="en">` → `<html lang="zh-CN">`。
- `<title>Turbo Kart Rush</title>` → `<title>涡轮卡丁竞速</title>`。

### 13. `src/style.css`（中文字体回退）

- `--display` 与 `--body` 末尾追加 CJK 回退，使中文以合适字体渲染：

```css
--display: 'Impact', 'Haettenschweiler', 'Arial Narrow Bold', 'Franklin Gothic Medium', 'Arial Black',
  'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
--body: system-ui, -apple-system, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC',
  'Helvetica Neue', Arial, sans-serif;
```

- 新增 `.place-prefix`（复用 `.place-suffix` 的字号，去掉左侧 margin，改为右侧留白，与后面的数字衔接）：

```css
.place-prefix {
  font-size: clamp(34px, 4.6vw, 60px);
  letter-spacing: 0.02em;
  margin-right: 4px;
}
```

---

## 假设与决策

- 仅翻译**用户可见字符串**；代码注释与文档保持英文。
- 专有名词采用意译（已确认）；个别名称采用「名·姓」分隔（如「新星·疾风」）以符合中文语感。
- `theme`/`weightClass`/`difficulty` 等内部枚举值不变，仅改显示层映射。
- `ordinal()` 语义从「英文序数后缀」变为「第N名」，消费方已逐一适配，无残留英文序数。

---

## 验证步骤

1. `npm run build`（或 `npx tsc --noEmit`）确认类型检查通过（尤其 `THEME_LABEL` 的 `Record<TrackTheme,string>` 完整性、`ordinal` 消费方改动）。
2. `npm run dev` 启动，逐屏目检：
   - 标题页（logo「涡轮卡丁竞速」、副标、操作说明、版本行）。
   - 角色选择（8 名中文名、tagline、重量徽标、五项属性中文）。
   - 赛道选择（4 条赛道中文名/描述、难度「简单/普通/困难」及说明、主题徽标中文、圈数「N 圈」、「新手/高手/专家」）。
   - 加载页（「正在加载」「提示」及 12 条中文技巧轮播）。
   - 比赛中 HUD（道具中文名、圈数「N/N」、名次「第N名」、速度 km/h、「逆行」「出发！」「最后一圈！」「冲线」「第N圈」、名次变化「▲ 第N名」）。
   - 暂停菜单、结算页（「胜利！」/「第N名」、副标题、按钮、「（你）」「未完成」）。
   - 左上/右下角无乱码、无残留英文（预期保留英文：按键名如 W/A/S/D/SPACE/SHIFT、单位 km/h、`DNF` 已换为「未完成」）。
3. 静音按 `M`，确认「🔇 已静音」；中文未因 Impact 字体缺字而出现豆腐块（应回退到微软雅黑/苹方）。