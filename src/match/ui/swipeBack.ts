/**
 * ui/swipeBack.ts — 左缘右滑返回手势（iOS 标志性交互）
 *
 * 行为规格（对齐 iOS 系统导航的交互语义）：
 *   · 只有从屏幕左缘 30px 内起步的触摸才有资格成为「返回手势」，
 *     其余触摸一律放行给滚动与点按 —— 宁可漏识别，不可抢滚动。
 *   · 起步后先做方向裁决：水平位移占优才捕获；垂直占优立刻放弃，
 *     这次触摸交还给页面滚动，之后不再纠缠。
 *   · 捕获后当前屏跟手右移，上一屏（peek）以 26% 视差从左侧滑入 ——
 *     这是 iOS push/pop 的经典双层运动。
 *   · 松手时按「距离 > 28% 屏宽」或「速度 > 0.45px/ms」双阈值判定：
 *     满足则补完动画并 commit；不满足则弹回原位，状态零变化。
 *   · 捕获过的手势序列绝不允许再派生 click —— 否则一次返回滑动
 *     可能顺带触发选项点选。
 *
 * 所有动画只动 transform / opacity，在合成器线程上跑，不触发排版。
 */

export interface SwipeBackOptions {
  /** 屏容器（#match-app），手势监听与 class 切换都挂在它上面 */
  host: HTMLElement;
  /** 当前顶屏元素（.m-screen），跟手移动的对象 */
  screen: () => HTMLElement | null;
  /** 手势是否可用（答题屏、不在转场中、不在另一次滑动中） */
  canSwipe: () => boolean;
  /** 静默渲染上一屏（不播报、不转移焦点、无任何交互） */
  peek: () => HTMLElement;
  /** 判定为「完成返回」后的提交动作（控制器做状态迁移，无转场） */
  commit: () => void;
}

const EDGE_PX = 30;          // 左缘热区
const MIN_DOMINANT_DX = 12;  // 进入捕获前的最小水平位移
const VERTICAL_BAIL_DY = 12; // 垂直位移超过它就放弃本次手势
const COMMIT_RATIO = 0.28;   // 距离阈值：屏宽占比
const COMMIT_VELOCITY = 0.45;// 速度阈值：px/ms
const PARALLAX = 26;         // peek 视差百分比
const EASE_OUT = 'cubic-bezier(0.32, 0.72, 0, 1)';

