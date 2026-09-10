/**
 * Impact.com (Barges / TUNE) S2S Postback → PostHog
 * 端点：/api/postback?click_id={click_id}&payout={payout}&transaction_id={transaction_id}
 *
 * ── 2026-09-10 重写（原版本存在三个静默丢数据的缺陷）──────────────────────
 *
 * 缺陷 1｜$0 注册转化无法区分
 *   原版把所有回调都写成 Order_Converted、revenue=payout。当 payout=0（Kasamba
 *   「3 免费分钟」、Purple Garden 注册这类 Lead 事件）时没有任何标记，事后无法
 *   把「注册」与「付费」分开统计。
 *   → 现在增加 conversion_type: 'lead'($0) / 'sale'(>0)，两者都正常入库。
 *
 * 缺陷 2｜缺少 click_id 时直接 400 丢弃
 *   一旦联盟侧漏传 click_id（模板改错、参数名变化、跨设备归因丢失），回调会被
 *   **静默扔掉**，数据上完全看不见，只表现为「后台有转化、PostHog 一条没有」。
 *   → 现在绝不丢弃：改发 Postback_Orphan 事件，带全部原始参数 + IP + UA。
 *
 * 缺陷 3｜无幂等，重复回调会重复计入营收
 *   → 现在写入 $insert_id，PostHog 侧自动去重。
 *
 * ── 2026-09-10 增补：精确定位「哪一次点击」成交 ──────────────────────────
 * 前端 click_id 取自 posthog.get_distinct_id()，是**按人**的：同一个人点 3 个 CTA
 * 会得到 3 个相同的 click_id。实测 178 次点击里 76% 来自点过 ≥2 次的人，
 * 于是回调只能说清"是哪个人"，说不清"是他哪一次点击"。
 *
 * 现在前端把 aff_sub2 传成 `<人ID>.<点击令牌>`，回调原样带回。这里按 `.` 拆开：
 *   · 人ID   → 作为 PostHog 的 distinct_id，保证人物档案仍然正确挂接
 *   · 令牌   → 写进 click_token 属性，可反查那一次点击的页面/文案/位置
 * 令牌若在联盟侧被截断或改写，拆分失败即退回按人归因——**不会比改造前更差**。
 *
 * 另增：?dry=1 自检模式，直接返回 JSON 而不写事件，用来验证链路通不通。
 * ─────────────────────────────────────────────────────────────────────────
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/** Impact 广告单 ID → 平台名（与 src/data/affiliateLinks.ts 里的 offer_id 保持一致） */
const OFFER_TO_PLATFORM = {
  '221': 'Keen',
  '191': 'Kasamba',
  '30': 'PurpleGarden',
};

