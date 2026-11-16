import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type Profile = { username: string | null; display_name: string | null; bio: string | null; avatar_url: string | null };

export default function MyProfileScreen() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.user.id) return;
    supabase.from('profiles').select('username, display_name, bio, avatar_url').eq('id', session.user.id).maybeSingle().then(({ data, error: loadError }) => {
      setProfile(data as Profile | null); if (loadError) setError(loadError.message); setBusy(false);
    });
  }, [session?.user.id]);

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message); else router.replace('/');
  }

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <View style={styles.top}><Text style={styles.brand}>VYBE</Text><Text style={styles.title}>Your profile</Text></View>
      {busy ? <ActivityIndicator color="#202124" style={{ marginTop: 45 }} /> : <View style={styles.card}>
        <View style={styles.avatar}>{profile?.avatar_url ? <Image alt={`${profile.display_name || 'Your'} profile picture`} source={{ uri: profile.avatar_url }} style={styles.avatarImage} /> : <Text style={styles.avatarLetter}>{(profile?.display_name || session?.user.email || 'V').slice(0, 1).toUpperCase()}</Text>}</View>
        <Text style={styles.name}>{profile?.display_name || session?.user.user_metadata?.full_name || 'VYBE user'}</Text>
        <Text style={styles.username}>@{(profile?.username || session?.user.email?.split('@')[0] || 'user').replace(/^@/, '')}</Text>
        <Text style={styles.bio}>{profile?.bio || 'Building connections, sharing ideas, and exploring every world.'}</Text>
        <View style={styles.info}><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoValue}>{session?.user.email}</Text></View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable onPress={signOut} style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}><Text style={styles.buttonText}>Log out</Text></Pressable>
      </View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 14 }, top: { paddingTop: 11 }, brand: { color: '#171717', fontWeight: '900', fontSize: 23 }, title: { color: '#111827', fontSize: 28, fontWeight: '800', marginTop: 20 }, card: { marginTop: 18, backgroundColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 25, padding: 21, alignItems: 'center' }, avatar: { width: 86, height: 86, borderRadius: 45, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 14 }, avatarImage: { width: '100%', height: '100%' }, avatarLetter: { color: '#166534', fontWeight: '700', fontSize: 28 }, name: { color: '#171717', fontWeight: '800', fontSize: 20 }, username: { color: '#737780', marginTop: 5 }, bio: { color: '#555b64', lineHeight: 21, textAlign: 'center', marginTop: 15, marginBottom: 15 }, info: { width: '100%', backgroundColor: '#f7f7f8', borderRadius: 14, padding: 13, marginTop: 5 }, infoLabel: { color: '#737780', fontSize: 12 }, infoValue: { color: '#202124', fontSize: 14, marginTop: 5 }, button: { width: '100%', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 14, marginTop: 18, backgroundColor: '#fff' }, buttonText: { color: '#166534', fontWeight: '700', fontSize: 15 }, error: { color: '#b42318', marginTop: 12 } });