export function attachSwipeBack(opts: SwipeBackOptions): () => void {
  const { host } = opts;

  let tracking = false;
  let captured = false;
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let raf = 0;
  let cur: HTMLElement | null = null;
  let peekEl: HTMLElement | null = null;

  /** 捕获期间派生的下一次 click 必须被吞掉（详见文件头说明） */
  function swallowNextClick(): void {
    const eat = (ev: Event) => {
      ev.stopPropagation();
      ev.preventDefault();
    };
    host.addEventListener('click', eat, { capture: true });
    // 不能用 once:true —— 若这次手势后根本没有 click 产生，监听器会
    // 残留下来吞掉用户下一次的合法点击。改为定时自毁。
    window.setTimeout(() => host.removeEventListener('click', eat, { capture: true }), 400);
  }

  function applyFrame(): void {
    raf = 0;
    if (!cur) return;
    const w = host.clientWidth || 1;
    const progress = Math.min(dx / w, 1);
    cur.style.transform = `translateX(${dx}px)`;
    if (peekEl) peekEl.style.transform = `translateX(${-PARALLAX * (1 - progress)}%)`;
  }

  function scheduleFrame(): void {
    if (!raf) raf = window.requestAnimationFrame(applyFrame);
  }

  function beginCapture(): void {
    captured = true;
    cur = opts.screen();
    peekEl = opts.peek();
    peekEl.classList.add('m-swipe-peek');
    peekEl.setAttribute('aria-hidden', 'true');
    peekEl.style.transform = `translateX(-${PARALLAX}%)`;
    // 插到当前屏之前：两者同层时 DOM 序决定绘制序，当前屏在上
    host.insertBefore(peekEl, cur);
    host.classList.add('is-swiping');
  }

  /** 动画收尾工具：finished 在动画被取消时会 reject，吞掉即可 */
  function settle(anim: Animation | undefined, done: () => void): void {
    if (!anim) { done(); return; }
    anim.finished.then(done, done);
  }

  function onTouchStart(e: TouchEvent): void {
    if (!opts.canSwipe() || e.touches.length !== 1) return;
    const t = e.touches[0];
    if (t.clientX > EDGE_PX) return;
    tracking = true;
    captured = false;
    startX = t.clientX;
    startY = t.clientY;
    lastX = t.clientX;
    lastT = e.timeStamp;
    dx = 0;
    velocity = 0;
  }

  function onTouchMove(e: TouchEvent): void {
    if (!tracking) return;
    const t = e.touches[0];
    const dX = t.clientX - startX;
    const dY = t.clientY - startY;

    if (!captured) {
      if (dX > MIN_DOMINANT_DX && dX > Math.abs(dY) * 1.15) {
        beginCapture();
      } else if (Math.abs(dY) > VERTICAL_BAIL_DY || dX < -8) {
        tracking = false;
        return;
      } else {
        return; // 还没定论，继续观察
      }
    }

    // 已捕获：这次手势归我们，页面滚动必须停
    e.preventDefault();
    dx = Math.max(0, dX);

    // 指数平滑的瞬时速度，松手判定用
    const now = e.timeStamp;
    const dt = now - lastT;
    if (dt > 0) {
      velocity = 0.7 * velocity + 0.3 * ((t.clientX - lastX) / dt);
      lastX = t.clientX;
      lastT = now;
    }
    scheduleFrame();
  }

  function onTouchEnd(): void {
    if (!tracking) return;
    tracking = false;
    if (!captured) return;

    const w = host.clientWidth || 1;
    const shouldCommit = dx > w * COMMIT_RATIO || velocity > COMMIT_VELOCITY;
    const fromDx = dx;
    const c = cur;
    const p = peekEl;

    cur = null;
    peekEl = null;
    dx = 0;
    velocity = 0;
    swallowNextClick();

    if (shouldCommit) {
      // 补完剩余行程，然后由控制器无转场换 DOM。
      // 换上的新屏与 peek 静止态逐像素一致，用户看不出交接。
      const dur = 220;
      const a1 = c?.animate(
        [{ transform: `translateX(${fromDx}px)` }, { transform: `translateX(${w}px)` }],
        { duration: dur, easing: EASE_OUT, fill: 'forwards' },
      );
      p?.animate(
        [{ transform: `translateX(${-PARALLAX * (1 - fromDx / w)}%)` }, { transform: 'translateX(0)' }],
        { duration: dur, easing: EASE_OUT, fill: 'forwards' },
      );
      settle(a1, () => {
        host.classList.remove('is-swiping');
        opts.commit();
      });
    } else {
      // 弹回原位：当前屏滑回 0，peek 退回左侧并移除
      const dur = 300;
      const a1 = c?.animate(
        [{ transform: `translateX(${fromDx}px)` }, { transform: 'translateX(0)' }],
        { duration: dur, easing: EASE_OUT, fill: 'forwards' },
      );
      p?.animate(
        [{ transform: `translateX(${-PARALLAX * (1 - fromDx / w)}%)` }, { transform: `translateX(-${PARALLAX}%)` }],
        { duration: dur, easing: EASE_OUT, fill: 'forwards' },
      );
      settle(a1, () => {
        if (c) c.style.transform = '';
        p?.remove();
        host.classList.remove('is-swiping');
      });
    }
  }

  function onTouchCancel(): void {
    if (!captured) { tracking = false; return; }
    // 系统抢走手势（来电、控制中心…）：一律按「未完成」弹回
    const c = cur;
    const p = peekEl;
    cur = null;
    peekEl = null;
    tracking = false;
    captured = false;
    if (c) c.style.transform = '';
    p?.remove();
    host.classList.remove('is-swiping');
  }

  // touchmove 必须 passive:false，否则捕获后无法阻止页面滚动
  host.addEventListener('touchstart', onTouchStart, { passive: true });
  host.addEventListener('touchmove', onTouchMove, { passive: false });
  host.addEventListener('touchend', onTouchEnd, { passive: true });
  host.addEventListener('touchcancel', onTouchCancel, { passive: true });

  /** 分离：换屏前由控制器调用，清监听、清动画帧、清残留 DOM */
  return function detach(): void {
    host.removeEventListener('touchstart', onTouchStart);
    host.removeEventListener('touchmove', onTouchMove);
    host.removeEventListener('touchend', onTouchEnd);
    host.removeEventListener('touchcancel', onTouchCancel);
    if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
    if (cur) { cur.style.transform = ''; cur = null; }
    peekEl?.remove();
    peekEl = null;
    tracking = false;
    captured = false;
    host.classList.remove('is-swiping');
  };
}
