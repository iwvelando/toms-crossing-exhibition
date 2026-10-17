import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkDist } from "./check-dist.mjs";

test("distribution validation rejects missing releases and private handoffs", async () => {
  const root = await mkdtemp(join(tmpdir(), "exhibition-dist-"));
  try {
    assert.throws(() => checkDist(root), /Missing/);
    // A real build is the positive fixture, so the check guards what ships.
    checkDist(new URL("../dist/", import.meta.url));
    await mkdir(join(root, ".local"));
    await writeFile(join(root, ".local", "handoff.txt"), "private");
    assert.throws(() => checkDist(root), /Private/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
