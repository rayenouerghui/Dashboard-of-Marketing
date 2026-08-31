/**
 * Verify conversion stats against expected static data values.
 * Run: node scripts/verify-stats.mjs
 */
import {
  getGlobalConversionStats,
  getPhysicalConversionStats,
  getDigitalConversionStats,
  getPhysicalMemberRankings,
  getDigitalReferralRankings,
  getGlobalApprovalRankings,
} from "../src/data/stats.ts";

const global = getGlobalConversionStats();
const physical = getPhysicalConversionStats();
const digital = getDigitalConversionStats();

console.log("=== Conversion Rates ===");
console.log("Global:", global.approved, "/", global.total, "=", global.conversionRate.toFixed(2) + "%");
console.log("Physical:", physical.approved, "/", physical.total, "=", physical.conversionRate.toFixed(2) + "%");
console.log("Digital:", digital.approved, "/", digital.total, "=", digital.conversionRate.toFixed(2) + "%");

const assert = (cond, msg) => {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("PASS:", msg);
};

assert(global.total === 2154, "Global total = 1922 + 232");
assert(global.approved === 4, "Global approved = 3 + 1");
assert(physical.approved === 3, "Physical approved = 3");
assert(digital.approved === 1, "Digital approved = 1");

const physRank = getPhysicalMemberRankings().filter((r) => r.approvals > 0);
assert(physRank.length === 3, "3 physical members with approvals");
assert(physRank.every((r) => r.approvals === 1), "Each physical member has 1 approval");

const digRank = getDigitalReferralRankings().filter((r) => r.approvals > 0);
assert(digRank.length === 1, "1 digital referral with approvals");
assert(digRank[0].name === "Friend" && digRank[0].approvals === 1, "Friend has 1 digital approval");

const globalRank = getGlobalApprovalRankings();
assert(globalRank.length === 4, "4 total approved performers globally");
assert(globalRank[0].approvals === 1, "Top rank has 1 approval (tie)");

console.log("\n=== Top Physical Members ===");
physRank.forEach((r, i) => console.log(`${i + 1}. ${r.name}: ${r.approvals} approved`));

console.log("\n=== Top Digital Referrals ===");
digRank.forEach((r, i) => console.log(`${i + 1}. ${r.name}: ${r.approvals} approved`));

console.log("\nAll verification checks passed.");
