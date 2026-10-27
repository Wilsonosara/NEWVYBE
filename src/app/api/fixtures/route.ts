
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | null;
  venue?: string | null;
  matchday?: number | null;
  stage?: string | null;
  competition?: {
    name?: string;
    code?: string | null;
    emblem?: string | null;
  };
  homeTeam?: {
    name?: string;
    shortName?: string | null;
    crest?: string | null;
  };
  awayTeam?: {
    name?: string;
    shortName?: string | null;
    crest?: string | null;
  };
  score?: {
    fullTime?: {
      home?: number | null;
      away?: number | null;
    };
    regularTime?: {
      home?: number | null;
      away?: number | null;
    };
    halfTime?: {
      home?: number | null;
      away?: number | null;
    };
  };
};

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
  venue: string | null;
  matchday: number | null;
  stage: string | null;
};

const LIVE_STATUSES = [
  "IN_PLAY",
  "LIVE",
  "PAUSED",
  "HALF_TIME",
  "EXTRA_TIME",
  "PENALTY_SHOOTOUT",
];

const UPCOMING_STATUSES = [
  "TIMED",
  "SCHEDULED",
  "INCOMPLETE",
];

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeTeamName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function getMatchPriority(status: string) {
  if (LIVE_STATUSES.includes(status)) return 0;
  if (UPCOMING_STATUSES.includes(status)) return 1;
  return 2;
}

function getScores(match: FootballDataMatch) {
  const score = match.score;

  return {
    homeScore:
      score?.fullTime?.home ??
      score?.regularTime?.home ??
      score?.halfTime?.home ??
      null,
    awayScore:
      score?.fullTime?.away ??
      score?.regularTime?.away ??
      score?.halfTime?.away ??
      null,
  };
}

function toFixture(match: FootballDataMatch): Fixture {
  const { homeScore, awayScore } = getScores(match);

  return {
    id: match.id,
    date: match.utcDate,
    status: match.status,
    minute: match.minute ?? null,
    competition: match.competition?.name ?? "Football",
    competitionCode: match.competition?.code ?? null,
    competitionLogo: match.competition?.emblem ?? null,
    home:
      match.homeTeam?.shortName ||
      match.homeTeam?.name ||
      "Home",
    homeName: match.homeTeam?.name ?? "Home",
    homeLogo: match.homeTeam?.crest ?? null,
    away:
      match.awayTeam?.shortName ||
      match.awayTeam?.name ||
      "Away",
    awayName: match.awayTeam?.name ?? "Away",
    awayLogo: match.awayTeam?.crest ?? null,
    homeScore,
    awayScore,
    venue: match.venue ?? null,
    matchday: match.matchday ?? null,
    stage: match.stage ?? null,
  };
}

function sortMatches(matches: Fixture[]) {
  return [...matches].sort((a, b) => {
    const priorityDifference =
      getMatchPriority(a.status) -
      getMatchPriority(b.status);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    if (getMatchPriority(a.status) === 0) {
      return (
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
      );
    }

    if (getMatchPriority(a.status) === 1) {
      return (
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
      );
    }

    return (
      new Date(b.date).getTime() -
      new Date(a.date).getTime()
    );
  });
}

function matchesTeam(fixture: Fixture, requestedTeam: string) {
  const target = normalizeTeamName(requestedTeam);

  if (!target) return true;

  const homeNames = [
    fixture.home,
    fixture.homeName,
  ].map(normalizeTeamName);

  const awayNames = [
    fixture.away,
    fixture.awayName,
  ].map(normalizeTeamName);

  return [...homeNames, ...awayNames].some(
    (name) =>
      name === target ||
      name.startsWith(target) ||
      target.startsWith(name)
  );
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Football API key is missing. Check FOOTBALL_DATA_API_KEY in .env.local and restart the development server.",
      },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;

  const competition = searchParams
    .get("competition")
    ?.trim()
    .toUpperCase();

  const team = searchParams.get("team")?.trim() ?? "";

  if (
    competition &&
    !/^[A-Z0-9]{2,8}$/.test(competition)
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid competition code. Use a valid football-data.org competition code.",
      },
      { status: 400 }
    );
  }

  if (team.length > 100) {
    return NextResponse.json(
      { error: "Team name must be 100 characters or fewer." },
      { status: 400 }
    );
  }

  const today = new Date();

  const dateFrom = new Date(today);
  dateFrom.setUTCDate(dateFrom.getUTCDate() - 1);

  const dateTo = new Date(today);
  dateTo.setUTCDate(dateTo.getUTCDate() + 7);

  const params = new URLSearchParams({
    dateFrom: formatDate(dateFrom),
    dateTo: formatDate(dateTo),
  });

  if (competition) {
    params.set("competitions", competition);
  }

  try {
    const response = await fetch(
      `https://api.football-data.org/v4/matches?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "X-Auth-Token": apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const details = await response.text();

      console.error(
        "Football-data.org error:",
        response.status,
        details
      );

      if (response.status === 401) {
        return NextResponse.json(
          {
            error:
              "The football API rejected the key. Check FOOTBALL_DATA_API_KEY in .env.local.",
            status: 401,
          },
          { status: 401 }
        );
      }

      if (response.status === 403) {
        return NextResponse.json(
          {
            error:
              "Access to this competition or match may be restricted by your football API plan.",
            status: 403,
          },
          { status: 403 }
        );
      }

      if (response.status === 429) {
        return NextResponse.json(
          {
            error:
              "The football API request limit has been reached. Please try again shortly.",
            status: 429,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: "Unable to retrieve football fixtures.",
          status: response.status,
        },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      matches?: FootballDataMatch[];
    };

    let matches = (data.matches ?? []).map(toFixture);

    if (team) {
      matches = matches.filter((fixture) =>
        matchesTeam(fixture, team)
      );
    }

    matches = sortMatches(matches);

    return NextResponse.json(
      {
        matches,
        updatedAt: new Date().toISOString(),
        competition: competition ?? null,
        team: team || null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "Failed to fetch football fixtures:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not connect to the football data service. Please try again.",
      },
      { status: 502 }
    );
  }
}
