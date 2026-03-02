(() => {
  const modal = document.getElementById('feedback-modal');
  const openBtn = document.getElementById('feedback-fab');
  const closeBtn = document.getElementById('feedback-close');
  const cancelBtn = document.getElementById('feedback-cancel');
  const form = document.getElementById('feedback-form');

  if (!modal || !openBtn || !form) return;

  const typeSelect = document.getElementById('feedback-type');
  const messageInput = document.getElementById('feedback-message');
  const emailInput = document.getElementById('feedback-email');
  const consentInput = document.getElementById('feedback-consent');
  const counter = document.getElementById('feedback-counter');
  const messageError = document.getElementById('feedback-message-error');
  const submitBtn = document.getElementById('feedback-submit');
  const submitLabel = submitBtn.querySelector('.feedback-submit-label');
  const submitLoading = submitBtn.querySelector('.feedback-submit-loading');

  const pageUrlInput = document.getElementById('feedback-page-url');
  const pageTitleInput = document.getElementById('feedback-page-title');
  const productIdInput = document.getElementById('feedback-product-id');
  const themeInput = document.getElementById('feedback-theme');
  const timestampInput = document.getElementById('feedback-timestamp');
  const uidInput = document.getElementById('feedback-uid');
  const displayNameInput = document.getElementById('feedback-display-name');
  const ratingInput = document.getElementById('feedback-rating');

  const ratingButtons = Array.from(document.querySelectorAll('[data-feedback-rating]'));
  const ratingGroup = document.getElementById('feedback-rating-group');
  const feedbackFab = document.getElementById('feedback-fab');

  let currentUser = null;
  let currentRating = 0;
  let lastFocus = null;
  let draftTimer = null;

  function getTheme() {
    return document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')
      ? 'dark'
      : 'light';
  }

  function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('productId') || params.get('id') || params.get('product') || params.get('sku') || '';
  }

  function getDraftKey() {
    const pid = getProductId() || 'general';
    const uid = currentUser?.uid || 'anon';
    return `feedbackDraft:${uid}:${location.pathname}:${pid}`;
  }

  function saveDraft() {
    const draft = {
      type: typeSelect.value,
      rating: currentRating,
      message: messageInput.value,
      email: emailInput.value,
      canContact: consentInput.checked
    };
    localStorage.setItem(getDraftKey(), JSON.stringify(draft));
  }

  function restoreDraft() {
    const raw = localStorage.getItem(getDraftKey());
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (draft.type) typeSelect.value = draft.type;
      if (draft.message) messageInput.value = draft.message;
      if (draft.email) emailInput.value = draft.email;
      if (typeof draft.canContact === 'boolean') consentInput.checked = draft.canContact;
      if (draft.rating) setRating(draft.rating);
      updateCounter();
    } catch (_) {
      // Ignore invalid drafts
    }
  }

  function clearDraft() {
    localStorage.removeItem(getDraftKey());
  }

  function setRating(value) {
    currentRating = value;
    ratingInput.value = value ? String(value) : '';
    ratingButtons.forEach((btn) => {
      const v = Number(btn.getAttribute('data-feedback-rating'));
      const active = v <= value;
      btn.classList.toggle('text-amber-400', active);
      if (!active) {
        btn.classList.add('text-slate-300');
        btn.classList.add('dark:text-slate-600');
      } else {
        btn.classList.remove('text-slate-300');
        btn.classList.remove('dark:text-slate-600');
      }
      btn.setAttribute('aria-checked', String(v === value));
      btn.tabIndex = v === value || (value === 0 && v === 1) ? 0 : -1;
    });
  }

  function updateCounter() {
    const len = messageInput.value.length;
    counter.textContent = `${len}/500`;
  }

  function showToast(message, type = 'success') {
    if (window.showNotification) {
      window.showNotification(message, type);
      return;
    }
    const toast = document.createElement('div');
    const bg = type === 'success'
      ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300'
      : 'bg-rose-100 dark:bg-rose-900/30 border-rose-500 text-rose-700 dark:text-rose-300';
    toast.className = `fixed top-24 right-4 ${bg} border rounded-lg shadow-lg p-4 z-[60] transform translate-x-full transition-transform duration-300 max-w-sm`;
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-sm font-medium">${message}</span>
        <button class="ml-auto" aria-label="Close">x</button>
      </div>
    `;
    toast.querySelector('button').addEventListener('click', () => toast.remove());
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-x-full'), 10);
    setTimeout(() => {
      toast.classList.add('translate-x-full');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function showInlineError(message) {
    messageError.textContent = message;
    messageError.classList.remove('hidden');
    messageInput.classList.add('border-rose-500');
    messageInput.setAttribute('aria-invalid', 'true');
  }

  function clearInlineError() {
    messageError.textContent = '';
    messageError.classList.add('hidden');
    messageInput.classList.remove('border-rose-500');
    messageInput.removeAttribute('aria-invalid');
  }

  function setContextFields() {
    pageUrlInput.value = window.location.href;
    pageTitleInput.value = document.title;
    productIdInput.value = getProductId();
    themeInput.value = getTheme();
    timestampInput.value = new Date().toISOString();
    uidInput.value = currentUser?.uid || '';
    displayNameInput.value = currentUser?.displayName || '';
  }

  function openModal() {
    lastFocus = document.activeElement;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setContextFields();
    restoreDraft();
    updateCounter();
    setTimeout(() => typeSelect.focus(), 0);
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  function focusTrap(e) {
    if (e.key !== 'Tab') return;
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const list = Array.from(focusable).filter(el => !el.disabled && !el.getAttribute('aria-hidden'));
    if (list.length === 0) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitLabel.classList.toggle('hidden', isLoading);
    submitLoading.classList.toggle('hidden', !isLoading);
  }

  function adjustFabOffset() {
    const filterToggle = document.getElementById('filter-toggle');
    if (!feedbackFab) return;
    if (filterToggle && filterToggle.offsetParent !== null) {
      feedbackFab.style.bottom = '6.5rem';
    } else {
      feedbackFab.style.bottom = '';
    }
  }

  // Event listeners
  openBtn.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  modal.addEventListener('keydown', focusTrap);

  messageInput.addEventListener('input', () => {
    clearInlineError();
    updateCounter();
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 250);
  });

  typeSelect.addEventListener('change', () => {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 250);
  });

  emailInput.addEventListener('input', () => {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 250);
  });

  consentInput.addEventListener('change', () => {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 250);
  });

  ratingButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setRating(Number(btn.getAttribute('data-feedback-rating')));
      saveDraft();
    });
  });

  ratingGroup.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '5') {
      setRating(Number(e.key));
      saveDraft();
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      setRating(Math.min(5, currentRating + 1));
      saveDraft();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      setRating(Math.max(0, currentRating - 1));
      saveDraft();
    }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      setRating(0);
      saveDraft();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearInlineError();

    if (!typeSelect.value) {
      showToast('Please choose a feedback type.', 'error');
      typeSelect.focus();
      return;
    }

    if (!messageInput.value.trim()) {
      showInlineError('Message is required.');
      messageInput.focus();
      return;
    }

    if (typeof db === 'undefined' || typeof firebase === 'undefined') {
      showToast('Feedback service unavailable. Please try again later.', 'error');
      return;
    }

    setContextFields();

    const payload = {
      type: typeSelect.value,
      rating: currentRating || null,
      message: messageInput.value.trim(),
      email: emailInput.value.trim() || null,
      canContact: consentInput.checked,
      pageUrl: pageUrlInput.value,
      pageTitle: pageTitleInput.value,
      productId: productIdInput.value || null,
      uid: currentUser?.uid || null,
      displayName: currentUser?.displayName || null,
      theme: themeInput.value,
      timestamp: timestampInput.value,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      setLoading(true);
      await db.collection('feedback').add(payload);
      clearDraft();
      form.reset();
      setRating(0);
      updateCounter();
      closeModal();
      showToast('Thanks - feedback received', 'success');
    } catch (err) {
      console.error('Feedback submit error:', err);
      showToast('Could not submit feedback. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  });

  // Profile feedback list (optional)
  const list = document.getElementById('feedback-list');
  const empty = document.getElementById('feedback-empty');
  const loadMoreBtn = document.getElementById('feedback-load-more');
  const refreshBtn = document.getElementById('feedback-refresh');

  let lastDoc = null;
  let loading = false;

  async function loadUserFeedback(reset = false) {
    if (!list || typeof db === 'undefined' || typeof firebase === 'undefined') return;
    if (!currentUser) return;
    if (loading) return;
    loading = true;

    if (reset) {
      list.innerHTML = '';
      lastDoc = null;
      if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
    }

    try {
      let query = db.collection('feedback')
        .where('uid', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .limit(10);

      if (lastDoc) query = query.startAfter(lastDoc);

      const snap = await query.get();
      if (snap.empty && list.children.length === 0) {
        empty?.classList.remove('hidden');
        return;
      }

      empty?.classList.add('hidden');
      snap.forEach((doc) => {
        const data = doc.data();
        const item = document.createElement('div');
        item.className = 'p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600';
        item.innerHTML = `
          <div class="flex items-center justify-between mb-1">
            <p class="font-semibold dark:text-white">${data.type || 'Feedback'}</p>
            <span class="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Submitted</span>
          </div>
          <p class="text-sm text-slate-600 dark:text-slate-300">${data.message || ''}</p>
          <div class="mt-2 text-xs text-slate-500 dark:text-slate-400">
            ${data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : ''}
          </div>
        `;
        list.appendChild(item);
      });

      lastDoc = snap.docs[snap.docs.length - 1] || lastDoc;
      if (loadMoreBtn) loadMoreBtn.classList.toggle('hidden', snap.size < 10);
    } catch (err) {
      console.error('Load feedback error:', err);
    } finally {
      loading = false;
    }
  }

  refreshBtn?.addEventListener('click', () => loadUserFeedback(true));
  loadMoreBtn?.addEventListener('click', () => loadUserFeedback(false));

  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged((user) => {
      currentUser = user || null;
      if (currentUser && emailInput && !emailInput.value) {
        emailInput.value = currentUser.email || '';
      }
      if (list) loadUserFeedback(true);
    });
  }

  adjustFabOffset();
  window.addEventListener('resize', adjustFabOffset);
})();