// 本地离线单元测试：验证 postback 处理器在无网络情况下的分类与幂等键逻辑
import { onRequestGet } from 'file:///C:/Users/samja/Desktop/site/easternalignment/functions/api/postback.js';

const captured = [];
globalThis.fetch = async (url, opts) => {
  captured.push(JSON.parse(opts.body));
  return new Response('{"status":1}', { status: 200 });
};

const ENV = { PUBLIC_POSTHOG_KEY: 'phc_test', PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com' };

async function hit(qs) {
  const req = new Request('https://easternalignment.com/api/postback?' + qs, { method: 'GET' });
  const res = await onRequestGet({ request: req, env: ENV });
  return { status: res.status, body: await res.json() };
}

const SUB_OLD = '01a0e4ee-ffe5-714b-bca7-fa56afa674f9.484cmo';
const SUB_NEW = '01a0e4ee-ffe5-714b-bca7-fa56afa674f9.484cmo.purplegarden';

const CASES = [
  ['A 显式 lead + 新格式 sub', `click_id=${SUB_NEW}&payout=0&transaction_id=T1&conversion_type=lead`, 'lead', 'declared', 'PurpleGarden', false, true],
  ['B commission=0 + 老格式 sub', `click_id=${SUB_OLD}&commission=0&payout=0&transaction_id=T2`, 'lead', 'commission', null, false, true],
  ['C payout 被填成报价但 amount=0', `click_id=${SUB_NEW}&payout=125&amount=0&transaction_id=T3`, 'lead', 'order_amount', 'PurpleGarden', false, true],
  ['D 付费 125 老格式（保持历史行为）', `click_id=${SUB_OLD}&payout=125&transaction_id=T4`, 'sale', 'payout', null, false, true],
  ['E 撤销', `click_id=${SUB_NEW}&payout=125&transaction_id=T5&status=reversed`, 'sale', 'reversal', 'PurpleGarden', true, true],
  ['F 缺 click_id → Orphan', `payout=0&transaction_id=T6`, 'lead', 'payout', null, false, false],
  ['G Keen 平台码', `click_id=01a0e114-b83b-7d95-aa49-80ad849a62fd.fqwax3.keen&payout=125&transaction_id=T7`, 'sale', 'payout', 'Keen', false, true],
  ['H 未知第三段不应被当平台', `click_id=01a0e4ee-xxx.tok.somethingelse&payout=1&transaction_id=T8`, 'sale', 'payout', null, false, true],
  ['I 三参数宏未被替换（真实探测形状）', `c=&click_i=&click_id=`, 'lead', 'payout', null, false, false],
  // 2026-09-29：补齐 offer 34 / 42 / 209 后的回归（这三条覆盖了此前 30% 的归因空洞）
  ['J offer 34 = PG 西语', `click_id=01a0e4ee-xxx.tok&offer_id=34&payout=125&transaction_id=T9`, 'sale', 'payout', 'PurpleGarden', false, true],
  ['K offer 42 = Psiquicos', `click_id=01a0e4ee-xxx.tok&offer_id=42&payout=0&transaction_id=T10`, 'lead', 'payout', 'Psiquicos', false, true],
  ['L offer 209 = Keen 按人深链', `click_id=01a0e4ee-xxx.tok&offer_id=209&payout=125&transaction_id=T11`, 'sale', 'payout', 'Keen', false, true],
  ['M sub 平台码 psiquicos', `click_id=01a0e4ee-ffe5-714b-bca7-fa56afa674f9.abc123.psiquicos&payout=0&transaction_id=T12`, 'lead', 'payout', 'Psiquicos', false, true],
  ['N 名称兜底认 psiquicos', `click_id=01a0e4ee-xxx.tok&payout=0&transaction_id=T13&advertiser_name=Psiquicos.net`, 'lead', 'payout', 'Psiquicos', false, true],
];

let fail = 0;
for (const [name, qs, ct, ti, pf, rev, attributable] of CASES) {
  captured.length = 0;
  const { status, body } = await hit(qs);
  const ev = captured[0];
  const p = ev ? ev.properties : {};
  const bad = [];
  if (status !== 200) bad.push(`HTTP ${status}`);
  if (ev && ev.event !== (attributable ? 'Order_Converted' : 'Postback_Orphan')) bad.push(`event=${ev.event}`);
  if (p.conversion_type !== ct) bad.push(`conversion_type=${p.conversion_type} 期望 ${ct}`);
  if (p.type_inference !== ti) bad.push(`type_inference=${p.type_inference} 期望 ${ti}`);
  if ((p.platform || null) !== pf) bad.push(`platform=${p.platform} 期望 ${pf}`);
  if (!!p.is_reversal !== rev) bad.push(`is_reversal=${p.is_reversal} 期望 ${rev}`);
  if (ct === 'lead' && p.is_lead !== true) bad.push('is_lead 未置位');
  if (attributable && !p.click_token) bad.push('click_token 为空');
  if (attributable && !p.sub_id_canonical) bad.push('sub_id_canonical 为空');
  if (attributable && p.sub_id_canonical !== `${p.distinct_id}.${p.click_token}`) bad.push(`sub_id_canonical 形状异常: ${p.sub_id_canonical}`);
  if (rev && p.revenue >= 0) bad.push(`撤销 revenue 应为负，实际 ${p.revenue}`);
  if (bad.length) { fail++; console.log(`✗ ${name}\n    ${bad.join(' | ')}`); }
  else console.log(`✓ ${name}  →  ${p.conversion_type}/${p.type_inference} pf=${p.platform} rev=${p.revenue} ins=${p.$insert_id}`);
}

// 幂等键：同交易号 approved 与 reversed 必须不同；重复 approved 必须相同
captured.length = 0;
await hit(`click_id=${SUB_NEW}&payout=125&transaction_id=TX`);
await hit(`click_id=${SUB_NEW}&payout=125&transaction_id=TX`);
await hit(`click_id=${SUB_NEW}&payout=125&transaction_id=TX&status=reversed`);
const ids = captured.map((e) => e.properties.$insert_id);
console.log('\n幂等键：', ids);
if (ids[0] !== ids[1]) { fail++; console.log('✗ 重复 approved 的 $insert_id 不一致（幂等失效）'); } else console.log('✓ 重复 approved 幂等');
if (ids[0] === ids[2]) { fail++; console.log('✗ 撤销与正常事件 $insert_id 相同（撤销会被吞掉）'); } else console.log('✓ 撤销另开一条');
// 历史事件格式兼容：T1..T8 之外，检查 approved 事件沿用 ea-pb-<txn>-<type>-<payout>
if (ids[0] !== 'ea-pb-TX-sale-125') { fail++; console.log(`✗ 与历史格式不兼容: ${ids[0]}`); } else console.log('✓ 与历史 $insert_id 格式完全兼容');

// 孤儿事件指纹去重
captured.length = 0;
await hit('c=&click_id=');
await hit('click_i=&click_id=');
const oids = captured.map((e) => e.properties.$insert_id);
if (oids[0] === oids[1]) { fail++; console.log('✗ 不同孤儿回传 $insert_id 撞号'); } else console.log('✓ 孤儿事件按参数指纹区分：', oids.join(' , '));

// 密钥校验
captured.length = 0;
const req = new Request('https://easternalignment.com/api/postback?click_id=x.y&payout=1&transaction_id=Z', { method: 'GET' });
const res = await onRequestGet({ request: req, env: { ...ENV, POSTBACK_SECRET: 's3cr3t' } });
console.log(res.status === 403 && captured.length === 0 ? '✓ 启用密钥后无密钥请求被 403 且未写库' : '✗ 密钥校验异常');
if (!(res.status === 403 && captured.length === 0)) fail++;

console.log(`\n=== ${fail === 0 ? '全部通过' : fail + ' 项失败'} ===`);
process.exit(fail ? 1 : 0);
