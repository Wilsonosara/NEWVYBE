import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type Post = {
  id: number;
  user_id: string;
  author: string;
  username: string;
  content: string;
  world: string;
  created_at: string;
  media_path: string | null;
  media_type: string | null;
};
type Profile = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
type Story = { id: string; user_id: string; media_path: string; text_content: string | null; created_at: string; expires_at: string };
type StoryPreview = { id: string; user_id: string; name: string; image: string; caption?: string; own: boolean; itemCount: number; latestAt: number };

function ago(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

export default function HomeFeed() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [stories, setStories] = useState<StoryPreview[]>([]);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [openStory, setOpenStory] = useState<{ name: string; image: string; caption?: string } | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setError('');
    const [{ data: postRows, error: postError }, { data: storyRows, error: storyError }] = await Promise.all([
      supabase.from('posts').select('id, user_id, author, username, content, world, created_at, media_path, media_type').order('created_at', { ascending: false }).limit(60),
      supabase.from('stories').select('id, user_id, media_path, text_content, created_at, expires_at').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true }).limit(50),
    ]);
    if (postError) { setError(postError.message); setLoading(false); setRefreshing(false); return; }
    if (storyError) setError(storyError.message);
    const nextPosts = (postRows ?? []) as Post[];
    setPosts(nextPosts);
    const storiesData = (storyRows ?? []) as Story[];
    const { data: ownProfile } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    setMyProfile(ownProfile as Profile | null);
    const userIds = [...new Set([...nextPosts.map((post) => post.user_id), ...storiesData.map((story) => story.user_id)])];
    const postIds = nextPosts.map((post) => post.id);
    if (userIds.length) {
      const { data } = await supabase.from('profiles').select('id, display_name, username, avatar_url').in('id', userIds);
      const profileMap: Record<string, Profile> = {};
      for (const profile of (data ?? []) as Profile[]) profileMap[profile.id] = profile;
      setProfiles(profileMap);
      const storyGroups = new Map<string, { first: Story; count: number; latestAt: number }>();
      for (const story of storiesData) {
        const current = storyGroups.get(story.user_id);
        const createdAt = new Date(story.created_at).getTime();
        if (current) {
          current.count += 1;
          current.latestAt = Math.max(current.latestAt, createdAt);
        } else {
          storyGroups.set(story.user_id, { first: story, count: 1, latestAt: createdAt });
        }
      }
      const storyPreviews = [...storyGroups.entries()].map(([storyOwnerId, group]) => {
        const story = group.first;
        const profile = profileMap[story.user_id];
        const { data: media } = supabase.storage.from('post-media').getPublicUrl(story.media_path);
        const own = storyOwnerId === userId;
        return {
          id: story.id,
          user_id: storyOwnerId,
          name: own
            ? myProfile?.display_name || session?.user.user_metadata?.full_name || 'You'
            : profile?.display_name || profile?.username || 'VYBE user',
          image: media.publicUrl,
          caption: story.text_content || undefined,
          own,
          itemCount: group.count,
          latestAt: group.latestAt,
        };
      }).sort((a, b) => Number(b.own) - Number(a.own) || b.latestAt - a.latestAt);
      setStories(storyPreviews);
    } else setStories([]);
    if (postIds.length) {
      const [{ data: likes }, { data: mine }] = await Promise.all([
        supabase.from('post_likes').select('post_id').in('post_id', postIds),
        supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
      ]);
      const counts: Record<number, number> = {};
      for (const row of likes ?? []) counts[Number(row.post_id)] = (counts[Number(row.post_id)] ?? 0) + 1;
      setLikeCounts(counts); setLiked(new Set((mine ?? []).map((row) => Number(row.post_id))));
    } else { setLikeCounts({}); setLiked(new Set()); }
    setLoading(false); setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    const refresh = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(refresh);
  }, [load]);

  const toggleLike = async (postId: number) => {
    if (!session?.user.id) return;
    const wasLiked = liked.has(postId);
    setLiked((current) => { const next = new Set(current); if (wasLiked) next.delete(postId); else next.add(postId); return next; });
    setLikeCounts((current) => ({ ...current, [postId]: Math.max(0, (current[postId] ?? 0) + (wasLiked ? -1 : 1)) }));
    const result = wasLiked
      ? await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', session.user.id)
      : await supabase.from('post_likes').insert({ post_id: postId, user_id: session.user.id });
    if (result.error) void load();
  };

  const header = (
    <View>
      <View style={styles.topbar}>
        <Text style={styles.brand}>VYBE<Text style={styles.brandDot}>.</Text></Text>
        <View style={styles.createButton} accessibilityLabel="Create a post">
          <Text style={styles.createButtonText}>＋</Text>
        </View>
      </View>
      <View style={styles.storiesCard}>
        <View style={styles.storiesHeadingRow}>
          <View>
            <Text style={styles.eyebrow}>MOMENTS</Text>
            <Text style={styles.sectionHeading}>Stories</Text>
            <Text style={styles.muted}>See what your people are up to.</Text>
          </View>
          <Text style={styles.hoursBadge}>24 hours</Text>
        </View>
        <FlatList horizontal showsHorizontalScrollIndicator={false} data={stories} keyExtractor={(item) => item.id} contentContainerStyle={styles.storyList} ListHeaderComponent={<View style={styles.storyItem}><View style={[styles.storyFrame, styles.addStoryFrame]}><View style={styles.addStoryIcon}><Text style={styles.addStoryPlus}>＋</Text></View><Text style={styles.addStoryLabel}>Add story</Text></View></View>} ListEmptyComponent={<Text style={styles.emptyStories}>Stories from your community will show here.</Text>} renderItem={({ item }) => (
          <Pressable onPress={() => setOpenStory({ name: item.name, image: item.image || '', caption: item.caption })} style={styles.storyItem}>
            <View style={styles.storyFrame}>
              {item.image ? <Image alt={`${item.name}'s story`} source={{ uri: item.image }} resizeMode="cover" style={styles.storyImage} /> : <View style={styles.storyFallback}><Text style={styles.storyInitial}>{item.name.slice(0, 1).toUpperCase()}</Text></View>}
              <View style={styles.storyShade} />
              <Text numberOfLines={1} style={styles.storyName}>{item.name}</Text>
            </View>
          </Pressable>
        )} />
      </View>
      <View style={styles.composer}>
        <View style={styles.composerAvatar}>
          {myProfile?.avatar_url
            ? <Image alt={`${myProfile.display_name || 'Your'} profile picture`} source={{ uri: myProfile.avatar_url }} style={styles.composerAvatarImage} />
            : <Text style={styles.avatarLetter}>{(myProfile?.display_name || session?.user.user_metadata?.full_name || 'G').slice(0, 1).toUpperCase()}</Text>}
        </View>
        <View style={styles.composerPrompt}><Text style={styles.composerText}>Share something with your world...</Text></View>
        <View style={styles.composerMedia}><Text style={styles.composerPlus}>＋</Text></View>
      </View>
      <View style={styles.feedHeadingRow}>
        <View><Text style={styles.feedHeading}>For you</Text><Text style={styles.muted}>Posts from your world</Text></View>
        <Text style={styles.discoverButton}>Discover</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <FlatList data={posts} keyExtractor={(item) => String(item.id)} ListHeaderComponent={header} contentContainerStyle={styles.feed} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor="#555" />} ListEmptyComponent={loading ? <ActivityIndicator style={{ marginTop: 28 }} color="#202124" /> : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Your feed starts here</Text><Text style={styles.muted}>Share your first post or discover people on VYBE.</Text></View>} renderItem={({ item }) => {
        const profile = profiles[item.user_id];
        const mediaId = item.media_path?.startsWith('post-media/') ? item.media_path.slice('post-media/'.length) : item.media_path;
        const mediaUrl = mediaId ? supabase.storage.from('post-media').getPublicUrl(mediaId).data.publicUrl : null;
        return <View style={styles.post}>
          <View style={styles.authorRow}><View style={styles.avatar}>{profile?.avatar_url ? <Image alt={`${profile.display_name || item.author}'s profile picture`} source={{ uri: profile.avatar_url }} style={styles.avatarImage} /> : <Text style={styles.avatarLetter}>{(profile?.display_name || item.author || 'V').slice(0, 1).toUpperCase()}</Text>}</View><View style={{ flex: 1 }}><Text style={styles.author}>{profile?.display_name || item.author || 'VYBE user'}</Text><Text style={styles.postMeta}>@{(profile?.username || item.username || 'user').replace(/^@/, '')} · {ago(item.created_at)}</Text></View><Text style={styles.world}>{item.world || 'Community'}</Text></View>
          {item.content ? <Text style={styles.postText}>{item.content}</Text> : null}
          {mediaUrl && item.media_type !== 'video' ? <Image alt={`Photo shared by ${profile?.display_name || item.author || 'a VYBE user'}`} source={{ uri: mediaUrl }} style={styles.postImage} resizeMode="cover" /> : mediaUrl ? <View style={styles.videoPlaceholder}><Text style={styles.videoText}>Video post</Text></View> : null}
          <View style={styles.postActions}><Pressable onPress={() => void toggleLike(item.id)} hitSlop={8}><Text style={[styles.action, liked.has(item.id) && styles.liked]}>{liked.has(item.id) ? '♥' : '♡'}  {likeCounts[item.id] ?? 0}</Text></Pressable><Text style={styles.action}>♡  Comments</Text><Text style={styles.action}>↗  Share</Text></View>
        </View>;
      }} />
      {openStory ? <View style={styles.storyOverlay}><Pressable style={StyleSheet.absoluteFill} onPress={() => setOpenStory(null)} /><View style={styles.storyModal}>{openStory.image ? <ExpoImage source={{ uri: openStory.image }} style={styles.storyFullImage} contentFit="cover" /> : null}<View style={styles.storyCaption}><Text style={styles.storyModalName}>{openStory.name}</Text>{openStory.caption ? <Text style={styles.storyModalText}>{openStory.caption}</Text> : null}</View><Pressable onPress={() => setOpenStory(null)} style={styles.closeButton}><Text style={styles.action}>Close</Text></Pressable></View></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' }, feed: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 24 },
  topbar: { paddingHorizontal: 6, paddingVertical: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }, brand: { fontSize: 25, fontWeight: '900', color: '#171717', letterSpacing: -0.8 }, brandDot: { color: '#15803d' }, createButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' }, createButtonText: { fontSize: 25, lineHeight: 28, color: '#166534' },
  storiesCard: { backgroundColor: '#fff', borderRadius: 25, borderWidth: 1, borderColor: '#e5e7eb', paddingTop: 17, paddingBottom: 10, marginBottom: 12, overflow: 'hidden' }, storiesHeadingRow: { paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { color: '#15803d', fontSize: 10, fontWeight: '900', letterSpacing: 2.1, marginBottom: 3 }, sectionHeading: { fontSize: 20, color: '#111827', fontWeight: '800' }, muted: { color: '#6b7280', fontSize: 12, marginTop: 3 }, hoursBadge: { overflow: 'hidden', color: '#15803d', backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7, fontSize: 11, fontWeight: '700' }, storyList: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2, gap: 10 }, storyItem: { width: 116 }, storyFrame: { width: 112, height: 112, borderRadius: 17, overflow: 'hidden', backgroundColor: '#e5e7eb', borderWidth: 2, borderColor: '#16a34a', justifyContent: 'flex-end' }, addStoryFrame: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderColor: '#15803d', backgroundColor: '#f0fdf4' }, addStoryIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dcfce7' }, addStoryPlus: { color: '#15803d', fontSize: 28, lineHeight: 32 }, addStoryLabel: { marginTop: 7, color: '#166534', fontSize: 11, fontWeight: '700' }, storyImage: { position: 'absolute', top: 0, left: 0, width: 112, height: 112 }, storyFallback: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dcfce7' }, storyInitial: { color: '#166534', fontSize: 28, fontWeight: '800' }, storyShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.16)' }, storyName: { color: '#fff', fontSize: 11, fontWeight: '700', paddingHorizontal: 7, paddingBottom: 7 }, emptyStories: { color: '#6b7280', fontSize: 12, paddingVertical: 15, paddingHorizontal: 5 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingHorizontal: 3, paddingVertical: 12, marginBottom: 17 }, composerAvatar: { width: 38, height: 38, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4' }, composerAvatarImage: { width: '100%', height: '100%', borderRadius: 19 }, composerPrompt: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 11 }, composerText: { color: '#6b7280', fontSize: 12 }, composerMedia: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4' }, composerPlus: { color: '#15803d', fontSize: 21 },
  feedHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 3, marginBottom: 10 }, feedHeading: { fontSize: 20, color: '#111827', fontWeight: '800' }, discoverButton: { color: '#111827', borderColor: '#e5e7eb', borderWidth: 1, overflow: 'hidden', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8, fontSize: 11, fontWeight: '700' }, error: { color: '#b42318', backgroundColor: '#fff3f2', marginHorizontal: 2, padding: 10, borderRadius: 10 }, emptyCard: { backgroundColor: '#fff', marginTop: 4, borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 22, padding: 22, alignItems: 'center', gap: 7 }, emptyTitle: { color: '#111827', fontWeight: '800', fontSize: 17 },
  post: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginTop: 8, paddingHorizontal: 3, paddingTop: 12, paddingBottom: 18 }, authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 42, height: 42, borderRadius: 22, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%' }, avatarLetter: { color: '#166534', fontWeight: '700', fontSize: 17 }, author: { color: '#171717', fontWeight: '700', fontSize: 14 }, postMeta: { color: '#737780', fontSize: 11, marginTop: 3 }, world: { color: '#4b5563', fontSize: 10, backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9 }, postText: { color: '#303238', fontSize: 14, lineHeight: 21, marginTop: 13 }, postImage: { width: '100%', height: 300, borderRadius: 15, marginTop: 12, backgroundColor: '#f3f4f6' }, videoPlaceholder: { height: 150, borderRadius: 15, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginTop: 12 }, videoText: { color: '#6b7280' }, postActions: { borderTopWidth: 1, borderTopColor: '#f0f1f2', flexDirection: 'row', justifyContent: 'space-between', marginTop: 13, paddingTop: 11 }, action: { color: '#60656d', fontSize: 12, fontWeight: '600' }, liked: { color: '#d33' },
  storyOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.86)', alignItems: 'center', justifyContent: 'center', padding: 12 }, storyModal: { backgroundColor: '#111', borderRadius: 22, padding: 12, width: '100%', minHeight: 260, justifyContent: 'space-between', overflow: 'hidden' }, storyFullImage: { width: '100%', height: 570, borderRadius: 14, backgroundColor: '#222' }, storyCaption: { position: 'absolute', left: 24, right: 24, top: 25, backgroundColor: 'rgba(0,0,0,0.48)', padding: 12, borderRadius: 12 }, storyModalName: { color: '#fff', fontWeight: '700', fontSize: 16 }, storyModalText: { color: '#fff', fontSize: 14, marginTop: 5 }, closeButton: { alignSelf: 'flex-end', padding: 9 },
});
