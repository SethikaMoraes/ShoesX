// Firebase Configuration
// Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyCw_36mUmIa04K26BimIgM9Qx-OQU4OTZw",
  authDomain: "shoesx-2525906.firebaseapp.com",
  projectId: "shoesx-2525906",
  storageBucket: "shoesx-2525906.firebasestorage.app",
  messagingSenderId: "451254233030",
  appId: "1:451254233030:web:8173eb26fba53e7e24b4c7"
};

// Initialize Firebase (only if Firebase is loaded)
let auth, db;
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
}

// Theme Management
const ThemeManager = {
  init() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.setTheme(savedTheme);
    this.setupThemeToggle();
  },

  setTheme(theme) {
    // Use dark class for both Tailwind and custom CSS
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    
    if (theme === 'dark') {
      htmlElement.classList.add('dark');
      bodyElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
      bodyElement.classList.remove('dark');
    }
    
    // Set data-theme for backward compatibility
    htmlElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Update theme icon
    this.updateThemeIcon(theme);
  },

  updateThemeIcon(theme) {
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      if (theme === 'dark') {
        // Sun icon for light mode (shows when in dark mode)
        themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
      } else {
        // Moon icon for dark mode (shows when in light mode)
        themeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
      }
    }
  },

  toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  },

  setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }
  }
};

