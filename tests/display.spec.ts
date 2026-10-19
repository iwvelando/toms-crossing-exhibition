import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {inscriptionLayout, montageLayout} from '../src/display';
import type {Catalog} from '../src/types';
import type {Layout} from '../src/layout';

const catalog = JSON.parse(readFileSync(new URL('../public/collection/catalog.json', import.meta.url), 'utf8')) as Catalog;
const layout = JSON.parse(readFileSync(new URL('../public/collection/layout.json', import.meta.url), 'utf8')) as Layout;

test('Mortality lettering fits a wide, compact block with the complete wording', () => {
  const work = catalog.works.find(w => w.title === 'Mortality and the World of Appearances')!;
  const slot = layout.reservations.find(r => r.workId === work.id)!;
  const text = inscriptionLayout(work.wallText!, slot.displaySize?.[0]);
  expect(text.lines.join(' ')).toBe(work.wallText!.trim().replace(/\s+/g, ' '));
  expect(text.lines.length).toBeLessThanOrEqual(5);
  expect(text.width).toBeGreaterThanOrEqual(4);
  const topLine = (text.lines.length - 1) / 2 * text.lineHeight + .25 / 2;
  // The lamp is mounted above this same display height, including its lowest edge.
  expect(text.height / 2 + .48 - .12 - topLine).toBeGreaterThan(.25);
  const distance = Math.hypot(slot.camera[0] - slot.position[0], slot.camera[2] - slot.position[2]);
  const portraitViewWidth = 2 * distance * Math.tan(58 / 2 * Math.PI / 180) * 390 / 844;
  expect(text.width).toBeLessThan(portraitViewWidth * .9);
});

test('montage numbering has bottom backing margin and a separate title', () => {
  for (const work of catalog.works.filter(w => w.panels)) {
    const montage = montageLayout(work.panels!.length, work.presentation === 'variants');
    const lastRow = -(montage.rows - 1) / 2 * montage.rowHeight;
    const maximumImageHeight = work.presentation === 'variants' ? 1.5 : .5;
    const numberBottom = lastRow - maximumImageHeight / 2 - .08 - .09 / 2;
    const backingBottom = montage.backingY - montage.height / 2;
    expect(numberBottom - backingBottom, work.id).toBeGreaterThanOrEqual(.12);
    expect(montage.titleY + .18 / 2).toBeLessThan(backingBottom - .08);
  }
});

test('scene labels identify reconstructions consistently and use plain chamber numbers', async ({page}) => {
  await page.addInitScript(() => {
    const labels: string[] = [];
    Object.assign(window, {renderedLabels: labels});
    const draw = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(...args) {
      labels.push(args[0]);
      return draw.apply(this, args);
    };
  });
  await page.goto('/');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', {name: 'Enter the exhibition'}).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-modeled-objects', '28', {timeout:30000});
  const labels = await page.evaluate(() => (window as unknown as {renderedLabels: string[]}).renderedLabels);
  expect(labels).not.toContain('Object study · inspect');
  expect(labels.filter(text => text === 'Exhibition reconstruction').length).toBeGreaterThanOrEqual(28);
  expect(labels.filter(text => /^\d{2}\s+→$/.test(text))).toEqual([]);
  for (const number of ['02', '03', '04', '05', '06']) expect(labels).toContain(number);
});
