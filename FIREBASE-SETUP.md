# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for your ShoesX website.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard:
   - Enter project name: "ShoesX" (or your preferred name)
   - Enable Google Analytics (optional)
   - Click "Create project"

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication** → **Get Started**
2. Click on **Sign-in method** tab
3. Enable **Email/Password**:
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"

## Step 3: Get Your Firebase Config

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Select **Project settings**
3. Scroll down to **Your apps** section
4. Click the **Web** icon (`</>`) to add a web app
5. Register your app:
   - App nickname: "ShoesX Web"
   - Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"
6. Copy the `firebaseConfig` object

## Step 4: Update Your Code

1. Open `app.js` in your project
2. Find the `firebaseConfig` object at the top of the file (around line 4)
3. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};
```

## Step 5: Enable Firestore (Optional - for storing user data)

1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development)
4. Select a location for your database
5. Click **Enable**

**Note**: For production, you'll need to set up proper security rules.

## Step 6: Test Your Setup

1. Open `index.html` in your browser
2. Click "Sign Up" button
3. Try creating a new account:
   - Enter name, email, and password (min 6 characters)
   - Click "Sign Up"
4. Check Firebase Console → Authentication → Users to see your new user

## Security Rules (Production)

When you're ready for production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Troubleshooting

### "Firebase Auth not configured" error
- Make sure you've updated the `firebaseConfig` in `app.js`
- Check browser console for specific error messages

### Authentication not working
- Verify Email/Password is enabled in Firebase Console
- Check that your Firebase config values are correct
- Ensure Firebase SDK scripts are loading (check Network tab)

### Users not appearing in Firebase
- Check browser console for errors
- Verify Firestore is enabled if you're storing user data
- Check Firebase Console → Authentication → Users

## Additional Features You Can Add

1. **Password Reset**: Add "Forgot Password" functionality
2. **Social Login**: Enable Google, Facebook, or Twitter sign-in
3. **Email Verification**: Send verification emails to new users
4. **User Profiles**: Store additional user data in Firestore

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Auth Guide](https://firebase.google.com/docs/auth)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)

