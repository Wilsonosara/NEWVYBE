
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { ensureProfileForUser } from "../../../../utils/supabase/ensure-profile";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");

  // Only allow local paths so a callback cannot redirect users to an
  // untrusted external website.
  const next =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/app";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        try {
          await ensureProfileForUser(supabase, user);
        } catch (profileError) {
          console.error("Unable to create account profile:", profileError);
        }
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?message=confirmation_failed", requestUrl.origin)
  );
}
