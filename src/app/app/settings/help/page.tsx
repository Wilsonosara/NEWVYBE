
"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { createClient } from "../../../../../utils/supabase/client";

type HelpTopic =
  | "All"
  | "Account"
  | "Posts and Stories"
  | "Messages"
  | "Privacy and Safety";

type FAQ = {
  question: string;
  answer: string;
  topic: Exclude<HelpTopic, "All">;
};

const topics: HelpTopic[] = [
  "All",
  "Account",
  "Posts and Stories",
  "Messages",
  "Privacy and Safety",
];

const faqs: FAQ[] = [
  {
    topic: "Account",
    question: "How do I update my profile?",
    answer:
      "Open Settings, select Edit profile, and update your display name, username, or bio. Save your changes when you are finished.",
  },
  {
    topic: "Account",
    question: "How do I change my password?",
    answer:
      "Open Settings and select Password and authentication. Follow the available instructions to manage your sign-in security.",
  },
  {
    topic: "Posts and Stories",
    question: "How do I create a post?",
    answer:
      "Open the Create section, add your text or supported media, review your post, and publish it.",
  },
  {
    topic: "Posts and Stories",
    question: "Why can't I see someone's story?",
    answer:
      "The story may have expired, been removed, or may no longer be available to your account. Stories are designed to expire after 24 hours.",
  },
  {
    topic: "Messages",
    question: "How do I send a private message?",
    answer:
      "Open Messages, choose a conversation, enter your message, and send it. Messages are intended for the selected recipient.",
  },
  {
    topic: "Messages",
    question: "Why can't I find a conversation?",
    answer:
      "Check that you have selected the correct account and search for the person by name or username. If the problem continues, contact support.",
  },
  {
    topic: "Privacy and Safety",
    question: "How do I block an account?",
    answer:
      "Open Settings and select Blocked accounts to manage your blocked list. You can also use the blocking option available on supported account screens.",
  },
  {
    topic: "Privacy and Safety",
    question: "How can I protect my account?",
    answer:
      "Use a strong, unique password, keep your sign-in details private, and review your privacy and security settings regularly.",
  },
];

