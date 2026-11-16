import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function register() {
    setMessage(''); setError('');
    if (!isSupabaseConfigured) { setError('Add the VYBE Supabase URL and publishable key to mobile/.env to connect.'); return; }
    if (!name.trim() || !email.trim() || password.length < 8) { setError('Enter your name and email. Your password must contain at least 8 characters.'); return; }
    if (password !== confirm) { setError('Your passwords do not match.'); return; }
    setBusy(true);
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: 'vybe://auth/callback' },
    });
    if (signupError) { setError(signupError.message); setBusy(false); return; }
    if (data.user && data.session) {
      const displayName = name.trim();
      const username = displayName.toLowerCase().replace(/[^a-z0-9._-]+/g, '.').replace(/^[._-]+|[._-]+$/g, '').slice(0, 24) || `member-${data.user.id.slice(0, 8)}`;
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        username: `${username}.${data.user.id.slice(0, 5)}`,
        display_name: displayName,
        bio: 'Building connections, sharing ideas, and exploring every world. 🌍',
        avatar_url: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: true });
      if (profileError) setError(`Your account was created, but the profile needs attention: ${profileError.message}`);
      else router.replace('/(tabs)');
    } else {
      setMessage('Check your email for a confirmation link. Add vybe://auth/callback to the Supabase allowed redirect URLs so the link can return to this app.');
    }
    setBusy(false);
  }

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Link href="/" style={styles.back}>‹  Back to log in</Link>
          <Text style={styles.brand}>VYBE</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join the community and share your world.</Text>
          <Text style={styles.label}>Full name</Text><TextInput autoCapitalize="words" placeholder="Enter your full name" value={name} onChangeText={setName} style={styles.input} />
          <Text style={styles.label}>Email address</Text><TextInput autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" value={email} onChangeText={setEmail} style={styles.input} />
          <Text style={styles.label}>Password</Text><TextInput secureTextEntry placeholder="At least 8 characters" value={password} onChangeText={setPassword} style={styles.input} />
          <Text style={styles.label}>Confirm password</Text><TextInput secureTextEntry placeholder="Enter your password again" value={confirm} onChangeText={setConfirm} style={styles.input} />
          {error ? <Text style={styles.error}>{error}</Text> : null}{message ? <Text style={styles.message}>{message}</Text> : null}
          <Pressable onPress={register} disabled={busy} style={({ pressed }) => [styles.button, pressed && { opacity: 0.72 }]}>{busy ? <ActivityIndicator color="#202124" /> : <Text style={styles.buttonText}>Create account</Text>}</Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f1f2f3', justifyContent: 'center', padding: 18 },
  keyboard: { justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 26, borderColor: '#e5e7eb', borderWidth: 1, padding: 24 },
  back: { color: '#6b7280', fontSize: 14, marginBottom: 16 },
  brand: { color: '#202124', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  title: { color: '#202124', fontSize: 27, fontWeight: '700' },
  subtitle: { color: '#6b7280', marginTop: 7, marginBottom: 13 },
  label: { color: '#374151', fontSize: 14, fontWeight: '600', marginBottom: 7, marginTop: 12 },
  input: { backgroundColor: '#fafafa', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, color: '#202124', fontSize: 16 },
  error: { color: '#b42318', backgroundColor: '#fff3f2', padding: 10, borderRadius: 10, marginTop: 13 },
  message: { color: '#374151', backgroundColor: '#f3f4f6', padding: 10, borderRadius: 10, marginTop: 13, lineHeight: 20 },
  button: { minHeight: 49, justifyContent: 'center', alignItems: 'center', borderColor: '#e5e7eb', borderWidth: 1, borderRadius: 13, marginTop: 18 },
  buttonText: { color: '#202124', fontWeight: '700', fontSize: 16 },
});