// Authentication Manager
const AuthManager = {
  currentUser: null,

  init() {
    if (!auth) {
      console.warn('Firebase Auth not initialized. Please configure Firebase.');
      return;
    }

    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      this.updateUI(user);
    });

    this.setupAuthModals();
    this.setupAuthForms();
  },

  setupAuthModals() {
    const signInBtn = document.querySelectorAll('[data-action="signin"]');
    const signUpBtn = document.querySelectorAll('[data-action="signup"]');
    const authModal = document.getElementById('auth-modal');
    const closeAuthModal = document.getElementById('close-auth-modal');

    signInBtn.forEach(btn => {
      btn.addEventListener('click', () => this.openAuthModal('signin'));
    });

    signUpBtn.forEach(btn => {
      btn.addEventListener('click', () => this.openAuthModal('signup'));
    });

    if (closeAuthModal) {
      closeAuthModal.addEventListener('click', () => this.closeAuthModal());
    }

    if (authModal) {
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) this.closeAuthModal();
      });
    }

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && authModal && !authModal.classList.contains('hidden')) {
        this.closeAuthModal();
      }
    });
  },

  openAuthModal(mode) {
    const authModal = document.getElementById('auth-modal');
    const signInForm = document.getElementById('signin-form');
    const signUpForm = document.getElementById('signup-form');
    const authTitle = document.getElementById('auth-title');
    const switchAuthLink = document.getElementById('switch-auth-link');
    const switchAuthText = document.getElementById('switch-auth-text');

    if (!authModal) return;

    if (mode === 'signin') {
      signInForm?.classList.remove('hidden');
      signUpForm?.classList.add('hidden');
      if (authTitle) authTitle.textContent = 'Sign In';
      if (switchAuthText) switchAuthText.textContent = "Don't have an account?";
      if (switchAuthLink) {
        switchAuthLink.textContent = 'Sign Up';
        switchAuthLink.onclick = () => this.openAuthModal('signup');
      }
    } else {
      signInForm?.classList.add('hidden');
      signUpForm?.classList.remove('hidden');
      if (authTitle) authTitle.textContent = 'Sign Up';
      if (switchAuthText) switchAuthText.textContent = 'Already have an account?';
      if (switchAuthLink) {
        switchAuthLink.textContent = 'Sign In';
        switchAuthLink.onclick = () => this.openAuthModal('signin');
      }
    }

    authModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const firstInput = authModal.querySelector('input');
    if (firstInput) firstInput.focus();
  },

  closeAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
      authModal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  },

  setupAuthForms() {
    const signInForm = document.getElementById('signin-form');
    const signUpForm = document.getElementById('signup-form');

    if (signInForm) {
      signInForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.signIn(
          signInForm.email.value.trim(),
          signInForm.password.value
        );
      });
    }

    if (signUpForm) {
      signUpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.signUp(
          signUpForm.email.value.trim(),
          signUpForm.password.value,
          signUpForm.name?.value.trim()
        );
      });
    }
  },

  async signIn(email, password) {
    if (!auth) {
      alert('Firebase Auth not configured. Please set up Firebase.');
      return;
    }

    const errorMsg = document.getElementById('auth-error');
    try {
      await auth.signInWithEmailAndPassword(email, password);
      this.closeAuthModal();
      if (errorMsg) errorMsg.classList.add('hidden');
    } catch (error) {
      this.showAuthError(error.message);
    }
  },

  async signUp(email, password, name) {
    if (!auth) {
      alert('Firebase Auth not configured. Please set up Firebase.');
      return;
    }

    const errorMsg = document.getElementById('auth-error');
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      
      // Update user profile with name
      if (name && userCredential.user) {
        await userCredential.user.updateProfile({ displayName: name });
        
        // Save additional user data to Firestore
        if (db) {
          await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      this.closeAuthModal();
      if (errorMsg) errorMsg.classList.add('hidden');
    } catch (error) {
      this.showAuthError(error.message);
    }
  },

  async signOut() {
    if (!auth) return;
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  },

  showAuthError(message) {
    const errorMsg = document.getElementById('auth-error');
    if (errorMsg) {
      errorMsg.textContent = message;
      errorMsg.classList.remove('hidden');
    }
  },

  updateUI(user) {
    const signInBtns = document.querySelectorAll('[data-action="signin"]');
    const signUpBtns = document.querySelectorAll('[data-action="signup"]');
    const userMenu = document.getElementById('user-menu');
    const mobileUserMenu = document.getElementById('mobile-user-menu');
    const userName = document.getElementById('user-name');
    const mobileUserName = document.getElementById('mobile-user-name');
    const signOutBtn = document.getElementById('signout-btn');
    const mobileSignOutBtn = document.getElementById('mobile-signout-btn');

    if (user) {
      // User is signed in
      signInBtns.forEach(btn => btn.style.display = 'none');
      signUpBtns.forEach(btn => btn.style.display = 'none');
      if (userMenu) userMenu.classList.remove('hidden');
      if (mobileUserMenu) mobileUserMenu.classList.remove('hidden');
      if (userName) userName.textContent = user.displayName || user.email;
      if (mobileUserName) mobileUserName.textContent = user.displayName || user.email;
      
      // Load cart from Firestore if cart manager exists
      if (window.cartManager && db) {
        window.cartManager.loadFromFirestore(user.uid, db);
      }
    } else {
      // User is signed out
      signInBtns.forEach(btn => btn.style.display = '');
      signUpBtns.forEach(btn => btn.style.display = '');
      if (userMenu) userMenu.classList.add('hidden');
      if (mobileUserMenu) mobileUserMenu.classList.add('hidden');
      
      // Save cart to localStorage
      if (window.cartManager) {
        window.cartManager.saveToStorage();
      }
    }

    if (signOutBtn) {
      signOutBtn.onclick = () => this.signOut();
    }
    if (mobileSignOutBtn) {
      mobileSignOutBtn.onclick = () => this.signOut();
    }
  }
};

// Performance: Use requestAnimationFrame for animations
const raf = window.requestAnimationFrame || ((fn) => setTimeout(fn, 16));

// Suppress GLTFLoader texture loading errors (these are warnings, not critical)
(function() {
  const originalError = console.error;
  console.error = function(...args) {
    // Filter out GLTFLoader texture blob URL errors
    if (args.length > 0 && typeof args[0] === 'string' && 
        (args[0].includes('GLTFLoader') && args[0].includes("Couldn't load texture"))) {
      // Suppress these warnings - they're non-critical
      return;
    }
    originalError.apply(console, args);
  };
})();

