/**
 * The "Physical Data" sheet is positional and stable.
 *
 * The header row is stale: it still says "🙋Member Name" in column 17 (Q) and a
 * questionnaire question in column 18 (R), while the actual live layout stores the
 * referral source in Q and the person who attracted the lead in R.
 * We therefore default to the positional layout instead of trusting the outdated header text.
 */
export const DEFAULT_NAME_COLUMN_INDEX = 18;
export const DEFAULT_REFERRAL_COLUMN_INDEX = 17;
export const SHEET_LAYOUT_VERSION = "physical-data-v1";
