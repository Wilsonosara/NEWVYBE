"use client";

const people = [
  {
    initial: "D",
    name: "David Okafor",
    username: "@davidokafor",
    interests: "Sports • Social",
    followers: "2.4k followers",
  },
  {
    initial: "C",
    name: "Chioma James",
    username: "@chiomajames",
    interests: "Learn • Career",
    followers: "1.8k followers",
  },
  {
    initial: "T",
    name: "Tunde Bello",
    username: "@tundebello",
    interests: "Business • Social",
    followers: "3.1k followers",
  },
  {
    initial: "A",
    name: "Amaka Johnson",
    username: "@amakaj",
    interests: "Create • Entertainment",
    followers: "1.2k followers",
  },
  {
    initial: "M",
    name: "Michael Adams",
    username: "@michaeladams",
    interests: "Sports • Gaming",
    followers: "4.6k followers",
  },
  {
    initial: "S",
    name: "Sarah Williams",
    username: "@sarahw",
    interests: "Learn • Create",
    followers: "2.7k followers",
  },
];

const communities = [
  ["⚽", "Football Fans Nigeria", "24.8k members"],
  ["💻", "Tech & Developers", "18.2k members"],
  ["📚", "Students & Learners", "15.7k members"],
  ["💼", "Young Professionals", "11.4k members"],
];

export default function ConnectPage() {
  return (
    <main className="min-h-screen bg-[#f5f8f6] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1400px]">

        {/* HERO */}
        <section className="relative mb-8 overflow-hidden rounded-[30px] bg-green-800 px-6 py-10 text-white shadow-lg md:px-10">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-green-700 opacity-60" />

          <div className="relative max-w-3xl">
            <div className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-bold">
              👥 BUILD YOUR NETWORK
            </div>

            <h1 className="text-3xl font-extrabold md:text-5xl">
              Connect with your people.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-green-100 md:text-base">
              Discover people who share your interests,
              follow creators you enjoy and build meaningful
              connections across VYBE.
            </p>

            <div className="mt-7 flex max-w-xl items-center rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
              <span className="mr-3 text-xl">🔎</span>

              <input
                type="text"
                placeholder="Search people..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-green-100"
              />
            </div>
          </div>
        </section>

        {/* STATS */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["12.4k", "People nearby"],
            ["8.7k", "Suggested for you"],
            ["246", "New this week"],
            ["32", "Communities"],
          ].map(([number, label]) => (
            <div
              key={label}
              className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="text-2xl font-extrabold text-green-700">
                {number}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* PEOPLE */}
        <section className="mb-8">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                Recommended
              </p>

              <h2 className="mt-1 text-2xl font-bold text-gray-900">
                People you may know
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Based on your interests and the worlds you explore.
              </p>
            </div>

            <button className="hidden rounded-xl bg-white px-4 py-2 text-sm font-semibold text-green-700 shadow-sm ring-1 ring-gray-200 hover:bg-green-50 md:block">
              See all
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((person) => (
              <article
                key={person.username}
                className="rounded-[26px] border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-green-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-xl font-extrabold text-green-800">
                    {person.initial}
                  </div>

                  <button className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-400 hover:bg-gray-50">
                    •••
                  </button>
                </div>

                <h3 className="mt-5 font-bold text-gray-900">
                  {person.name}
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  {person.username}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {person.interests.split(" • ").map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700"
                    >
                      {interest}
                    </span>
                  ))}
                </div>

                <p className="mt-4 text-xs text-gray-400">
                  {person.followers}
                </p>

                <button className="mt-5 w-full rounded-xl bg-green-700 py-3 text-sm font-bold text-white transition hover:bg-green-800">
                  + Connect
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* COMMUNITIES */}
        <section className="mb-8 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-green-700">
              Find your community
            </p>

            <h2 className="mt-1 text-2xl font-bold text-gray-900">
              Communities worth joining
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Connect with people around shared interests.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {communities.map(([icon, name, members]) => (
              <button
                key={name}
                className="group flex items-center gap-4 rounded-2xl border border-gray-100 p-4 text-left transition hover:border-green-200 hover:bg-green-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-xl group-hover:bg-white">
                  {icon}
                </div>

                <div className="flex-1">
                  <p className="font-bold text-gray-900 group-hover:text-green-700">
                    {name}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    {members}
                  </p>
                </div>

                <span className="text-gray-300 group-hover:text-green-700">
                  →
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-[28px] bg-green-800 p-8 text-white shadow-lg md:p-10">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-green-200">
              VYBE
            </p>

            <h2 className="mt-2 text-2xl font-extrabold md:text-3xl">
              Your people are already here.
            </h2>

            <p className="mt-3 text-sm leading-6 text-green-100">
              Follow, connect, share ideas and build relationships
              across every world.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}