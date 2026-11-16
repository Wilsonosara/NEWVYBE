import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';

function getWebsiteUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  if (configuredUrl) return configuredUrl;

  const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (__DEV__ && expoHost) return `http://${expoHost}:3000/`;

  return null;
}

export default function WebsiteScreen() {
  const [failed, setFailed] = useState(false);
  const websiteUrl = getWebsiteUrl();

  if (!websiteUrl) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>VYBE website URL needed</Text>
        <Text style={styles.message}>
          Set EXPO_PUBLIC_WEB_URL to your deployed website address to open the full VYBE experience here.
        </Text>
      </SafeAreaView>
    );
  }

  if (failed) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Can’t reach the VYBE website</Text>
        <Text style={styles.message}>
          For local Expo Go preview, start the website with npm run dev:mobile and keep it on the same Wi-Fi network as your phone.
        </Text>
        <Text style={styles.address}>{websiteUrl}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <WebView
        source={{ uri: websiteUrl }}
        style={styles.webView}
        onError={() => setFailed(true)}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode >= 500) setFailed(true);
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color="#15803d" />
          </View>
        )}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  webView: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  center: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { color: '#171717', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: { color: '#6b7280', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  address: { color: '#15803d', fontSize: 12, marginTop: 14, textAlign: 'center' },
});
