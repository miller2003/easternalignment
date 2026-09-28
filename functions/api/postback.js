/**
 * barges / TUNE (HasOffers) S2S Postback → PostHog
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
 *   → 现在绝不丢弃：改发 Postback_Orphan 事件，带全部原始参数。
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
 *
 * ── 2026-09-28 补全 $0 / Lead 注册回传（本次改动）────────────────────────
 *
 * 线上事实：付费回传正常（9 月已收到 7 笔），**Lead/注册回传一条都没进来**。
 * 经核验「收不到」不是端点的问题（端点早就能收 payout=0），而是后台那条
 * postback URL 没有对 Lead 类转化触发。本次把端点补成「无论后台怎么配都能吃下」，
 * 并修掉 4 个会让 Lead 数据失真或让营收算错的问题：
 *
 * 缺陷 4｜反向/撤销（status=reversed/rejected/refunded）无法表达
 *   原版把 status 只当信息记着，revenue 仍是正数 → 被撤销的付费转化会**永久
 *   虚增营收**；而且 $insert_id 不含 status，同交易号的撤销回调会被幂等去重
 *   静默丢弃（连"发生过撤销"都看不见）。
 *   → 现在：撤销类状态单独开一条事件（$insert_id 追加状态后缀，不影响已入库的
 *     历史事件幂等），revenue 记**负值**，于是 `sum(revenue)` 自动得到净营收。
 *
 * 缺陷 5｜Lead/Sale 的类型判定只看 payout，$0 注册容易被误判成 sale
 *   联盟侧在 Lead 动作上可能把 {payout} 填成「报价」而不是实际金额（手册已警告），
 *   一个非零 payout 会把注册算成付费转化，直接污染付费笔数。
 *   → 现在按「显式声明 > 实际佣金 commission > 订单金额 amount/sale_amount/
 *     order_amount > payout」四级判定，并把用了哪一级写进 type_inference，
 *     事后可审计。URL 上写 &conversion_type=lead 可强制归类。
 *
 * 缺陷 6｜platform 恒为 null（回传里没有 offer_id）
 *   实测 7 笔回传的 platform 全是 null，导致「按平台核对滞后常数」做不了；
 *   Lead 更是完全不知道该记到 Kasamba 还是 Purple Garden。
 *   → 现在 /go/ 页把平台码拼进 aff_sub2 的第三段（`<人ID>.<令牌>.<平台>`），
 *     端点按白名单解析。老格式（两段）继续兼容。
 *
 * 缺陷 7｜端点无鉴权，任何人 POST 都会写进 PostHog
 *   实测 2026-09-28 19:26:32 有 3 次带空参数的探测（?c= / ?click_i= / ?click_id=）
 *   被当成真实孤儿回传写了进去；同时 3 条孤儿事件因为 transaction_id 都是
 *   'unknown'，$insert_id 撞成同一个值。
 *   → 现在支持可选共享密钥（env.POSTBACK_SECRET，参数 k/key/token/secret 任一），
 *     **未设置环境变量时不校验**（向后兼容，不会打断线上回传）；孤儿事件的
 *     $insert_id 改为带参数指纹，避免互相覆盖。
 *
 * ── 部署与后台配置见 docs/lead-postback-setup.md ──────────────────────────
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/** 广告单 ID → 平台名（与 src/data/affiliateLinks.ts 里的 offer_id 保持一致） */
const OFFER_TO_PLATFORM = {
  '221': 'Keen',
  '191': 'Kasamba',
  '30': 'PurpleGarden',
};

/** sub_id 第三段的平台码（由 /go/ 页写入，见 src/pages/go/[...slug].astro） */
const PLATFORM_CODE = {
  keen: 'Keen',
  kasamba: 'Kasamba',
  purplegarden: 'PurpleGarden',
};

