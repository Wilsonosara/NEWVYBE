import { NextRequest, NextResponse } from "next/server";

type NewsArticle = {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
  summary: string;
};

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code))
    )
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16))
    )
    .trim();
}

function getTag(item: string, tag: string) {
  const expression = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );
  const match = item.match(expression);
  return match ? decodeXml(match[1]) : "";
}

function stripHtml(value: string) {
  return decodeXml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRss(xml: string): NewsArticle[] {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

  return items
    .map((item, index) => {
      const title = stripHtml(getTag(item, "title"));
      const link = getTag(item, "link").trim();
      const source = stripHtml(getTag(item, "source")) || "Google News";
      const pubDate = getTag(item, "pubDate");
      const description = stripHtml(getTag(item, "description"));

      if (!title || !/^https?:\/\//i.test(link)) return null;

      return {
        id: `${link}-${index}`,
        title,
        link,
        source,
        publishedAt:
          pubDate && !Number.isNaN(new Date(pubDate).getTime())
            ? new Date(pubDate).toISOString()
            : null,
        summary: description.slice(0, 360),
      } satisfies NewsArticle;
    })
    .filter((article): article is NewsArticle => article !== null);
}

export async function GET(request: NextRequest) {
  const club = request.nextUrl.searchParams.get("club")?.trim();
  const league = request.nextUrl.searchParams.get("league")?.trim();

  if (!club || club.length > 100) {
    return NextResponse.json(
      { error: "A valid club name is required." },
      { status: 400 }
    );
  }

  const query = `${club} ${league || "football"} football news`;
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-NG");
  url.searchParams.set("gl", "NG");
  url.searchParams.set("ceid", "NG:en");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": "ProjectOneSportsNews/1.0",
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`The news provider returned status ${response.status}.`);
    }

    const xml = await response.text();
    const articles = parseRss(xml).slice(0, 20);

    return NextResponse.json(
      {
        articles,
        updatedAt: new Date().toISOString(),
        query,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Could not load VYBE sports news:", error);
    return NextResponse.json(
      {
        error:
          "Sports news is temporarily unavailable. Please try refreshing in a moment.",
      },
      { status: 502 }
    );
  }
}
