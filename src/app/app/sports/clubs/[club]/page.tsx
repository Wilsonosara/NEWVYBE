
"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../../../../../utils/supabase/client";
import { usePosts } from "../../../PostContext";
import ClubNews from "./ClubNews";
const FOLLOWED_CLUBS_KEY = "project-one-followed-clubs";

type Fixture = {
  id: number | string;
  date: string;
  status: string;
  minute?: number | null;
  competition?: string;
  competitionCode?: string;
  competitionLogo?: string;
  home?: string;
  homeName: string;
  homeLogo?: string;
  away?: string;
  awayName: string;
  awayLogo?: string;
  homeScore: number | null;
  awayScore: number | null;
  venue?: string;
  matchday?: number;
  stage?: string;
};

type FixturesResponse = {
  matches?: Fixture[];
  error?: string;
  message?: string;
};

type ClubFollowRow = {
  user_id: string;
  club_slug: string;
};

const leagueCompetitionCodes: Record<string, string> = {
  "Premier League": "PL",
  "La Liga": "PD",
  "Serie A": "SA",
  Bundesliga: "BL1",
  "Ligue 1": "FL1",
};

const clubSlugAliases: Record<string, string> = {
  "atletico-madrid": "atletico",
  "bayern-munich": "bayern",
  enyimba: "enyimba-fc",
};

function canonicalClubSlug(slug: string) {
  return clubSlugAliases[slug] ?? slug;
}

function normalizeTeamName(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(fc|cf|afc|sc)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function formatFixtureDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date to be confirmed";
  }

  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fixtureStatusLabel(fixture: Fixture) {
  const status = fixture.status.toUpperCase();

  if (["IN_PLAY", "LIVE"].includes(status)) {
    return fixture.minute ? `LIVE · ${fixture.minute}′` : "LIVE";
  }

  if (status === "PAUSED") return "HALF-TIME";
  if (status === "FINISHED") return "FULL-TIME";
  if (status === "POSTPONED") return "POSTPONED";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "SUSPENDED") return "SUSPENDED";
  if (status === "AWARDED") return "AWARDED";

  return formatFixtureDate(fixture.date);
}

function isFixtureLive(fixture: Fixture) {
  return ["IN_PLAY", "PAUSED", "LIVE"].includes(
    fixture.status.toUpperCase()
  );
}

function isFixtureFinished(fixture: Fixture) {
  return [
    "FINISHED",
    "AET",
    "PENALTY_SHOOTOUT",
    "AWARDED",
  ].includes(fixture.status.toUpperCase());
}

function isFixtureUpcoming(fixture: Fixture) {
  return ["TIMED", "SCHEDULED"].includes(
    fixture.status.toUpperCase()
  );
}

type MatchFilter = "All" | "Live" | "Upcoming" | "Finished";

const matchFilters: MatchFilter[] = [
  "All",
  "Live",
  "Upcoming",
  "Finished",
];

type Club = {
  name: string;
  nickname: string;
  icon: string;
  color: string;
  logo?: string;
  description: string;
  league: string;
  aliases?: string[];
};

const makeClub = (
  name: string,
  nickname: string,
  league: string,
  icon = "⚽",
  color = "bg-gray-800",
  logo?: string,
  aliases: string[] = []
): Club => ({
  name,
  nickname,
  league,
  icon,
  color,
  logo,
  aliases,
  description: `Welcome to the ${name} fan community. Follow club conversations, share match reactions, and connect with other ${nickname} fans.`,
});