/** 从 advertiser / offer 名称里兜底识别平台 */
function platformFromName(name) {
  const s = String(name || '').toLowerCase();
  if (s.indexOf('kasamba') > -1) return 'Kasamba';
  if (s.indexOf('keen') > -1) return 'Keen';
  if (s.indexOf('purple') > -1) return 'PurpleGarden';
  return null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function collectParams(request) {
  const url = new URL(request.url);
  const out = {};
  for (const [k, v] of url.searchParams.entries()) out[k] = v;
  if (request.method === 'POST') {
    try {
      const ct = (request.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('application/json')) {
        Object.assign(out, await request.json());
      } else {
        const text = await request.text();
        for (const [k, v] of new URLSearchParams(text).entries()) out[k] = v;
      }
    } catch (_) {}
  }
  return out;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

async function handle(context) {
  const { request, env } = context;
  const p = await collectParams(request);

  // ── 参数解析（兼容多种命名）──────────────────────────────────────────
  const clickId =
    p.click_id || p.clickid || p.sub_id || p.aff_sub2 || p.aff_sub || p.ea_sub || '';
  const transactionId =
    p.transaction_id || p.transactionId || p.txn_id || p.order_id || p.conversion_id || 'unknown';

  // ── 金额解析 ────────────────────────────────────────────────────────
  // ⚠️ 2026-09-10 发现的问题：PostHog 里的 revenue 与 Impact 后台的实际佣金不符。
  //    实测交易号 102380548055de713d7c0bea39eab7：后台「支出」为 $125，
  //    而回调带进来的 payout 是 50。也就是说 {payout} 宏并不等于我们真正赚到的佣金。
  //    在没有确认哪个宏才是真实佣金之前，revenue 继续以 payout 为准（保持既有行为，
  //    不做破坏性改动），但把**所有金额类宏**都记进 amount_macros，
  //    这样用 ?dry=1 打一次真实回调就能一眼看出每个宏各是多少，再决定换成哪个。
  const toNum = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };
  const amountMacros = {
    payout: toNum(p.payout),
    amount: toNum(p.amount),
    commission: toNum(p.commission),
    sale_amount: toNum(p.sale_amount),
    order_amount: toNum(p.order_amount),
    revenue: toNum(p.revenue),
    currency: p.currency || p.currency_code || null,
  };
  // commission 语义上就是"我们赚到的"，若联盟侧提供就优先用它；
  // 否则退回 payout，与改造前行为一致。
  let revenueSource = 'payout';
  let payout = amountMacros.payout;
  if (amountMacros.commission !== null) {
    payout = amountMacros.commission;
    revenueSource = 'commission';
  }
  if (payout === null) {
    payout = 0;
    revenueSource = 'none';
  }

  const status = String(p.status || p.conversion_status || '').toLowerCase();
  const approved = status === '' || status === 'approved' || status === '1' || status === 'true';
  const isDry = p.dry === '1' || p.__diag === '1';

  // 类型判定：优先用联盟侧显式声明的类型。
  // 为什么不只看 payout：在 Impact 的 Lead 动作上，{payout} 宏可能填的是「报价」
  // 而不是实际金额，一个非零值会被误判成 sale。所以允许 postback URL 里写上
  // &conversion_type=lead 来强制归类。没写才退回按金额猜。
  const declared = String(p.conversion_type || p.ctype || '').toLowerCase();
  let conversionType;
  if (declared === 'lead' || declared === 'registration' || declared === 'signup' || declared === 'sign_up') {
    conversionType = 'lead';
  } else if (declared === 'sale' || declared === 'paid' || declared === 'purchase') {
    conversionType = 'sale';
  } else {
    conversionType = payout > 0 ? 'sale' : 'lead';
  }

  const posthogKey = env.PUBLIC_POSTHOG_KEY;
  const posthogHost = env.PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  // 平台识别：优先 offer_id，其次广告主/广告单名称（dry 模式也要显示，便于核对）
  const offerId = String(p.offer_id || p.offerId || p.campaign_id || p.campaignId || '');
  const advertiserName = p.advertiser_name || p.advertiserName || p.advertiser || '';
  const offerName = p.offer_name || p.offerName || '';
  const platform =
    OFFER_TO_PLATFORM[offerId] ||
    platformFromName(advertiserName) ||
    platformFromName(offerName) ||
    null;

  // ── 自检模式：不写事件，只回报链路状态 ───────────────────────────────
  if (isDry) {
    return json({
      ok: true,
      dry_run: true,
      has_posthog_key: !!posthogKey,
      posthog_host: posthogHost,
      parsed: { click_id: clickId || null, person_id: clickId ? String(clickId).split('.')[0] : null, click_token: String(clickId || '').indexOf('.') > -1 ? String(clickId).split('.').slice(1).join('.') : null, transaction_id: transactionId, payout, revenue_source: revenueSource, amount_macros: amountMacros, conversion_type: conversionType, declared_type: declared || null, platform, offer_id: offerId || null, status: status || 'unspecified' },
      hint: '把 amount_macros 的每个值跟 Impact 后台同一笔的「支出」对照，就能确定哪个宏是真实佣金；确认后可用 &commission={commission} 让它成为 revenue。',
      raw_params: p,
      note: 'dry=1 只做诊断，不写入 PostHog。去掉 dry 参数即为真实上报。',
    });
  }

  if (!posthogKey) {
    return json({ ok: false, error: 'Missing PUBLIC_POSTHOG_KEY in environment' }, 500);
  }

  // 拆 `<人ID>.<点击令牌>`：前半段挂人物档案，后半段用于定位具体那一次点击
  let personId = clickId || '';
  let clickToken = null;
  if (personId.indexOf('.') > -1) {
    const parts = personId.split('.');
    if (parts[0]) {
      personId = parts[0];
      clickToken = parts.slice(1).join('.') || null;
    }
  }

  // ── 认不出人：不再丢弃，转为可观测的孤儿事件 ─────────────────────────
  // 判定条件有两类：
  //   1) 完全没带 click_id
  //   2) 带的是前端兜底的 `anon-<随机>`（SDK 未就绪时的产物）——它不对应任何真实
  //      人物，若照常写 $set 会凭空造出垃圾人物档案，所以同样按孤儿处理
  const orphan = !clickId || personId.indexOf('anon-') === 0;

  const distinctId = orphan ? `orphan-${transactionId}-${conversionType}` : personId;

  const properties = {
    distinct_id: distinctId,
    revenue: payout,
    revenue_source: revenueSource,
    amount_macros: amountMacros,
    transaction_id: transactionId,
    conversion_type: conversionType,
    platform,
    offer_id: offerId || null,
    advertiser_name: advertiserName || null,
    offer_name: offerName || null,
    currency: p.currency || p.currency_code || null,
    status: status || 'unspecified',
    approved,
    orphan,
    // 精确定位用：click_id 的原始值 + 拆出来的点击令牌
    sub_id: clickId || null,
    click_token: clickToken,
    $source: 'tune_s2s_postback',
    raw_params: p,
    received_at: new Date().toISOString(),
    $insert_id: `ea-pb-${transactionId}-${conversionType}-${payout}`,
  };

  // 只在能真正认出人时写人物属性，避免孤儿事件生成垃圾用户档案。
  // 这些属性让人物档案直接带上转化事实，不必再去翻事件流。
  if (!orphan) {
    properties.$set = {
      ea_converted: true,
      ea_last_conversion_type: conversionType,
      ea_last_conversion_platform: platform,
      ea_last_conversion_payout: payout,
      ea_last_transaction_id: transactionId,
      ea_last_conversion_at: new Date().toISOString(),
      ea_last_click_token: clickToken,
    };
    properties.$set_once = { ea_first_conversion_at: new Date().toISOString() };
  }

  const eventName = orphan ? 'Postback_Orphan' : 'Order_Converted';

  const posthogEvent = {
    api_key: posthogKey,
    event: eventName,
    properties,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(`${posthogHost}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(posthogEvent),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('[postback] PostHog ingest failed:', response.status, detail);
      return json({ ok: false, error: 'upstream_failed', status: response.status, detail: detail.slice(0, 300) }, 502);
    }

    return json({
      ok: true,
      recorded: true,
      event: eventName,
      conversion_type: conversionType,
      platform,
      revenue: payout,
      transaction_id: transactionId,
      click_token: clickToken,
      attributable: !orphan,
      warning: orphan ? 'click_id 缺失，已记入 Postback_Orphan 供排查' : undefined,
    });
  } catch (error) {
    console.error('[postback] network error:', error);
    return json({ ok: false, error: 'internal_error', detail: String(error).slice(0, 200) }, 500);
  }
}

export async function onRequestGet(context) {
  return handle(context);
}

export async function onRequestPost(context) {
  return handle(context);
}
