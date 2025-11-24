# ShoesX - Quick Setup Guide

Welcome! This guide will help you get your ShoesX website up and running.

## 📁 Project Structure

```
ShoesX/
├── index.html          # Main HTML file
├── style.css           # Styles and dark mode
├── app.js              # All JavaScript functionality
├── README-3D-MODELS.md # Guide for adding 3D models
├── FIREBASE-SETUP.md   # Firebase authentication setup
└── SETUP.md            # This file
```

## 🚀 Quick Start

1. **Open the website**: Simply open `index.html` in your browser
2. **Configure Firebase** (optional): See `FIREBASE-SETUP.md`
3. **Add 3D Models** (optional): See `README-3D-MODELS.md`

## ✨ Features Included

✅ **Dark/Light Mode Toggle**
- Click the theme button in the navigation
- Preference is saved in localStorage
- Automatically applies on page load

✅ **Firebase Authentication**
- Sign up and sign in functionality
- User data stored in Firestore
- See `FIREBASE-SETUP.md` for configuration

✅ **3D Model Viewer**
- Supports GLB format
- Automatic fallback for missing models
- See `README-3D-MODELS.md` for details

✅ **Form Validation**
- Fit Assurance form with real-time validation
- Contact form email validation
- Accessible error messages

✅ **Responsive Design**
- Mobile-friendly navigation
- Optimized for all screen sizes

## 🔧 Configuration Steps

### Step 1: Firebase Setup (Required for Authentication)

1. Follow the guide in `FIREBASE-SETUP.md`
2. Get your Firebase config from Firebase Console
3. Update `firebaseConfig` in `app.js` (line 4-10)

### Step 2: Add 3D Models (Optional)

1. Place GLB files in the project root:
   - `shoe.glb` (runner)
   - `formal.glb`
   - `trail.glb`
   - `court.glb`
2. Or update model paths in `index.html`
3. See `README-3D-MODELS.md` for detailed instructions

### Step 3: Test Everything

1. Open `index.html` in a browser
2. Test dark mode toggle
3. Try signing up (after Firebase setup)
4. Test form validation
5. Check 3D viewer (if models are added)

## 🎨 Customization

### Colors
Edit CSS variables in `style.css`:
```css
:root {
  --accent: #10b981;    /* Primary green */
  --accent-2: #06b6d4;  /* Secondary cyan */
}
```

### Dark Mode Colors
Dark mode styles are in `style.css` under `[data-theme="dark"]`

## 📝 Notes

- **Firebase**: Authentication won't work until you configure Firebase
- **3D Models**: Site works without models (shows fallback UI)
- **Browser Support**: Modern browsers (Chrome, Firefox, Edge, Safari)

## 🐛 Troubleshooting

### Theme toggle not working?
- Check browser console for errors
- Ensure `app.js` is loaded correctly

### Firebase errors?
- Verify Firebase config in `app.js`
- Check Firebase Console for enabled services
- See `FIREBASE-SETUP.md`

### 3D models not showing?
- Check file paths in `index.html`
- Verify GLB files are in correct location
- Check browser console for loading errors
- See `README-3D-MODELS.md`

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Model Viewer Documentation](https://modelviewer.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🎯 Next Steps

1. ✅ Set up Firebase (if using authentication)
2. ✅ Add 3D models (optional)
3. ✅ Customize colors and branding
4. ✅ Add shopping cart functionality
5. ✅ Deploy to hosting (Netlify, Vercel, etc.)

---

**Need help?** Check the individual README files for detailed guides on specific features.