// 3D Viewer Fallback Handler
function setup3DViewerFallback(viewerId, fallbackId) {
  const viewer = document.getElementById(viewerId);
  const fallback = document.getElementById(fallbackId);
  
  if (!viewer || !fallback) return;

  // Show loading animation initially
  fallback.classList.remove('hidden');
  viewer.style.opacity = '0';
  
  // Check if model-viewer is supported
  if (typeof customElements !== 'undefined' && customElements.get('model-viewer')) {
    
    viewer.addEventListener('error', (e) => {
      // Only show fallback for critical errors, not texture warnings
      if (e.detail && e.detail.type === 'error') {
        viewer.style.display = 'none';
        fallback.classList.remove('hidden');
      }
    });
    
    viewer.addEventListener('load', () => {
      // Hide loading animation and show the model with a fade in
      fallback.classList.add('hidden');
      viewer.style.display = 'block';
      viewer.style.opacity = '1';
      viewer.style.transition = 'opacity 0.5s ease-in-out';
    });

    // Show loading progress if available
    viewer.addEventListener('progress', (event) => {
      const progress = event.detail.totalProgress;
      if (progress < 1) {
        fallback.classList.remove('hidden');
      }
    });

    // Timeout for loading (10 seconds)
    setTimeout(() => {
      if (!viewer.loaded && viewer.src) {
        // Model took too long to load, hide loading and show fallback
        fallback.classList.remove('hidden');
      } else if (viewer.loaded) {
        // Model loaded successfully
        fallback.classList.add('hidden');
        viewer.style.opacity = '1';
      }
    }, 10000);
  } else {
    // model-viewer not supported
    viewer.style.display = 'none';
    fallback.classList.remove('hidden');
  }
}

// Form Validation Helper
function showError(input, message) {
  const errorId = input.getAttribute('aria-describedby');
  const errorEl = document.getElementById(errorId);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
  input.classList.add('border-rose-500');
  input.setAttribute('aria-invalid', 'true');
}

function clearError(input) {
  const errorId = input.getAttribute('aria-describedby');
  const errorEl = document.getElementById(errorId);
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }
  input.classList.remove('border-rose-500');
  input.removeAttribute('aria-invalid');
}

function validateFitForm() {
  const form = document.getElementById('fit-form');
  const gender = form.gender;
  const length = form.length;
  const width = form.width;
  const category = form.category;
  let isValid = true;

  // Clear previous errors
  [gender, length, width, category].forEach(clearError);

  // Validate gender
  if (!gender.value) {
    showError(gender, 'Please select a gender');
    isValid = false;
  }

  // Validate length
  const lengthVal = parseFloat(length.value);
  if (!length.value || isNaN(lengthVal)) {
    showError(length, 'Please enter a valid foot length');
    isValid = false;
  } else if (lengthVal < 10 || lengthVal > 40) {
    showError(length, 'Foot length must be between 10 and 40 cm');
    isValid = false;
  }

  // Validate width
  const widthVal = parseFloat(width.value);
  if (!width.value || isNaN(widthVal)) {
    showError(width, 'Please enter a valid foot width');
    isValid = false;
  } else if (widthVal < 5 || widthVal > 20) {
    showError(width, 'Foot width must be between 5 and 20 cm');
    isValid = false;
  }

  // Validate category
  if (!category.value) {
    showError(category, 'Please select a category');
    isValid = false;
  }

  return isValid;
}

