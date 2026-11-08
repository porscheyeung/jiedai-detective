import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { CASES, JUDGES, PASSAGES, RELATIONS, JUDGE_LABELS, splitTokens } from '../data.js';
const { chromium } = createRequire(pathToFileURL(process.env.PW_DIR + '/x.js'))('playwright-core');
const base = process.env.BASE ?? 'http://127.0.0.1:8124/';
const shots = process.env.SHOTS;
const browser = await chromium.launch({ executablePath: process.env.CHROME });
const checks = [];
const errors = [];
const ok = (c, n) => { if (!c) throw new Error('失敗：' + n); checks.push(n); };
async function fresh(viewport = { width: 1280, height: 900 }, opts = {}) {
  const ctx = await browser.newContext({ viewport, ...opts });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return { ctx, page };
}
const go = async (page, h) => { await page.goto(base + '#' + h); await page.waitForTimeout(150); };
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
const act = (page, a, i) => page.locator(`[data-act="${a}"]${i === undefined ? '' : `[data-i="${i}"]`}`).first().click();
const store = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('jiedai-detective-v1')));

const { page, ctx } = await fresh();
await go(page, 'home');
ok(await page.locator('.folder').count() === 6, '首頁六個案件夾');
ok(await page.locator('.hero .mascot').count() === 1, '首頁吉祥物');
if (shots) await page.screenshot({ path: shots + '/home-desktop.png' });

await go(page, 'u1');
await act(page, 'u1q', 0);
ok((await page.locator('.fb-bad').innerText()).includes('衣架'), '單元一錯答提示');
await act(page, 'u1q', 1);
const box = await page.locator('#lens-stage').boundingBox();
for (let k = 0; k < 25; k++) await page.mouse.move(box.x + 40 + k * 20, box.y + 120);
await page.waitForTimeout(700);
ok(await page.locator('.reveal-card').count() === 1, '放大鏡移動後揭示醫護人員');
if (shots) await page.screenshot({ path: shots + '/u1-desktop.png', fullPage: true });
await act(page, 'u1done');
await page.waitForTimeout(300);
ok(await page.locator('.stamp-pop').count() === 1, '破案印章動畫');
ok((await store(page)).units.u1, '單元一完成已保存');

await go(page, 'u2');
for (let i = 0; i < 3; i++) await act(page, 'u2step', i);
ok(await page.locator('[data-act="u2done"]').isDisabled(), '未翻卡不能完成單元二');
for (let i = 0; i < 4; i++) await act(page, 'u2flip', i);
await act(page, 'u2done');
ok((await store(page)).units.u2, '單元二完成');

await go(page, 'u3');
const relKeys = Object.keys(RELATIONS);
for (const [ci, c] of CASES.entries()) {
  const toks = splitTokens(c.tokens);
  if (ci === 0) { await act(page, 'u3tok', 0); ok((await page.locator('.fb-bad').count()) === 1, '點錯詞有提示'); }
  await act(page, 'u3tok', toks.indexOf(c.word));
  await act(page, 'u3target', c.target);
  await act(page, 'u3rel', relKeys.indexOf(c.relation));
  ok(await page.locator('.solved-card').count() === 1, '配對站第' + (ci + 1) + '案完成');
  if (ci === 3 && shots) await page.screenshot({ path: shots + '/u3-desktop.png', fullPage: true });
  if (ci < CASES.length - 1) await act(page, 'u3next');
}
await act(page, 'u3done');
ok((await store(page)).units.u3, '單元三完成');

await go(page, 'u4');
const jk = Object.keys(JUDGE_LABELS);
for (const [ji, j] of JUDGES.entries()) {
  await page.keyboard.press(String(jk.indexOf(j.answer) + 1));
  await act(page, 'u4r', j.reason);
  ok(await page.locator('.solved-card').count() === 1, '真假借代第' + (ji + 1) + '句（鍵盤作答）');
  if (ji < JUDGES.length - 1) await act(page, 'u4next');
}
await act(page, 'u4done');

await go(page, 'u5');
for (const [pi, p] of PASSAGES.entries()) {
  for (const t of p.targets) {
    const ti = splitTokens(p.sentences[t.at[0]]).indexOf(t.at[1]);
    await page.locator(`[data-act="u5tok"][data-s="${t.at[0]}"][data-i="${ti}"]`).click();
    await act(page, 'u5target', t.answer);
    if (pi === 0 && shots) await page.screenshot({ path: shots + '/u5-clue-desktop.png', fullPage: true });
    await act(page, 'u5clue', t.clues[0]);
    ok(await page.locator('.solved-card').count() === 1, '短文 ' + t.id + ' 破案');
    await act(page, 'u5cont');
  }
  if (pi < PASSAGES.length - 1) await act(page, 'u5nextp');
}
await act(page, 'u5done');

await go(page, 'u6');
await page.fill('#rw', '幾頂紅帽子正在派發物資。');
await act(page, 'u6check');
ok(await page.locator('.fb-saved').count() === 1, '改寫句收到中性回饋');
await act(page, 'u6q', 1);
await act(page, 'u6scene', 2);
await page.fill('#mine', '新學期，班上多了幾張新面孔。');
for (let i = 0; i < 4; i++) await page.locator(`[data-check="${i}"]`).check();
await act(page, 'u6save');
ok(await page.locator('.notes li').count() === 1, '造句放進筆記本');
await act(page, 'u6done');
const st = await store(page);
ok(Object.values(st.units).filter(Boolean).length === 6, '六個單元全部完成');
const done = Object.values(st.answers).filter((a) => a.done).length;
const first = Object.values(st.answers).filter((a) => a.done && a.first).length;
ok(done === 24 && first === 23, `24 題完成、首次答對 23 題（實際 ${done}/${first}）`);

