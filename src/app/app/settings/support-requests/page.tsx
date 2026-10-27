
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../../utils/supabase/client";

type SupportRequest = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusLabel(status: SupportRequest["status"]) {
  switch (status) {
    case "open":
      return "Open";
    case "in_progress":
      return "In Progress";
    case "resolved":
      return "Resolved";
    default:
      return "Unknown";
  }
}

export default function SupportRequestsPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] =
    useState<SupportRequest | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: queryError } = await supabase
        .from("support_requests")
        .select("id, name, email, message, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (queryError) {
        throw queryError;
      }

      setRequests((data ?? []) as SupportRequest[]);
    } catch (err) {
      console.error("Could not load support requests:", err);
      setError(
        "We couldn't load your support requests. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (active) {
        await loadRequests();
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [loadRequests]);

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto min-h-screen w-full max-w-2xl border-x border-gray-100">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur">
          <Link
            href="/app/settings"
            aria-label="Back to settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl transition hover:bg-gray-100"
          >
            ←
          </Link>

          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">
              My Support Requests
            </h1>
            <p className="text-sm text-gray-500">
              Track the requests you have submitted
            </p>
          </div>
        </header>

        <div className="space-y-5 px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">
                Your requests
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {requests.length}{" "}
                {requests.length === 1 ? "request" : "requests"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadRequests()}
              disabled={loading}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-gray-200 bg-gray-50 p-4"
            >
              <p className="text-sm text-gray-700">{error}</p>
              <button
                type="button"
                onClick={() => void loadRequests()}
                className="mt-3 text-sm font-semibold underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-gray-200 px-4 py-12 text-center">
              <p className="text-sm text-gray-500">
                Loading your support requests...
              </p>
            </div>
          ) : !error && requests.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-600">
                ?
              </div>

              <h3 className="mt-4 text-base font-semibold">
                No support requests yet
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
                When you contact support through the Help Center,
                your requests will appear here.
              </p>

              <Link
                href="/app/settings/help"
                className="mt-5 inline-flex rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium transition hover:bg-gray-50"
              >
                Visit Help Center
              </Link>
            </div>
          ) : !error ? (
            <div className="space-y-3">
              {requests.map((request) => (
                <article
                  key={request.id}
                  className="overflow-hidden rounded-2xl border border-gray-200"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRequest(
                        selectedRequest?.id === request.id
                          ? null
                          : request
                      )
                    }
                    aria-expanded={selectedRequest?.id === request.id}
                    className="w-full px-4 py-4 text-left transition hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">
                          Submitted {formatDate(request.created_at)}
                        </p>

                        <h3 className="mt-2 text-sm font-semibold">
                          Support request
                        </h3>

                        <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-600">
                          {request.message}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                          request.status === "resolved"
                            ? "border-gray-200 bg-gray-100 text-gray-700"
                            : request.status === "in_progress"
                              ? "border-gray-300 bg-white text-gray-700"
                              : "border-gray-200 bg-white text-gray-600"
                        }`}
                      >
                        {statusLabel(request.status)}
                      </span>
                    </div>

                    <p className="mt-3 text-xs font-medium text-gray-500">
                      {selectedRequest?.id === request.id
                        ? "Hide details ↑"
                        : "View details ↓"}
                    </p>
                  </button>

                  {selectedRequest?.id === request.id && (
                    <div className="space-y-3 border-t border-gray-100 bg-gray-50 px-4 py-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Submitted by
                        </p>
                        <p className="mt-1 text-sm text-gray-800">
                          {request.name}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Contact email
                        </p>
                        <p className="mt-1 break-all text-sm text-gray-800">
                          {request.email}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Request details
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                          {request.message}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          Current status
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {statusLabel(request.status)}
                        </p>
                      </div>

                      <p className="border-t border-gray-200 pt-3 text-xs leading-5 text-gray-500">
                        Support team replies will be available here
                        once the reply feature is implemented.
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : null}

          <div className="border-t border-gray-100 pt-5">
            <Link
              href="/app/settings/help"
              className="text-sm text-gray-600 underline underline-offset-4 hover:text-black"
            >
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
