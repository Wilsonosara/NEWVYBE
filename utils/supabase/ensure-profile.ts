import type { SupabaseClient, User } from "@supabase/supabase-js";

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
};

const DEFAULT_BIO =
  "Building connections, sharing ideas, and exploring every world. 🌍";

export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User
): Promise<ProfileRow> {
  const { data: existingProfile, error: lookupError } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existingProfile) return existingProfile as ProfileRow;

  const metadataName =
    user.user_metadata?.full_name || user.user_metadata?.name || "";
  const displayName =
    (typeof metadataName === "string" ? metadataName.trim() : "") ||
    user.email?.split("@")[0] ||
    "VYBE member";
  const rawUsername = displayName.toLowerCase().replace(/\s+/g, ".");
  const baseUsername = rawUsername
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, ".")
    .replace(/[._-]{2,}/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 30);
  const username = baseUsername || `member-${user.id.slice(0, 8)}`;

  const profileValues = {
    id: user.id,
    username,
    display_name: displayName,
    bio: DEFAULT_BIO,
    avatar_url: null,
    updated_at: new Date().toISOString(),
  };

  const { data: createdProfile, error: createError } = await supabase
    .from("profiles")
    .insert(profileValues)
    .select("id, username, display_name, bio, avatar_url")
    .single();

  if (!createError && createdProfile) return createdProfile as ProfileRow;

  // If another request created this profile at the same time, use that row.
  const { data: racedProfile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (racedProfile) return racedProfile as ProfileRow;

  if (createError?.code === "23505") {
    const uniqueUsername = `${username.slice(0, 22)}-${user.id.slice(0, 7)}`;
    const { data: retryProfile, error: retryError } = await supabase
      .from("profiles")
      .insert({ ...profileValues, username: uniqueUsername })
      .select("id, username, display_name, bio, avatar_url")
      .single();

    if (!retryError && retryProfile) return retryProfile as ProfileRow;
    throw retryError || createError;
  }

  throw createError || new Error("Unable to create the account profile.");
}
