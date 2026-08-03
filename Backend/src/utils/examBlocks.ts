// Split n students into contiguous exam blocks, target `size` each.
//
// Rule (per the exam spec): never leave a block below `min` (15). If `size` (20)
// does not divide evenly, the remainder is absorbed by growing blocks toward
// `max` (size + 4 = 24) instead of creating a tiny trailing block. Block sizes
// stay within 1 of each other and are contiguous, so enrollment order is kept.
//
// A block may exceed `max` only when n cannot otherwise avoid a sub-`min` block
// (e.g. n = 25 → [25], since [13,12] would break the 15 floor).
export function splitBlockSizes(n: number, size: number, min = 15, max = size + 4): number[] {
  if (n <= 0) return [];
  if (n <= max) return [n]; // single block, up to `max`
  let k = Math.max(1, Math.round(n / size));
  while (Math.ceil(n / k) > max) k++; // per-block too big → split into more blocks
  while (k > 1 && Math.floor(n / k) < min) k--; // per-block too small → fewer blocks
  const base = Math.floor(n / k);
  const r = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < r ? 1 : 0)); // bigger blocks first
}

// ── runnable self-check: `tsx src/utils/examBlocks.ts` ──
function demo() {
  const assert = (c: boolean, m: string) => { if (!c) throw new Error("FAIL: " + m); };
  const cases: [number, number][] = [[20, 20], [24, 20], [25, 20], [44, 20], [60, 20], [64, 20], [70, 20], [17, 20], [14, 20], [0, 20], [30, 20], [45, 20]];
  for (const [n, size] of cases) {
    const s = splitBlockSizes(n, size);
    assert(s.reduce((a, b) => a + b, 0) === n, `sum ${n}`);
    if (s.length > 1) {
      assert(Math.min(...s) >= 15, `min15 n=${n} → ${s}`);
      assert(Math.max(...s) <= size + 4, `max n=${n} → ${s}`);
      assert(Math.max(...s) - Math.min(...s) <= 1, `balanced n=${n} → ${s}`);
    }
  }
  assert(JSON.stringify(splitBlockSizes(44, 20)) === "[22,22]", "44→[22,22]");
  assert(JSON.stringify(splitBlockSizes(64, 20)) === "[22,21,21]", "64→[22,21,21]");
  assert(JSON.stringify(splitBlockSizes(25, 20)) === "[25]", "25→[25]");
  assert(JSON.stringify(splitBlockSizes(30, 20)) === "[15,15]", "30→[15,15]");
  console.log("examBlocks self-check OK");
}
if (process.argv[1] && process.argv[1].endsWith("examBlocks.ts")) demo();
