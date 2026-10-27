
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { usePosts } from "../PostContext";
import MediaDisplay from "../MediaDisplay";
import { createClient } from "../../../../utils/supabase/client";

type Section = "Feed" | "Jobs" | "People";

type Job = {
  id: number;
  employer_id: string;
  company_name: string;
  title: string;
  description: string;
  location: string | null;
  salary_range: string | null;
  application_url: string | null;
  employment_type: string;
  created_at: string;
  updated_at?: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type FollowRow = {
  follower_id: string;
  following_id: string;
};

type FollowCounts = {
  followers: number;
  following: number;
};

const categories = [
  "All",
  "Career Journeys",
  "Career Advice",
  "Technology",
  "Business",
  "Networking",
];

const employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Freelance",
  "Temporary",
];

const careerKeywords: Record<string, string[]> = {
  "Career Journeys": [
    "career",
    "journey",
    "experience",
    "growth",
    "achievement",
    "challenge",
    "lesson",
    "professional",
    "work",
    "success",
    "failure",
    "learning",
  ],
  "Career Advice": [
    "advice",
    "skill",
    "skills",
    "learning",
    "mentor",
    "leadership",
    "resume",
    "interview",
    "improve",
    "development",
    "guidance",
  ],
  Technology: [
    "tech",
    "technology",
    "software",
    "coding",
    "developer",
    "programming",
    "data",
    "cybersecurity",
    "digital",
    "ai",
  ],
  Business: [
    "business",
    "startup",
    "entrepreneur",
    "entrepreneurship",
    "company",
    "customer",
    "sales",
    "marketing",
    "founder",
    "finance",
  ],
  Networking: [
    "network",
    "connect",
    "connection",
    "professional",
    "community",
    "collaborate",
    "collaboration",
    "partnership",
    "relationship",
  ],
};

const leaderKeywords = [
  "ceo",
  "chief executive",
  "founder",
  "co-founder",
  "entrepreneur",
  "executive",
  "business owner",
  "director",
  "managing director",
  "business leader",
];

function matchesCategory(content: string, category: string) {
  if (category === "All") return true;

  const text = content.toLowerCase();

  return (careerKeywords[category] ?? []).some((word) =>
    text.includes(word)
  );
}

