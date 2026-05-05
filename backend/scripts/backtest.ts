/**
 * Backtest script — runs the reorder-engine and anomaly-engine
 * against the demo seed data to validate their output.
 *
 * Usage: bun run scripts/backtest.ts
 */

import { generateSeedData } from "../src/lib/demo/index.ts";
import { analyzeAllItems } from "../src/lib/reorder-engine.ts";
import { analyzeMovements } from "../src/lib/anomaly-engine.ts";

const data = generateSeedData();

const divider = "━".repeat(64);

// ─── Reorder Engine Backtest ─────────────────────────────

console.log(`\n${divider}`);
console.log("  REORDER ENGINE — BACKTEST");
console.log(divider);
console.log(`  Items      : ${data.items.length}`);
console.log(`  Movements  : ${data.movements.length}`);
console.log(`  Suppliers  : ${data.suppliers.length}`);
console.log(divider);

const analyses = analyzeAllItems(
  data.items,
  data.movements,
  data.suppliers,
);

console.log(`\n  Results: ${analyses.length} item analyses`);
console.log(`${divider}`);

interface Summary {
  total: number;
  needsReorder: number;
  urgent: number;
  healthy: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
}

const summary: Summary = analyses.reduce<Summary>(
  (acc, a) => {
    acc.total++;
    if (a.suggestedReorderPoint !== a.currentReorderPoint) acc.needsReorder++;
    if (a.daysUntilStockout !== null && a.daysUntilStockout <= 7) acc.urgent++;
    if (a.currentStock > a.currentReorderPoint) acc.healthy++;
    if (a.confidence === "high") acc.highConfidence++;
    else if (a.confidence === "medium") acc.mediumConfidence++;
    else acc.lowConfidence++;
    return acc;
  },
  { total: 0, needsReorder: 0, urgent: 0, healthy: 0, highConfidence: 0, mediumConfidence: 0, lowConfidence: 0 },
);

console.log(`  Items needing reorder point update  : ${summary.needsReorder}`);
console.log(`  Urgent (stockout <= 7 days)         : ${summary.urgent}`);
console.log(`  Healthy (stock > reorder point)     : ${summary.healthy}`);
console.log(`  Confidence — High / Medium / Low    : ${summary.highConfidence} / ${summary.mediumConfidence} / ${summary.lowConfidence}`);

// Detailed urgent items
const urgent = analyses.filter((a) => a.daysUntilStockout !== null && a.daysUntilStockout <= 7);
if (urgent.length > 0) {
  console.log(`\n  ── Urgent Items ──`);
  for (const a of urgent) {
    console.log(
      `  ${a.sku.padEnd(12)} ${a.itemName.padEnd(24)} stock=${String(a.currentStock).padStart(3)}  reorder=${String(a.currentReorderPoint).padStart(3)}  daysUntilStockout=${String(a.daysUntilStockout).padStart(3)}  confidence=${a.confidence}`,
    );
  }
}

// ─── Anomaly Engine Backtest ─────────────────────────────

console.log(`\n${divider}`);
console.log("  ANOMALY ENGINE — BACKTEST");
console.log(divider);

const anomalies = analyzeMovements(data.movements);

console.log(`\n  Results: ${anomalies.length} anomalies detected`);
console.log(divider);

const byType = { quantity_spike: 0, frequent_adjustments: 0, unusual_timing: 0 };
const bySeverity = { critical: 0, warning: 0 };
for (const a of anomalies) {
  byType[a.type]++;
  bySeverity[a.severity]++;
}

console.log(`  Quantity spikes       : ${byType.quantity_spike}`);
console.log(`  Frequent adjustments  : ${byType.frequent_adjustments}`);
console.log(`  Unusual timing        : ${byType.unusual_timing}`);
console.log(`  Critical / Warning    : ${bySeverity.critical} / ${bySeverity.warning}`);

if (anomalies.length > 0) {
  console.log(`\n  ── Anomaly Details ──`);
  for (const a of anomalies) {
    const sev = a.severity === "critical" ? "CRIT" : "WARN";
    console.log(`  [${sev}] ${a.type.padEnd(22)} item=${a.itemId.padEnd(8)} ${a.title}`);
  }
}

console.log(`\n${divider}`);
console.log("  BACKTEST COMPLETE");
console.log(`${divider}\n`);