export default function HelpCenterPage() {
  const [search, setSearch] = useState("");
  const [activeTopic, setActiveTopic] = useState<HelpTopic>("All");
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const [supportName, setSupportName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportMessage, setSupportMessage] = useState("");

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredFAQs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesTopic =
        activeTopic === "All" || faq.topic === activeTopic;

      const matchesSearch =
        !term ||
        faq.question.toLowerCase().includes(term) ||
        faq.answer.toLowerCase().includes(term) ||
        faq.topic.toLowerCase().includes(term);

      return matchesTopic && matchesSearch;
    });
  }, [search, activeTopic]);

  async function handleSupportSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting) return;

    setFormError("");
    setSuccessMessage("");

    const name = supportName.trim();
    const email = supportEmail.trim();
    const message = supportMessage.trim();

    if (!name || !email || !message) {
      setFormError("Please complete all fields.");
      return;
    }

    if (name.length > 100) {
      setFormError("Your name must be 100 characters or fewer.");
      return;
    }

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (message.length < 10 || message.length > 3000) {
      setFormError(
        "Your message must contain between 10 and 3000 characters."
      );
      return;
    }

    setSubmitting(true);

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
        setFormError(
          "Please log in to your VYBE account before submitting a support request."
        );
        return;
      }

      const { error: insertError } = await supabase
        .from("support_requests")
        .insert({
          user_id: user.id,
          name,
          email,
          message,
        });

      if (insertError) {
        console.error("Could not save support request:", insertError);
        setFormError(
          "We couldn't submit your request. Please try again. If the problem continues, contact support through your available support channel."
        );
        return;
      }

      setSuccessMessage(
        "Your support request has been submitted successfully. Your reference ID will be available when request tracking is added."
      );

      setSupportMessage("");
    } catch (error) {
      console.error("Support request submission failed:", error);
      setFormError(
        "Something went wrong while submitting your request. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

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

          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Help Center
            </h1>
            <p className="text-sm text-gray-500">
              How can we help you?
            </p>
          </div>
        </header>

        <div className="space-y-8 px-4 py-6">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight">
              Find the help you need
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Browse common questions about your VYBE account,
              posts, messages, and privacy.
            </p>

            <div className="relative mt-5">
              <label htmlFor="help-search" className="sr-only">
                Search help articles
              </label>

              <input
                id="help-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search help articles..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold">
              Browse by topic
            </h2>

            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => {
                const selected = activeTopic === topic;

                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setActiveTopic(topic)}
                    aria-pressed={selected}
                    className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
                      selected
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">
                Frequently asked questions
              </h2>

              <span className="text-xs text-gray-400">
                {filteredFAQs.length} articles
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((faq, index) => {
                  const isOpen = openQuestion === faq.question;

                  return (
                    <div
                      key={faq.question}
                      className={
                        index > 0 ? "border-t border-gray-100" : ""
                      }
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setOpenQuestion(
                            isOpen ? null : faq.question
                          )
                        }
                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-gray-50"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs text-gray-400">
                            {faq.topic}
                          </span>

                          <span className="mt-1 block text-sm font-medium text-gray-900">
                            {faq.question}
                          </span>
                        </span>

                        <span className="shrink-0 text-xl text-gray-400">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4">
                          <p className="text-sm leading-6 text-gray-600">
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-gray-700">
                    No matching articles found
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    Try another search or choose a different topic.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setActiveTopic("All");
                    }}
                    className="mt-4 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 p-4">
            <h2 className="text-base font-semibold">
              Still need help?
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Tell us what happened, and submit a support request
              using your VYBE account.
            </p>

            {successMessage ? (
              <div
                role="status"
                className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <p className="text-sm font-semibold text-gray-900">
                  Request submitted
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {successMessage}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage("");
                    setFormError("");
                  }}
                  className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSupportSubmit}
                className="mt-5 space-y-4"
              >
                <div>
                  <label
                    htmlFor="support-name"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Your name
                  </label>

                  <input
                    id="support-name"
                    autoComplete="name"
                    value={supportName}
                    onChange={(event) =>
                      setSupportName(event.target.value)
                    }
                    required
                    maxLength={100}
                    placeholder="Enter your name"
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="support-email"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Email address
                  </label>

                  <input
                    id="support-email"
                    type="email"
                    autoComplete="email"
                    value={supportEmail}
                    onChange={(event) =>
                      setSupportEmail(event.target.value)
                    }
                    required
                    maxLength={254}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="support-message"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    How can we help?
                  </label>

                  <textarea
                    id="support-message"
                    value={supportMessage}
                    onChange={(event) =>
                      setSupportMessage(event.target.value)
                    }
                    required
                    minLength={10}
                    maxLength={3000}
                    rows={5}
                    placeholder="Describe your issue in detail..."
                    className="w-full resize-y rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-gray-400"
                  />

                  <p className="mt-1 text-right text-xs text-gray-400">
                    {supportMessage.length}/3000
                  </p>
                </div>

                {formError && (
                  <p
                    role="alert"
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm leading-5 text-gray-700"
                  >
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Submitting request..."
                    : "Submit support request"}
                </button>

                <p className="text-xs leading-5 text-gray-400">
                  Your request is associated with your signed-in
                  account and can only be read by that account under
                  the current database policies.
                </p>
              </form>
            )}
          </section>

          <div className="border-t border-gray-100 pt-5 text-center">
            <Link
              href="/app/settings/community-guidelines"
              className="text-sm text-gray-600 underline underline-offset-4 hover:text-black"
            >
              Read our Community Guidelines
            </Link>

            <p className="mt-3 text-xs text-gray-400">
              VYBE · Help Center
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