const clubs: Record<string, Club> = {
  arsenal: {
    ...makeClub(
      "Arsenal",
      "Gunners",
      "Premier League",
      "🔴",
      "bg-red-600",
      "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg"
    ),
    description:
      "Welcome to the Arsenal fan community. Follow the latest conversations, matches and banter.",
  },

  chelsea: {
    ...makeClub(
      "Chelsea",
      "Blues",
      "Premier League",
      "🔵",
      "bg-blue-700",
      "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg"
    ),
    description:
      "Everything Chelsea. Match discussions, fan opinions, news and football banter.",
  },

  liverpool: {
    ...makeClub(
      "Liverpool",
      "Reds",
      "Premier League",
      "🔴",
      "bg-red-700",
      "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg"
    ),
    description:
      "Join Liverpool fans and follow everything happening around the Reds.",
  },

  "man-city": makeClub(
    "Man City",
    "Citizens",
    "Premier League",
    "🔵",
    "bg-sky-600",
    "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg",
    ["Manchester City"]
  ),

  "real-madrid": makeClub(
    "Real Madrid",
    "Madridistas",
    "La Liga",
    "⚪",
    "bg-gray-700",
    "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg"
  ),

  barcelona: makeClub(
    "Barcelona",
    "Culers",
    "La Liga",
    "🔵",
    "bg-blue-600",
    "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg"
  ),

  "manchester-united": makeClub(
    "Manchester United",
    "Red Devils",
    "Premier League",
    "🔴",
    "bg-red-700",
    "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg"
  ),

  "tottenham-hotspur": makeClub(
    "Tottenham Hotspur",
    "Spurs",
    "Premier League",
    "⚪",
    "bg-gray-800"
  ),

  "newcastle-united": makeClub(
    "Newcastle United",
    "Magpies",
    "Premier League",
    "⚫",
    "bg-gray-800"
  ),

  "aston-villa": makeClub(
    "Aston Villa",
    "Villans",
    "Premier League",
    "🟣",
    "bg-purple-800"
  ),

  brighton: makeClub(
    "Brighton",
    "Seagulls",
    "Premier League",
    "🔵",
    "bg-sky-700"
  ),

  "west-ham-united": makeClub(
    "West Ham United",
    "Hammers",
    "Premier League",
    "🍷",
    "bg-rose-900"
  ),

  everton: makeClub(
    "Everton",
    "Toffees",
    "Premier League",
    "🔵",
    "bg-blue-800"
  ),

  "crystal-palace": makeClub(
    "Crystal Palace",
    "Eagles",
    "Premier League",
    "🔴",
    "bg-red-800"
  ),

  "nottingham-forest": makeClub(
    "Nottingham Forest",
    "Forest",
    "Premier League",
    "🌳",
    "bg-red-700"
  ),

  brentford: makeClub(
    "Brentford",
    "Bees",
    "Premier League",
    "🐝",
    "bg-red-700"
  ),

  fulham: makeClub(
    "Fulham",
    "Cottagers",
    "Premier League",
    "⚪",
    "bg-gray-700"
  ),

  wolves: makeClub(
    "Wolves",
    "Wanderers",
    "Premier League",
    "🟠",
    "bg-amber-600"
  ),

  bournemouth: makeClub(
    "Bournemouth",
    "Cherries",
    "Premier League",
    "🍒",
    "bg-red-800"
  ),

  atletico: makeClub(
    "Atletico Madrid",
    "Atleti",
    "La Liga",
    "🔴",
    "bg-red-700",
    undefined,
    ["Atletico Madrid"]
  ),

  sevilla: makeClub(
    "Sevilla",
    "Sevillistas",
    "La Liga",
    "⚪",
    "bg-gray-700"
  ),

  valencia: makeClub(
    "Valencia",
    "Los Che",
    "La Liga",
    "🦇",
    "bg-orange-700"
  ),

  "real-betis": makeClub(
    "Real Betis",
    "Béticos",
    "La Liga",
    "🟢",
    "bg-emerald-800"
  ),

  "inter-milan": makeClub(
    "Inter Milan",
    "Nerazzurri",
    "Serie A",
    "🔵",
    "bg-blue-800"
  ),

  "ac-milan": makeClub(
    "AC Milan",
    "Rossoneri",
    "Serie A",
    "🔴",
    "bg-red-800"
  ),

  juventus: makeClub(
    "Juventus",
    "Bianconeri",
    "Serie A",
    "⚫",
    "bg-gray-900"
  ),

  napoli: makeClub(
    "Napoli",
    "Partenopei",
    "Serie A",
    "🔵",
    "bg-sky-600"
  ),

  "as-roma": makeClub(
    "AS Roma",
    "Giallorossi",
    "Serie A",
    "🟠",
    "bg-orange-800"
  ),

  bayern: makeClub(
    "Bayern Munich",
    "Bavarians",
    "Bundesliga",
    "🔴",
    "bg-red-700",
    undefined,
    ["Bayern Munich"]
  ),

  "borussia-dortmund": makeClub(
    "Borussia Dortmund",
    "BVB",
    "Bundesliga",
    "🟡",
    "bg-yellow-600"
  ),

  "bayer-leverkusen": makeClub(
    "Bayer Leverkusen",
    "Die Werkself",
    "Bundesliga",
    "🔴",
    "bg-red-800"
  ),

  "rb-leipzig": makeClub(
    "RB Leipzig",
    "Die Roten Bullen",
    "Bundesliga",
    "🔴",
    "bg-red-700"
  ),

  psg: makeClub(
    "PSG",
    "Parisian Fans",
    "Ligue 1",
    "🔵",
    "bg-blue-900",
    undefined,
    ["Paris Saint-Germain"]
  ),

  marseille: makeClub(
    "Marseille",
    "Les Phocéens",
    "Ligue 1",
    "🔵",
    "bg-sky-700"
  ),

  lyon: makeClub(
    "Lyon",
    "Les Gones",
    "Ligue 1",
    "🔴",
    "bg-red-800"
  ),

  "enyimba-fc": makeClub(
    "Enyimba FC",
    "People's Elephant",
    "Nigeria",
    "🔵",
    "bg-blue-800",
    undefined,
    ["Enyimba"]
  ),

  "rangers-international": makeClub(
    "Rangers International",
    "Flying Antelopes",
    "Nigeria",
    "🟢",
    "bg-emerald-800"
  ),

  "remo-stars": makeClub(
    "Remo Stars",
    "Sky Blue Stars",
    "Nigeria",
    "🔵",
    "bg-sky-700"
  ),

  "rivers-united": makeClub(
    "Rivers United",
    "Pride of Rivers",
    "Nigeria",
    "🔵",
    "bg-blue-800"
  ),

  "kano-pillars": makeClub(
    "Kano Pillars",
    "Sai Masu Gida",
    "Nigeria",
    "🟡",
    "bg-yellow-700"
  ),
};

