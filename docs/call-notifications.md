# VYBE call notifications setup

VYBE now keeps incoming call offers and ICE candidates in Supabase so a recipient can receive an incoming call after opening the app from a browser notification. The in-app call listener is mounted at the app layout, so calls ring while the user is on any VYBE screen. Browser push can alert a subscribed device when the VYBE page is in the background or closed.

## Supabase setup

1. Apply `supabase/migrations/20261123000000_direct_call_push.sql` to the Supabase project.
2. Generate a VAPID key pair with `npx web-push generate-vapid-keys`.
3. Add the public key to the deployed app environment as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and redeploy the web app.
4. Set the private values as Supabase Edge Function secrets. Keep the private key out of the web app and source control:

   ```sh
   supabase secrets set VAPID_PUBLIC_KEY="<public-key>" VAPID_PRIVATE_KEY="<private-key>" VAPID_SUBJECT="mailto:<support-address>"
   ```

5. Deploy the push function:

   ```sh
   supabase functions deploy notify-incoming-call
   ```

Users then enable **Incoming calls** in VYBE’s Notification preferences and allow browser notifications on each device.

## Platform limits

Background web push requires HTTPS and a browser with Push API support. On iPhone and iPad, users need to add VYBE to the Home Screen before enabling web push. The separate Expo native app does not yet register APNs/FCM push tokens, so native-app-closed call alerts need a native push setup as a follow-up. The operating system controls notification sound and vibration while the site is closed.
