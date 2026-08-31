export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";

export default function LeadsRedirectPage() {
  redirect("/dashboard/digital-attraction");
}