function getSavedFollowSlugs() {
  try {
    const saved = localStorage.getItem(FOLLOWED_CLUBS_KEY);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);

    if (
      !Array.isArray(parsed) ||
      !parsed.every((item) => typeof item === "string")
    ) {
      return [];
    }

    return Array.from(
      new Set(parsed.map((slug) => canonicalClubSlug(slug)))
    );
  } catch {
    return [];
  }
}

function saveFollowSlugs(slugs: string[]) {
  try {
    localStorage.setItem(
      FOLLOWED_CLUBS_KEY,
      JSON.stringify(Array.from(new Set(slugs)))
    );
  } catch {
    // The signed-in user's database records remain the source of truth.
  }
}

export default function ClubPage() {
  const params = useParams();
  const clubSlug = String(params.club ?? "");
  const clubKey = canonicalClubSlug(clubSlug);

  const { posts, likePost } = usePosts();
  const supabase = useMemo(() => createClient(), []);

  const club = clubs[clubKey];

  const [followedClubs, setFollowedClubs] = useState<string[]>([]);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followerCountLoading, setFollowerCountLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [userId, setUserId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(true);
  const [followSaving, setFollowSaving] = useState(false);
  const [followError, setFollowError] = useState("");
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("All");
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [fixturesRefreshing, setFixturesRefreshing] = useState(false);
  const [fixturesError, setFixturesError] = useState("");
  const [fixturesUpdatedAt, setFixturesUpdatedAt] = useState<string | null>(
    null
  );

  const isFollowing = followedClubs.includes(clubKey);

  const loadFollowerCount = useCallback(async () => {
    if (!club) {
      setFollowerCountLoading(false);
      return;
    }

    setFollowerCountLoading(true);

    try {
      // Include legacy slugs so older follows still count correctly.
      const acceptedSlugs = Object.entries(clubSlugAliases)
        .filter(([, canonical]) => canonical === clubKey)
        .map(([alias]) => alias);

      const slugsToCheck = Array.from(
        new Set([clubKey, ...acceptedSlugs])
      );

      const { data, error } = await supabase
        .from("club_follows")
        .select("user_id, club_slug")
        .in("club_slug", slugsToCheck);

      if (error) throw error;

      const rows = (data ?? []) as ClubFollowRow[];

      // Count unique accounts rather than rows, preventing duplicate legacy
      // records from inflating the visible follower count.
      const uniqueUsers = new Set(rows.map((row) => row.user_id));

      setFollowerCount(uniqueUsers.size);
    } catch (error) {
      console.error("Could not load club follower count:", error);
      setFollowerCount(null);
    } finally {
      setFollowerCountLoading(false);
    }
  }, [
    club,
    clubKey,
    setFollowerCount,
    setFollowerCountLoading,
    supabase,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadFollows() {
      setFollowLoading(true);
      setFollowError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (cancelled) return;

        setUserId(user?.id ?? null);

        if (user) {
          const { data, error } = await supabase
            .from("club_follows")
            .select("club_slug")
            .eq("user_id", user.id);

          if (error) throw error;
          if (cancelled) return;

          const slugs = Array.from(
            new Set(
              (data ?? []).map((row) =>
                canonicalClubSlug(String(row.club_slug))
              )
            )
          );

          setFollowedClubs(slugs);
          saveFollowSlugs(slugs);
        } else {
          const slugs = getSavedFollowSlugs();
          if (!cancelled) setFollowedClubs(slugs);
        }
      } catch (error) {
        if (!cancelled) {
          setFollowError(
            error instanceof Error
              ? error.message
              : "Could not load your followed clubs."
          );

          setFollowedClubs(getSavedFollowSlugs());
        }
      } finally {
        if (!cancelled) setFollowLoading(false);
      }
    }

    void loadFollows();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => void loadFollowerCount(),
      0
    );

    return () => window.clearTimeout(initialLoad);
  }, [loadFollowerCount]);

  const loadClubFixtures = useCallback(
    async (manualRefresh = false) => {
      if (!club) {
        setFixtures([]);
        setFixturesLoading(false);
        return;
      }

      if (manualRefresh) setFixturesRefreshing(true);
      else setFixturesLoading(true);

      setFixturesError("");

      try {
        const competitionCode = leagueCompetitionCodes[club.league];
        const teamSearchName = club.aliases?.[0] || club.name;
        const query = new URLSearchParams({ team: teamSearchName });

        if (competitionCode) {
          query.set("competition", competitionCode);
        }

        const response = await fetch(
          `/api/fixtures?${query.toString()}`,
          { cache: "no-store" }
        );

        const payload = (await response.json()) as FixturesResponse;

        if (!response.ok) {
          throw new Error(
            payload.message ||
              payload.error ||
              "Could not load club fixtures."
          );
        }

        const aliases = [club.name, ...(club.aliases ?? [])].map(
          normalizeTeamName
        );

        const clubMatches = (payload.matches ?? []).filter((fixture) => {
          const homeName = normalizeTeamName(
            fixture.homeName || fixture.home || ""
          );
          const awayName = normalizeTeamName(
            fixture.awayName || fixture.away || ""
          );

          return aliases.some(
            (alias) =>
              alias &&
              (homeName === alias ||
                awayName === alias ||
                homeName.includes(alias) ||
                awayName.includes(alias) ||
                (homeName !== "" && alias.includes(homeName)) ||
                (awayName !== "" && alias.includes(awayName)))
          );
        });

        clubMatches.sort((a, b) => {
          const aLive = isFixtureLive(a);
          const bLive = isFixtureLive(b);

          if (aLive !== bLive) return aLive ? -1 : 1;

          const aFinished = isFixtureFinished(a);
          const bFinished = isFixtureFinished(b);

          if (aFinished !== bFinished) return aFinished ? 1 : -1;

          if (aFinished && bFinished) {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          }

          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        setFixtures(clubMatches);
        setFixturesUpdatedAt(new Date().toISOString());
      } catch (error) {
        setFixturesError(
          error instanceof Error
            ? error.message
            : "Could not load club fixtures."
        );
      } finally {
        setFixturesLoading(false);
        setFixturesRefreshing(false);
      }
    },
    [
      club,
      setFixtures,
      setFixturesError,
      setFixturesLoading,
      setFixturesRefreshing,
      setFixturesUpdatedAt,
    ]
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => void loadClubFixtures(),
      0
    );

    const interval = window.setInterval(() => {
      void loadClubFixtures(true);
    }, 60_000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(initialLoad);
    };
  }, [loadClubFixtures]);

  const nextClubFixture = useMemo(
    () =>
      fixtures.find((fixture) => !isFixtureFinished(fixture)) ??
      fixtures[0] ??
      null,
    [fixtures]
  );

  const filteredClubFixtures = useMemo(() => {
    switch (matchFilter) {
      case "Live":
        return fixtures.filter(isFixtureLive);
      case "Upcoming":
        return fixtures.filter(isFixtureUpcoming);
      case "Finished":
        return fixtures.filter(isFixtureFinished);
      default:
        return fixtures;
    }
  }, [fixtures, matchFilter]);

  const clubPosts = useMemo(() => {
    if (!club) return [];

    return posts.filter(
      (post) =>
        post.world === "Sports" &&
        post.clubSlug === clubKey
    );
  }, [posts, club, clubKey]);

  const toggleFollowClub = useCallback(async () => {
    if (!club || followSaving || followLoading) return;

    setFollowSaving(true);
    setFollowError("");

    const wasFollowing = followedClubs.includes(clubKey);

    const updated = wasFollowing
      ? followedClubs.filter((slug) => slug !== clubKey)
      : [...followedClubs, clubKey];

    try {
      if (userId) {
        const legacySlugs = Object.entries(clubSlugAliases)
          .filter(([, canonical]) => canonical === clubKey)
          .map(([alias]) => alias);

        const slugsToCheck = Array.from(
          new Set([clubKey, ...legacySlugs, clubSlug])
        );

        if (wasFollowing) {
          const { error } = await supabase
            .from("club_follows")
            .delete()
            .eq("user_id", userId)
            .in("club_slug", slugsToCheck);

          if (error) throw error;
        } else {
          // Use the canonical slug for all new follows.
          const { error } = await supabase
            .from("club_follows")
            .insert({
              user_id: userId,
              club_slug: clubKey,
              club_name: club.name,
            });

          if (error) throw error;
        }
      }

      setFollowedClubs(updated);
      saveFollowSlugs(updated);

      // Reload the count from Supabase after a successful follow change.
      await loadFollowerCount();
    } catch (error) {
      setFollowError(
        error instanceof Error
          ? error.message
          : "Could not update your club follow. Please try again."
      );
    } finally {
      setFollowSaving(false);
    }
  }, [
    club,
    clubKey,
    clubSlug,
    followedClubs,
    followLoading,
    followSaving,
    loadFollowerCount,
    setFollowError,
    setFollowSaving,
    setFollowedClubs,
    supabase,
    userId,
  ]);

  if (!club) {
    return (
      <main className="min-h-screen bg-[#f7f7f5] px-5 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-200">
          <div className="text-5xl">⚽</div>
          <h1 className="mt-5 text-3xl font-black text-gray-900">
            Club not found
          </h1>
          <p className="mt-3 text-gray-500">
            We couldn&apos;t find this club.
          </p>
          <Link
            href="/app/sports"
            className="mt-6 inline-flex rounded-xl bg-[#f3f3f1] px-5 py-3 font-bold text-gray-800 transition hover:bg-[#eaeae7]"
          >
            ← Back to Sports
          </Link>
        </div>
      </main>
    );
  }

  const createClubPostUrl = `/app/create?club=${encodeURIComponent(clubKey)}`;

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <section className={`${club.color} text-white`}>
        <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-8 lg:px-10">
          <Link
            href="/app/sports"
            className="text-sm font-semibold text-white/80 transition hover:text-white"
          >
            ← Sports World
          </Link>

          <div className="mt-8 flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-white p-3 shadow-xl">
                {club.logo ? (
                  <img
                    src={club.logo}
                    alt={`${club.name} crest`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-5xl">{club.icon}</span>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-black md:text-5xl">
                    {club.name}
                  </h1>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                    {club.nickname}
                  </span>
                </div>

                <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
                  {club.description}
                </p>

                <p className="mt-2 text-xs font-semibold text-white/70">
                  {club.league}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void toggleFollowClub()}
              disabled={followLoading || followSaving}
              className="rounded-2xl bg-[#f3f3f1] px-7 py-3 font-black text-gray-800 shadow-lg transition hover:bg-[#eaeae7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {followLoading
                ? "Loading..."
                : followSaving
                  ? "Saving..."
                  : isFollowing
                    ? "✓ Following"
                    : "+ Follow Club"}
            </button>
          </div>

          {followError && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-black/20 p-3 text-sm text-white"
            >
              {followError}
            </p>
          )}

          {!userId && !followLoading && (
            <p className="mt-3 text-xs text-white/75">
              You can follow clubs on this device. Sign in to save your club
              follows to your account.
            </p>
          )}

          <div className="mt-8 grid grid-cols-3 gap-3 md:max-w-xl">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-lg font-black sm:text-2xl">
                {followerCountLoading
                  ? "…"
                  : followerCount === null
                    ? "—"
                    : followerCount.toLocaleString()}
              </p>
              <p className="text-xs text-white/70">Followers</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-2xl font-black">{clubPosts.length}</p>
              <p className="text-xs text-white/70">Club posts</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-2xl font-black">{fixtures.length}</p>
              <p className="text-xs text-white/70">Matches found</p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] gap-7 overflow-x-auto px-5 md:px-8 lg:px-10">
          {["Overview", "Posts", "Matches", "News", "Fans"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActiveTab(item)}
              aria-pressed={activeTab === item}
              className={`whitespace-nowrap border-b-2 py-4 text-sm font-bold transition ${
                activeTab === item
                  ? "border-gray-800 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-[1500px] px-5 py-8 md:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_350px]">
          <div>
            {(activeTab === "Overview" || activeTab === "Matches") && (
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/70">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                      {activeTab === "Matches" ? "Matches" : "Club Match Centre"}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-gray-900">
                      {activeTab === "Matches" ? "Match information" : "Next Match"}
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#f3f3f1] px-3 py-1 text-xs font-bold text-gray-700">
                    Fixtures
                  </span>
                </div>

                <div className="mt-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-gray-500">
                      {fixturesUpdatedAt
                        ? `Updated ${new Date(fixturesUpdatedAt).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`
                        : "Live fixture data"}
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadClubFixtures(true)}
                      disabled={fixturesLoading || fixturesRefreshing}
                      className="rounded-xl bg-[#f3f3f1] px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-[#eaeae7] disabled:opacity-60"
                    >
                      {fixturesRefreshing ? "Refreshing…" : "↻ Refresh"}
                    </button>
                  </div>

                  {fixturesError && (
                    <div
                      role="alert"
                      className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
                    >
                      {fixturesError}
                    </div>
                  )}

                  {activeTab === "Matches" &&
                    !fixturesLoading &&
                    fixtures.length > 0 && (
                      <div className="mb-5">
                        <div
                          className="flex flex-wrap gap-2"
                          role="group"
                          aria-label="Filter club matches"
                        >
                          {matchFilters.map((filter) => {
                            const count =
                              filter === "All"
                                ? fixtures.length
                                : filter === "Live"
                                  ? fixtures.filter(isFixtureLive).length
                                  : filter === "Upcoming"
                                    ? fixtures.filter(isFixtureUpcoming).length
                                    : fixtures.filter(isFixtureFinished).length;

                            return (
                              <button
                                key={filter}
                                type="button"
                                onClick={() => setMatchFilter(filter)}
                                aria-pressed={matchFilter === filter}
                                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                                  matchFilter === filter
                                    ? "bg-gray-900 text-white"
                                    : "bg-[#f3f3f1] text-gray-700 hover:bg-[#eaeae7]"
                                }`}
                              >
                                {filter}{" "}
                                <span
                                  className={
                                    matchFilter === filter
                                      ? "text-white/70"
                                      : "text-gray-400"
                                  }
                                >
                                  ({count})
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {fixturesLoading ? (
                    <div className="rounded-2xl bg-[#f7f7f5] p-8 text-center text-sm text-gray-500">
                      Loading {club.name} fixtures…
                    </div>
                  ) : fixtures.length === 0 ? (
                    <div className="rounded-2xl bg-[#f7f7f5] p-8 text-center">
                      <div className="text-3xl">⚽</div>
                      <p className="mt-3 font-bold text-gray-800">
                        No fixtures found for {club.name}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-gray-500">
                        The fixtures service may not cover this competition,
                        or there may be no matches in its current date range.
                        You can check the main Sports Match Centre for the
                        available competitions.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(activeTab === "Matches"
                        ? filteredClubFixtures
                        : [nextClubFixture].filter(
                            (fixture): fixture is Fixture => Boolean(fixture)
                          )
                      ).length === 0 ? (
                        <div className="rounded-2xl bg-[#f7f7f5] p-8 text-center">
                          <div className="text-3xl">⚽</div>
                          <p className="mt-3 font-bold text-gray-800">
                            No {matchFilter.toLowerCase()} matches found
                          </p>
                          <p className="mt-2 text-sm text-gray-500">
                            Try another filter to see more {club.name} fixtures.
                          </p>
                        </div>
                      ) : (
                        (activeTab === "Matches"
                          ? filteredClubFixtures
                          : [nextClubFixture].filter(
                              (fixture): fixture is Fixture => Boolean(fixture)
                            )
                        ).map((fixture) => {
                          const homeTeam =
                            fixture.homeName || fixture.home || "Home";
                          const awayTeam =
                            fixture.awayName || fixture.away || "Away";
                          const hasScore =
                            fixture.homeScore !== null &&
                            fixture.awayScore !== null;
                          const live = isFixtureLive(fixture);
                          const finished = isFixtureFinished(fixture);

                          return (
                            <article
                              key={fixture.id}
                              className="rounded-2xl bg-[#f7f7f5] p-4 sm:p-5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-gray-500">
                                  {fixture.competition || club.league}
                                  {fixture.matchday
                                    ? ` · Matchday ${fixture.matchday}`
                                    : ""}
                                </p>
                                <span
                                  className={`rounded-full px-3 py-1 text-[11px] font-black ${
                                    live
                                      ? "bg-red-100 text-red-700"
                                      : finished
                                        ? "bg-gray-200 text-gray-600"
                                        : "bg-white text-gray-600"
                                  }`}
                                >
                                  {fixtureStatusLabel(fixture)}
                                </span>
                              </div>

                              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-center">
                                <div className="min-w-0">
                                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white p-2">
                                    {fixture.homeLogo ? (
                                      <img
                                        src={fixture.homeLogo}
                                        alt={`${homeTeam} crest`}
                                        className="h-full w-full object-contain"
                                      />
                                    ) : (
                                      <span className="text-2xl">⚽</span>
                                    )}
                                  </div>
                                  <p className="mt-2 break-words text-sm font-bold text-gray-800">
                                    {homeTeam}
                                  </p>
                                </div>

                                <div className="min-w-[4.5rem]">
                                  <p
                                    className={`text-xl font-black tabular-nums ${
                                      live ? "text-red-700" : "text-gray-900"
                                    }`}
                                  >
                                    {hasScore
                                      ? `${fixture.homeScore} - ${fixture.awayScore}`
                                      : "VS"}
                                  </p>
                                  <p className="mt-1 text-[11px] text-gray-500">
                                    {live
                                      ? "Live score"
                                      : finished
                                        ? "Final score"
                                        : formatFixtureDate(fixture.date)}
                                  </p>
                                </div>

                                <div className="min-w-0">
                                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white p-2">
                                    {fixture.awayLogo ? (
                                      <img
                                        src={fixture.awayLogo}
                                        alt={`${awayTeam} crest`}
                                        className="h-full w-full object-contain"
                                      />
                                    ) : (
                                      <span className="text-2xl">⚽</span>
                                    )}
                                  </div>
                                  <p className="mt-2 break-words text-sm font-bold text-gray-800">
                                    {awayTeam}
                                  </p>
                                </div>
                              </div>

                              {fixture.venue && (
                                <p className="mt-3 text-center text-xs text-gray-500">
                                  {fixture.venue}
                                </p>
                              )}
                            </article>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <Link
                  href="/app/sports"
                  className="mt-4 block w-full rounded-xl bg-[#f3f3f1] py-3 text-center text-sm font-bold text-gray-800 transition hover:bg-[#eaeae7]"
                >
                  Open Sports Match Centre →
                </Link>
              </div>
            )}

            {(activeTab === "Overview" || activeTab === "Posts") && (
              <div className="mt-8">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                      Fan Feed
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-gray-900">
                      {club.name} conversations
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                      Posts linked specifically to this club appear here.
                    </p>
                  </div>

                  <Link
                    href={createClubPostUrl}
                    className="inline-flex rounded-xl bg-[#f3f3f1] px-5 py-3 text-sm font-bold text-gray-800 transition hover:bg-[#eaeae7]"
                  >
                    + Create Club Post
                  </Link>
                </div>

                <div className="space-y-4">
                  {clubPosts.length > 0 ? (
                    clubPosts.map((post) => (
                      <article
                        key={post.id}
                        className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/70"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f0f0ee] font-black text-gray-700">
                            {post.author.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-gray-900">
                              {post.author}
                            </p>
                            <p className="text-xs text-gray-400">
                              {post.username} • {post.time}
                            </p>
                          </div>
                        </div>

                        <p className="mt-5 whitespace-pre-wrap leading-7 text-gray-700">
                          {post.content}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              void likePost(post.id).catch((error) => {
                                console.error("Could not like club post:", error);
                                window.alert(
                                  error instanceof Error
                                    ? error.message
                                    : "Could not like this post."
                                );
                              });
                            }}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-[#f3f3f1] hover:text-gray-900"
                          >
                            ♡ {post.likes} Likes
                          </button>

                          <Link
                            href={`/app?post=${post.id}`}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-[#f3f3f1]"
                          >
                            💬 {post.comments} Comments
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              const shareUrl = `${window.location.origin}/app?post=${post.id}`;

                              if (navigator.share) {
                                void navigator
                                  .share({
                                    title: `${club.name} conversation`,
                                    text: post.content,
                                    url: shareUrl,
                                  })
                                  .catch(() => {});
                              } else if (navigator.clipboard) {
                                void navigator.clipboard
                                  .writeText(shareUrl)
                                  .then(() => window.alert("Post link copied."))
                                  .catch(() => window.alert(shareUrl));
                              } else {
                                window.alert(shareUrl);
                              }
                            }}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-[#f3f3f1]"
                          >
                            ↗ Share
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-200/70">
                      <div className="text-4xl">{club.icon}</div>
                      <h3 className="mt-4 text-xl font-black text-gray-900">
                        No {club.name} posts yet
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Start a conversation with other {club.name} fans.
                      </p>
                      <Link
                        href={createClubPostUrl}
                        className="mt-5 inline-flex rounded-xl bg-[#f3f3f1] px-5 py-3 text-sm font-bold text-gray-800 transition hover:bg-[#eaeae7]"
                      >
                        Create a Post
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

           {activeTab === "News" && (
  <ClubNews clubName={club.name} league={club.league} />
)}

            {activeTab === "Fans" && (
              <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-200/70">
                <h2 className="text-xl font-black">{club.name} fans</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {followerCountLoading
                    ? "Loading the club's follower count…"
                    : followerCount === null
                      ? "The follower count could not be loaded. Please try again."
                      : `${followerCount.toLocaleString()} account${
                          followerCount === 1 ? "" : "s"
                        } follow this club.`}
                </p>

                <button
                  type="button"
                  onClick={() => void toggleFollowClub()}
                  disabled={followLoading || followSaving}
                  className="mt-5 rounded-xl bg-[#f3f3f1] px-5 py-3 text-sm font-bold text-gray-800 transition hover:bg-[#eaeae7] disabled:opacity-60"
                >
                  {isFollowing ? "✓ Following Club" : "+ Follow Club"}
                </button>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200/70">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                Club Information
              </p>
              <h3 className="mt-2 text-xl font-black text-gray-900">
                {club.name}
              </h3>

              <div className="mt-5 space-y-3">
                <div className="flex justify-between gap-3 rounded-xl bg-[#f7f7f5] p-3">
                  <span className="text-sm text-gray-500">Nickname</span>
                  <span className="text-right text-sm font-bold text-gray-800">
                    {club.nickname}
                  </span>
                </div>

                <div className="flex justify-between gap-3 rounded-xl bg-[#f7f7f5] p-3">
                  <span className="text-sm text-gray-500">League</span>
                  <span className="text-right text-sm font-bold text-gray-800">
                    {club.league}
                  </span>
                </div>

                <div className="flex justify-between gap-3 rounded-xl bg-[#f7f7f5] p-3">
                  <span className="text-sm text-gray-500">Followers</span>
                  <span className="text-right text-sm font-bold text-gray-800">
                    {followerCountLoading
                      ? "Loading…"
                      : followerCount === null
                        ? "Unavailable"
                        : followerCount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between gap-3 rounded-xl bg-[#f7f7f5] p-3">
                  <span className="text-sm text-gray-500">Follow status</span>
                  <span className="text-right text-sm font-bold text-gray-700">
                    {isFollowing ? "Following" : "Not following"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-gray-900 p-6 text-white">
              <div className="text-3xl">{club.icon}</div>
              <h3 className="mt-4 text-xl font-black">
                Join the {club.name} community
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Connect with other fans, share opinions and never miss the
                banter.
              </p>
              <button
                type="button"
                onClick={() => void toggleFollowClub()}
                disabled={followLoading || followSaving}
                className="mt-5 w-full rounded-xl bg-[#f3f3f1] py-3 text-sm font-bold text-gray-800 transition hover:bg-[#eaeae7] disabled:opacity-60"
              >
                {followLoading
                  ? "Loading..."
                  : followSaving
                    ? "Saving..."
                    : isFollowing
                      ? "✓ Following Club"
                      : "Follow Club"}
              </button>
            </div>

            <Link
              href="/app/sports"
              className="flex items-center justify-center rounded-2xl bg-white py-4 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-gray-200/70 transition hover:bg-[#f3f3f1]"
            >
              ← Explore More Clubs
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
