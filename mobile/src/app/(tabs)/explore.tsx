import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type Person = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; bio: string | null };

export default function ExploreScreen() {
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Person | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Search by name or username.');

  async function findPeople() {
    if (!session?.user.id) return;
    const query = search.trim().replace(/[,%()]/g, '');
    if (!query) { setPeople([]); setMessage('Search by name or username.'); return; }
    setBusy(true); setMessage('');
    const pattern = `%${query}%`;
    const { data, error } = await supabase.from('profiles').select('id, username, display_name, avatar_url, bio').neq('id', session.user.id).or(`username.ilike.${pattern},display_name.ilike.${pattern}`).limit(30);
    if (error) setMessage(error.message);
    else { setPeople((data ?? []) as Person[]); if (!data?.length) setMessage('No profiles match your search.'); }
    setBusy(false);
  }

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <Text style={styles.brand}>VYBE</Text><Text style={styles.title}>Explore</Text><Text style={styles.subtitle}>Find people and communities on VYBE.</Text>
      <View style={styles.searchRow}><TextInput value={search} onChangeText={setSearch} onSubmitEditing={() => void findPeople()} returnKeyType="search" placeholder="Search people by name or username" placeholderTextColor="#8b9097" style={styles.input} /><Pressable onPress={() => void findPeople()} style={styles.searchButton}><Text style={styles.searchButtonText}>Search</Text></Pressable></View>
      {busy ? <ActivityIndicator color="#202124" style={{ marginTop: 25 }} /> : null}
      {!busy && message ? <Text style={styles.message}>{message}</Text> : null}
      <FlatList data={people} keyExtractor={(person) => person.id} contentContainerStyle={styles.results} renderItem={({ item }) => <Pressable onPress={() => setSelected(item)} style={styles.person}><View style={styles.avatar}>{item.avatar_url ? <Image alt={`${item.display_name || item.username}'s profile picture`} source={{ uri: item.avatar_url }} style={styles.avatarImage} /> : <Text style={styles.avatarLetter}>{(item.display_name || item.username || 'V').slice(0, 1).toUpperCase()}</Text>}</View><View style={{ flex: 1 }}><Text style={styles.personName}>{item.display_name || item.username || 'VYBE user'}</Text><Text style={styles.username}>@{(item.username || 'user').replace(/^@/, '')}</Text></View><Text style={styles.chevron}>›</Text></Pressable>} />
      {selected ? <View style={styles.overlay}><Pressable onPress={() => setSelected(null)} style={StyleSheet.absoluteFill} /><View style={styles.profileCard}><View style={styles.avatarLarge}>{selected.avatar_url ? <Image alt={`${selected.display_name || selected.username}'s profile picture`} source={{ uri: selected.avatar_url }} style={styles.avatarImage} /> : <Text style={styles.avatarLetter}>{(selected.display_name || selected.username || 'V').slice(0, 1).toUpperCase()}</Text>}</View><Text style={styles.personName}>{selected.display_name || 'VYBE user'}</Text><Text style={styles.username}>@{(selected.username || 'user').replace(/^@/, '')}</Text><Text style={styles.bio}>{selected.bio || 'Building connections and sharing ideas on VYBE.'}</Text><Pressable onPress={() => setSelected(null)} style={styles.close}><Text style={styles.personName}>Close</Text></Pressable></View></View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 14 }, brand: { color: '#171717', fontWeight: '900', fontSize: 23, marginTop: 11 }, title: { color: '#111827', fontSize: 28, fontWeight: '800', marginTop: 20 }, subtitle: { color: '#6b7280', fontSize: 14, lineHeight: 21, marginTop: 5 }, searchRow: { flexDirection: 'row', gap: 8, marginTop: 20 }, input: { flex: 1, backgroundColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, minHeight: 48, color: '#202124', fontSize: 15 }, searchButton: { minWidth: 78, backgroundColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, searchButtonText: { color: '#166534', fontWeight: '700' }, message: { textAlign: 'center', color: '#6b7280', marginTop: 28, fontSize: 14 }, results: { paddingTop: 13, paddingBottom: 18 }, person: { backgroundColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 9 }, avatar: { width: 46, height: 46, borderRadius: 24, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: '100%', height: '100%', borderRadius: 99 }, avatarLetter: { color: '#166534', fontWeight: '700', fontSize: 18 }, personName: { color: '#171717', fontWeight: '700', fontSize: 15 }, username: { color: '#737780', marginTop: 3, fontSize: 13 }, chevron: { color: '#737780', fontSize: 25, paddingHorizontal: 5 }, overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.42)' }, profileCard: { width: '100%', backgroundColor: '#fff', borderRadius: 22, alignItems: 'center', padding: 24, borderWidth: 1, borderColor: '#e5e7eb' }, avatarLarge: { width: 76, height: 76, borderRadius: 40, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 13 }, bio: { color: '#555b64', textAlign: 'center', lineHeight: 21, marginTop: 18 }, close: { marginTop: 22, paddingVertical: 9, paddingHorizontal: 19, backgroundColor: '#f0fdf4', borderRadius: 12 },
});
