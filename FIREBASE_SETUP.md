# Firebase Setup Guide for Attendance App

## Issues Fixed

✅ **Auth Service**: Updated to use real Firebase authentication instead of mock implementation
✅ **Dashboard Loading**: Fixed broken `isAuthenticated()` and `getUserId()` methods
✅ **Google Sign-In**: Properly configured Firebase authentication

## Firebase Configuration Status

✅ **Firebase is fully configured** with your actual project credentials. No placeholder values remain.

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Enter a project name (e.g., "Attendance App")
4. Follow the setup wizard

### Step 2: Add a Web App

1. In your Firebase project, click the web icon (</>) to add a web app
2. Register your app with a nickname (e.g., "Attendance Web App")
3. Firebase will display your configuration object - **save this!**

### Step 3: Enable Authentication Methods

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** authentication
3. Enable **Google** authentication:
   - Click on Google provider
   - Enable it
   - Add your support email
   - Save

### Step 4: Configure Firebase in Your App

Open `services/firebase.ts` and replace the placeholder values with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

You can find these values in:
- Firebase Console → Project Settings → General → Your apps → SDK setup and configuration

### Step 5: Configure Authorized Domains (Important for Google Sign-In)

1. In Firebase Console, go to **Authentication** → **Settings** → **Authorized domains**
2. Add your domains:
   - `localhost` (for development)
   - Your production domain (when deployed)

### Step 6: Test Your Setup

1. Run your app: `npm start`
2. Try signing up with email/password
3. Try signing in with Google

## Why the Dashboard Shows Nothing

The dashboard is **working correctly** but appears empty because:

1. **No subjects added yet**: The app starts with zero subjects
2. **No attendance records**: You need to add subjects first, then mark attendance

### To See Data on Dashboard:

1. **Sign in** to the app
2. **Go to Subjects tab** (bottom navigation)
3. **Add some subjects** (e.g., Math, Science, English)
4. **Go back to Dashboard** (Home tab)
5. **Mark attendance** using the Quick Mark buttons

The dashboard will then show:
- Overall attendance percentage
- Subject overview with progress bars
- Today's attendance records
- Your streak count

## Quick Start After Firebase Setup

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm start

# For web
npm run web

# For Android (requires Android Studio)
npm run android

# For iOS (requires Xcode on macOS)
npm run ios
```

## Troubleshooting

### Google Sign-In Not Working

**Error: "popup_closed_by_user"**
- User closed the popup before completing sign-in
- Try again

**Error: "auth/unauthorized-domain"**
- Add your domain to authorized domains in Firebase Console
- See Step 5 above

**Error: "auth/configuration-not-found"**
- Google provider not enabled in Firebase
- See Step 3 above

### Email Sign-In Issues

**Error: "auth/email-already-in-use"**
- This email is already registered
- Try signing in instead of signing up

**Error: "auth/weak-password"**
- Password must be at least 6 characters

**Error: "auth/invalid-email"**
- Check email format

### Dashboard Empty

- This is **normal for a new user**
- Add subjects first from the Subjects tab
- Then mark attendance to see data

## Firebase Security Rules

For production, configure Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read for shared data
    match /public/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Need Help?

If you encounter issues:

1. Check browser console for error messages
2. Verify Firebase configuration is correct
3. Ensure authentication methods are enabled
4. Check that authorized domains include localhost
5. Make sure you're using the correct Firebase project

## Next Steps

Once Firebase is configured:

1. ✅ Sign in/Sign up will work
2. ✅ Google authentication will work
3. ✅ User data will persist across sessions
4. ✅ Dashboard will populate as you add subjects and mark attendance
