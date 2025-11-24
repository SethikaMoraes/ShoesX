/**
 * Profile Manager
 * Handles user profile, measurements, and size history
 */

class ProfileManager {
  constructor() {
    this.currentUser = null;
    this.measurements = null;
    this.sizeHistory = [];
    this.init();
  }

  async init() {
    if (!auth) {
      console.error('Firebase Auth not initialized');
      window.location.href = 'index.html';
      return;
    }

    // Check authentication
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = 'index.html';
        return;
      }

      this.currentUser = user;
      this.updateUserInfo(user);
      this.updateNavbarUI(user);
      this.updateHero(user);
      await this.loadMeasurements();
      await this.loadSizeHistory();
      this.setupEventListeners();
      this.updateMetrics();
    });
  }

  /**
   * Update user info display
   */
  updateUserInfo(user) {
    const nameDisplay = document.getElementById('user-name-display');
    const emailDisplay = document.getElementById('user-email-display');

    if (nameDisplay) {
      nameDisplay.textContent = user.displayName || 'Not set';
    }
    if (emailDisplay) {
      emailDisplay.textContent = user.email || '';
    }
  }

  /**
   * Update hero welcome text
   */
  updateHero(user) {
    const heroName = document.getElementById('profile-hero-name');
    if (heroName) {
      heroName.textContent = user.displayName || (user.email ? user.email.split('@')[0] : 'ShoesX member');
    }
  }

  /**
   * Update navbar UI to show user menu instead of Sign In/Sign Up
   */
  updateNavbarUI(user) {
    if (!user) return;

    // Hide Sign In and Sign Up buttons
    const signInBtns = document.querySelectorAll('[data-action="signin"]');
    const signUpBtns = document.querySelectorAll('[data-action="signup"]');
    signInBtns.forEach(btn => btn.style.display = 'none');
    signUpBtns.forEach(btn => btn.style.display = 'none');

    // Show user menu
    const userMenu = document.getElementById('user-menu');
    const mobileUserMenu = document.getElementById('mobile-user-menu');
    if (userMenu) userMenu.classList.remove('hidden');
    if (mobileUserMenu) mobileUserMenu.classList.remove('hidden');

    // Update user name displays
    const userName = document.getElementById('user-name');
    const mobileUserName = document.getElementById('mobile-user-name');
    if (userName) userName.textContent = user.displayName || user.email;
    if (mobileUserName) mobileUserName.textContent = user.displayName || user.email;
  }

  /**
   * Load measurements from Firestore
   */
  async loadMeasurements() {
    if (!this.currentUser || !db) return;

    try {
      const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
      
      if (userDoc.exists) {
        const data = userDoc.data();
        this.measurements = data.measurements || null;
        this.displayMeasurements();
        this.updateMetrics();
      }
    } catch (error) {
      console.error('Error loading measurements:', error);
      this.showError('Failed to load measurements');
    }
  }

  /**
   * Display measurements
   */
  displayMeasurements() {
    const displayGender = document.getElementById('display-gender');
    const displayLength = document.getElementById('display-length');
    const displayWidth = document.getElementById('display-width');
    const displayFit = document.getElementById('display-fit');

    if (this.measurements) {
      if (displayGender) displayGender.textContent = this.measurements.gender || '-';
      if (displayLength) displayLength.textContent = this.measurements.length ? `${this.measurements.length} cm` : '-';
      if (displayWidth) displayWidth.textContent = this.measurements.width ? `${this.measurements.width} cm` : '-';
      if (displayFit) displayFit.textContent = this.measurements.preferredFit ? this.capitalize(this.measurements.preferredFit) : '-';
    } else {
      if (displayGender) displayGender.textContent = 'Not set';
      if (displayLength) displayLength.textContent = 'Not set';
      if (displayWidth) displayWidth.textContent = 'Not set';
      if (displayFit) displayFit.textContent = 'Not set';
    }
    this.updateMetrics();
  }

  /**
   * Update metric cards
   */
  updateMetrics() {
    const measurementStatus = document.getElementById('profile-metric-measurements');
    const updatedAt = document.getElementById('profile-metric-updated');
    const historyCount = document.getElementById('profile-metric-history');
    const fitPref = document.getElementById('profile-metric-fit');

    if (measurementStatus) {
      measurementStatus.textContent = this.measurements ? 'Synced' : 'Pending';
    }

    if (updatedAt) {
      const ts = this.measurements ? this.measurements.lastUpdated : null;
      updatedAt.textContent = ts ? this.formatTimestamp(ts) : '—';
    }

    if (historyCount) {
      const count = this.sizeHistory ? this.sizeHistory.length : 0;
      historyCount.textContent = String(count).padStart(2, '0');
    }

    if (fitPref) {
      const preferredFit = this.measurements ? this.measurements.preferredFit : null;
      fitPref.textContent = preferredFit ? this.capitalize(preferredFit) : 'Regular';
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Edit measurements button
    const editBtn = document.getElementById('edit-measurements');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        this.showMeasurementsForm();
      });
    }

    const heroEditBtn = document.getElementById('hero-edit-measurements');
    if (heroEditBtn) {
      heroEditBtn.addEventListener('click', () => {
        this.showMeasurementsForm();
        const section = document.getElementById('measurements-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Cancel edit
    const cancelBtn = document.getElementById('cancel-edit');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.hideMeasurementsForm();
      });
    }

    // Save measurements form
    const form = document.getElementById('measurements-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveMeasurements();
      });
    }

    // Sign out (both desktop and mobile)
    const signOutBtn = document.getElementById('signout-btn');
    const mobileSignOutBtn = document.getElementById('mobile-signout-btn');
    
    const handleSignOut = () => {
      auth.signOut().then(() => {
        window.location.href = 'index.html';
      });
    };
    
    if (signOutBtn) {
      signOutBtn.addEventListener('click', handleSignOut);
    }
    if (mobileSignOutBtn) {
      mobileSignOutBtn.addEventListener('click', handleSignOut);
    }
  }

  /**
   * Show measurements form
   */
  showMeasurementsForm() {
    const display = document.getElementById('measurements-display');
    const form = document.getElementById('measurements-form');
    const editBtn = document.getElementById('edit-measurements');

    if (display) display.classList.add('hidden');
    if (form) {
      form.classList.remove('hidden');
      
      // Populate form with existing data
      if (this.measurements) {
        const genderSelect = document.getElementById('form-gender');
        const lengthInput = document.getElementById('form-length');
        const widthInput = document.getElementById('form-width');
        const fitSelect = document.getElementById('form-fit');

        if (genderSelect) genderSelect.value = this.measurements.gender || '';
        if (lengthInput) lengthInput.value = this.measurements.length || '';
        if (widthInput) widthInput.value = this.measurements.width || '';
        if (fitSelect) fitSelect.value = this.measurements.preferredFit || 'regular';
      }
    }
    if (editBtn) editBtn.classList.add('hidden');
  }

  /**
   * Hide measurements form
   */
  hideMeasurementsForm() {
    const display = document.getElementById('measurements-display');
    const form = document.getElementById('measurements-form');
    const editBtn = document.getElementById('edit-measurements');

    if (display) display.classList.remove('hidden');
    if (form) form.classList.add('hidden');
    if (editBtn) editBtn.classList.remove('hidden');
  }

  /**
   * Save measurements to Firestore
   */
  async saveMeasurements() {
    if (!this.currentUser || !db) return;

    const form = document.getElementById('measurements-form');
    if (!form) return;

    const measurements = {
      gender: form.gender.value,
      length: parseFloat(form.length.value),
      width: parseFloat(form.width.value),
      preferredFit: form.fit.value,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Validate
    if (!measurements.gender || !measurements.length || !measurements.width) {
      this.showError('Please fill in all required fields');
      return;
    }

    if (measurements.length < 10 || measurements.length > 40) {
      this.showError('Foot length must be between 10 and 40 cm');
      return;
    }

    if (measurements.width < 5 || measurements.width > 20) {
      this.showError('Foot width must be between 5 and 20 cm');
      return;
    }

    try {
      this.showLoading(true);
      
      await db.collection('users').doc(this.currentUser.uid).set({
        measurements: measurements,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      this.measurements = measurements;
      this.displayMeasurements();
      this.updateMetrics();
      this.hideMeasurementsForm();
      this.showSuccess('Measurements saved successfully!');
    } catch (error) {
      console.error('Error saving measurements:', error);
      this.showError('Failed to save measurements');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Load size history from Firestore
   */
  async loadSizeHistory() {
    if (!this.currentUser || !db) return;

    try {
      const historySnapshot = await db.collection('sizeHistory')
        .where('userId', '==', this.currentUser.uid)
        .orderBy('purchasedAt', 'desc')
        .limit(10)
        .get();

      this.sizeHistory = [];
      historySnapshot.forEach(doc => {
        this.sizeHistory.push({ id: doc.id, ...doc.data() });
      });

    this.displaySizeHistory();
    this.updateMetrics();
    } catch (error) {
      console.error('Error loading size history:', error);
    }
  }

  /**
   * Display size history
   */
  displaySizeHistory() {
    const container = document.getElementById('size-history');
    if (!container) return;

    if (this.sizeHistory.length === 0) {
      container.innerHTML = '<p class="text-slate-500 dark:text-slate-400 text-sm">No size history yet. Your purchases will appear here.</p>';
      return;
    }

    container.innerHTML = this.sizeHistory.map(item => `
      <div class="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold dark:text-white">${item.productName || 'Product'}</h3>
          <span class="text-sm text-slate-500 dark:text-slate-400">${this.formatDate(item.purchasedAt)}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span class="text-slate-500 dark:text-slate-400">Size:</span>
            <span class="font-medium dark:text-white ml-2">${item.size || '-'}</span>
          </div>
          <div>
            <span class="text-slate-500 dark:text-slate-400">Fit Rating:</span>
            <span class="font-medium dark:text-white ml-2">${item.fitRating ? this.capitalize(item.fitRating) : '-'}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Format date
   */
  formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatTimestamp(timestamp) {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Capitalize first letter
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Show loading overlay
   */
  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      if (show) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
      } else {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
      }
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-100 dark:bg-green-900/30 border-green-500' : 'bg-rose-100 dark:bg-rose-900/30 border-rose-500';
    const textColor = type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-rose-700 dark:text-rose-300';
    
    notification.className = `fixed top-24 right-4 ${bgColor} border ${textColor} rounded-lg shadow-lg p-4 z-50 transform translate-x-full transition-transform duration-300 max-w-sm`;
    notification.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-sm font-medium">${message}</span>
        <button class="ml-auto" onclick="this.parentElement.parentElement.remove()" aria-label="Close">×</button>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 10);
    
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
  });
} else {
  window.profileManager = new ProfileManager();
}

