# PWA Setup Guide

This guide will help you set up the Progressive Web App (PWA) features for the Expense Tracker.

## Features Implemented

✅ **iOS Support**
- Apple touch icons and splash screens
- Standalone mode support
- Black translucent status bar
- Proper viewport configuration

✅ **Service Worker**
- Offline support with fallback page
- Network-first caching strategy
- Background sync for offline submissions
- Push notification support

✅ **Push Notifications**
- Budget alerts
- Spending pattern notifications
- Savings goal reminders
- New expense confirmations

✅ **Install Prompts**
- Custom install banner for Android/Chrome
- iOS-specific installation instructions
- Smart timing (shows after 3 visits or 5 seconds)
- Dismissible with 7-day cooldown

✅ **App Manifest**
- App shortcuts for quick actions
- Multiple icon sizes for all platforms
- Standalone display mode
- Portrait orientation lock

## Setup Steps

### 1. Generate VAPID Keys for Push Notifications

```bash
npx web-push generate-vapid-keys
```

Add the keys to your `.env` file:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com
```

### 2. Generate App Icons

You need icons in these sizes: 72, 96, 128, 144, 152, 192, 384, 512

**Option A: Use an online tool**
- Visit https://realfavicongenerator.net/
- Upload a 512x512px logo
- Download and place in `/public/`

**Option B: Use ImageMagick**
```bash
# Starting with a 512x512 source image
convert source.png -resize 72x72 public/icon-72x72.png
convert source.png -resize 96x96 public/icon-96x96.png
convert source.png -resize 128x128 public/icon-128x128.png
convert source.png -resize 144x144 public/icon-144x144.png
convert source.png -resize 152x152 public/icon-152x152.png
convert source.png -resize 192x192 public/icon-192x192.png
convert source.png -resize 384x384 public/icon-384x384.png
convert source.png -resize 512x512 public/icon-512x512.png
```

### 3. Run Database Migration

Apply the push subscriptions migration:
```bash
# Using Supabase CLI
supabase db push

# Or manually execute the SQL in:
# supabase/migrations/005_add_push_subscriptions.sql
```

### 4. Test PWA Installation

**On Desktop (Chrome/Edge):**
1. Visit your app in the browser
2. Look for the install icon in the address bar
3. Click install
4. App opens in standalone window

**On Android:**
1. Visit your app in Chrome
2. Tap the install banner or menu → "Add to Home Screen"
3. App icon appears on home screen
4. Opens in fullscreen standalone mode

**On iPhone/iPad:**
1. Visit your app in Safari
2. Tap the share button
3. Select "Add to Home Screen"
4. App icon appears with custom icon
5. Opens in standalone mode without browser UI

### 5. Test Push Notifications

**Enable Notifications:**
1. Click the bell icon in the app
2. Allow notifications when prompted
3. Test notification will appear

**Test Notifications:**
```bash
# Test with web-push CLI
npx web-push send-notification \
  --endpoint=<subscription-endpoint> \
  --key=<p256dh-key> \
  --auth=<auth-key> \
  --vapid-subject="mailto:your-email@example.com" \
  --vapid-pubkey=<public-key> \
  --vapid-pvtkey=<private-key> \
  --payload='{"title":"Test","body":"Testing push notifications"}'
```

## iOS-Specific Notes

### Supported Features:
- ✅ Offline mode
- ✅ Add to home screen
- ✅ Standalone display
- ✅ Custom icons
- ✅ Pull-to-refresh
- ✅ Haptic feedback
- ⚠️ Push notifications (limited - only works when app is open)
- ⚠️ Background sync (not supported)

### iOS Installation Instructions:
1. Open Safari (not Chrome)
2. Tap the share button (box with arrow)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add" to confirm
5. Find the app icon on your home screen

### iOS Status Bar:
The app uses `black-translucent` status bar style, which:
- Makes the status bar transparent
- Shows white text on dark backgrounds
- Integrates seamlessly with the app header

## Troubleshooting

### Service Worker Not Registering
- Check browser DevTools → Application → Service Workers
- Ensure you're on HTTPS (or localhost)
- Clear cache and hard reload (Ctrl+Shift+R)

### Icons Not Showing
- Verify icon files exist in `/public/`
- Check file names match manifest.json
- Clear browser cache
- On iOS, delete and re-add to home screen

### Push Notifications Not Working
- Check notification permission in browser settings
- Verify VAPID keys are correctly set
- Check browser console for errors
- Ensure database migration ran successfully
- On iOS, notifications only work in foreground

### Install Prompt Not Showing
- Wait for conditions to be met (3 visits, not dismissed recently)
- Check localStorage: `pwa-install-dismissed`
- Try in incognito mode
- On iOS, must use Safari

## Advanced Configuration

### Customizing Notifications
Edit `/components/push-notification-manager.tsx`:
- Change notification timing
- Customize notification content
- Add more notification types

### Customizing Install Prompt
Edit `/components/pwa-install-prompt.tsx`:
- Change display timing
- Customize appearance
- Modify dismissal logic

### Customizing Caching Strategy
Edit `/public/sw.js`:
- Change cache name for versioning
- Add more resources to cache
- Modify fetch strategy

### App Shortcuts
Edit `/public/manifest.json` shortcuts array:
- Add quick actions
- Customize URLs
- Add icons

## Browser Support

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| App Manifest | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ⚠️ | ✅ | ✅ |
| Install Prompt | ✅ | Manual | ❌ | ✅ |
| Background Sync | ✅ | ❌ | ⚠️ | ✅ |
| Shortcuts | ✅ | ❌ | ❌ | ✅ |

✅ Fully supported | ⚠️ Partial support | ❌ Not supported

## Security Best Practices

1. **HTTPS Only**: PWA features require HTTPS (except localhost)
2. **Secure VAPID Keys**: Never commit private keys to git
3. **Content Security Policy**: Add CSP headers for extra security
4. **Validate Subscriptions**: Check endpoints before sending notifications
5. **Rate Limiting**: Implement rate limits on notification endpoints

## Performance Optimization

1. **Cache Static Assets**: Service worker caches essential files
2. **Network First**: Dynamic content always fresh when online
3. **Offline Fallback**: Graceful degradation when offline
4. **Lazy Load Icons**: Icons loaded on demand
5. **Efficient Updates**: Service worker updates hourly

## Monitoring

Check PWA quality with:
- Chrome DevTools → Lighthouse → PWA audit
- Microsoft Edge → DevTools → PWA tab
- PWABuilder: https://www.pwabuilder.com/

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [iOS PWA Guide](https://medium.com/appscope/designing-native-like-progressive-web-apps-for-ios-1b3cdda1d0e8)
