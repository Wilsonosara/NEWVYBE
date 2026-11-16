import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/lib/auth';

export default function AppTabs() {
  const { session, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f2f3' }}><ActivityIndicator color="#202124" /></View>;
  if (!session) return <Redirect href="/" />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#15803d',
      tabBarInactiveTintColor: '#737780',
      tabBarStyle: { height: 66, paddingTop: 8, paddingBottom: 8, borderTopColor: '#e5e7eb', backgroundColor: '#fff' },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
