(() => {
  const STORAGE_KEY = 'shoesx_products';
  const loginView = document.getElementById('admin-login');
  const dashboardView = document.getElementById('admin-dashboard');
  const loginForm = document.getElementById('admin-login-form');
  const loginError = document.getElementById('admin-login-error');
  const signOutBtn = document.getElementById('admin-signout');
  const productsBody = document.getElementById('admin-products-body');
  const productForm = document.getElementById('admin-product-form');
  const resetBtn = document.getElementById('admin-reset');
  const formTitle = document.getElementById('admin-form-title');
  const formMode = document.getElementById('admin-form-mode');
  const formCancel = document.getElementById('admin-form-cancel');
  const summaryProducts = document.getElementById('admin-summary-products');
  const summaryRating = document.getElementById('admin-summary-rating');
  const summaryCategory = document.getElementById('admin-summary-category');

  const defaultProducts = Array.isArray(window.SHOESX_DEFAULT_PRODUCTS)
    ? window.SHOESX_DEFAULT_PRODUCTS
    : [];

  const safeParse = (value) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      return null;
    }
  };

  const loadProducts = () => {
    const stored = safeParse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(stored) && stored.length) {
      return stored;
    }
    return [...defaultProducts];
  };

  const saveProducts = (products) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  };

  const toList = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
  };

  const slugify = (value) => {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const formatPrice = (value) => {
    if (typeof value === 'number') return `$${value}`;
    if (!value) return '$0';
    return String(value).startsWith('$') ? value : `$${value}`;
  };

  const normalizeProduct = (product) => {
    const priceNum = Number(String(product.price || '').replace('$', '')) || product.priceNum || 0;
    return {
      id: product.id || slugify(product.name),
      name: product.name || 'Untitled',
      price: formatPrice(product.price || priceNum),
      priceNum: priceNum,
      category: product.category || 'Running',
      rating: Number(product.rating) || 0,
      sizes: product.sizes || 'UK 6-11',
      colors: toList(product.colors),
      description: product.description || '',
      shortDescription: product.shortDescription || product.description || '',
      image: product.image || '',
      cardImage: product.cardImage || product.image || '',
      fitScore: Number(product.fitScore) || 90,
      badge: product.badge || 'Featured',
      logistics: toList(product.logistics)
    };
  };

  const getTopCategory = (products) => {
    if (!products.length) return 'N/A';
    const counts = products.reduce((acc, product) => {
      const key = product.category || 'Other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  };

  const updateSummary = (products) => {
    if (summaryProducts) summaryProducts.textContent = String(products.length).padStart(2, '0');
    if (summaryRating) {
      const avg = products.length
        ? (products.reduce((sum, product) => sum + (product.rating || 0), 0) / products.length).toFixed(1)
        : '0.0';
      summaryRating.textContent = avg;
    }
    if (summaryCategory) summaryCategory.textContent = getTopCategory(products);
  };

  const renderProducts = (products) => {
    if (!productsBody) return;
    productsBody.innerHTML = products.map((product) => `
      <tr class="border-b border-slate-200 dark:border-slate-700">
        <td class="py-3 px-2 text-sm font-semibold text-slate-900 dark:text-white">${product.name}</td>
        <td class="py-3 px-2 text-sm text-slate-600 dark:text-slate-300">${product.category}</td>
        <td class="py-3 px-2 text-sm text-slate-600 dark:text-slate-300">${product.price}</td>
        <td class="py-3 px-2 text-sm text-slate-600 dark:text-slate-300">${product.rating}</td>
        <td class="py-3 px-2 text-sm text-slate-600 dark:text-slate-300">${product.fitScore}%</td>
        <td class="py-3 px-2 text-sm text-slate-600 dark:text-slate-300">${product.id}</td>
        <td class="py-3 px-2 text-sm">
          <div class="flex gap-2">
            <button class="btn-secondary px-3 py-1 text-xs" data-action="edit" data-id="${product.id}">Edit</button>
            <button class="btn-secondary px-3 py-1 text-xs" data-action="delete" data-id="${product.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  };

  const loadAndRender = () => {
    const products = loadProducts().map(normalizeProduct);
    saveProducts(products);
    renderProducts(products);
    updateSummary(products);
    return products;
  };

  const resetForm = () => {
    if (!productForm) return;
    productForm.reset();
    formMode.value = 'create';
    if (formTitle) formTitle.textContent = 'Add Product';
    if (formCancel) formCancel.classList.add('hidden');
  };

  const fillForm = (product) => {
    if (!productForm) return;
    productForm.productId.value = product.id || '';
    productForm.productName.value = product.name || '';
    productForm.productPrice.value = product.price || '';
    productForm.productCategory.value = product.category || '';
    productForm.productRating.value = product.rating || '';
    productForm.productFit.value = product.fitScore || '';
    productForm.productSizes.value = product.sizes || '';
    productForm.productColors.value = (product.colors || []).join(', ');
    productForm.productDescription.value = product.description || '';
    productForm.productShortDescription.value = product.shortDescription || '';
    productForm.productImage.value = product.image || '';
    productForm.productCardImage.value = product.cardImage || '';
    productForm.productBadge.value = product.badge || '';
    productForm.productLogistics.value = (product.logistics || []).join(', ');
    formMode.value = 'edit';
    if (formTitle) formTitle.textContent = 'Edit Product';
    if (formCancel) formCancel.classList.remove('hidden');
  };

  const handleLogin = (username, password) => {
    if (window.AdminManager && typeof window.AdminManager.signIn === 'function') {
      return window.AdminManager.signIn(username, password, { redirect: false });
    }
    return username === 'Admin' && password === 'Admin123';
  };

  const showDashboard = () => {
    if (loginView) loginView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.remove('hidden');
  };

  const showLogin = () => {
    if (loginView) loginView.classList.remove('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
  };

  const isAdmin = () => {
    if (window.AdminManager && typeof window.AdminManager.isAuthenticated === 'function') {
      return window.AdminManager.isAuthenticated();
    }
    const session = safeParse(localStorage.getItem('shoesx_admin_session'));
    return session && session.active;
  };

  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const username = loginForm.username.value.trim();
      const password = loginForm.password.value;
      const ok = handleLogin(username, password);
      if (!ok) {
        if (loginError) {
          loginError.textContent = 'Invalid admin credentials.';
          loginError.classList.remove('hidden');
        }
        return;
      }
      if (loginError) loginError.classList.add('hidden');
      showDashboard();
      loadAndRender();
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      if (window.AdminManager && typeof window.AdminManager.signOut === 'function') {
        window.AdminManager.signOut({ redirect: true });
      } else {
        localStorage.removeItem('shoesx_admin_session');
        window.location.href = 'index.html';
      }
    });
  }

  if (productsBody) {
    productsBody.addEventListener('click', (event) => {
      const target = event.target;
      if (!target || !target.dataset) return;
      const action = target.dataset.action;
      const id = target.dataset.id;
      if (!action || !id) return;
      const products = loadProducts().map(normalizeProduct);
      const product = products.find(item => item.id === id);
      if (action === 'edit' && product) {
        fillForm(product);
      }
      if (action === 'delete') {
        const next = products.filter(item => item.id !== id);
        saveProducts(next);
        renderProducts(next);
        updateSummary(next);
        resetForm();
      }
    });
  }

  if (productForm) {
    productForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const products = loadProducts().map(normalizeProduct);
      const payload = normalizeProduct({
        id: productForm.productId.value.trim(),
        name: productForm.productName.value.trim(),
        price: productForm.productPrice.value.trim(),
        category: productForm.productCategory.value,
        rating: productForm.productRating.value,
        fitScore: productForm.productFit.value,
        sizes: productForm.productSizes.value.trim(),
        colors: productForm.productColors.value.trim(),
        description: productForm.productDescription.value.trim(),
        shortDescription: productForm.productShortDescription.value.trim(),
        image: productForm.productImage.value.trim(),
        cardImage: productForm.productCardImage.value.trim(),
        badge: productForm.productBadge.value.trim(),
        logistics: productForm.productLogistics.value.trim()
      });

      const existingIndex = products.findIndex(item => item.id === payload.id);
      if (formMode.value === 'edit' && existingIndex !== -1) {
        products[existingIndex] = payload;
      } else {
        products.push(payload);
      }

      saveProducts(products);
      renderProducts(products);
      updateSummary(products);
      resetForm();

      if (window.showNotification) {
        window.showNotification('Product saved.', 'success');
      }
    });
  }

  if (formCancel) {
    formCancel.addEventListener('click', () => resetForm());
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      saveProducts([...defaultProducts]);
      loadAndRender();
      resetForm();
      if (window.showNotification) {
        window.showNotification('Catalog reset to defaults.', 'info');
      }
    });
  }

  if (isAdmin()) {
    showDashboard();
    loadAndRender();
  } else {
    showLogin();
  }
})();
