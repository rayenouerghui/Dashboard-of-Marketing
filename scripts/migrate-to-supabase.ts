/**
 * Migration script: Fetch all data from Google Sheets and migrate to Supabase
 * Usage: npx tsx scripts/migrate-to-supabase.ts
 */

import { fetchOpportunitySubmissions } from "../src/lib/googleSheetsServer";
import { getSupabaseAdminClient } from "../src/lib/supabase";
import type { SubmissionRecord } from "../src/lib/submissionsStore";

async function migrate() {
  console.log("🚀 Starting migration from Google Sheets to Supabase...\n");

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    console.error("❌ Supabase admin client not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.");
    process.exit(1);
  }

  // Check if table exists
  console.log("📋 Checking submissions table...");
  const { data: tableCheck, error: tableError } = await supabase
    .from("submissions")
    .select("id")
    .limit(1);
  
  if (tableError) {
    console.error("❌ Submissions table doesn't exist or is not accessible:", tableError.message);
    console.log("Please run the SQL migration first: supabase/migrations/001_create_submissions_table.sql");
    process.exit(1);
  }
  
  console.log("✅ Submissions table exists\n");

  // Fetch all submissions from Google Sheets
  console.log("📥 Fetching submissions from Google Sheets...");
  const ogvSubmissions = await fetchOpportunitySubmissions("OGV");
  const ogtSubmissions = await fetchOpportunitySubmissions("OGT");
  
  const allSubmissions = [...ogvSubmissions, ...ogtSubmissions];
  console.log(`✅ Found ${allSubmissions.length} submissions total (${ogvSubmissions.length} OGV, ${ogtSubmissions.length} OGT)\n`);

  if (allSubmissions.length === 0) {
    console.log("⚠️  No submissions found in Google Sheets. Nothing to migrate.");
    return;
  }

  // Insert into Supabase
  console.log("💾 Inserting into Supabase...");
  let successCount = 0;
  let errorCount = 0;

  for (const submission of allSubmissions) {
    const { error } = await supabase.from("submissions").upsert({
      id: submission.id,
      submitted_at: submission.submittedAt,
      sheet: submission.sheet,
      product: submission.product,
      opportunity_id: submission.opportunityId,
      opportunity_title: submission.opportunityTitle,
      university_id: submission.universityId,
      university_name: submission.universityName,
      country: submission.country,
      duration: submission.duration,
      opportunity_date: submission.opportunityDate,
      ep_name: submission.epName,
      condition: submission.condition,
      note: submission.note,
      source: submission.source,
    }, { onConflict: "id" });

    if (error) {
      console.error(`❌ Error inserting submission ${submission.id}:`, error.message);
      errorCount++;
    } else {
      successCount++;
    }
  }

  console.log(`\n✅ Migration complete!`);
  console.log(`   - Successfully migrated: ${successCount}`);
  console.log(`   - Errors: ${errorCount}`);
  console.log(`   - Total processed: ${allSubmissions.length}`);
}

migrate().catch(console.error);
