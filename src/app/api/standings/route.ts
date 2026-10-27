
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_COMPETITIONS = [
  "PL",
  "CL",
  "PD",
  "BL1",
  "SA",
  "FL1",
] as const;

type CompetitionCode = (typeof ALLOWED_COMPETITIONS)[number];

type StandingEntry = {
  position: number;
  team: {
    id: number;
    name: string;
    shortName?: string | null;
    crest?: string | null;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

type StandingsResponse = {
  competition?: {
    id: number;
    name: string;
    code: string | null;
    emblem: string | null;
  };
  season?: {
    startDate: string;
    endDate: string;
    currentMatchday: number | null;
  };
  standings?: Array<{
    type: string;
    table: StandingEntry[];
  }>;
};

export async function GET(request: NextRequest) {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Football API key is missing. Check .env.local.",
      },
      { status: 500 }
    );
  }

  const requestedCode =
    request.nextUrl.searchParams.get("competition") || "PL";

  if (
    !ALLOWED_COMPETITIONS.includes(
      requestedCode as CompetitionCode
    )
  ) {
    return NextResponse.json(
      {
        error: "Unsupported competition code.",
        allowedCompetitions: ALLOWED_COMPETITIONS,
      },
      { status: 400 }
    );
  }

  const competition = requestedCode as CompetitionCode;

  try {
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${competition}/standings`,
      {
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
        "Football standings API error:",
        response.status,
        details
      );

      return NextResponse.json(
        {
          error:
            response.status === 403
              ? "Your API plan may not include standings for this competition."
              : response.status === 429
                ? "The football API request limit has been reached. Try again shortly."
                : "Unable to retrieve league standings.",
          status: response.status,
        },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const data =
      (await response.json()) as StandingsResponse;

    const totalTable =
      data.standings?.find(
        (standing) => standing.type === "TOTAL"
      )?.table ?? data.standings?.[0]?.table ?? [];

    const table = totalTable.map((entry) => ({
      position: entry.position,
      teamId: entry.team.id,
      team: entry.team.name,
      shortName: entry.team.shortName ?? entry.team.name,
      crest: entry.team.crest ?? null,
      played: entry.playedGames,
      won: entry.won,
      drawn: entry.draw,
      lost: entry.lost,
      goalsFor: entry.goalsFor,
      goalsAgainst: entry.goalsAgainst,
      goalDifference: entry.goalDifference,
      points: entry.points,
    }));

    return NextResponse.json({
      competition: {
        name: data.competition?.name ?? competition,
        code: data.competition?.code ?? competition,
        emblem: data.competition?.emblem ?? null,
      },
      season: data.season ?? null,
      table,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Failed to fetch league standings:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not connect to the football data service.",
      },
      { status: 502 }
    );
  }
}
