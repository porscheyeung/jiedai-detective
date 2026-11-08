import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES, JUDGES, PASSAGES, SCORED, RELATIONS, JUDGE_LABELS, splitTokens } from '../data.js';

test('共有 24 道計分題，編號不重複', () => {
  assert.equal(SCORED.length, 24);
  assert.equal(new Set(SCORED.map((q) => q.id)).size, 24);
  assert.equal(SCORED.filter((q) => q.skill === 'target').length, 6);
  assert.equal(SCORED.filter((q) => q.skill === 'relation').length, 6);
  assert.equal(SCORED.filter((q) => q.skill === 'judge').length, 8);
  assert.equal(SCORED.filter((q) => q.skill === 'passage').length, 4);
});

test('配對站：借代詞只出現一次，答案及關係有效，錯誤選項都有提示', () => {
  const expect = { c1: ['人手', 'part'], c2: ['新面孔', 'part'], c3: ['全校', 'place'], c4: ['紅衣們', 'feature'], c5: ['金庸', 'author'], c6: ['千帆', 'part'] };
  for (const c of CASES) {
    const toks = splitTokens(c.tokens);
    assert.equal(toks.filter((t) => t === c.word).length, 1, c.id);
    assert.deepEqual([c.word, c.relation], expect[c.id]);
    assert.ok(RELATIONS[c.relation]);
    assert.ok(c.target >= 0 && c.target < c.targets.length);
    c.targets.forEach((_, i) => { if (i !== c.target) assert.ok(c.targetHints[i].length > 5, c.id + i); });
  }
});

test('真假借代：三類都有，錯誤類別都有提示', () => {
  const expect = { j1: 'putong', j2: 'jiedai', j3: 'biyu', j4: 'biyu', j5: 'jiedai', j6: 'putong', j7: 'jiedai', j8: 'putong' };
  for (const j of JUDGES) {
    assert.equal(j.answer, expect[j.id]);
    for (const k of Object.keys(JUDGE_LABELS)) if (k !== j.answer) assert.ok(j.hints[k], j.id + k);
    assert.ok(j.reason < j.reasons.length);
  }
  assert.ok(JUDGES.some((j) => j.answer === 'biyu' && !j.sentence.includes('像')), '有不含「像」的比喻');
});

test('短文：目標詞位置正確、證據句存在、字數合理', () => {
  for (const p of PASSAGES) {
    const len = p.sentences.join('').replace(/\|/g, '').length;
    assert.ok(len >= 70 && len <= 130, p.id + ' 字數 ' + len);
    for (const t of p.targets) {
      const toks = splitTokens(p.sentences[t.at[0]]);
      assert.equal(toks.filter((x) => x === t.at[1]).length, 1, t.id);
      t.clues.forEach((c) => assert.ok(c >= 0 && c < p.sentences.length && c !== t.at[0]));
      assert.ok(t.answer < t.options.length);
    }
  }
});
