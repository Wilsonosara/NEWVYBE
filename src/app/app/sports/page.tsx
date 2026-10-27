"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePosts } from "../PostContext";

const clubs = [
  // Premier League
  {
    name: "Arsenal",
    nickname: "Gunners",
    icon: "🔴",
    logo: "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg",
  },
  {
    name: "Liverpool",
    nickname: "Reds",
    icon: "🔴",
    logo: "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg",
  },
  {
    name: "Chelsea",
    nickname: "Blues",
    icon: "🔵",
    logo: "https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg",
  },
  {
    name: "Man City",
    nickname: "Citizens",
    icon: "🔵",
    logo: "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg",
  },
  {
    name: "Manchester United",
    nickname: "Red Devils",
    icon: "🔴",
    logo: "https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg",
  },
  {
    name: "Tottenham Hotspur",
    nickname: "Spurs",
    icon: "⚪",
    logo: "https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg",
  },
  {
    name: "Newcastle United",
    nickname: "Magpies",
    icon: "⚫",
    logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg",
  },
  {
    name: "Aston Villa",
    nickname: "Villans",
    icon: "🟣",
    logo: "https://upload.wikimedia.org/wikipedia/en/9/9f/Aston_Villa_FC_crest_%282023%29.svg",
  },
  {
    name: "Brighton",
    nickname: "Seagulls",
    icon: "🔵",
    logo: "https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg",
  },
  {
    name: "West Ham United",
    nickname: "Hammers",
    icon: "🍷",
    logo: "https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg",
  },
  {
    name: "Everton",
    nickname: "Toffees",
    icon: "🔵",
    logo: "https://upload.wikimedia.org/wikipedia/en/7/7c/Everton_FC_logo.svg",
  },
  {
    name: "Crystal Palace",
    nickname: "Eagles",
    icon: "🔴",
    logo: "https://upload.wikimedia.org/wikipedia/en/a/a2/Crystal_Palace_FC_logo_%282022%29.svg",
  },
  {
    name: "Nottingham Forest",
    nickname: "Tricky Trees",
    icon: "🔴",
    logo: "https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg",
  },
  {
    name: "Brentford",
    nickname: "Bees",
    icon: "🐝",
    logo: "https://upload.wikimedia.org/wikipedia/en/2/2a/Brentford_FC_crest.svg",
  },
  {
    name: "Fulham",
    nickname: "Cottagers",
    icon: "⚫",
    logo: "https://upload.wikimedia.org/wikipedia/en/e/eb/Fulham_FC_%28shield%29.svg",
  },
  {
    name: "Wolves",
    nickname: "Wanderers",
    icon: "🟡",
    logo: "https://upload.wikimedia.org/wikipedia/en/f/fc/Wolverhampton_Wanderers.svg",
  },
  {
    name: "Bournemouth",
    nickname: "Cherries",
    icon: "🍒",
    logo: "https://upload.wikimedia.org/wikipedia/en/e/e5/AFC_Bournemouth_%282013%29.svg",
  },

  // La Liga
  {
    name: "Real Madrid",
    nickname: "Madridistas",
    icon: "⚪",
    logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg",
  },
  {
    name: "Barcelona",
    nickname: "Culers",
    icon: "🔵",
    logo: "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg",
  },
  {
    name: "Atletico Madrid",
    nickname: "Colchoneros",
    icon: "🔴",
    logo: "https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg",
  },
  {
    name: "Sevilla",
    nickname: "Sevillistas",
    icon: "⚪",
    logo: "https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg",
  },
  {
    name: "Valencia",
    nickname: "Los Che",
    icon: "🦇",
    logo: "https://upload.wikimedia.org/wikipedia/en/c/ce/Valenciacf.svg",
  },
  {
    name: "Real Betis",
    nickname: "Verdiblancos",
    icon: "🟢",
    logo: "https://upload.wikimedia.org/wikipedia/en/1/13/Real_betis_logo.svg",
  },

  // Serie A
  {
    name: "Inter Milan",
    nickname: "Nerazzurri",
    icon: "🔵",
    logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg",
  },
  {
    name: "AC Milan",
    nickname: "Rossoneri",
    icon: "🔴",
    logo: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg",
  },
  {
    name: "Juventus",
    nickname: "Bianconeri",
    icon: "⚫",
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg",
  },
  {
    name: "Napoli",
    nickname: "Partenopei",
    icon: "🔵",
    logo: "https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Neapel.svg",
  },
  {
    name: "AS Roma",
    nickname: "Giallorossi",
    icon: "🟡",
    logo: "https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg",
  },

  // Bundesliga
  {
    name: "Bayern Munich",
    nickname: "Bavarians",
    icon: "🔴",
    logo: "https://upload.wikimedia.org/wikipedia/en/1/1f/FC_Bayern_München_logo_%282017%29.svg",
  },
  {
    name: "Borussia Dortmund",
    nickname: "Black and Yellows",
    icon: "🟡",
    logo: "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg",
  },
  {
    name: "Bayer Leverkusen",
    nickname: "Die Werkself",
    icon: "🔴",
    logo: "https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg",
  },
  {
    name: "RB Leipzig",
    nickname: "Red Bulls",
    icon: "🔴",
    logo: "https://upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2014_logo.svg",
  },

  // Ligue 1
  {
    name: "PSG",
    nickname: "Parisians",
    icon: "🔵",
    logo: "https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg",
  },
  {
    name: "Marseille",
    nickname: "Les Phocéens",
    icon: "🔵",
    logo: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg",
  },
  {
    name: "Lyon",
    nickname: "Les Gones",
    icon: "🔵",
    logo: "https://upload.wikimedia.org/wikipedia/en/c/c6/Olympique_Lyonnais.svg",
  },

  // Nigerian football
  {
    name: "Enyimba",
    nickname: "People's Elephant",
    icon: "🔵",
    logo: "",
  },
  {
    name: "Rangers International",
    nickname: "Flying Antelopes",
    icon: "🟢",
    logo: "",
  },
  {
    name: "Remo Stars",
    nickname: "Sky Blue Stars",
    icon: "🔵",
    logo: "",
  },
  {
    name: "Rivers United",
    nickname: "Pride of Rivers",
    icon: "🔵",
    logo: "",
  },
  {
    name: "Kano Pillars",
    nickname: "Sai Masu Gida",
    icon: "🟡",
    logo: "",
  },
];