// Initialize when DOM is ready
function init() {
  // Initialize theme
  ThemeManager.init();

  // Initialize Firebase Auth
  AuthManager.init();

  // Initialize Cart System
  if (typeof CartManager !== 'undefined' && typeof CartUI !== 'undefined') {
    window.cartManager = new CartManager();
    window.cartUI = new CartUI(window.cartManager);
    
    // Sync cart with Firestore if user is logged in
    if (AuthManager.currentUser && db) {
      window.cartManager.loadFromFirestore(AuthManager.currentUser.uid, db);
    }
  }

  // Initialize Search Manager
  if (typeof SearchManager !== 'undefined') {
    window.searchManager = new SearchManager();
  }

  // Initialize 3D viewer fallbacks and force load models
  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    setup3DViewerFallback('hero-viewer', 'hero-3d-fallback');
    setup3DViewerFallback('main-viewer', 'viewer-3d-fallback');
    
    // Force load models immediately
    const heroViewer = document.getElementById('hero-viewer');
    const mainViewer = document.getElementById('main-viewer');
    
    if (heroViewer && heroViewer.load) {
      heroViewer.load();
    }
    if (mainViewer && mainViewer.load) {
      mainViewer.load();
    }
  });

  // Smooth scroll for nav links with performance optimization
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      
      // Only prevent default for hash-only links (same page anchors like #home, #fit)
      // Allow normal navigation for page links (products.html, index.html, index.html#fit, etc.)
      if (href && href.startsWith('#') && !href.includes('.')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          const mobileMenu = document.getElementById('mobile-menu');
          if (mobileMenu) {
            mobileMenu.classList.add('hidden');
            document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
          }
        }
      }
      // For page links (products.html, index.html, index.html#fit, etc.), let browser handle navigation normally
      // Just close mobile menu if open
      const mobileMenu = document.getElementById('mobile-menu');
      if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
        document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Mobile menu toggle with accessibility
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      const isHidden = mobileMenu.classList.toggle('hidden');
      menuToggle.setAttribute('aria-expanded', !isHidden);
    });

    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.focus();
      }
    });
  }

  // Page load hero animation (optimized)
  raf(() => {
    document.querySelectorAll('.fade-hero').forEach(el => el.classList.add('show'));
  });

  // Intersection observer for sections (performance optimized)
  const observerOptions = { 
    threshold: 0.1,
    rootMargin: '50px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        raf(() => {
          entry.target.classList.add('show');
          observer.unobserve(entry.target);
        });
      }
    });
  }, observerOptions);

  // Observe elements with fade-up class
  document.querySelectorAll('.card, section').forEach(el => {
    el.classList.add('fade-up');
    observer.observe(el);
  });

  // Modal logic with keyboard navigation
  const modal = document.getElementById('product-modal');
  const modalClose = document.getElementById('modal-close');
  let previousActiveElement = null;

  function openModal() {
    previousActiveElement = document.activeElement;
    modal.classList.remove('hidden');
    modalClose.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    if (previousActiveElement) {
      previousActiveElement.focus();
    }
  }

  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });
  }

  // View Details buttons now link to product-detail.html
  // Modal functionality kept for backward compatibility if needed
  document.querySelectorAll('.view-details').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // If it's a link, let it navigate naturally
      if (btn.tagName === 'A') {
        return;
      }
      // Otherwise, fallback to modal (for any remaining buttons)
      e.preventDefault();
      const card = btn.closest('.product-card');
      if (card && modal) {
        document.getElementById('modal-name').textContent = card.dataset.name || '';
        document.getElementById('modal-price').textContent = card.dataset.price || '';
        document.getElementById('modal-category').textContent = card.dataset.category || '';
        document.getElementById('modal-rating').textContent = (card.dataset.rating || '0') + ' / 5';
        document.getElementById('modal-sizes').textContent = card.dataset.sizes || '';
        document.getElementById('modal-colors').textContent = card.dataset.colors || '';
        document.getElementById('modal-description').textContent = card.dataset.description || '';
        const modalImage = document.getElementById('modal-image');
        modalImage.src = card.dataset.image || '';
        modalImage.alt = card.dataset.name || 'Product image';
        openModal();
      }
    });
  });

  const modalView3d = document.getElementById('modal-view-3d');
  if (modalView3d) {
    modalView3d.addEventListener('click', () => {
      closeModal();
      const viewerSection = document.getElementById('viewer');
      if (viewerSection) {
        viewerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Fit Assurance form with validation
  const fitForm = document.getElementById('fit-form');
  const fitResult = document.getElementById('fit-result');
  const sizeOutput = document.getElementById('size-output');
  const confidenceOutput = document.getElementById('confidence-output');
  const returnOutput = document.getElementById('return-output');
  const riskBadge = document.getElementById('risk-badge');

  if (fitForm) {
    // Clear errors on input
    fitForm.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('input', () => clearError(input));
      input.addEventListener('change', () => clearError(input));
    });

    fitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      if (!validateFitForm()) {
        fitResult.classList.add('hidden');
        // Focus first error field
        const firstError = fitForm.querySelector('[aria-invalid="true"]');
        if (firstError) {
          firstError.focus();
        }
        return;
      }

      const length = parseFloat(fitForm.length.value);
      const width = parseFloat(fitForm.width.value);
      const gender = fitForm.gender.value;
      const category = fitForm.category.value;

      // Enhanced mock sizing logic
      let size = 'UK 7';
      if (length > 28.5) size = 'UK 10';
      else if (length > 27) size = 'UK 9';
      else if (length > 25.5) size = 'UK 8';
      else if (length < 25) size = 'UK 6';
      else if (length < 24) size = 'UK 5';

      // Adjust for gender
      if (gender === 'Female' && size.startsWith('UK')) {
        const numSize = parseInt(size.split(' ')[1]);
        size = `UK ${Math.max(3, numSize - 1.5)}`;
      }

      const confidence = Math.min(95, Math.max(70, 75 + Math.round((length + width) % 25)));
      const riskLevels = ['Low', 'Medium', 'High'];
      let riskIndex = 0;
      if (width > 10.5) riskIndex = 1;
      if (width > 11.5) riskIndex = 2;
      const risk = riskLevels[riskIndex];

      if (sizeOutput) sizeOutput.textContent = `Recommended Size: ${size}`;
      if (confidenceOutput) confidenceOutput.textContent = `Confidence: ${confidence}%`;
      if (returnOutput) returnOutput.textContent = `Return Risk: ${risk}`;

      if (riskBadge) {
        riskBadge.textContent = risk;
        riskBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold';
        if (risk === 'Low') riskBadge.classList.add('bg-purple-100', 'text-purple-700');
        else if (risk === 'Medium') riskBadge.classList.add('bg-amber-100', 'text-amber-700');
        else riskBadge.classList.add('bg-rose-100', 'text-rose-700');
      }

      if (fitResult) {
        fitResult.classList.remove('hidden');
        fitResult.classList.add('show');
        fitResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  // Contact form validation
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    const emailInput = contactForm.querySelector('input[type="email"]');
    const emailError = document.getElementById('email-error');
    
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      if (emailInput && emailError) {
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
          emailError.textContent = 'Please enter your email address';
          emailError.classList.remove('hidden');
          emailInput.classList.add('border-rose-500');
          emailInput.focus();
          return;
        }
        
        if (!emailRegex.test(email)) {
          emailError.textContent = 'Please enter a valid email address';
          emailError.classList.remove('hidden');
          emailInput.classList.add('border-rose-500');
          emailInput.focus();
          return;
        }
        
        // Success - in production, send to backend
        emailError.classList.add('hidden');
        emailInput.classList.remove('border-rose-500');
        alert('Thank you! We\'ll notify you when we launch.');
        contactForm.reset();
      }
    });
    
    if (emailInput) {
      emailInput.addEventListener('input', () => {
        if (emailError) {
          emailError.classList.add('hidden');
          emailInput.classList.remove('border-rose-500');
        }
      });
    }
  }

  // 3D viewer swap with fallback
  const mainViewer = document.getElementById('main-viewer');
  const viewerFallback = document.getElementById('viewer-3d-fallback');
  
  if (mainViewer) {
    document.querySelectorAll('.thumb-btn').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        // Update aria-pressed
        document.querySelectorAll('.thumb-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        
        const newSrc = btn.dataset.src;
        if (mainViewer && viewerFallback) {
          // Show loading animation
          viewerFallback.classList.remove('hidden');
          mainViewer.style.opacity = '0';
          
          mainViewer.classList.remove('fade-pulse');
          void mainViewer.offsetWidth; // Force reflow
          mainViewer.classList.add('fade-pulse');
          mainViewer.setAttribute('src', newSrc);
          
          // Listen for model load
          const onLoad = () => {
            viewerFallback.classList.add('hidden');
            mainViewer.style.opacity = '1';
            mainViewer.style.transition = 'opacity 0.5s ease-in-out';
            mainViewer.removeEventListener('load', onLoad);
          };
          
          mainViewer.addEventListener('load', onLoad);
          
          // Timeout fallback
          setTimeout(() => {
            if (mainViewer.modelStatus === 'failed' || !mainViewer.loaded) {
              mainViewer.style.display = 'none';
              viewerFallback.classList.remove('hidden');
            } else {
              viewerFallback.classList.add('hidden');
              mainViewer.style.display = 'block';
              mainViewer.style.opacity = '1';
            }
          }, 5000);
        }
      });
    });
  }

  // Card hover micro-interaction (optimized with throttling)
  let tiltTimeout;
  document.querySelectorAll('.tilt-card').forEach(card => {
    let isHovering = false;
    
    card.addEventListener('mouseenter', () => {
      isHovering = true;
    });
    
    card.addEventListener('mouseleave', () => {
      isHovering = false;
      card.style.transform = '';
    });
    
    card.addEventListener('mousemove', (e) => {
      if (!isHovering) return;
      
      clearTimeout(tiltTimeout);
      tiltTimeout = setTimeout(() => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateY = (x / rect.width - 0.5) * 8;
        const rotateX = (y / rect.height - 0.5) * -8;
        card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      }, 16); // ~60fps
    });
  });

  // Handle Add to Cart clicks
  let currentProduct = null;
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      currentProduct = {
        id: btn.dataset.productId,
        name: btn.dataset.productName,
        price: btn.dataset.productPrice,
        image: btn.dataset.productImage,
        category: btn.dataset.productCategory
      };
      
      // Show size selection modal
      showSizeModal();
    });
  });

  // Size Modal Functions
  function showSizeModal() {
    const modal = document.getElementById('size-modal');
    const sizeOptions = document.getElementById('size-options');
    const addBtn = document.getElementById('size-modal-add');
    const productName = document.getElementById('size-modal-product');
    
    if (!modal || !sizeOptions) return;
    
    if (productName && currentProduct) {
      productName.textContent = currentProduct.name;
    }
    
    // Generate size options (UK 5-12)
    sizeOptions.innerHTML = '';
    for (let size = 5; size <= 12; size++) {
      const btn = document.createElement('button');
      btn.className = 'px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors dark:text-white';
      btn.textContent = `UK ${size}`;
      btn.dataset.size = `UK ${size}`;
      btn.addEventListener('click', () => {
        // Remove selected class from all
        sizeOptions.querySelectorAll('button').forEach(b => {
          b.classList.remove('border-purple-600', 'bg-purple-50', 'dark:bg-purple-900/20', 'text-purple-700', 'dark:text-purple-300');
        });
        // Add to clicked
        btn.classList.add('border-purple-600', 'bg-purple-50', 'dark:bg-purple-900/20', 'text-purple-700', 'dark:text-purple-300');
        if (addBtn) {
          addBtn.disabled = false;
          addBtn.dataset.selectedSize = btn.dataset.size;
        }
      });
      sizeOptions.appendChild(btn);
    }
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  // Size modal event listeners
  document.getElementById('size-modal-cancel')?.addEventListener('click', () => {
    document.getElementById('size-modal')?.classList.add('hidden');
    document.body.style.overflow = '';
    currentProduct = null;
  });

  document.getElementById('size-modal-close')?.addEventListener('click', () => {
    document.getElementById('size-modal')?.classList.add('hidden');
    document.body.style.overflow = '';
    currentProduct = null;
  });

  document.getElementById('size-modal-add')?.addEventListener('click', () => {
    const selectedSize = document.getElementById('size-modal-add')?.dataset.selectedSize;
    if (currentProduct && selectedSize && window.cartManager) {
      window.cartManager.addItem(currentProduct, selectedSize, 1);
      
      // Save to Firestore if user is logged in
      if (AuthManager.currentUser && db) {
        window.cartManager.saveToFirestore(AuthManager.currentUser.uid, db);
      }
      
      document.getElementById('size-modal')?.classList.add('hidden');
      document.body.style.overflow = '';
      
      // Show success notification
      showNotification('Item added to cart!', 'success');
      currentProduct = null;
    }
  });

  // Close size modal on overlay click
  document.getElementById('size-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'size-modal') {
      document.getElementById('size-modal')?.classList.add('hidden');
      document.body.style.overflow = '';
      currentProduct = null;
    }
  });

  // Close size modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const sizeModal = document.getElementById('size-modal');
      if (sizeModal && !sizeModal.classList.contains('hidden')) {
        sizeModal.classList.add('hidden');
        document.body.style.overflow = '';
        currentProduct = null;
      }
    }
  });

  // Notification function
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-24 right-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 z-50 transform translate-x-full transition-transform duration-300 max-w-sm`;
    notification.innerHTML = `
      <div class="flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm font-medium dark:text-white">${message}</span>
        <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-auto" onclick="this.parentElement.parentElement.remove()" aria-label="Close notification">×</button>
      </div>
    `;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 10);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  window.showNotification = showNotification;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

