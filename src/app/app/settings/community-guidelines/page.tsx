
"use client";

import Link from "next/link";

type Guideline = {
  number: string;
  title: string;
  description: string;
  examples: string[];
};

const guidelines: Guideline[] = [
  {
    number: "01",
    title: "Treat everyone with respect",
    description:
      "VYBE brings people from different backgrounds together. Keep conversations respectful, even when you disagree.",
    examples: [
      "Share constructive opinions and feedback.",
      "Respect different backgrounds and perspectives.",
      "Avoid hateful language, insults, and demeaning remarks.",
    ],
  },
  {
    number: "02",
    title: "No harassment or bullying",
    description:
      "Everyone should be able to participate without fear of threats, intimidation, or repeated unwanted contact.",
    examples: [
      "Do not threaten or target other people.",
      "Do not encourage others to harass someone.",
      "Respect another person's decision to stop a conversation.",
    ],
  },
  {
    number: "03",
    title: "Keep content safe and lawful",
    description:
      "Posts, stories, comments, and messages must not promote abuse, exploitation, violence against people, or illegal activity.",
    examples: [
      "Do not share exploitative or abusive material.",
      "Do not encourage dangerous or criminal acts.",
      "Do not use VYBE to facilitate harm to others.",
    ],
  },
  {
    number: "04",
    title: "Protect privacy",
    description:
      "Respect personal boundaries and help keep the community safe by protecting sensitive information.",
    examples: [
      "Do not publish someone's private address or contact details without permission.",
      "Do not share private conversations without appropriate consent.",
      "Never ask others to reveal passwords or authentication codes.",
    ],
  },
  {
    number: "05",
    title: "No spam, scams, or impersonation",
    description:
      "Use VYBE honestly. Deceptive activity damages trust and puts other members at risk.",
    examples: [
      "Do not impersonate another person or organization.",
      "Do not distribute fraudulent offers or phishing links.",
      "Avoid repetitive, misleading, or unsolicited promotional activity.",
    ],
  },
  {
    number: "06",
    title: "Respect intellectual property",
    description:
      "Be considerate of creators and their work. Share content you created or have permission to use.",
    examples: [
      "Credit creators when appropriate.",
      "Do not claim someone else's work as your own.",
      "Do not upload copyrighted material without the necessary rights or permission.",
    ],
  },
  {
    number: "07",
    title: "Keep interactions authentic",
    description:
      "Help create a trustworthy community by being honest about who you are and how you interact with others.",
    examples: [
      "Do not create deceptive identities to defraud or mislead people.",
      "Do not manipulate engagement through spam or coordinated deception.",
      "Do not use the platform to mislead members for personal gain.",
    ],
  },
  {
    number: "08",
    title: "Report concerns responsibly",
    description:
      "If you encounter content or behavior that appears to violate these guidelines, use the available safety features or contact support.",
    examples: [
      "Provide accurate information when reporting a concern.",
      "Use blocking tools when you need to limit interactions.",
      "Do not make knowingly false or malicious reports against other members.",
    ],
  },
];

export default function CommunityGuidelinesPage() {
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
              Community Guidelines
            </h1>
            <p className="text-sm text-gray-500">
              Building a safer community together
            </p>
          </div>
        </header>

        <div className="space-y-8 px-4 py-6">
          <section className="rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              VYBE community standards
            </p>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              One community. Many perspectives.
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              VYBE is a place to share ideas, build connections,
              express yourself, and explore different interests. These
              guidelines explain the behavior we expect from everyone
              who uses the platform.
            </p>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              By participating, you help make VYBE more welcoming,
              trustworthy, and useful for everyone.
            </p>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                Our community standards
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Please follow these principles across posts, stories,
                comments, profiles, and private messages.
              </p>
            </div>

            <div className="space-y-3">
              {guidelines.map((guideline) => (
                <article
                  key={guideline.number}
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                      {guideline.number}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold">
                        {guideline.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {guideline.description}
                      </p>

                      <ul className="mt-3 space-y-2">
                        {guideline.examples.map((example) => (
                          <li
                            key={example}
                            className="flex items-start gap-2 text-sm leading-5 text-gray-600"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-0.5 text-gray-400"
                            >
                              •
                            </span>
                            <span>{example}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold">
              What happens when guidelines are violated?
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Depending on the circumstances, violations may lead to
              content removal, restrictions on certain activities,
              temporary suspension, or account termination. Decisions
              should consider the seriousness and context of the
              behavior and any applicable platform policies.
            </p>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              These guidelines describe the community standards. They
              do not mean that automated moderation, reporting review,
              or appeals are already implemented in every part of
              VYBE.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold">
              Need help or want to report a concern?
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Visit the Help Center for guidance or submit a support
              request if you encounter a problem while using VYBE.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/settings/help"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium transition hover:bg-gray-50"
              >
                Visit Help Center
              </Link>

              <Link
                href="/app/settings"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium transition hover:bg-gray-50"
              >
                Back to Settings
              </Link>
            </div>
          </section>

          <footer className="border-t border-gray-100 pt-5 text-center">
            <p className="text-xs leading-5 text-gray-400">
              VYBE · Community Guidelines
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Let’s build a community where everyone can belong.
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
