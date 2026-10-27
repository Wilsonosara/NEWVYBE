
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePosts } from "../PostContext";

type Trend = { tag: string; keywords: string[] };

const trendingTopics: Trend[] = [
  { tag: "#FootballTalk", keywords: ["footballtalk", "football", "soccer"] },
  {
    tag: "#TechCareers",
    keywords: ["techcareers", "tech careers", "technology", "tech", "career"],
  },
  {
    tag: "#MondayMotivation",
    keywords: ["mondaymotivation", "monday motivation", "motivation"],
  },
  {
    tag: "#GamingCommunity",
    keywords: [
      "gamingcommunity",
      "gaming",
      "gamer",
      "videogame",
      "video game",
    ],
  },
  {
    tag: "#PremierLeague",
    keywords: ["premierleague", "premier league", "epl"],
  },
  { tag: "#Arsenal", keywords: ["arsenal"] },
  { tag: "#Chelsea", keywords: ["chelsea"] },
  { tag: "#Liverpool", keywords: ["liverpool"] },
  { tag: "#UCL", keywords: ["#ucl", "ucl", "champions league"] },
  {
    tag: "#ElClasico",
    keywords: ["elclasico", "el clasico", "real madrid", "barcelona"],
  },
];

function normalize(value: string) {
  return value.toLocaleLowerCase();
}

function postMatchesTopic(content: string, topic: Trend) {
  const normalized = normalize(content);
  return topic.keywords.some((keyword) =>
    normalized.includes(normalize(keyword)),
  );
}

function topicForTag(tag: string): Trend {
  const known = trendingTopics.find(
    (topic) => topic.tag.toLowerCase() === tag.toLowerCase(),
  );

  if (known) return known;

  const keyword = tag
    .replace(/^#/, "")
    .replaceAll("_", " ")
    .toLowerCase();

  return {
    tag: tag.startsWith("#") ? tag : `#${tag}`,
    keywords: [keyword, keyword.replaceAll(" ", "")],
  };
}

export default function TrendingPage() {
  const { posts } = usePosts();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    const readTopicFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const topic = params.get("topic");

      setActiveTag(topic?.trim() ? topicForTag(topic.trim()).tag : null);
    };

    readTopicFromUrl();

    window.addEventListener("popstate", readTopicFromUrl);

    return () => {
      window.removeEventListener("popstate", readTopicFromUrl);
    };
  }, []);

  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const topic of trendingTopics) {
      counts[topic.tag] = posts.filter((post) =>
        postMatchesTopic(post.content || "", topic),
      ).length;
    }

    return counts;
  }, [posts]);

  const rankedTopics = useMemo(
    () =>
      [...trendingTopics].sort(
        (a, b) =>
          (topicCounts[b.tag] ?? 0) - (topicCounts[a.tag] ?? 0)
      ),
    [topicCounts],
  );

  const topTopic = rankedTopics[0] ?? trendingTopics[0];

  const chooseTopic = useCallback((tag: string) => {
    const topic = topicForTag(tag);

    setActiveTag(topic.tag);

    const url = `/app/trending?topic=${encodeURIComponent(topic.tag)}`;

    window.history.pushState({}, "", url);
  }, []);

  const defaultTopic = activeTag ?? topTopic.tag;
  const activeTopic = useMemo(
    () => topicForTag(defaultTopic),
    [defaultTopic],
  );
  const matchingPosts = useMemo(
    () =>
      posts.filter((post) =>
        postMatchesTopic(post.content || "", activeTopic),
      ),
    [posts, activeTopic],
  );

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-gray-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-7">
          <Link
            href="/app/explore"
            className="text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            ← Explore
          </Link>

          <p className="mt-5 text-sm font-medium text-gray-500">
            VYBE · All worlds
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Trending
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
            Explore matching conversations from Sports, Social, Career, and
            every other world on VYBE.
          </p>
        </header>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Trending topics
          </h2>

          <div className="flex flex-wrap gap-2">
            {rankedTopics.map((topic) => (
              <button
                key={topic.tag}
                type="button"
                onClick={() => chooseTopic(topic.tag)}
                aria-pressed={defaultTopic === topic.tag}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  defaultTopic === topic.tag
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {topic.tag}

                <span
                  className={`ml-2 text-xs ${
                    defaultTopic === topic.tag
                      ? "text-gray-300"
                      : "text-gray-400"
                  }`}
                >
                  {topicCounts[topic.tag] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section aria-live="polite">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Posts about {activeTopic.tag}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {matchingPosts.length}{" "}
                {matchingPosts.length === 1
                  ? "matching post"
                  : "matching posts"}{" "}
                across all worlds
              </p>
            </div>

            <Link
              href="/app/create"
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Create a post
            </Link>
          </div>

          {matchingPosts.length > 0 ? (
            <div className="space-y-4">
              {matchingPosts.map((post) => (
                <article
                  key={post.id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {post.author || "VYBE member"}
                      </p>

                      <p className="truncate text-xs text-gray-500">
                        {post.username || ""}
                        {post.world ? ` · ${post.world}` : ""}
                      </p>
                    </div>

                    {post.world && (
                      <span className="shrink-0 rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-500">
                        {post.world}
                      </span>
                    )}
                  </div>

                  {post.content && (
                    <p className="whitespace-pre-wrap break-words px-4 pb-4 text-sm leading-6 text-gray-800">
                      {post.content}
                    </p>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                    <span className="text-xs text-gray-400">
                      Shared on VYBE
                    </span>

                    <Link
                      href={`/app?post=${post.id}`}
                      className="text-xs font-semibold text-gray-700 hover:text-black"
                    >
                      View post →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-12 text-center">
              <h3 className="text-sm font-semibold text-gray-800">
                No posts about {activeTopic.tag} yet
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                When members publish matching posts in any world, they will
                appear here.
              </p>

              <Link
                href="/app/create"
                className="mt-4 inline-flex rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Create a post
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
