"use client";

import { useCallback, useEffect, useState } from "react";

type NewsArticle = {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
  summary: string;
};

type NewsResponse = {
  articles?: NewsArticle[];
  error?: string;
  updatedAt?: string;
};

type ClubNewsProps = {
  clubName: string;
  league: string;
};

function formatPublishedDate(value: string | null) {
  if (!value) return "Publication time unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Publication time unavailable";

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ClubNews({ clubName, league }: ClubNewsProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const loadNews = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ club: clubName, league });
      const response = await fetch(`/api/sports-news?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as NewsResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Could not load club news.");
      }

      setArticles(payload.articles ?? []);
      setUpdatedAt(payload.updatedAt ?? new Date().toISOString());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load club news. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clubName, league]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadNews(), 0);

    return () => window.clearTimeout(initialLoad);
  }, [loadNews]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
            Latest headlines
          </p>
          <h2 className="mt-1 text-2xl font-black text-gray-900">
            {clubName} news
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Recent stories from news publishers. Open a headline to read the full report at its source.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadNews(true)}
          disabled={loading || refreshing}
          className="rounded-xl bg-[#f3f3f1] px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-[#eaeae7] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? "Refreshing…" : "↻ Refresh news"}
        </button>
      </div>

      {updatedAt && !error && (
        <p className="text-xs text-gray-400">
          Feed checked {new Date(updatedAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })} · News provided by Google News RSS
        </p>
      )}

      {error && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadNews(true)}
            className="mt-3 rounded-lg bg-white px-3 py-2 font-bold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-100"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl bg-white p-10 text-center text-sm text-gray-500 shadow-sm ring-1 ring-gray-200/70">
          Loading the latest {clubName} headlines…
        </div>
      ) : !error && articles.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-200/70">
          <div className="text-4xl">📰</div>
          <h3 className="mt-4 text-lg font-black text-gray-900">No recent headlines found</h3>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            There are no matching stories in the feed right now. Try refreshing later.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <article
              key={article.id}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200/70 transition hover:ring-gray-300 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-gray-500">
                <span className="text-gray-800">{article.source}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={article.publishedAt ?? undefined}>
                  {formatPublishedDate(article.publishedAt)}
                </time>
              </div>
              <h3 className="mt-3 text-lg font-bold leading-7 text-gray-900">
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-blue-700"
                >
                  {article.title}
                </a>
              </h3>
              {article.summary && (
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {article.summary}
                </p>
              )}
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900"
              >
                Read full story <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