await page.reload(); await page.waitForTimeout(200);
await go(page, 'report');
ok((await page.locator('.report-head').innerText()).includes('金牌偵探'), '重新整理後報告保留進度');
if (shots) await page.screenshot({ path: shots + '/report-desktop.png', fullPage: true });
await go(page, 'worksheet');
ok(await page.locator('.answers').count() === 1, '工作紙有獨立答案頁');
await ctx.close();

{
  const { page, ctx } = await fresh();
  await go(page, 'home');
  await page.evaluate(() => { const s = { prefs: { teacher: true, sound: false } }; localStorage.setItem('jiedai-detective-v1', JSON.stringify(s)); });
  await page.reload(); await page.waitForTimeout(200); await go(page, 'u4');
  ok(await page.locator('.teacher-box').count() === 1, '老師模式顯示揭曉工具');
  await page.locator('.teacher-box [data-act="u4reveal"]').click();
  ok(await page.locator('.solved-card').count() === 1, '老師揭曉答案');
  const s = await store(page);
  ok(s.answers.j1.revealed && s.answers.j1.first === false, '揭曉不計首次答對');
  await ctx.close();
}

for (const [name, vp, mobile] of [['mobile', { width: 390, height: 844 }, true], ['tablet', { width: 820, height: 1180 }, true], ['narrow', { width: 320, height: 640 }, true]]) {
  const { page, ctx } = await fresh(vp, { isMobile: mobile, hasTouch: true });
  for (const r of ['home', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'report', 'worksheet', 'guide']) {
    await go(page, r);
    if (r === 'u2') { for (let i = 0; i < 3; i++) await act(page, 'u2step', i); }
    if (r === 'u5') { const t = PASSAGES[0].targets[0]; await page.locator(`[data-act="u5tok"][data-s="${t.at[0]}"][data-i="${splitTokens(PASSAGES[0].sentences[t.at[0]]).indexOf(t.at[1])}"]`).tap(); }
    ok(!(await overflow(page)), `${name} ${r} 沒有橫向捲動`);
    if (shots && ['home', 'u3', 'u5', 'u2'].includes(r) && name !== 'narrow') await page.screenshot({ path: `${shots}/${r}-${name}.png`, fullPage: true });
  }
  const small = await page.evaluate(() => { location.hash = 'u4'; return new Promise((res) => setTimeout(() => res([...document.querySelectorAll('.opt,.dot,.btn')].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 40).length), 200)); });
  ok(small === 0, `${name} 按鈕高度最少 40px`);
  await ctx.close();
}

{
  const { page, ctx } = await fresh({ width: 390, height: 844 }, { isMobile: true, hasTouch: true });
  await go(page, 'u1'); await act(page, 'u1q', 1);
  const b = await page.locator('#lens-stage').boundingBox();
  for (let k = 0; k < 22; k++) await page.touchscreen.tap(b.x + 30 + k * 14, b.y + 100);
  await page.waitForTimeout(700);
  ok(await page.locator('.reveal-card').count() === 1, '手機觸控放大鏡可揭示');
  await ctx.close();
}

{
  const { page, ctx } = await fresh();
  await go(page, 'home');
  await page.evaluate(() => localStorage.setItem('jiedai-detective-v1', JSON.stringify({
    answers: { c1a: { done: true, first: true }, c3a: { done: true, first: true }, j7: { done: true, first: true }, p1b: { done: true, first: true } },
    units: { u1: true, u2: true, u3: true, u4: true, u5: true, u6: true },
    writing: { rewrite: '舊改寫保留', rewriteQ: 1, entries: [{ text: '我的舊筆記', scene: 'school', checks: [0] }] },
    prefs: { sound: false, teacher: true, calm: true }
  })));
  await page.reload(); await go(page, 'u6');
  const migrated = await store(page);
  ok(migrated.contentRevision === 2 && migrated.answers.c1a.done && !migrated.answers.c3a && !migrated.answers.j7 && !migrated.answers.p1b, '舊紀錄只重開替換題');
  ok(migrated.units.u1 && !migrated.units.u4 && migrated.writing.entries[0].text === '我的舊筆記' && migrated.writing.rewrite === '舊改寫保留', '修訂保留筆記、原改寫及未改紀錄');
  ok(migrated.prefs.teacher && migrated.writing.rewriteQ === null, '保留設定並重開新情境追問');
  await page.fill('#rw', '紅帽子放在桌上。'); await act(page, 'u6check');
  const message = await page.locator('.fb-saved').innerText();
  ok(message.includes('不自動判分') && !message.includes('這就是借代'), '包含關鍵字的普通描述不會被自動判為借代');
  await go(page, 'u4'); await act(page, 'u4go', 6); await act(page, 'u4j', 0);
  ok((await page.locator('.fb-bad').innerText()).includes('仍指花'), '擬人誤選借代有針對性解說');
  await act(page, 'u4j', 3); await page.mouse.move(0, 0); await page.waitForTimeout(300); await act(page, 'u4r', 0);
  ok((await page.locator('.solved-card').innerText()).includes('是擬人'), '擬人題正確作答及解說');
  await go(page, 'worksheet');
  ok((await page.locator('.answers').innerText()).includes('擬人') && !(await page.locator('.answers').innerText()).includes('地方代'), '工作紙答案同步更新');
  await go(page, 'guide');
  ok(await page.locator('a[href*="Pri_Chin_Lang_LO_2023.pdf"]').count() === 1, '教師說明附官方課程來源');
  await ctx.close();
}

ok(errors.length === 0, '沒有主控台錯誤 ' + errors.join(' | '));
await browser.close();
console.log(checks.length + ' 項瀏覽器檢查通過');
checks.forEach((c) => console.log('✓ ' + c));
