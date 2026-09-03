import "server-only";
import type { Opportunity } from "@/lib/dataUtils";

type RawExpaOpportunity = {
  id: string | number;
  title?: string | null;
  description?: string | null;
  organisation?: { name?: string | null } | null;
  city?: { name?: string | null; country?: string | null } | null;
  // home_lc.country is a plain string — most reliable country source
  home_lc?: { name?: string | null; country?: string | null } | null;
  location?: string | null;
  work_hours?: string | number | null;
  programme?: { short_name_display?: string | null; id?: string | number | null } | null;
  skills?: Array<{ constant_name?: string | null } | null> | null;
  role_info?: { learning_points?: string[] | string | null } | null;
  specifics_info?: {
    salary?: string | number | null;
    salary_currency?: { name?: string | null } | null;
    expected_work_schedule?: string | null;
  } | null;
  // EXPA returns strings: "provided" | "not_provided" | "covered" | "not_covered"
  logistics_info?: {
    accommodation_provided?: string | null;
    accommodation_covered?: string | null;
    accommodation_additional_info?: string | null;
    food_provided?: string | null;
    food_covered?: string | null;
    transportation_provided?: string | null;
    transportation_covered?: string | null;
    transportation_additional_info?: string | null;
    computer_provided?: string | null;
  } | null;
};

function toStringValue(value: unknown) {
  return value == null ? "" : String(value).trim();
}

function normalizeList(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) {
    return value.map((item) => toStringValue(item)).filter(Boolean);
  }
  return toStringValue(value)
    .split(/\r?\n|•|\u2022|-/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function bulletLinesFromDescription(description: string) {
  return description
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((line) => line.length > 3);
}

// EXPA logistics fields are strings: "provided" / "not_provided" / "covered" / "not_covered"
function isProvided(value?: string | null) {
  return value === "provided";
}

function isCovered(value?: string | null) {
  return value === "covered";
}

function formatLogisticsText(
  provided?: string | null,
  covered?: string | null,
  additionalInfo?: string | null
) {
  if (!isProvided(provided)) return "Not provided.";
  const base = isCovered(covered) ? "Provided and covered." : "Provided (not covered).";
  const extra = toStringValue(additionalInfo);
  return extra ? `${base} ${extra}` : base;
}

function formatComputerText(provided?: string | null) {
  return isProvided(provided) ? "Provided." : "Not provided.";
}

function formatSalary(salary?: string | number | null, currency?: string | null) {
  const salaryText = toStringValue(salary);
  const currencyText = toStringValue(currency);
  if (!salaryText && !currencyText) return "";
  if (!currencyText) return salaryText;
  if (!salaryText) return currencyText;
  return `${salaryText} ${currencyText}`;
}

// Maps programme short_name_display to our internal product key
function normalizeProduct(shortName?: string | null): string | undefined {
  const s = (shortName ?? "").trim().toLowerCase();
  if (s === "gta" || s === "ogta") return "GTa";
  if (s === "gte" || s === "ogte") return "GTe";
  if (s === "gv" || s === "ogv") return "GV";
  return undefined;
}

// Derives opportunity type label + color key from programme
function deriveOpportunityType(
  shortName?: string | null
): "professional" | "teaching" | "volunteering" | undefined {
  const s = (shortName ?? "").trim().toLowerCase();
  if (s === "gta" || s === "ogta") return "professional";
  if (s === "gte" || s === "ogte") return "teaching";
  if (s === "gv" || s === "ogv") return "volunteering";
  return undefined;
}

export function mapExpaOpportunityToOpportunity(raw: RawExpaOpportunity): Opportunity {
  const description = toStringValue(raw.description);
  const learningPoints = normalizeList(raw.role_info?.learning_points);
  const responsibilities = bulletLinesFromDescription(description).filter(
    (line) => !line.toLowerCase().includes("learning point")
  );

  const salary = formatSalary(
    raw.specifics_info?.salary,
    raw.specifics_info?.salary_currency?.name
  );

  // Country: prefer city.country, fall back to home_lc.country (both are plain strings)
  const countryValue =
    toStringValue(raw.city?.country) ||
    toStringValue(raw.home_lc?.country) ||
    "";

  const skills = (raw.skills ?? [])
    .map((skill) => toStringValue(skill?.constant_name))
    .filter(Boolean);

  const programmeShortName = toStringValue(raw.programme?.short_name_display) || null;
  const product = normalizeProduct(programmeShortName);
  const opportunityType = deriveOpportunityType(programmeShortName);

  return {
    id: `expa-${String(raw.id)}`,
    expaOpportunityId: String(raw.id),
    universityId: "",
    title: toStringValue(raw.title),
    organisation: toStringValue(raw.organisation?.name),
    location: toStringValue(raw.location || raw.city?.name),
    country: countryValue,
    description,
    // duration is not reliably provided by EXPA — left blank for admin to fill manually
    duration: "",
    date: "",
    product,
    opportunityType,
    skills,
    responsibilities,
    learningPoints,
    salary,
    workHours: toStringValue(raw.work_hours),
    expectedWorkSchedule: toStringValue(raw.specifics_info?.expected_work_schedule),
    accommodation: formatLogisticsText(
      raw.logistics_info?.accommodation_provided,
      raw.logistics_info?.accommodation_covered,
      raw.logistics_info?.accommodation_additional_info
    ),
    food: formatLogisticsText(
      raw.logistics_info?.food_provided,
      raw.logistics_info?.food_covered
    ),
    transportation: formatLogisticsText(
      raw.logistics_info?.transportation_provided,
      raw.logistics_info?.transportation_covered,
      raw.logistics_info?.transportation_additional_info
    ),
    computer: formatComputerText(raw.logistics_info?.computer_provided),
    benefits: [],
    requirements: [],
  };
}

export type { RawExpaOpportunity };
