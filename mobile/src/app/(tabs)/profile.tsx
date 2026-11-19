import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type Profile = { id: string; username: string | null; display_name: string | null; bio: string | null; avatar_url: string | null };
type Story = { id: string; media_path: string | null; media_type: string | null };
type Highlight = { id: number; title: string; cover: string | null; items: { id: string; url: string; isVideo: boolean }[] };

export default function MyProfileScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [postCount, setPostCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);

  useEffect(() => {
    if (!userId) {
      setBusy(false);
      return;
    }

    let active = true;
    async function loadProfile() {
      setBusy(true);
      setError('');
      const [profileResult, postsResult, followersResult, followingResult, storiesResult, highlightsResult] = await Promise.all([
        supabase.from('profiles').select('id, username, display_name, bio, avatar_url').eq('id', userId).maybeSingle(),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('stories').select('id, media_path, media_type').eq('user_id', userId).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true }),
        supabase.from('story_highlights').select('id, title, cover').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      if (profileResult.error) setError(profileResult.error.message);
      setProfile(profileResult.data as Profile | null);
      setPostCount(postsResult.count ?? 0);
      setFollowersCount(followersResult.count ?? 0);
      setFollowingCount(followingResult.count ?? 0);

      const getMediaUrl = (path: string) => path.startsWith('http')
        ? path
        : supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl;
      const asHighlight = (id: number, title: string, path: string | null, items: Highlight['items']): Highlight => {
        const cover = path ? getMediaUrl(path) : items[0]?.url ?? null;
        return { id, title, cover, items };
      };
      const activeStories = ((storiesResult.data ?? []) as Story[]).filter((story) => story.media_path).map((story) => ({
        id: story.id,
        url: getMediaUrl(story.media_path!),
        isVideo: story.media_type === 'video',
      }));
      const recentStories = activeStories.length ? [asHighlight(-1, 'Recent stories', activeStories[activeStories.length - 1].url, activeStories)] : [];
      const highlightRows = highlightsResult.data ?? [];
      if (!highlightRows.length) {
        setHighlights(recentStories);
        setBusy(false);
        return;
      }
      const ids = highlightRows.map((item) => item.id);
      const { data: itemRows } = await supabase.from('story_highlight_items').select('id, highlight_id, media_path, media_type').in('highlight_id', ids).order('added_at', { ascending: true });
      if (!active) return;
      const grouped = new Map<number, Highlight['items']>();
      for (const item of itemRows ?? []) {
        if (!item.media_path) continue;
        const items = grouped.get(item.highlight_id) ?? [];
        items.push({
          id: String(item.id),
          url: getMediaUrl(item.media_path),
          isVideo: item.media_type === 'video',
        });
        grouped.set(item.highlight_id, items);
      }
      const savedHighlights = highlightRows.map((item) => asHighlight(item.id, item.title || 'Highlights', item.cover, grouped.get(item.id) ?? [])).filter((item) => item.items.length);
      setHighlights([...recentStories, ...savedHighlights]);
      setBusy(false);
    }
    void loadProfile().catch((loadError: unknown) => {
      if (active) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load your profile.');
        setBusy(false);
      }
    });
    return () => { active = false; };
  }, [userId]);

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message); else router.replace('/');
  }

  const displayName = profile?.display_name || session?.user.user_metadata?.full_name || 'VYBE user';
  const username = (profile?.username || session?.user.email?.split('@')[0] || 'user').replace(/^@/, '');

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Text style={styles.brand}>VYBE<Text style={styles.brandDot}>.</Text></Text>
          <Pressable onPress={signOut} accessibilityRole="button" style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
        {busy ? <ActivityIndicator color="#7d22ef" style={styles.loader} /> : <>
          <View style={styles.profileHeader}>
            <View style={styles.identity}>
              <View style={styles.avatarRing}>
                {profile?.avatar_url
                  ? <Image alt={`${displayName} profile picture`} source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                  : <Text style={styles.avatarLetter}>{displayName.slice(0, 1).toUpperCase()}</Text>}
              </View>
              <View style={styles.identityText}>
                <Text numberOfLines={1} style={styles.name}>{displayName}</Text>
                <Text numberOfLines={1} style={styles.username}>@{username}</Text>
              </View>
            </View>
            <Text style={styles.bio}>{profile?.bio || 'Building connections, sharing ideas, and exploring every world. 🌍'}</Text>
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statValue}>{postCount}</Text><Text style={styles.statLabel}>Posts</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.stat}><Text style={styles.statValue}>{followersCount}</Text><Text style={styles.statLabel}>Followers</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.stat}><Text style={styles.statValue}>{followingCount}</Text><Text style={styles.statLabel}>Following</Text></View>
          </View>

          <View style={styles.highlightsSection}>
            <Text style={styles.sectionTitle}>Highlights</Text>
            {highlights.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlightList}>
              {highlights.map((item) => <Pressable key={item.id} onPress={() => setSelectedHighlight(item)} style={({ pressed }) => [styles.highlightItem, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Open highlight ${item.title}`}>
                <View style={styles.highlightRing}>
                  {item.cover ? <Image alt="" source={{ uri: item.cover }} style={styles.highlightImage} /> : <View style={styles.highlightEmpty}><Text style={styles.highlightInitial}>{item.title.slice(0, 1).toUpperCase()}</Text></View>}
                  <View style={styles.highlightShade} /><Text numberOfLines={1} style={styles.highlightTitle}>{item.title}</Text>
                </View>
              </Pressable>)}
            </ScrollView> : <Text style={styles.emptyHighlights}>No highlights yet.</Text>}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>}
      </ScrollView>
      <Modal visible={!!selectedHighlight} transparent animationType="fade" onRequestClose={() => setSelectedHighlight(null)}>
        <View style={styles.modal}>
          <Pressable accessibilityLabel="Close highlight" style={StyleSheet.absoluteFill} onPress={() => setSelectedHighlight(null)} />
          {selectedHighlight?.cover ? <Image alt={selectedHighlight.title} source={{ uri: selectedHighlight.cover }} style={styles.modalImage} resizeMode="contain" /> : null}
          <Text style={styles.modalTitle}>{selectedHighlight?.title}</Text>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 16, paddingBottom: 30 },
  top: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: '#f3f4f6', borderBottomWidth: 1 },
  brand: { color: '#111', fontWeight: '900', fontSize: 19, letterSpacing: -0.5 },
  brandDot: { color: '#7d22ef' },
  logout: { minHeight: 34, paddingHorizontal: 13, justifyContent: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20 },
  logoutText: { color: '#333', fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  loader: { marginTop: 45 },
  profileHeader: { paddingTop: 17, paddingHorizontal: 2, paddingBottom: 15 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatarRing: { width: 76, height: 76, borderRadius: 38, padding: 3, borderWidth: 2, borderColor: '#7d22ef', backgroundColor: '#fff' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 34, backgroundColor: '#f3f4f6' },
  avatarLetter: { width: '100%', height: '100%', borderRadius: 34, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', backgroundColor: '#f3f4f6', color: '#51406c', fontWeight: '700', fontSize: 24 },
  identityText: { flex: 1, minWidth: 0 },
  name: { color: '#111', fontWeight: '800', fontSize: 22 },
  username: { color: '#69758c', fontWeight: '500', fontSize: 14, marginTop: 3 },
  bio: { color: '#222', fontSize: 13, lineHeight: 19, marginTop: 12 },
  stats: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#d9ddea' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: '#111', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#69758c', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 31, backgroundColor: '#d9ddea' },
  highlightsSection: { marginTop: 17 },
  sectionTitle: { color: '#171717', fontSize: 14, fontWeight: '800', marginBottom: 9 },
  highlightList: { gap: 10, paddingBottom: 4 },
  highlightItem: { width: 66, alignItems: 'center' },
  highlightRing: { width: 64, height: 64, borderRadius: 32, padding: 2, overflow: 'hidden', borderWidth: 2, borderColor: '#7d22ef', backgroundColor: '#eadcff' },
  highlightImage: { width: '100%', height: '100%', borderRadius: 30 },
  highlightEmpty: { flex: 1, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eadcff' },
  highlightInitial: { color: '#5b21b6', fontSize: 20, fontWeight: '700' },
  highlightShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.12)' },
  highlightTitle: { position: 'absolute', left: 3, right: 3, bottom: 3, color: '#fff', textAlign: 'center', fontSize: 8, fontWeight: '700' },
  emptyHighlights: { color: '#6b7280', fontSize: 12, paddingVertical: 10 },
  error: { color: '#b42318', marginTop: 12, fontSize: 12 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalImage: { width: '100%', height: '80%' },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 14 },
});
