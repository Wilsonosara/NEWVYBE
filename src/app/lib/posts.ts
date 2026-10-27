
export type PostMedia = {
  mediaId: string;
  mediaType: "image" | "video";
  mediaName: string;
};

export type Post = {
  id: number;
  author: string;
  username: string;
  authorId?: string;
  content: string;
  world: string;
  likes: number;
  comments: number;
  time: string;

  // Backward compatibility with existing single-media posts.
  mediaId?: string;
  mediaType?: "image" | "video";
  mediaName?: string;

  // Supports multiple pictures or a single video in one post.
  mediaItems?: PostMedia[];

  // Identifies the club this post belongs to, when applicable.
  clubSlug?: string;
};

export const posts: Post[] = [
  {
    id: 1,
    author: "Alex Johnson",
    username: "@alexjohnson",
    content:
      "Just started working on a new project. Excited to see where this goes!",
    world: "Create",
    likes: 12,
    comments: 3,
    time: "10 min ago",
  },
  {
    id: 2,
    author: "Michael Brown",
    username: "@michaelbrown",
    content:
      "What a match! Football banter is always better when your team wins 😂⚽",
    world: "Sports",
    likes: 28,
    comments: 8,
    time: "25 min ago",
  },
  {
    id: 3,
    author: "Sarah Williams",
    username: "@sarahw",
    content:
      "Learning something new every day. Small progress is still progress.",
    world: "Learn",
    likes: 19,
    comments: 5,
    time: "1 hr ago",
  },
  {
    id: 4,
    author: "David Okafor",
    username: "@davidokafor",
    content:
      "Arsenal are looking dangerous this season. The fans are ready! 🔴⚽",
    world: "Sports",
    likes: 42,
    comments: 12,
    time: "2 hrs ago",
  },
  {
    id: 5,
    author: "Chioma James",
    username: "@chiomajames",
    content:
      "Chelsea fans, what are we saying about the next match? 💙",
    world: "Sports",
    likes: 31,
    comments: 9,
    time: "3 hrs ago",
  },
];