type Fixture = {
  id: number;
  date: string;
  status: string;
  minute: number | null;
  competition: string;
  competitionCode: string | null;
  competitionLogo: string | null;
  home: string;
  homeName: string;
  homeLogo: string | null;
  away: string;
  awayName: string;
  awayLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  venue?: string | null;
  matchday?: number | null;
  stage?: string | null;
};

type Standing = {
  position: number;
  teamId: number;
  team: string;
  shortName: string;
  crest: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type StandingsResponse = {
  competition?: {
    name: string;
    code: string;
    emblem: string | null;
  };
  table?: Standing[];
  updatedAt?: string;
  error?: string;
};

type League = {
  code: string;
  name: string;
};

const leagues: League[] = [
  { code: "PL", name: "Premier League" },
  { code: "CL", name: "Champions League" },
  { code: "PD", name: "La Liga" },
  { code: "BL1", name: "Bundesliga" },
  { code: "SA", name: "Serie A" },
  { code: "FL1", name: "Ligue 1" },
];

type MatchFilter = "All" | "Live" | "Upcoming" | "Finished";

const matchFilters: MatchFilter[] = [
  "All",
  "Live",
  "Upcoming",
  "Finished",
];

const trending = [
  { tag: "#PremierLeague", keywords: ["premierleague", "premier league", "epl"] },
  { tag: "#Arsenal", keywords: ["arsenal"] },
  { tag: "#Chelsea", keywords: ["chelsea"] },
  { tag: "#Liverpool", keywords: ["liverpool"] },
  { tag: "#UCL", keywords: ["#ucl", "ucl", "champions league"] },
  { tag: "#ElClasico", keywords: ["elclasico", "el clasico", "real madrid", "barcelona"] },
];

function postMatchesFootballTrend(content: string, keywords: string[]) {
  const normalized = content.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

type FootballSection = "fixtures" | "standings" | "banters";

function formatKickoff(date: string) {
  return new Date(date).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMatchStatus(match: Fixture) {
  switch (match.status) {
    case "IN_PLAY":
    case "LIVE":
      return match.minute != null ? `LIVE ${match.minute}'` : "LIVE";
    case "PAUSED":
      return "HALF-TIME";
    case "FINISHED":
      return "FULL-TIME";
    case "AET":
      return "AFTER EXTRA TIME";
    case "PENALTY_SHOOTOUT":
      return "PENALTIES";
    case "POSTPONED":
      return "POSTPONED";
    case "CANCELLED":
      return "CANCELLED";
    case "SUSPENDED":
      return "SUSPENDED";
    case "AWARDED":
      return "AWARDED";
    case "TIMED":
    case "SCHEDULED":
      return formatKickoff(match.date);
    default:
      return match.status.replaceAll("_", " ");
  }
}

function isLive(match: Fixture) {
  return ["IN_PLAY", "LIVE", "PAUSED"].includes(match.status);
}

function isFinished(match: Fixture) {
  return [
    "FINISHED",
    "AET",
    "PENALTY_SHOOTOUT",
    "AWARDED",
  ].includes(match.status);
}

function isUpcoming(match: Fixture) {
  return ["TIMED", "SCHEDULED"].includes(match.status);
}

function hasStarted(match: Fixture) {
  return isLive(match) || isFinished(match);
}

function getStatusStyle(match: Fixture) {
  if (isLive(match)) {
    return "bg-red-100 text-red-700";
  }

  if (isFinished(match)) {
    return "bg-gray-100 text-gray-600";
  }

  if (
    ["POSTPONED", "CANCELLED", "SUSPENDED"].includes(match.status)
  ) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-green-50 text-green-700";
}

function getClubSlug(name: string) {
  // Keep the original Man City URL working.
  if (name === "Man City") return "man-city";

  return name
    .toLowerCase()
    .replaceAll("&", "and")
    .replaceAll(".", "")
    .replaceAll(" ", "-");
}

export default function SportsPage() {
  const { posts, addPost, likePost } = usePosts();

  const [postText, setPostText] = useState("");
  const [selectedTrendingTag, setSelectedTrendingTag] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState("All Clubs");
  const [activeTab, setActiveTab] = useState("For You");

  const [activeFootballSection, setActiveFootballSection] =
    useState<FootballSection>("banters");

  const [matches, setMatches] = useState<Fixture[]>([]);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [fixturesError, setFixturesError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [activeMatchFilter, setActiveMatchFilter] =
    useState<MatchFilter>("All");
  const [selectedCompetition, setSelectedCompetition] =
    useState("ALL");
  const [selectedMatch, setSelectedMatch] =
    useState<Fixture | null>(null);

  const [selectedLeague, setSelectedLeague] = useState("PL");
  const [standings, setStandings] = useState<Standing[]>([]);
  const [standingsCompetition, setStandingsCompetition] = useState("");
  const [standingsLoading, setStandingsLoading] = useState(true);
  const [standingsError, setStandingsError] = useState("");
  const [standingsUpdatedAt, setStandingsUpdatedAt] = useState("");

  const loadFixtures = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setFixturesLoading(true);
    }

    setFixturesError("");

    try {
      const response = await fetch("/api/fixtures", {
        cache: "no-store",
      });

      const data = (await response.json()) as {
        matches?: Fixture[];
        updatedAt?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load football fixtures."
        );
      }

      const nextMatches = data.matches ?? [];

      setMatches(nextMatches);
      setLastUpdated(data.updatedAt ?? new Date().toISOString());

      setSelectedMatch((current) => {
        if (!current) return null;

        return (
          nextMatches.find((match) => match.id === current.id) ??
          current
        );
      });
    } catch (error) {
      setFixturesError(
        error instanceof Error
          ? error.message
          : "Unable to load football fixtures."
      );
    } finally {
      setFixturesLoading(false);
    }
  }, []);

  const loadStandings = useCallback(
    async (competition: string) => {
      setStandingsLoading(true);
      setStandingsError("");

      try {
        const response = await fetch(
          `/api/standings?competition=${encodeURIComponent(competition)}`,
          { cache: "no-store" }
        );

        const data =
          (await response.json()) as StandingsResponse;

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load league standings."
          );
        }

        setStandings(data.table ?? []);
        setStandingsCompetition(
          data.competition?.name ??
            leagues.find((league) => league.code === competition)?.name ??
            "League standings"
        );
        setStandingsUpdatedAt(
          data.updatedAt ?? new Date().toISOString()
        );
      } catch (error) {
        setStandings([]);
        setStandingsCompetition("");
        setStandingsError(
          error instanceof Error
            ? error.message
            : "Unable to load league standings."
        );
      } finally {
        setStandingsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadFixtures(), 0);

    const interval = window.setInterval(() => {
      void loadFixtures(false);
    }, 60_000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(initialLoad);
    };
  }, [loadFixtures]);

  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => void loadStandings(selectedLeague),
      0
    );

    return () => window.clearTimeout(initialLoad);
  }, [selectedLeague, loadStandings]);

  const competitions = useMemo(() => {
    const uniqueCompetitions = new Map<string, string>();

    matches.forEach((match) => {
      const code = match.competitionCode || match.competition;

      if (code && match.competition) {
        uniqueCompetitions.set(code, match.competition);
      }
    });

    return Array.from(uniqueCompetitions.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [matches]);

  const competitionMatches = useMemo(() => {
    if (selectedCompetition === "ALL") return matches;

    return matches.filter(
      (match) =>
        (match.competitionCode || match.competition) ===
        selectedCompetition
    );
  }, [matches, selectedCompetition]);

  const matchCounts = useMemo(
    () => ({
      All: competitionMatches.length,
      Live: competitionMatches.filter(isLive).length,
      Upcoming: competitionMatches.filter(isUpcoming).length,
      Finished: competitionMatches.filter(isFinished).length,
    }),
    [competitionMatches]
  );

  const filteredMatches = useMemo(() => {
    let result: Fixture[];

    switch (activeMatchFilter) {
      case "Live":
        result = competitionMatches.filter(isLive);
        break;
      case "Upcoming":
        result = competitionMatches.filter(isUpcoming);
        break;
      case "Finished":
        result = competitionMatches.filter(isFinished);
        break;
      default:
        result = [...competitionMatches];
    }

    return result.sort((a, b) => {
      const priority = (match: Fixture) => {
        if (isLive(match)) return 0;
        if (isUpcoming(match)) return 1;
        if (isFinished(match)) return 2;
        return 3;
      };

      const priorityDifference = priority(a) - priority(b);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return (
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    });
  }, [competitionMatches, activeMatchFilter]);

  const sportsPosts = posts.filter((post) => post.world === "Sports");

  const filteredPosts = sportsPosts.filter((post) => {
    const matchesClub =
      selectedClub === "All Clubs" ||
      post.content.toLowerCase().includes(selectedClub.toLowerCase());
    const selectedTrend = trending.find((trend) => trend.tag === selectedTrendingTag);
    const matchesTrend = !selectedTrend || postMatchesFootballTrend(post.content || "", selectedTrend.keywords);
    return matchesClub && matchesTrend;
  });

  const trendingCounts = trending.reduce<Record<string, number>>((counts, trend) => {
    counts[trend.tag] = sportsPosts.filter((post) =>
      postMatchesFootballTrend(post.content || "", trend.keywords)
    ).length;
    return counts;
  }, {});

  function handlePost() {
    if (!postText.trim()) return;

    const content =
      selectedClub === "All Clubs"
        ? postText.trim()
        : `${selectedClub}: ${postText.trim()}`;

    addPost(content, "Sports");
    setPostText("");
    setSelectedClub("All Clubs");
  }

  function openMatch(match: Fixture) {
    setSelectedMatch(match);
  }

  function closeMatchDetails() {
    setSelectedMatch(null);
  }

  function discussMatch(match: Fixture) {
    const score = hasStarted(match)
      ? `${match.homeName} ${match.homeScore ?? "–"} - ${
          match.awayScore ?? "–"
        } ${match.awayName}`
      : `${match.homeName} vs ${match.awayName}`;

    setPostText(
      `${match.competition}: ${score}\nWhat do you think about this match? `
    );
    setSelectedClub("All Clubs");
    setSelectedMatch(null);
    setActiveFootballSection("banters");

    window.setTimeout(() => {
      document.getElementById("fan-zone")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  return (
    <main className="min-h-screen bg-[#f4f8f5] text-gray-900">
      <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 lg:px-10">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-green-950 via-green-800 to-emerald-600 p-7 text-white shadow-lg md:p-12">
          <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 right-1/3 h-48 w-48 rounded-full bg-lime-300/10 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em]">
              ⚽ Welcome to the Sports World
            </span>

            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Football.
              <br />
              Fans. Banter.
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-green-50 md:text-base">
              Your club. Your people. Your opinions. Join conversations,
              follow your favourite teams, share match reactions and connect
              with football fans across VYBE.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#clubs"
                className="rounded-xl bg-white px-6 py-3 text-sm font-black text-green-900 transition hover:bg-green-50"
              >
                Explore Clubs →
              </a>

              <a
                href="#fan-zone"
                onClick={() => setActiveFootballSection("banters")}
                className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Join the Conversation
              </a>
            </div>

            <div className="mt-9 flex flex-wrap gap-6 border-t border-white/15 pt-6">
              <div>
                <p className="text-2xl font-black">{clubs.length}+</p>
                <p className="text-xs text-green-100">Featured Clubs</p>
              </div>
              <div>
                <p className="text-2xl font-black">24/7</p>
                <p className="text-xs text-green-100">Fan Conversations</p>
              </div>
              <div>
                <p className="text-2xl font-black">One</p>
                <p className="text-xs text-green-100">Football Community</p>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTBALL SECTION BUTTONS */}
        <section
          aria-label="Football sections"
          className="mt-6 flex flex-wrap gap-3"
        >
          <button
            type="button"
            aria-pressed={activeFootballSection === "fixtures"}
            aria-controls="football-fixtures"
            onClick={() => setActiveFootballSection("fixtures")}
            className={`rounded-xl px-5 py-3 text-sm font-bold shadow-sm ring-1 transition ${
              activeFootballSection === "fixtures"
                ? "bg-green-700 text-white ring-green-700"
                : "bg-white text-gray-700 ring-gray-200 hover:bg-green-50 hover:text-green-800"
            }`}
          >
            ⚽ Fixtures
          </button>

          <button
            type="button"
            aria-pressed={activeFootballSection === "standings"}
            aria-controls="standings"
            onClick={() => setActiveFootballSection("standings")}
            className={`rounded-xl px-5 py-3 text-sm font-bold shadow-sm ring-1 transition ${
              activeFootballSection === "standings"
                ? "bg-green-700 text-white ring-green-700"
                : "bg-white text-gray-700 ring-gray-200 hover:bg-green-50 hover:text-green-800"
            }`}
          >
            🏆 Standings
          </button>

          <button
            type="button"
            aria-pressed={activeFootballSection === "banters"}
            aria-controls="football-banters"
            onClick={() => setActiveFootballSection("banters")}
            className={`rounded-xl px-5 py-3 text-sm font-bold shadow-sm ring-1 transition ${
              activeFootballSection === "banters"
                ? "bg-green-700 text-white ring-green-700"
                : "bg-white text-gray-700 ring-gray-200 hover:bg-green-50 hover:text-green-800"
            }`}
          >
            💬 Banters
          </button>
        </section>

        {/* INTERACTIVE MATCH CENTRE */}
        <section
          id="football-fixtures"
          className={`mt-8 ${
            activeFootballSection === "fixtures" ? "" : "hidden"
          }`}
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-700">
                Match Centre
              </p>
              <h2 className="mt-1 text-2xl font-black">
                Live scores & fixtures
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Explore matches, check scores and join the discussion.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
                {matches.filter(isLive).length} live
              </span>

              <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-800">
                {matches.length} matches
              </span>

              <button
                type="button"
                onClick={() => void loadFixtures()}
                disabled={fixturesLoading}
                className="rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {fixturesLoading ? "Loading..." : "↻ Refresh"}
              </button>
            </div>
          </div>

          {lastUpdated && (
            <p className="mb-4 text-xs text-gray-400">
              Last checked:{" "}
              {new Date(lastUpdated).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
              {" · "}Automatically refreshes every minute
            </p>
          )}

          {/* COMPETITION FILTER */}
          <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <label
              htmlFor="competition-filter"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500"
            >
              Choose a competition
            </label>

            <select
              id="competition-filter"
              value={selectedCompetition}
              onChange={(event) => {
                setSelectedCompetition(event.target.value);
                setSelectedMatch(null);
              }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-green-600 sm:max-w-md"
            >
              <option value="ALL">All available competitions</option>
              {competitions.map((competition) => (
                <option key={competition.code} value={competition.code}>
                  {competition.name}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs leading-5 text-gray-400">
              Competitions shown here are based on the matches returned by
              your football data API.
            </p>
          </div>

          {/* STATUS FILTERS */}
          <div className="mb-5 flex flex-wrap gap-2">
            {matchFilters.map((filter) => {
              const selected = activeMatchFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveMatchFilter(filter)}
                  aria-pressed={selected}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    selected
                      ? "bg-green-700 text-white shadow-sm"
                      : "bg-white text-gray-600 shadow-sm ring-1 ring-gray-100 hover:bg-green-50 hover:text-green-800"
                  }`}
                >
                  {filter === "Live" && (
                    <span
                      className={`h-2 w-2 rounded-full ${
                        selected ? "bg-white" : "bg-red-500"
                      }`}
                    />
                  )}
                  {filter}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      selected
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {matchCounts[filter]}
                  </span>
                </button>
              );
            })}
          </div>

          {fixturesError && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            >
              <p className="font-bold">Fixtures could not be refreshed.</p>
              <p className="mt-1">{fixturesError}</p>
              <button
                type="button"
                onClick={() => void loadFixtures()}
                className="mt-3 rounded-lg bg-white px-4 py-2 text-xs font-bold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
              >
                Try again
              </button>
            </div>
          )}

          {fixturesLoading && matches.length === 0 ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-700" />
              <p className="mt-4 text-sm font-semibold text-gray-600">
                Loading football fixtures...
              </p>
            </div>
          ) : filteredMatches.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredMatches.map((match) => {
                const selected = selectedMatch?.id === match.id;

                return (
                  <article
                    key={match.id}
                    className={`rounded-3xl bg-white p-5 shadow-sm ring-1 transition hover:-translate-y-1 hover:shadow-md ${
                      selected
                        ? "ring-2 ring-green-600"
                        : "ring-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-gray-500">
                        {match.competitionLogo && (
                          <img
                            src={match.competitionLogo}
                            alt=""
                            className="h-5 w-5 shrink-0 object-contain"
                            loading="lazy"
                          />
                        )}
                        <span className="truncate">{match.competition}</span>
                      </span>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(
                          match
                        )}`}
                      >
                        {getMatchStatus(match)}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 p-2">
                          {match.homeLogo ? (
                            <img
                              src={match.homeLogo}
                              alt={`${match.homeName} crest`}
                              className="h-full w-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-2xl">⚽</span>
                          )}
                        </div>

                        <p
                          className="mt-2 w-full truncate text-sm font-bold"
                          title={match.homeName}
                        >
                          {match.home}
                        </p>
                      </div>

                      <div className="min-w-[76px] text-center">
                        {hasStarted(match) ? (
                          <p className="text-2xl font-black tabular-nums text-gray-900">
                            {match.homeScore ?? "–"}{" "}
                            <span className="text-gray-300">-</span>{" "}
                            {match.awayScore ?? "–"}
                          </p>
                        ) : (
                          <p className="text-xs font-black text-gray-300">
                            VS
                          </p>
                        )}

                        <p className="mt-1 text-xs text-gray-400">
                          {isFinished(match)
                            ? "Full-time"
                            : isLive(match)
                              ? "In progress"
                              : formatKickoff(match.date)}
                        </p>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 p-2">
                          {match.awayLogo ? (
                            <img
                              src={match.awayLogo}
                              alt={`${match.awayName} crest`}
                              className="h-full w-full object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-2xl">⚽</span>
                          )}
                        </div>

                        <p
                          className="mt-2 w-full truncate text-sm font-bold"
                          title={match.awayName}
                        >
                          {match.away}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                      <button
                        type="button"
                        onClick={() => openMatch(match)}
                        aria-expanded={selected}
                        className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                          selected
                            ? "bg-green-700 text-white"
                            : "bg-gray-50 text-gray-700 hover:bg-green-50 hover:text-green-800"
                        }`}
                      >
                        {selected ? "Details open" : "Match details"}
                      </button>

                      <button
                        type="button"
                        onClick={() => discussMatch(match)}
                        className="rounded-xl bg-green-50 px-3 py-2.5 text-xs font-bold text-green-800 transition hover:bg-green-100"
                      >
                        💬 Discuss match
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            !fixturesLoading &&
            !fixturesError && (
              <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
                <div className="text-4xl">⚽</div>
                <h3 className="mt-3 text-lg font-black">
                  {activeMatchFilter === "All"
                    ? "No fixtures available"
                    : `No ${activeMatchFilter.toLowerCase()} matches`}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {activeMatchFilter === "Live"
                    ? "There are no matches currently marked as live in this selection."
                    : activeMatchFilter === "Upcoming"
                      ? "There are no upcoming matches in this selection."
                      : activeMatchFilter === "Finished"
                        ? "No completed matches were returned in this selection."
                        : "No matches were returned by the football data service."}
                </p>

                {activeMatchFilter !== "All" && (
                  <button
                    type="button"
                    onClick={() => setActiveMatchFilter("All")}
                    className="mt-4 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-green-800"
                  >
                    View All Matches
                  </button>
                )}
              </div>
            )
          )}

          {/* INTERACTIVE MATCH DETAILS */}
          {selectedMatch && (
            <section
              aria-label="Selected match details"
              className="mt-6 scroll-mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-green-200 md:p-7"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-700">
                    Match Details
                  </p>
                  <h3 className="mt-1 text-xl font-black">
                    {selectedMatch.competition}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatKickoff(selectedMatch.date)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeMatchDetails}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600 transition hover:bg-gray-200"
                >
                  ✕ Close
                </button>
              </div>

              <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl bg-gray-50 p-4 md:p-7">
                <div className="flex min-w-0 flex-col items-center text-center">
                  {selectedMatch.homeLogo ? (
                    <img
                      src={selectedMatch.homeLogo}
                      alt={`${selectedMatch.homeName} crest`}
                      className="h-16 w-16 object-contain md:h-20 md:w-20"
                    />
                  ) : (
                    <span className="text-4xl">⚽</span>
                  )}
                  <p className="mt-3 text-sm font-black md:text-base">
                    {selectedMatch.homeName}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Home</p>
                </div>

                <div className="min-w-[80px] text-center">
                  {hasStarted(selectedMatch) ? (
                    <p className="text-3xl font-black tabular-nums md:text-4xl">
                      {selectedMatch.homeScore ?? "–"} -{" "}
                      {selectedMatch.awayScore ?? "–"}
                    </p>
                  ) : (
                    <p className="text-2xl font-black text-gray-300">
                      VS
                    </p>
                  )}

                  <span
                    className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${getStatusStyle(
                      selectedMatch
                    )}`}
                  >
                    {getMatchStatus(selectedMatch)}
                  </span>
                </div>

                <div className="flex min-w-0 flex-col items-center text-center">
                  {selectedMatch.awayLogo ? (
                    <img
                      src={selectedMatch.awayLogo}
                      alt={`${selectedMatch.awayName} crest`}
                      className="h-16 w-16 object-contain md:h-20 md:w-20"
                    />
                  ) : (
                    <span className="text-4xl">⚽</span>
                  )}
                  <p className="mt-3 text-sm font-black md:text-base">
                    {selectedMatch.awayName}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Away</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Competition
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {selectedMatch.competitionLogo && (
                      <img
                        src={selectedMatch.competitionLogo}
                        alt=""
                        className="h-7 w-7 object-contain"
                      />
                    )}
                    <p className="text-sm font-bold">
                      {selectedMatch.competition}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Kick-off / Match date
                  </p>
                  <p className="mt-2 text-sm font-bold">
                    {formatKickoff(selectedMatch.date)}
                  </p>
                </div>

                {selectedMatch.venue && (
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Venue
                    </p>
                    <p className="mt-2 text-sm font-bold">
                      {selectedMatch.venue}
                    </p>
                  </div>
                )}

                {selectedMatch.matchday != null && (
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Matchday
                    </p>
                    <p className="mt-2 text-sm font-bold">
                      {selectedMatch.matchday}
                    </p>
                  </div>
                )}

                {selectedMatch.stage && (
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Stage
                    </p>
                    <p className="mt-2 text-sm font-bold">
                      {selectedMatch.stage.replaceAll("_", " ")}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => discussMatch(selectedMatch)}
                  className="rounded-xl bg-green-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-800"
                >
                  💬 Discuss this match
                </button>

                <button
                  type="button"
                  onClick={() => void loadFixtures()}
                  disabled={fixturesLoading}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  ↻ Refresh score
                </button>
              </div>

              <p className="mt-4 text-xs leading-5 text-gray-400">
                Match details are limited to the information supplied by your
                current football data API.
              </p>
            </section>
          )}
        </section>

        {/* LEAGUE STANDINGS */}
        <section
          id="standings"
          className={`mt-10 scroll-mt-6 ${
            activeFootballSection === "standings" ? "" : "hidden"
          }`}
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-700">
                League Table
              </p>
              <h2 className="mt-1 text-2xl font-black md:text-3xl">
                League standings
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Check team positions, points and goal difference.
              </p>
            </div>

            <label className="flex flex-col gap-2 text-xs font-bold text-gray-600">
              Select competition
              <select
                value={selectedLeague}
                onChange={(event) => setSelectedLeague(event.target.value)}
                className="min-w-[190px] rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-green-600"
              >
                {leagues.map((league) => (
                  <option key={league.code} value={league.code}>
                    {league.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {standingsCompetition && !standingsLoading && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-gray-700">
                {standingsCompetition}
              </p>
              {standingsUpdatedAt && (
                <p className="text-xs text-gray-400">
                  Updated{" "}
                  {new Date(standingsUpdatedAt).toLocaleTimeString(
                    undefined,
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </p>
              )}
            </div>
          )}

          {standingsError && (
            <div
              role="alert"
              className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
            >
              <p className="font-bold">
                Could not load league standings.
              </p>
              <p className="mt-1">{standingsError}</p>
              <button
                type="button"
                onClick={() => void loadStandings(selectedLeague)}
                className="mt-3 rounded-lg bg-white px-4 py-2 text-xs font-bold ring-1 ring-amber-200 hover:bg-amber-100"
              >
                Try again
              </button>
            </div>
          )}

          {standingsLoading ? (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-700" />
              <p className="mt-4 text-sm font-semibold text-gray-600">
                Loading league table...
              </p>
            </div>
          ) : !standingsError && standings.length > 0 ? (
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] border-collapse text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-4 text-center">Pos</th>
                      <th className="px-4 py-4">Club</th>
                      <th className="px-3 py-4 text-center">MP</th>
                      <th className="px-3 py-4 text-center">W</th>
                      <th className="px-3 py-4 text-center">D</th>
                      <th className="px-3 py-4 text-center">L</th>
                      <th className="px-3 py-4 text-center">GF</th>
                      <th className="px-3 py-4 text-center">GA</th>
                      <th className="px-3 py-4 text-center">GD</th>
                      <th className="px-4 py-4 text-center font-black text-gray-900">
                        Pts
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {standings.map((team) => (
                      <tr
                        key={team.teamId}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-black ${
                              team.position <= 4
                                ? "bg-green-100 text-green-800"
                                : team.position >= standings.length - 2
                                  ? "bg-red-50 text-red-700"
                                  : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {team.position}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            {team.crest ? (
                              <img
                                src={team.crest}
                                alt={`${team.team} crest`}
                                className="h-7 w-7 shrink-0 object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs">
                                ⚽
                              </span>
                            )}
                            <span
                              className="max-w-[220px] truncate font-bold text-gray-800"
                              title={team.team}
                            >
                              {team.team}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-3 text-center text-gray-600">
                          {team.played}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600">
                          {team.won}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600">
                          {team.drawn}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600">
                          {team.lost}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600">
                          {team.goalsFor}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600">
                          {team.goalsAgainst}
                        </td>
                        <td className="px-3 py-3 text-center font-semibold text-gray-700">
                          {team.goalDifference > 0
                            ? `+${team.goalDifference}`
                            : team.goalDifference}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-gray-900">
                          {team.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-4 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-green-200" />
                  Top four positions
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-red-100" />
                  Bottom positions
                </span>
              </div>
            </div>
          ) : (
            !standingsError && (
              <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
                <div className="text-4xl">🏆</div>
                <h3 className="mt-3 text-lg font-black">
                  No standings available
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  The football data service returned no table for this
                  competition.
                </p>
              </div>
            )
          )}
        </section>

        {/* CLUBS — ALWAYS VISIBLE */}
        <section id="clubs" className="mt-10 scroll-mt-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-700">
                Find Your People
              </p>
              <h2 className="mt-1 text-2xl font-black md:text-3xl">
                Choose your club
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Step into your club&apos;s own fan community.
              </p>
            </div>

            <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-500 shadow-sm ring-1 ring-gray-100">
              {clubs.length} featured clubs
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {clubs.map((club) => (
              <Link
                key={club.name}
                href={`/app/sports/clubs/${getClubSlug(club.name)}`}
                className="group rounded-3xl bg-white p-4 text-center shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-1 hover:shadow-lg hover:ring-green-200"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-50 p-3 transition group-hover:bg-green-50">
                  {club.logo ? (
                    <img
                      src={club.logo}
                      alt={`${club.name} crest`}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-4xl" aria-label={club.name}>
                      {club.icon}
                    </span>
                  )}
                </div>

                <h3 className="mt-4 text-sm font-black">{club.name}</h3>
                <p className="mt-1 text-xs text-gray-500">
                  {club.nickname}
                </p>

                <span className="mt-4 inline-flex rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 transition group-hover:bg-green-700 group-hover:text-white">
                  Enter Club →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* MAIN FEED + SIDEBAR */}
        <section
          id="football-banters"
          className={`mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_330px] ${
            activeFootballSection === "banters" ? "" : "hidden"
          }`}
        >
          <div className="min-w-0">
            {/* FAN ZONE */}
            <div
              id="fan-zone"
              className="scroll-mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100 md:p-7"
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-700">
                Fan Zone
              </p>
              <h2 className="mt-1 text-2xl font-black">
                What&apos;s the banter?
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Share a match reaction, football opinion or club debate.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <label htmlFor="club-select" className="text-sm font-bold">
                  Club
                </label>
                <select
                  id="club-select"
                  value={selectedClub}
                  onChange={(event) => setSelectedClub(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-green-600"
                >
                  <option>All Clubs</option>
                  {clubs.map((club) => (
                    <option key={club.name}>{club.name}</option>
                  ))}
                </select>
              </div>

              <textarea
                value={postText}
                onChange={(event) => setPostText(event.target.value)}
                placeholder="What's on your mind, football fan?"
                rows={4}
                className="mt-4 w-full resize-y rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 outline-none transition placeholder:text-gray-400 focus:border-green-600 focus:bg-white"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-gray-400">
                  Keep it fun. Respect other fans.
                </p>
                <button
                  onClick={handlePost}
                  disabled={!postText.trim()}
                  className="rounded-xl bg-green-700 px-6 py-3 text-sm font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Publish Post →
                </button>
              </div>
            </div>

            {/* FEED */}
            <div className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-700">
                    Community Feed
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    Football conversations
                  </h2>
                </div>

                <div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-100">
                  {["For You", "Latest"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                        activeTab === tab
                          ? "bg-green-700 text-white"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {filteredPosts.length > 0 ? (
                  (activeTab === "Latest"
                    ? [...filteredPosts].reverse()
                    : filteredPosts
                  ).map((post) => (
                    <article
                      key={post.id}
                      className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100 md:p-6"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100 font-black text-green-800">
                          {post.author.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold">{post.author}</p>
                          <p className="text-xs text-gray-400">
                            {post.username} · {post.time}
                          </p>
                        </div>
                        <span className="ml-auto rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                          ⚽ Sports
                        </span>
                      </div>

                      <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                        {post.content}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                        <button
                          onClick={() => likePost(post.id)}
                          className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 transition hover:bg-green-50 hover:text-green-700"
                        >
                          💚 {post.likes} Likes
                        </button>
                        <span className="rounded-xl px-4 py-2 text-sm text-gray-400">
                          💬 {post.comments} Comments
                        </span>
                        <button
                          onClick={() => {
                            if (navigator.clipboard) {
                              void navigator.clipboard.writeText(
                                post.content
                              );
                            }
                          }}
                          className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 transition hover:bg-gray-50"
                        >
                          ↗ Share text
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-gray-100">
                    <div className="text-5xl">⚽</div>
                    <h3 className="mt-4 text-xl font-black">
                      {selectedTrendingTag ? `No posts match ${selectedTrendingTag} yet` : selectedClub !== "All Clubs" ? `No ${selectedClub} conversations yet` : "No conversations yet"}
                    </h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
                      {selectedTrendingTag
                        ? "Try another trending topic or clear the filter to see all football conversations."
                        : "Be the first fan to start a conversation. Share your football opinions and get the community talking."}
                    </p>
                    {selectedTrendingTag && (
                      <button
                        type="button"
                        onClick={() => setSelectedTrendingTag(null)}
                        className="mt-3 rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        Clear trending filter
                      </button>
                    )}
                    <button
                      onClick={() => {
                        document
                          .getElementById("fan-zone")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="mt-5 rounded-xl bg-green-700 px-5 py-3 text-sm font-bold text-white hover:bg-green-800"
                    >
                      Start a Conversation
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="space-y-5">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-700">
                Trending
              </p>
              <h3 className="mt-1 text-xl font-black">Around football</h3>

              <div className="mt-5 space-y-2">
                {trending.map((trend, index) => (
                  <div key={trend.tag} className={`rounded-xl p-3 transition ${selectedTrendingTag === trend.tag ? "bg-green-50 ring-1 ring-green-200" : "bg-gray-50"}`}>
                    <button
                      type="button"
                      aria-pressed={selectedTrendingTag === trend.tag}
                      onClick={() => {
                        setSelectedTrendingTag((current) => current === trend.tag ? null : trend.tag);
                        setActiveFootballSection("banters");
                        window.setTimeout(() => document.getElementById("fan-zone")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                      }}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <span className="text-sm font-bold text-green-800">{trend.tag}</span>
                      <span className="text-xs text-gray-500">{trendingCounts[trend.tag] ?? 0} {trendingCounts[trend.tag] === 1 ? "post" : "posts"}</span>
                    </button>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-gray-400">Topic {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => setPostText((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}${trend.tag} `)}
                        className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        Add to draft
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Select a topic to filter fan conversations, or add its hashtag to your draft.
              </p>
              {selectedTrendingTag && (
                <button type="button" onClick={() => setSelectedTrendingTag(null)} className="mt-2 text-xs font-semibold text-gray-600 underline hover:text-gray-900">
                  Clear trending filter
                </button>
              )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-700">
                Communities
              </p>
              <h3 className="mt-1 text-xl font-black">Find your fans</h3>

              <div className="mt-5 space-y-4">
                {clubs.slice(0, 4).map((club) => (
                  <Link
                    key={club.name}
                    href={`/app/sports/clubs/${getClubSlug(club.name)}`}
                    className="flex items-center gap-3 rounded-xl transition hover:bg-gray-50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 p-2">
                      {club.logo ? (
                        <img
                          src={club.logo}
                          alt={`${club.name} crest`}
                          className="h-full w-full object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xl">{club.icon}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{club.name}</p>
                      <p className="text-xs text-gray-400">
                        {club.nickname} community
                      </p>
                    </div>
                    <span className="text-gray-300">→</span>
                  </Link>
                ))}
              </div>

              <a
                href="#clubs"
                className="mt-5 block rounded-xl bg-green-50 py-3 text-center text-sm font-bold text-green-800 transition hover:bg-green-100"
              >
                Explore All Clubs
              </a>
            </div>

            <div className="overflow-hidden rounded-3xl bg-green-950 p-6 text-white">
              <div className="text-3xl">🌍</div>
              <h3 className="mt-4 text-xl font-black">More than football</h3>
              <p className="mt-2 text-sm leading-6 text-green-100">
                VYBE brings your sports interests, social life,
                learning and communities together in one place.
              </p>
              <Link
                href="/app"
                className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-green-950 transition hover:bg-green-50"
              >
                Explore VYBE →
              </Link>
            </div>
          </aside>
        </section>

        {/* FOOTER — ALWAYS VISIBLE */}
        <footer className="mt-12 border-t border-gray-200 py-7 text-center">
          <p className="text-sm font-black text-gray-700">
            VYBE <span className="text-green-700">·</span> Sports World
          </p>
          <p className="mt-2 text-xs text-gray-400">
            One platform. Many worlds. Your world, your people, your story.
          </p>
        </footer>
      </div>
    </main>
  );
}
