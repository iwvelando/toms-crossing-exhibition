import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { canStand, contains, type Layout } from '../src/layout';
import type { Catalog } from '../src/types';

const layout = JSON.parse(readFileSync(new URL('../public/collection/layout.json', import.meta.url), 'utf8')) as Layout;
const catalog = JSON.parse(readFileSync(new URL('../public/collection/catalog.json', import.meta.url), 'utf8')) as Catalog;
const slot = (id: string) => layout.reservations.find(r => r.workId === id)!;

test('scene interpretations join their narrative days while recollections and later exhibitions stay distinct', () => {
  expect(slot('study-12-gray-as-a-ghost').room).toBe('chamber-2');
  expect(slot('study-18-ash-and-tom-together-again').room).toBe('chamber-3');
  expect(slot('study-260-the-hands-and-the-step').room).toBe('chamber-4');
  for (const id of ['where-the-words-were', 'navidad-memories', 'wings-were-always-there',
    'study-24-the-weight-of-goodbyes', 'study-25-the-lives-they-might-have-made',
    'study-258-the-sermon-and-the-mothers', 'study-259-standing-their-ground',
    'study-261-hatch-makes-himself-small', 'study-262-the-crossing-is-two-posts',
    'study-263-the-weight-of-choosing-the-colt', 'study-264-sadness-thins-to-watercolor',
    'study-264b-landry-present-by-her-absence', 'study-278-a-dollar-kept-for-him',
    'study-279-the-witness-they-chose', 'study-280-a-field-without-a-chance',
    'study-281-no-enemy-in-his-hand', 'study-282-the-father-behind-him',
    'study-283-one-more-minute-at-the-crossing', 'study-284-the-son-returning',
    'study-285-where-the-glass-lets-light-in', 'study-286-the-last-run-through-the-freeze']) {
    expect(slot(id).room, id).toBe('chamber-5');
  }
  expect(slot('study-257-what-the-fire-leaves-unsaid').room).toBe('afterimages');
  expect(slot('study-217-rear-view-digital-return').room).toBe('afterimages');
  expect(slot('study-198-recollection-hatch-on-the-bed').room).toBe('recollections');
  for (const work of catalog.works) expect(work.placement?.room, work.id).toBe(slot(work.id).room);
});

test('the after chamber contains the closing interpretations and keeps the discovery pair adjacent', () => {
  const room = layout.rooms.find(r => r.id === 'afterwards');
  expect(room?.title).toBe('Some of what comes after');
  expect(layout.reservations.filter(r => r.room === 'afterwards' && r.workId)).toHaveLength(10);
  const discovery = slot('study-288-there-it-was');
  const evidence = slot('study-289-twenty-dollars-evidence-copy');
  expect(discovery.room).toBe('afterwards');
  expect(evidence.room).toBe(discovery.room);
  expect(evidence.angle).toBe(discovery.angle);
  expect(evidence.position[2]).toBe(discovery.position[2]);
  expect(Math.hypot(evidence.position[0] - discovery.position[0], evidence.position[2] - discovery.position[2])).toBeLessThanOrEqual(5);
  for (const reservation of layout.reservations.filter(r => r.room === 'afterwards'))
    expect(contains(room!.bounds, reservation.position[0], reservation.position[2])).toBe(true);
});

test('Sunday leads directly into the after chamber along the counterclockwise route', () => {
  const sunday = layout.rooms.find(r => r.id === 'chamber-5')!;
  const after = layout.rooms.find(r => r.id === 'afterwards');
  expect(after).toBeDefined();
  // Follow the open southern doorway from Sunday's western bay into the next room.
  for (let z = sunday.bounds[3] - 2; z <= after!.bounds[2] + 2; z += .25)
    expect(canStand(layout, after!.spawn[0], z, true), `doorway at ${z}`).toBe(true);
  const order = layout.rooms.map(r => r.id);
  expect(order.indexOf('afterwards')).toBe(order.indexOf('chamber-5') + 1);
});

test('the two corrected portraits are labeled as exhibition reconstructions', () => {
  for (const id of ['study-33-black-hat-a-generated-variation', 'study-76-portrait-on-newsprint-a-generated-departure']) {
    const work = catalog.works.find(w => w.id === id)!;
    expect(work.collection, id).toBe('exhibition');
    expect(work.title).not.toMatch(/Generated (Study|Variation|Departure)/);
    expect(work.attribution).not.toMatch(/Reader interpretation/);
  }
});

test('Chamber 4 uses at most two accessible display tiers beneath a lower roof', () => {
  for (const reservation of layout.reservations.filter(r => r.room === 'chamber-4'))
    expect(reservation.position[1], reservation.id).toBeLessThanOrEqual(5.8);
  expect(layout.floors.find(f => f.id === 'chamber-4')!.ceilingHeight).toBeLessThanOrEqual(8);
});

test('closing-chapter groups occupy outer walls without internal partitions', () => {
  expect(layout.walls.filter(w => w.room === 'afterwards' && w.partition)).toEqual([]);
  const room = layout.rooms.find(r => r.id === 'afterwards')!;
  const faces = new Set<string>();
  for (const r of layout.reservations.filter(r => r.room === room.id && r.workId)) {
    const [x,,z] = r.position;
    const face = Math.abs(x-room.bounds[0])<.3 ? 'west' : Math.abs(x-room.bounds[1])<.3 ? 'east'
      : Math.abs(z-room.bounds[2])<.3 ? 'north' : Math.abs(z-room.bounds[3])<.3 ? 'south' : undefined;
    expect(face, r.workId).toBeDefined();
    faces.add(face!);
  }
  expect(faces.size).toBe(4);
});

test('the finished exhibition has no empty side collection or dead-end side corridor', () => {
  expect(layout.rooms.some(r => r.id === 'ancillary')).toBe(false);
  expect(layout.floors.some(f => ['ancillary', 'passage-side'].includes(f.id))).toBe(false);
  expect(layout.walls.some(w => ['ancillary', 'passage-side'].includes(w.room))).toBe(false);
  expect(layout.reservations.some(r => r.room === 'ancillary')).toBe(false);
});
