#!/usr/bin/env node
/**
 * Lead / Sale postback 端到端自检
 * ---------------------------------
 * 用途：在不动联盟后台的前提下，验证 /api/postback 这条链路「参数进来 → 正确分类 →
 * 正确写入 PostHog」全通，并给出可对照的预期值。
 *
 * 用法：
 *   node scripts/postback-selftest.mjs                      # 只跑 dry-run（不写任何事件）
 *   node scripts/postback-selftest.mjs --write               # 额外发一条带 SELFTEST 标记的真实回传
 *   node scripts/postback-selftest.mjs --base https://easternalignment.com
 *
 * --write 会写入 1 条 transaction_id 以 SELFTEST- 开头的事件，用来确认「写库」这一步真的通。
 * 它不会被计入任何正常统计（分析时按 transaction_id NOT LIKE 'SELFTEST-%' 排除即可）。
 */
const args = process.argv.slice(2);
const BASE = (() => {
  const i = args.indexOf('--base');
  return i > -1 && args[i + 1] ? args[i + 1].replace(/\/+$/, '') : 'https://easternalignment.com';
})();
const WRITE = args.includes('--write');
const SECRET = (() => {
  const i = args.indexOf('--secret');
  return i > -1 && args[i + 1] ? args[i + 1] : '';
})();
const k = SECRET ? `&k=${encodeURIComponent(SECRET)}` : '';

/** 真实点击里出现过的两种 sub 形状 */
const SUB_OLD = '01a0e4ee-ffe5-714b-bca7-fa56afa674f9.484cmo';
const SUB_NEW = '01a0e4ee-ffe5-714b-bca7-fa56afa674f9.484cmo.purplegarden';

const CASES = [
  {
    name: 'A. $0 注册（PG，显式声明 lead，新格式 sub）',
    q: `click_id=${SUB_NEW}&payout=0&transaction_id=SELFTEST-LEAD-1&conversion_type=lead&status=approved`,
    expect: { conversion_type: 'lead', type_inference: 'declared', platform: 'PurpleGarden', is_reversal: false },
  },
  {
    name: 'B. $0 注册（Kasamba，靠 commission=0 推断，老格式 sub 兼容）',
    q: `click_id=01a0e7a6-e470-7a88-bc91-89668d92b4b5.wttqy0&commission=0&payout=0&transaction_id=SELFTEST-LEAD-2`,
    expect: { conversion_type: 'lead', type_inference: 'commission', platform: 'Kasamba', is_reversal: false },
  },
  {
    name: 'C. Lead 上 payout 被填成报价（坑：只看 payout 会误判 sale）',
    q: `click_id=${SUB_NEW}&payout=125&amount=0&transaction_id=SELFTEST-LEAD-3`,
    expect: { conversion_type: 'lead', type_inference: 'order_amount', platform: 'PurpleGarden', is_reversal: false },
  },
  {
    name: 'D. 付费 $125（Keen，老格式 sub，保持历史行为）',
    q: `click_id=01a0e114-b83b-7d95-aa49-80ad849a62fd.fqwax3&payout=125&transaction_id=SELFTEST-SALE-1`,
    expect: { conversion_type: 'sale', type_inference: 'payout', platform: null, is_reversal: false },
  },
  {
    name: 'E. 撤销（同一交易号，必须另开一条 + revenue 记负）',
    q: `click_id=${SUB_NEW}&payout=125&transaction_id=SELFTEST-SALE-2&status=reversed`,
    expect: { conversion_type: 'sale', is_reversal: true },
  },
  {
    name: 'F. 缺 click_id（必须落 Postback_Orphan，不丢）',
    q: `payout=0&transaction_id=SELFTEST-ORPHAN-1`,
    expect: { conversion_type: 'lead' },
  },
];

async function call(qs, dry) {
  const url = `${BASE}/api/postback?${qs}${k}${dry ? '&dry=1' : ''}`;
  const res = await fetch(url, { method: 'GET', headers: { 'user-agent': 'ea-postback-selftest/1.0' } });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 400) }; }
  return { status: res.status, body };
}

function check(expect, parsed) {
  const bad = [];
  for (const [key, want] of Object.entries(expect)) {
    const got = parsed[key];
    if (got !== want) bad.push(`${key}: 期望 ${JSON.stringify(want)}，实际 ${JSON.stringify(got)}`);
  }
  return bad;
}

(async () => {
  console.log(`\n=== /api/postback 自检 @ ${BASE} ===`);
  console.log(WRITE ? '模式：dry-run + 真实写入各跑一遍\n' : '模式：仅 dry-run（不写任何事件）\n');

  let failures = 0;
  for (const c of CASES) {
    const { status, body } = await call(c.q, true);
    if (status === 403) {
      console.log(`✗ ${c.name}\n    HTTP 403 —— 端点启用了共享密钥，请用 --secret <POSTBACK_SECRET> 重跑。`);
      failures++;
      continue;
    }
    if (status !== 200 || !body.parsed) {
      console.log(`✗ ${c.name}\n    HTTP ${status} ${JSON.stringify(body).slice(0, 300)}`);
      failures++;
      continue;
    }
    const bad = check(c.expect, body.parsed);
    if (bad.length) {
      failures += bad.length;
      console.log(`✗ ${c.name}`);
      bad.forEach((b) => console.log(`    · ${b}`));
    } else {
      const p = body.parsed;
      console.log(`✓ ${c.name}`);
      console.log(`    type=${p.conversion_type}(${p.type_inference}) platform=${p.platform} reversal=${p.is_reversal} revenue=${p.payout} src=${p.revenue_source}`);
    }
    if (body.parsed && body.parsed.click_token === null && c.name.indexOf('F.') !== 0) {
      console.log('    ! click_token 解析为 null，sub 拆分可能有问题');
      failures++;
    }
  }

  if (WRITE) {
    console.log('\n--- 真实写入（1 条 SELFTEST-LEAD-WRITE）---');
    const { status, body } = await call(
      `click_id=${SUB_NEW}&payout=0&transaction_id=SELFTEST-LEAD-WRITE&conversion_type=lead&status=approved`,
      false
    );
    console.log(`HTTP ${status}`, JSON.stringify(body, null, 1));
    if (status === 200 && body.recorded) {
      console.log('\n→ 请在 PostHog 里确认（约 1 分钟后）：');
      console.log("  event = Order_Converted  AND  properties.transaction_id = 'SELFTEST-LEAD-WRITE'");
      console.log('  期望属性：conversion_type=lead、is_lead=true、platform=PurpleGarden、revenue=0、click_token=484cmo');
    } else {
      console.log('\n✗ 写入失败：写库这一步没通。');
      failures++;
    }
  }

  console.log(`\n=== 结论：${failures === 0 ? '全部通过' : failures + ' 项不通过'} ===\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
