export default function Home() {
  const worlds = [
    {
      icon: "⚽",
      name: "Sports",
      description: "Matches, clubs, fans & banter",
    },
    {
      icon: "🌍",
      name: "Social",
      description: "Friends, posts & conversations",
    },
    {
      icon: "📚",
      name: "Learn",
      description: "Learn, share & grow together",
    },
    {
      icon: "💼",
      name: "Career",
      description: "Jobs, skills & opportunities",
    },
    {
      icon: "💰",
      name: "Business",
      description: "Businesses, services & ideas",
    },
    {
      icon: "🎮",
      name: "Gaming",
      description: "Games, players & communities",
    },
    {
      icon: "🎬",
      name: "Entertainment",
      description: "Music, movies & creators",
    },
    {
      icon: "🎨",
      name: "Create",
      description: "Create, publish & inspire",
    },
    {
      icon: "👥",
      name: "Communities",
      description: "Find your people",
    },
  ];

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <nav className="border-b border-gray-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="text-2xl font-bold tracking-tight">
            VYBE
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <button className="text-sm font-medium text-gray-600 hover:text-black">
              Explore
            </button>

            <button className="text-sm font-medium text-gray-600 hover:text-black">
              Create
            </button>

            <button className="text-sm font-medium text-gray-600 hover:text-black">
              Connect
            </button>
          </div>

          <button className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800">
            Join VYBE
          </button>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 pb-20 pt-24 text-center">
        <div className="mx-auto max-w-4xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            One Platform. Many Worlds.
          </p>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            One Community.
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-gray-600">
            A place where people connect, participate, discover, learn,
            create, compete and grow — all in one platform.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <button className="rounded-full bg-black px-7 py-3.5 font-semibold text-white hover:bg-gray-800">
              Explore VYBE
            </button>

            <button className="rounded-full border border-gray-300 px-7 py-3.5 font-semibold hover:bg-gray-50">
              Learn More
            </button>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12">
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Explore
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Many worlds. One identity.
            </h2>

            <p className="mt-4 max-w-2xl text-gray-600">
              Move between different interests and communities while keeping
              one profile, one identity and one connected experience.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {worlds.map((world) => (
              <div
                key={world.name}
                className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-4xl">{world.icon}</div>

                <h3 className="mt-5 text-xl font-bold">{world.name}</h3>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {world.description}
                </p>

                <div className="mt-5 text-sm font-semibold">
                  Explore →
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Your world is waiting.
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          Join a platform built around people, interests, communities and
          meaningful participation.
        </p>

        <button className="mt-8 rounded-full bg-black px-8 py-4 font-semibold text-white hover:bg-gray-800">
          Get Started
        </button>
      </section>
    </main>
  );
}