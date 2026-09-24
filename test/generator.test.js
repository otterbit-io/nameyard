import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateNames, tokenize, toAscii, join, attachEnding, blends, twists, countSyllables,
} from '../dist/assets/js/generator.js';

test('input is cleaned and split into up to three words', () => {
  assert.deepEqual(tokenize('  Coffee  Shop '), ['coffee', 'shop']);
  assert.deepEqual(tokenize('a b c d e f'), []); // single letters are dropped
  assert.deepEqual(tokenize('one two three four'), ['one', 'two', 'three']);
  assert.deepEqual(tokenize('<svg/onload=alert(1)>'), ['svg', 'onloadalert1']);
  assert.equal(toAscii('Über'), 'ueber');
  assert.equal(toAscii('Café'), 'cafe');
});

test('no duplicate names', () => {
  for (const input of ['coffee', 'coffee shop', 'sky', 'maker', 'über']) {
    const names = generateNames(input).names.map((n) => n.name.toLowerCase());
    assert.equal(new Set(names).size, names.length, input);
  }
});

test('several words are combined with each other', () => {
  const names = generateNames('coffee shop').names.map((n) => n.name);
  assert.ok(names.includes('Coffeeshop'));
  assert.ok(names.includes('Shopcoffee'));
});

test('well-known brands are never suggested', () => {
  const names = generateNames('shop sound cloud').names.map((n) => n.name.toLowerCase());
  assert.ok(!names.includes('shopify'));
  assert.ok(!names.includes('soundcloud'));
});

test('the input word itself is not a suggestion', () => {
  const names = generateNames('coffee').names.map((n) => n.name.toLowerCase());
  assert.ok(!names.includes('coffee'));
});

test('names are ASCII, consistently capitalised and never contain markup', () => {
  for (const { name } of generateNames('<b>Café</b> Über').names) {
    assert.match(name, /^[A-Z][a-z0-9]+$/);
  }
});

test('filters are respected', () => {
  const short = generateNames('coffee shop', { maxLength: 7 }).names;
  assert.ok(short.length > 0 && short.every((n) => n.name.length <= 7));
  const few = generateNames('coffee shop', { maxSyllables: 2 }).names;
  assert.ok(few.every((n) => n.syllables <= 2));
  const combos = generateNames('coffee shop', { styles: ['combo'] }).names;
  assert.ok(combos.length > 0 && combos.every((n) => n.kind === 'combo'));
  assert.equal(generateNames('coffee', { styles: [] }).names.length, 0);
});

test('same seed gives the same order, another seed shuffles', () => {
  const a = generateNames('coffee', { seed: 1 }).names.map((n) => n.name);
  const b = generateNames('coffee', { seed: 1 }).names.map((n) => n.name);
  const c = generateNames('coffee', { seed: 2 }).names.map((n) => n.name);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.deepEqual([...a].sort(), [...c].sort());
});

test('industry adds its own words', () => {
  const names = generateNames('coffee', { industry: 'food' }).names.map((n) => n.name);
  assert.ok(names.includes('Coffeekitchen') || names.includes('Coffeebakery'));
});

test('building blocks', () => {
  assert.equal(join('hyper', 'rise'), 'hyperise');
  assert.equal(attachEnding('coffee', 'io'), 'coffio');
  assert.equal(attachEnding('sky', 'ify'), 'skify');
  assert.equal(attachEnding('maker', 'er'), null);
  assert.equal(attachEnding('cool', 'ly'), null);
  assert.deepEqual(blends('cloud', 'sound'), ['clound']);
  assert.ok(twists('maker').includes('makr'));
  assert.equal(countSyllables('coffee'), 2);
  assert.equal(countSyllables('space'), 1);
  assert.equal(countSyllables('shopable'), 3);
});