function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CareerPage() {
  const { posts, addPost } = usePosts();

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(
    null
  );

  if (supabaseRef.current == null) {
    supabaseRef.current = createClient();
  }

  const supabase = supabaseRef.current;

  const [section, setSection] = useState<Section>("Feed");
  const [activeCategory, setActiveCategory] = useState("All");

  const [postSearch, setPostSearch] = useState("");
  const [postText, setPostText] = useState("");
  const [postMedia, setPostMedia] = useState<File | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [myId, setMyId] = useState("");

  const [followedProfileIds, setFollowedProfileIds] = useState<string[]>(
    []
  );
  const [followCounts, setFollowCounts] = useState<
    Record<string, FollowCounts>
  >({});
  const [pendingFollowIds, setPendingFollowIds] = useState<string[]>([]);
  const followRequestsRef = useRef<Set<string>>(new Set());

  const [jobsLoading, setJobsLoading] = useState(true);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [isPostingJob, setIsPostingJob] = useState(false);

  const [jobSearch, setJobSearch] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("All types");
  const [jobLocationFilter, setJobLocationFilter] = useState("All locations");

  const [peopleSearch, setPeopleSearch] = useState("");
  const [peopleFilter, setPeopleFilter] = useState<"All" | "Leaders">(
    "All"
  );

  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);

  const [jobForm, setJobForm] = useState({
    title: "",
    company_name: "",
    description: "",
    location: "",
    salary_range: "",
    employment_type: "Full-time",
    application_url: "",
  });

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    setError("");
  }, []);

  const showError = useCallback((text: string) => {
    setError(text);
    setNotice("");
  }, []);

  const loadCareerData = useCallback(async () => {
    setJobsLoading(true);
    setPeopleLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      const currentUserId = user?.id ?? "";
      setMyId(currentUserId);

      const [jobsResult, profilesResult] = await Promise.all([
        supabase
          .from("jobs")
          .select(
            "id, employer_id, company_name, title, description, location, salary_range, application_url, employment_type, created_at, updated_at"
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("profiles")
          .select("id, username, display_name, bio, avatar_url")
          .limit(200),
      ]);

      if (jobsResult.error) throw jobsResult.error;

      setJobs((jobsResult.data ?? []) as Job[]);

      let loadedProfiles: Profile[] = [];

      if (profilesResult.error) {
        console.error(
          "Could not load Career profiles:",
          profilesResult.error
        );
        setProfiles([]);
        setFollowCounts({});
        setFollowedProfileIds([]);
      } else {
        loadedProfiles = (profilesResult.data ?? []) as Profile[];
        setProfiles(loadedProfiles);
      }

      const allFollowsResult = await supabase
        .from("follows")
        .select("follower_id, following_id");

      if (allFollowsResult.error) {
        console.error(
          "Could not load public follow counts:",
          allFollowsResult.error
        );
      } else {
        const followRows = (allFollowsResult.data ?? []) as FollowRow[];
        const counts: Record<string, FollowCounts> = {};

        for (const profile of loadedProfiles) {
          counts[profile.id] = {
            followers: 0,
            following: 0,
          };
        }

        for (const follow of followRows) {
          if (counts[follow.following_id]) {
            counts[follow.following_id].followers += 1;
          }

          if (counts[follow.follower_id]) {
            counts[follow.follower_id].following += 1;
          }
        }

        setFollowCounts(counts);

        if (currentUserId) {
          setFollowedProfileIds(
            followRows
              .filter((follow) => follow.follower_id === currentUserId)
              .map((follow) => follow.following_id)
          );
        } else {
          setFollowedProfileIds([]);
        }
      }

      if (currentUserId && loadedProfiles.length > 0) {
        const profileIds = loadedProfiles.map((profile) => profile.id);

        const myFollowsResult = await supabase
          .from("follows")
          .select("follower_id, following_id")
          .eq("follower_id", currentUserId)
          .in("following_id", profileIds);

        if (myFollowsResult.error) {
          console.error(
            "Could not load your following list:",
            myFollowsResult.error
          );
        } else {
          const myFollowRows = (myFollowsResult.data ?? []) as FollowRow[];

          setFollowedProfileIds(
            myFollowRows.map((follow) => follow.following_id)
          );
        }
      } else {
        setFollowedProfileIds([]);
      }
    } catch (err) {
      console.error("Could not load Career data:", err);
      showError(
        "Some Career information could not be loaded. Please refresh and try again."
      );
    } finally {
      setJobsLoading(false);
      setPeopleLoading(false);
    }
  }, [supabase, showError]);

  useEffect(() => {
    const initialLoad = window.setTimeout(
      () => void loadCareerData(),
      0
    );

    return () => window.clearTimeout(initialLoad);
  }, [loadCareerData]);

  const careerPosts = useMemo(
    () =>
      posts.filter(
        (post) => post.world?.toLowerCase() === "career"
      ),
    [posts]
  );

  const filteredPosts = useMemo(() => {
    const normalizedSearch = postSearch.toLowerCase().trim();

    return careerPosts.filter((post) => {
      const searchableText =
        `${post.author} ${post.username} ${post.content}`.toLowerCase();

      return (
        searchableText.includes(normalizedSearch) &&
        matchesCategory(post.content, activeCategory)
      );
    });
  }, [careerPosts, postSearch, activeCategory]);

  const filteredJobs = useMemo(() => {
    const normalizedSearch = jobSearch.toLowerCase().trim();

    return jobs.filter((job) => {
      const searchableText = [
        job.title,
        job.company_name,
        job.description,
        job.location ?? "",
        job.salary_range ?? "",
        job.employment_type,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(normalizedSearch);

      const matchesType =
        jobTypeFilter === "All types" ||
        job.employment_type === jobTypeFilter;

      const matchesLocation =
        jobLocationFilter === "All locations" ||
        (job.location ?? "").toLowerCase() ===
          jobLocationFilter.toLowerCase();

      return matchesSearch && matchesType && matchesLocation;
    });
  }, [jobs, jobSearch, jobTypeFilter, jobLocationFilter]);

  const jobLocations = useMemo(
    () =>
      Array.from(
        new Set(
          jobs
            .map((job) => job.location?.trim())
            .filter((location): location is string => Boolean(location))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [jobs]
  );

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = peopleSearch.toLowerCase().trim();

    return profiles.filter((profile) => {
      if (profile.id === myId) return false;

      const searchableText = [
        profile.display_name ?? "",
        profile.username ?? "",
        profile.bio ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(normalizedSearch);

      const isLeader = leaderKeywords.some((keyword) =>
        searchableText.includes(keyword)
      );

      return (
        matchesSearch &&
        (peopleFilter === "All" || isLeader)
      );
    });
  }, [profiles, myId, peopleSearch, peopleFilter]);

  async function toggleFollow(profile: Profile) {
    const targetId = profile.id;

    if (!myId) {
      showError("Please log in before following other members.");
      return;
    }

    if (targetId === myId) return;

    if (followRequestsRef.current.has(targetId)) return;

    followRequestsRef.current.add(targetId);
    setPendingFollowIds((current) =>
      current.includes(targetId) ? current : [...current, targetId]
    );
    setError("");
    setNotice("");

    const wasFollowing = followedProfileIds.includes(targetId);

    try {
      if (wasFollowing) {
        const { data, error: deleteError } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", myId)
          .eq("following_id", targetId)
          .select("follower_id, following_id");

        if (deleteError) throw deleteError;

        if (!data || data.length === 0) {
          const { data: stillFollowing, error: checkError } = await supabase
            .from("follows")
            .select("follower_id")
            .eq("follower_id", myId)
            .eq("following_id", targetId)
            .maybeSingle();

          if (checkError) throw checkError;

          if (stillFollowing) {
            throw new Error(
              "Your follow could not be removed. Please check your database permissions and try again."
            );
          }
        }

        setFollowedProfileIds((current) =>
          current.filter((id) => id !== targetId)
        );

        setFollowCounts((current) => {
          const next = { ...current };

          if (next[targetId]) {
            next[targetId] = {
              ...next[targetId],
              followers: Math.max(0, next[targetId].followers - 1),
            };
          }

          if (next[myId]) {
            next[myId] = {
              ...next[myId],
              following: Math.max(0, next[myId].following - 1),
            };
          }

          return next;
        });

        showNotice(
          `You unfollowed ${profile.display_name?.trim() || profile.username || "this member"}.`
        );
      } else {
        const { data: insertedFollow, error: insertError } = await supabase
          .from("follows")
          .insert({
            follower_id: myId,
            following_id: targetId,
          })
          .select("follower_id, following_id")
          .maybeSingle();

        if (insertError) {
          if (insertError.code === "23505") {
            setFollowedProfileIds((current) =>
              current.includes(targetId) ? current : [...current, targetId]
            );
            showNotice(
              `You are already following ${profile.display_name?.trim() || profile.username || "this member"}.`
            );
            return;
          }

          throw insertError;
        }

        setFollowedProfileIds((current) =>
          current.includes(targetId) ? current : [...current, targetId]
        );

        setFollowCounts((current) => {
          const next = { ...current };

          next[targetId] = {
            followers: (next[targetId]?.followers ?? 0) + 1,
            following: next[targetId]?.following ?? 0,
          };

          if (next[myId]) {
            next[myId] = {
              ...next[myId],
              following: next[myId].following + 1,
            };
          }

          return next;
        });

        if (insertedFollow) {
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: targetId,
              actor_id: myId,
              type: "follow",
              message: "started following you",
            });

          if (notificationError) {
            console.error(
              "Follow succeeded, but the follow notification could not be saved:",
              notificationError
            );
          }
        }

        showNotice(
          `You are now following ${profile.display_name?.trim() || profile.username || "this member"}.`
        );
      }
    } catch (err) {
      console.error("Could not update follow relationship:", err);
      showError(
        err instanceof Error
          ? err.message
          : "Your follow relationship could not be updated. Please try again."
      );
    } finally {
      followRequestsRef.current.delete(targetId);
      setPendingFollowIds((current) =>
        current.filter((id) => id !== targetId)
      );
    }
  }

  async function publishPost() {
    const content = postText.trim();

    if (!content && !postMedia) {
      showError("Write something or choose a photo or video first.");
      return;
    }

    if (isPublishing) return;

    setIsPublishing(true);
    setError("");
    setNotice("");

    try {
      await addPost(content, "Career", postMedia ?? undefined);

      setPostText("");
      setPostMedia(null);
      setActiveCategory("All");
      setPostSearch("");
      showNotice("Your Career post has been published.");
    } catch (err) {
      console.error("Could not publish Career post:", err);
      showError(
        err instanceof Error
          ? err.message
          : "Your post could not be published. Please try again."
      );
    } finally {
      setIsPublishing(false);
    }
  }

  function resetJobForm() {
    setJobForm({
      title: "",
      company_name: "",
      description: "",
      location: "",
      salary_range: "",
      employment_type: "Full-time",
      application_url: "",
    });

    setEditingJobId(null);
    setShowJobForm(false);
  }

  function startEditingJob(job: Job) {
    setJobForm({
      title: job.title,
      company_name: job.company_name,
      description: job.description,
      location: job.location ?? "",
      salary_range: job.salary_range ?? "",
      employment_type: job.employment_type || "Full-time",
      application_url: job.application_url ?? "",
    });

    setEditingJobId(job.id);
    setShowJobForm(true);
    setSection("Jobs");
    setNotice("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPostingJob) return;

    if (!myId) {
      showError("Please log in before publishing a job.");
      return;
    }

    const title = jobForm.title.trim();
    const companyName = jobForm.company_name.trim();
    const description = jobForm.description.trim();
    const applicationUrl = safeExternalUrl(
      jobForm.application_url.trim()
    );

    if (!title || !companyName || !description) {
      showError("Please enter the job title, company, and description.");
      return;
    }

    if (!applicationUrl) {
      showError(
        "Enter a valid application link beginning with https:// or http://."
      );
      return;
    }

    setIsPostingJob(true);
    setError("");
    setNotice("");

    try {
      const jobValues = {
        title,
        company_name: companyName,
        description,
        location: jobForm.location.trim() || null,
        salary_range: jobForm.salary_range.trim() || null,
        employment_type: jobForm.employment_type,
        application_url: applicationUrl,
        updated_at: new Date().toISOString(),
      };

      if (editingJobId !== null) {
        const { data, error: updateError } = await supabase
          .from("jobs")
          .update(jobValues)
          .eq("id", editingJobId)
          .eq("employer_id", myId)
          .select(
            "id, employer_id, company_name, title, description, location, salary_range, application_url, employment_type, created_at, updated_at"
          )
          .maybeSingle();

        if (updateError) throw updateError;

        if (!data) {
          throw new Error(
            "This job could not be updated. You can only edit jobs you posted."
          );
        }

        setJobs((current) =>
          current.map((job) =>
            job.id === editingJobId ? (data as Job) : job
          )
        );

        showNotice("Your job listing has been updated.");
      } else {
        const { data, error: insertError } = await supabase
          .from("jobs")
          .insert({
            ...jobValues,
            employer_id: myId,
          })
          .select(
            "id, employer_id, company_name, title, description, location, salary_range, application_url, employment_type, created_at, updated_at"
          )
          .single();

        if (insertError) throw insertError;

        setJobs((current) => [data as Job, ...current]);
        showNotice("Your job is now available for others to discover.");
      }

      resetJobForm();
    } catch (err) {
      console.error("Could not save job:", err);
      showError(
        err instanceof Error
          ? err.message
          : "Your job could not be saved. Please try again."
      );
    } finally {
      setIsPostingJob(false);
    }
  }

  async function deleteJob(job: Job) {
    const confirmed = window.confirm(
      `Remove "${job.title}" from available jobs?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      const { data, error: deleteError } = await supabase
        .from("jobs")
        .delete()
        .eq("id", job.id)
        .eq("employer_id", myId)
        .select("id");

      if (deleteError) throw deleteError;

      if (!data?.length) {
        throw new Error(
          "This job could not be removed. You can only remove jobs you posted."
        );
      }

      setJobs((current) => current.filter((item) => item.id !== job.id));
      showNotice("The job listing has been removed.");
    } catch (err) {
      console.error("Could not remove job:", err);
      showError(
        err instanceof Error
          ? err.message
          : "The job could not be removed. Please try again."
      );
    }
  }

  const sections: {
    name: Section;
    icon: string;
    description: string;
  }[] = [
    { name: "Feed", icon: "▤", description: "Career stories" },
    { name: "Jobs", icon: "▣", description: "Find opportunities" },
    { name: "People", icon: "◎", description: "Meet professionals" },
  ];

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-7">
        <header className="mb-6">
          <Link
            href="/app/explore"
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-900"
          >
            <span aria-hidden="true">←</span>
            Explore worlds
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">
                <span className="h-2 w-2 rounded-full bg-gray-900" />
                VYBE World
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Career<span className="text-gray-400">.</span>
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
                Share your journey. Discover opportunities. Connect
                with people building the future.
              </p>
            </div>

            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-white text-2xl sm:flex">
              💼
            </div>
          </div>
        </header>

        <nav
          aria-label="Career sections"
          className="mb-6 grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-white p-2"
        >
          {sections.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                setSection(item.name);
                setNotice("");
                setError("");
              }}
              aria-pressed={section === item.name}
              className={`rounded-xl px-2 py-3 text-left transition sm:px-4 ${
                section === item.name
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span aria-hidden="true">{item.icon}</span>
                {item.name}
              </span>
              <span
                className={`mt-1 hidden text-xs sm:block ${
                  section === item.name
                    ? "text-gray-300"
                    : "text-gray-500"
                }`}
              >
                {item.description}
              </span>
            </button>
          ))}
        </nav>

        {notice && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        {section === "Feed" && (
          <>
            <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg">
                  ✍️
                </div>
                <div>
                  <h2 className="font-semibold">Share your journey</h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Your experience could inspire someone else.
                  </p>
                </div>
              </div>

              <textarea
                value={postText}
                onChange={(event) => {
                  setPostText(event.target.value);
                  setError("");
                  setNotice("");
                }}
                placeholder="What are you learning, building, or working towards?"
                rows={4}
                maxLength={5000}
                disabled={isPublishing}
                className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm leading-6 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white disabled:opacity-60"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50">
                  <span aria-hidden="true">＋</span>
                  Photo or video
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="sr-only"
                    disabled={isPublishing}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;

                      if (!file) return;

                      if (
                        !file.type.startsWith("image/") &&
                        !file.type.startsWith("video/")
                      ) {
                        showError("Choose an image or video file.");
                        event.target.value = "";
                        return;
                      }

                      setPostMedia(file);
                      setError("");
                      setNotice("");
                    }}
                  />
                </label>

                <span className="text-xs text-gray-500">
                  {postText.length}/5000
                </span>
              </div>

              {postMedia && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <span className="min-w-0 truncate text-sm text-gray-600">
                    {postMedia.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPostMedia(null)}
                    className="shrink-0 rounded-full px-3 py-1 text-sm text-gray-600 hover:bg-gray-200"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => void publishPost()}
                  disabled={
                    isPublishing || (!postText.trim() && !postMedia)
                  }
                  className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPublishing ? "Publishing..." : "Publish post"}
                </button>
              </div>
            </section>

            <section className="mb-5">
              <label
                htmlFor="career-post-search"
                className="mb-2 block text-sm font-medium"
              >
                Search Career posts
              </label>
              <input
                id="career-post-search"
                value={postSearch}
                onChange={(event) => setPostSearch(event.target.value)}
                placeholder="Search people, experiences, advice or ideas..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
              />
            </section>

            <nav
              aria-label="Career categories"
              className="mb-5 flex gap-2 overflow-x-auto pb-2"
            >
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  aria-pressed={activeCategory === category}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                    activeCategory === category
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {category}
                </button>
              ))}
            </nav>

            <section aria-label="Career community posts" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">
                  {activeCategory === "All"
                    ? "Community feed"
                    : activeCategory}
                </h2>
                <span className="text-sm text-gray-500">
                  {filteredPosts.length}{" "}
                  {filteredPosts.length === 1 ? "post" : "posts"}
                </span>
              </div>

              {filteredPosts.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-7 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">
                    ✨
                  </div>
                  <h3 className="font-semibold">
                    {careerPosts.length === 0
                      ? "Your Career community starts here"
                      : "No matching posts"}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                    {careerPosts.length === 0
                      ? "Share a career journey, a lesson you have learned, a photo from your work, or advice that could help someone else."
                      : "Try another category or search term, or share something new."}
                  </p>
                  {careerPosts.length === 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .querySelector<HTMLTextAreaElement>(
                            'textarea[placeholder^="What are you learning"]'
                          )
                          ?.focus()
                      }
                      className="mt-4 rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-semibold hover:bg-gray-100"
                    >
                      Share your story
                    </button>
                  )}
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <article
                    key={post.id}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 text-sm font-bold">
                          {post.author.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="break-words font-semibold">
                            {post.author}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {post.username}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {post.time}
                          </p>
                        </div>

                        <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">
                          Career
                        </span>
                      </div>

                      {post.content && (
                        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-gray-800">
                          {post.content}
                        </p>
                      )}
                    </div>

                    {post.mediaId && post.mediaType && (
                      <div className="border-t border-gray-100">
                        <MediaDisplay
                          mediaId={post.mediaId}
                          mediaType={post.mediaType}
                          mediaName={post.mediaName}
                        />
                      </div>
                    )}
                  </article>
                ))
              )}
            </section>
          </>
        )}

        {section === "Jobs" && (
          <section className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                    Career opportunities
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    Find your next move.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Discover opportunities shared by members of the
                    VYBE community.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (showJobForm) {
                      resetJobForm();
                    } else {
                      setEditingJobId(null);
                      setJobForm({
                        title: "",
                        company_name: "",
                        description: "",
                        location: "",
                        salary_range: "",
                        employment_type: "Full-time",
                        application_url: "",
                      });
                      setShowJobForm(true);
                      setError("");
                      setNotice("");
                    }
                  }}
                  className="shrink-0 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold transition hover:bg-gray-100"
                >
                  {showJobForm ? "Cancel" : "+ Post a job"}
                </button>
              </div>
            </div>

            {showJobForm && (
              <form
                onSubmit={(event) => void submitJob(event)}
                className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6"
              >
                <div>
                  <h3 className="text-lg font-semibold">
                    {editingJobId !== null
                      ? "Edit job listing"
                      : "Post an available job"}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Share the opportunity and link applicants directly
                    to your external application page. VYBE will
                    not collect applications.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Job title *
                    <input
                      required
                      maxLength={150}
                      value={jobForm.title}
                      onChange={(event) =>
                        setJobForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      placeholder="e.g. Product Designer"
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 font-normal outline-none focus:border-gray-400 focus:bg-white"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Company or organisation *
                    <input
                      required
                      maxLength={150}
                      value={jobForm.company_name}
                      onChange={(event) =>
                        setJobForm((current) => ({
                          ...current,
                          company_name: event.target.value,
                        }))
                      }
                      placeholder="Company name"
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 font-normal outline-none focus:border-gray-400 focus:bg-white"
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium">
                  Job description *
                  <textarea
                    required
                    maxLength={10000}
                    rows={5}
                    value={jobForm.description}
                    onChange={(event) =>
                      setJobForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Describe the role, responsibilities, qualifications and how to apply..."
                    className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 font-normal leading-6 outline-none focus:border-gray-400 focus:bg-white"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Location
                    <input
                      maxLength={200}
                      value={jobForm.location}
                      onChange={(event) =>
                        setJobForm((current) => ({
                          ...current,
                          location: event.target.value,
                        }))
                      }
                      placeholder="e.g. Lagos or Remote"
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 font-normal outline-none focus:border-gray-400 focus:bg-white"
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Salary range
                    <input
                      maxLength={150}
                      value={jobForm.salary_range}
                      onChange={(event) =>
                        setJobForm((current) => ({
                          ...current,
                          salary_range: event.target.value,
                        }))
                      }
                      placeholder="e.g. ₦300,000–₦500,000 monthly"
                      className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 font-normal outline-none focus:border-gray-400 focus:bg-white"
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium">
                  Employment type
                  <select
                    value={jobForm.employment_type}
                    onChange={(event) =>
                      setJobForm((current) => ({
                        ...current,
                        employment_type: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 font-normal outline-none focus:border-gray-400 focus:bg-white"
                  >
                    {employmentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  External application link *
                  <input
                    required
                    type="url"
                    maxLength={2000}
                    value={jobForm.application_url}
                    onChange={(event) =>
                      setJobForm((current) => ({
                        ...current,
                        application_url: event.target.value,
                      }))
                    }
                    placeholder="https://company.com/careers/apply"
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 font-normal outline-none focus:border-gray-400 focus:bg-white"
                  />
                  <span className="mt-2 block text-xs leading-5 text-gray-500">
                    Applicants will open this link to apply on the
                    employer&apos;s website or application platform.
                  </span>
                </label>

                <div className="flex flex-wrap justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetJobForm}
                    className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPostingJob}
                    className="rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-gray-100 disabled:opacity-50"
                  >
                    {isPostingJob
                      ? "Saving..."
                      : editingJobId !== null
                        ? "Save changes"
                        : "Publish job"}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              <label htmlFor="job-search" className="sr-only">
                Search jobs
              </label>
              <input
                id="job-search"
                value={jobSearch}
                onChange={(event) => setJobSearch(event.target.value)}
                placeholder="Search job title, company, skill or keyword..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-gray-400"
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-500">
                  Employment type
                  <select
                    value={jobTypeFilter}
                    onChange={(event) =>
                      setJobTypeFilter(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none focus:border-gray-400"
                  >
                    <option>All types</option>
                    {employmentTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-medium text-gray-500">
                  Location
                  <select
                    value={jobLocationFilter}
                    onChange={(event) =>
                      setJobLocationFilter(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none focus:border-gray-400"
                  >
                    <option>All locations</option>
                    {jobLocations.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Available jobs</h3>
              <span className="text-sm text-gray-500">
                {filteredJobs.length}{" "}
                {filteredJobs.length === 1 ? "opportunity" : "opportunities"}
              </span>
            </div>

            {jobsLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                Loading opportunities...
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">
                  💼
                </div>
                <h3 className="font-semibold">
                  {jobs.length === 0
                    ? "Be the first to share an opportunity"
                    : "No jobs match your search"}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
                  {jobs.length === 0
                    ? "Post a genuine opening and help someone find their next opportunity."
                    : "Try a different keyword, employment type, or location."}
                </p>
                {jobs.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowJobForm(true)}
                    className="mt-4 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-gray-100"
                  >
                    Post the first job
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredJobs.map((job) => {
                  const applicationUrl = safeExternalUrl(
                    job.application_url
                  );

                  const isOwner = job.employer_id === myId;

                  return (
                    <article
                      key={job.id}
                      className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-gray-300"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-lg font-bold">
                          {job.company_name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="break-words text-lg font-semibold">
                            {job.title}
                          </h3>
                          <p className="mt-1 text-sm text-gray-600">
                            {job.company_name}
                          </p>
                          <p className="mt-2 text-xs text-gray-500">
                            Posted {formatDate(job.created_at)}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600">
                          {job.employment_type}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
                        {job.location && (
                          <span className="inline-flex items-center gap-1.5">
                            <span aria-hidden="true">⌖</span>
                            {job.location}
                          </span>
                        )}
                        {job.salary_range && (
                          <span className="inline-flex items-center gap-1.5">
                            <span aria-hidden="true">₦</span>
                            {job.salary_range}
                          </span>
                        )}
                      </div>

                      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
                        {job.description}
                      </p>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                        {applicationUrl ? (
                          <a
                            href={applicationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold transition hover:bg-gray-100"
                          >
                            Apply now
                            <span aria-hidden="true">↗</span>
                          </a>
                        ) : (
                          <span className="text-xs text-gray-500">
                            Application link unavailable
                          </span>
                        )}

                        {isOwner && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingJob(job)}
                              className="rounded-full border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteJob(job)}
                              className="rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                      <p className="mt-3 text-xs leading-5 text-gray-500">
                        Apply through the external link provided by
                        the job poster. VYBE does not collect
                        your application.
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {section === "People" && (
          <section className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Your professional network
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Meet people going places.
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Discover professionals, founders, CEOs, and people
                whose experiences can help you grow.
              </p>
            </div>

            <input
              value={peopleSearch}
              onChange={(event) => setPeopleSearch(event.target.value)}
              placeholder="Search names, usernames or professional bios..."
              aria-label="Search professionals"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-gray-400"
            />

            <nav aria-label="People filters" className="flex gap-2">
              {(["All", "Leaders"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setPeopleFilter(filter)}
                  aria-pressed={peopleFilter === filter}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    peopleFilter === filter
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {filter === "All" ? "All professionals" : "CEOs & leaders"}
                </button>
              ))}
            </nav>

            {peopleLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                Finding people...
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
                <h3 className="font-semibold">
                  {peopleFilter === "Leaders"
                    ? "No leaders found yet"
                    : "No matching profiles"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Try another search. More professional profiles will
                  appear as members complete their profiles.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredProfiles.map((profile) => {
                  const displayName =
                    profile.display_name?.trim() ||
                    profile.username ||
                    "VYBE member";

                  const profileText =
                    `${profile.display_name ?? ""} ${profile.username ?? ""} ${profile.bio ?? ""}`.toLowerCase();

                  const isLeader = leaderKeywords.some((keyword) =>
                    profileText.includes(keyword)
                  );

                  const profileUrl = profile.username
                    ? `/app/profile?username=${encodeURIComponent(profile.username.replace(/^@/, ""))}`
                    : null;

                  const isFollowing = followedProfileIds.includes(profile.id);
                  const isFollowPending = pendingFollowIds.includes(profile.id);

                  const counts = followCounts[profile.id] ?? {
                    followers: 0,
                    following: 0,
                  };

                  return (
                    <article
                      key={profile.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-start gap-3">
                        {profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-full border border-gray-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-lg font-semibold">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h3 className="break-words font-semibold">
                            {displayName}
                          </h3>

                          {profileUrl ? (
                            <Link
                              href={profileUrl}
                              className="mt-1 inline-block break-all text-sm text-gray-500 transition hover:text-gray-900 hover:underline"
                            >
                              @{profile.username!.replace(/^@/, "")}
                            </Link>
                          ) : (
                            <p className="mt-1 text-sm text-gray-500">
                              VYBE member
                            </p>
                          )}

                          {isLeader && (
                            <span className="mt-2 inline-block rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600">
                              Leader / Founder
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>
                          <strong className="font-semibold text-gray-800">
                            {counts.followers}
                          </strong>{" "}
                          {counts.followers === 1 ? "follower" : "followers"}
                        </span>
                        <span>
                          <strong className="font-semibold text-gray-800">
                            {counts.following}
                          </strong>{" "}
                          following
                        </span>
                      </div>

                      {profile.bio && (
                        <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                          {profile.bio}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleFollow(profile)}
                          disabled={isFollowPending || !myId}
                          aria-pressed={isFollowing}
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            isFollowing
                              ? "border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200"
                              : "border-gray-300 bg-white text-gray-800 hover:bg-gray-100"
                          }`}
                        >
                          {isFollowPending
                            ? "Please wait..."
                            : isFollowing
                              ? "Following"
                              : "Follow"}
                        </button>

                        {profileUrl && (
                          <Link
                            href={profileUrl}
                            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100"
                          >
                            View profile
                          </Link>
                        )}

                        <Link
                          href={`/app/messages?user=${encodeURIComponent(profile.id)}`}
                          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
                        >
                          Message
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <p className="text-xs leading-5 text-gray-500">
              Leader discovery uses public profile names and bios.
              Members who have not described their role in their
              profile may not appear in the Leaders filter.
            </p>
          </section>
        )}

        <footer className="py-8 text-center text-xs text-gray-500">
          VYBE · Career community
        </footer>
      </div>
    </main>
  );
}