/** 撤销 / 拒绝类状态：这类回调要把营收冲回去，且必须单独入库 */
const REVERSAL_STATUS = [
  'reversed', 'reverse', 'refunded', 'refund', 'rejected', 'reject',
  'declined', 'chargeback', 'cancelled', 'canceled', 'void', 'fraud',
];

/** 从 advertiser / offer 名称里兜底识别平台 */
function platformFromName(name) {
  const s = String(name || '').toLowerCase();
  if (s.indexOf('kasamba') > -1) return 'Kasamba';
  if (s.indexOf('keen') > -1) return 'Keen';
  if (s.indexOf('purple') > -1) return 'PurpleGarden';
  return null;
}

/** 参数指纹：只用于孤儿事件的 $insert_id，让不同的坏回调互不覆盖，而重试仍去重 */
function fingerprint(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
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

/** 可选共享密钥校验。未配置 POSTBACK_SECRET 时一律放行（向后兼容）。 */
function checkSecret(p, env) {
  const expected = String((env && env.POSTBACK_SECRET) || '');
  if (!expected) return { enforced: false, ok: true };
  const provided = ['k', 'key', 'token', 'secret', 'auth']
    .map((n) => p[n])
    .find((v) => v) || '';
  return { enforced: true, ok: provided === expected };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

async function handle(context) {
  const { request, env } = context;
  const p = await collectParams(request);

  // ── 鉴权（可选）────────────────────────────────────────────────────
  // 校验失败**不写事件**：否则端点本身会变成污染源，比垃圾回传更糟。
  // 排查方向见 docs/lead-postback-setup.md「403 了怎么办」。
  const auth = checkSecret(p, env);
  if (!auth.ok) {
    return json({
      ok: false,
      error: 'unauthorized',
      hint: '端点已启用共享密钥。请在后台的 postback URL 上补 &k=<POSTBACK_SECRET>，或临时移除 Cloudflare 环境变量 POSTBACK_SECRET。',
    }, 403);
  }

  // ── 参数解析（兼容多种命名）──────────────────────────────────────────
  const clickId =
    p.click_id || p.clickid || p.sub_id || p.aff_sub2 || p.aff_sub || p.ea_sub || '';
  const transactionId =
    p.transaction_id || p.transactionId || p.txn_id || p.order_id || p.conversion_id || 'unknown';

  // ── 金额解析 ────────────────────────────────────────────────────────
  // ⚠️ 2026-09-10 发现的问题：PostHog 里的 revenue 与后台的实际佣金不符。
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
  const isReversal = REVERSAL_STATUS.indexOf(status) > -1;
  const isDry = p.dry === '1' || p.__diag === '1';

  // ── 类型判定：Lead($0) vs Sale(付费) ────────────────────────────────
  // 为什么要四级判定：Lead 动作上的 {payout} 可能填的是「报价」而不是实际佣金，
  // 只看 payout 会把注册算成付费转化，直接污染付费笔数（手册 2026-09-10 警告）。
  const declared = String(p.conversion_type || p.ctype || p.kind || p.type || p.event_type || '').toLowerCase();
  const isLeadWord = ['lead', 'registration', 'signup', 'sign_up', 'register', 'free_trial'];
  const isSaleWord = ['sale', 'paid', 'purchase', 'subscription'];
  let conversionType;
  let typeInference;
  if (isLeadWord.indexOf(declared) > -1) {
    conversionType = 'lead';
    typeInference = 'declared';
  } else if (isSaleWord.indexOf(declared) > -1) {
    conversionType = 'sale';
    typeInference = 'declared';
  } else if (amountMacros.commission !== null) {
    // commission = 我们实际赚到的钱，是判类型最硬的信号：Lead 上它必然是 0
    conversionType = amountMacros.commission > 0 ? 'sale' : 'lead';
    typeInference = 'commission';
  } else {
    const orderAmount = [amountMacros.amount, amountMacros.sale_amount, amountMacros.order_amount]
      .find((v) => v !== null);
    if (orderAmount !== undefined) {
      // 有订单金额但为 0 → 没有真实成交，按 Lead 处理
      conversionType = orderAmount > 0 ? 'sale' : 'lead';
      typeInference = 'order_amount';
    } else {
      conversionType = payout > 0 ? 'sale' : 'lead';
      typeInference = 'payout';
    }
  }
  if (isReversal) typeInference = 'reversal';

  // ── 类型与金额的一致性收口 ──────────────────────────────────────────
  // Lead（$0 注册）却带着一个非零 payout，只可能是「{payout} 宏填的是报价」这种情况。
  // 若照原值入库，一笔注册会凭空产生 $125 营收，比丢一笔更糟（营收是花钱决策的输入）。
  // 所以：类型判为 lead 且金额只来自 payout 时，revenue 归零，并在 revenue_source
  // 上留痕（原始值仍在 amount_macros.payout 与 raw_params 里，没有丢数据）。
  if (conversionType === 'lead' && revenueSource === 'payout' && payout !== 0) {
    payout = 0;
    revenueSource = 'lead_zeroed';
  }

  const posthogKey = env.PUBLIC_POSTHOG_KEY;
  const posthogHost = env.PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  // 平台识别：sub_id 第三段（2026-09-28 起） > offer_id > 广告主/广告单名称
  const rawClickId = String(clickId || '');
  const subParts = rawClickId.split('.');
  const platformFromSub =
    subParts.length >= 3 ? (PLATFORM_CODE[subParts[subParts.length - 1].toLowerCase()] || null) : null;

  const offerId = String(p.offer_id || p.offerId || p.campaign_id || p.campaignId || '');
  const advertiserName = p.advertiser_name || p.advertiserName || p.advertiser || '';
  const offerName = p.offer_name || p.offerName || '';
  const platform =
    platformFromSub ||
    OFFER_TO_PLATFORM[offerId] ||
    platformFromName(advertiserName) ||
    platformFromName(offerName) ||
    null;

  // 原始请求侧信息：端点转发的请求来自 Cloudflare（$ip 永远是 CF 出口），
  // 所以把真实来源头单独记下来，便于识别伪造回传。
  const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || null;
  const clientUa = request.headers.get('user-agent') || null;
  const cfCountry = (request.cf && request.cf.country) || null;

  // ── 自检模式：不写事件，只回报链路状态 ───────────────────────────────
  if (isDry) {
    return json({
      ok: true,
      dry_run: true,
      secret_enforced: auth.enforced,
      has_posthog_key: !!posthogKey,
      posthog_host: posthogHost,
      parsed: {
        click_id: clickId || null,
        person_id: clickId ? String(clickId).split('.')[0] : null,
        click_token: subParts.length >= 2 ? subParts.slice(1, platformFromSub ? -1 : undefined).join('.') : null,
        transaction_id: transactionId,
        payout,
        revenue_source: revenueSource,
        amount_macros: amountMacros,
        conversion_type: conversionType,
        type_inference: typeInference,
        declared_type: declared || null,
        is_reversal: isReversal,
        platform,
        platform_from: platformFromSub ? 'sub_id' : (OFFER_TO_PLATFORM[offerId] ? 'offer_id' : (platform ? 'name' : null)),
        offer_id: offerId || null,
        status: status || 'unspecified',
      },
      client: { ip: clientIp, ua: clientUa, country: cfCountry },
      hint: '把 amount_macros 的每个值跟后台同一笔的「支出」对照，就能确定哪个宏是真实佣金；确认后可用 &commission={commission} 让它成为 revenue。若这笔是 $0 注册却判成了 sale，请在 URL 上补 &conversion_type=lead，或改用 &commission={commission} 传实际佣金。',
      raw_params: p,
      note: 'dry=1 只做诊断，不写入 PostHog。去掉 dry 参数即为真实上报。',
    });
  }

  if (!posthogKey) {
    return json({ ok: false, error: 'Missing PUBLIC_POSTHOG_KEY in environment' }, 500);
  }

  // 拆 `<人ID>.<点击令牌>[.<平台码>]`：前半段挂人物档案，中间段定位具体那一次点击
  let personId = rawClickId;
  let clickToken = null;
  if (personId.indexOf('.') > -1) {
    const parts = personId.split('.');
    if (parts[0]) {
      personId = parts[0];
      clickToken = (platformFromSub ? parts.slice(1, -1) : parts.slice(1)).join('.') || null;
    }
  }

  // ── 认不出人：不再丢弃，转为可观测的孤儿事件 ─────────────────────────
  // 判定条件有两类：
  //   1) 完全没带 click_id
  //   2) 带的是前端兜底的 `anon-<随机>`（SDK 未就绪时的产物）——它不对应任何真实
  //      人物，若照常写 $set 会凭空造出垃圾人物档案，所以同样按孤儿处理
  const orphan = !clickId || personId.indexOf('anon-') === 0;

  const distinctId = orphan
    ? `orphan-${transactionId}-${conversionType}`
    : personId;

  // revenue：被撤销/拒绝的回传记负值 → sum(revenue) 天然得到净营收。
  const revenue = isReversal ? -Math.abs(payout) : payout;

  // $insert_id 幂等键。
  // · 正常（approved / 未给状态）→ 保持改造前的格式，历史事件不会因改版而重复入库
  // · 撤销类状态             → 追加状态后缀，**另开一条**，这样"被撤销"这件事可见
  // · 孤儿（transaction_id 缺失）→ 追加参数指纹，避免多次不同的坏回传互相覆盖
  const insertBase = `ea-pb-${transactionId}-${conversionType}-${payout}`;
  const insertId = isReversal
    ? `${insertBase}-${status}`
    : orphan
      ? `${insertBase}-orphan-${fingerprint(JSON.stringify(p))}`
      : insertBase;

  const properties = {
    distinct_id: distinctId,
    revenue,
    revenue_source: revenueSource,
    amount_macros: amountMacros,
    transaction_id: transactionId,
    conversion_type: conversionType,
    type_inference: typeInference,
    is_lead: conversionType === 'lead',
    is_sale: conversionType === 'sale',
    is_reversal: isReversal,
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
    // 归一化 sub：去掉平台码，形状与 affiliate_link_click.sub_id 完全一致，
    // 这样「回传 ⟷ 点击」可以直接按 sub_id 连接（2026-09-28 起 aff_sub2 多了一段平台码）
    sub_id_canonical: orphan ? null : (clickToken ? `${personId}.${clickToken}` : personId),
    click_token: clickToken,
    client_ip: clientIp,
    client_country: cfCountry,
    $source: 'tune_s2s_postback',
    raw_params: p,
    received_at: new Date().toISOString(),
    $insert_id: insertId,
  };
  if (clientUa) properties.client_ua = clientUa;

  // 只在能真正认出人时写人物属性，避免孤儿事件生成垃圾用户档案。
  // 这些属性让人物档案直接带上转化事实，不必再去翻事件流。
  if (!orphan) {
    properties.$set = {
      ea_converted: true,
      ea_last_conversion_type: conversionType,
      ea_last_conversion_platform: platform,
      ea_last_conversion_payout: revenue,
      ea_last_conversion_status: status || 'unspecified',
      ea_last_transaction_id: transactionId,
      ea_last_conversion_at: new Date().toISOString(),
      ea_last_click_token: clickToken,
    };
    if (isReversal) properties.$set.ea_reversed = true;
    // 注册/付费两类分开记时间，才能算「注册 → 付费」升级率与升级耗时
    if (conversionType === 'lead') {
      properties.$set_once = { ea_first_lead_at: new Date().toISOString() };
    } else if (!isReversal) {
      properties.$set_once = { ea_first_sale_at: new Date().toISOString() };
    }
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
      type_inference: typeInference,
      is_reversal: isReversal,
      platform,
      revenue,
      transaction_id: transactionId,
      insert_id: insertId,
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
