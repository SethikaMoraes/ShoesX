(() => {
  const formatValue = (value, decimals) => {
    if (Number.isNaN(value)) return '—';
    return value.toFixed(decimals);
  };

  const setSelectOptions = (select, options) => {
    if (!select) return;
    select.innerHTML = options.map((option) => `
      <option value="${option}">${option}</option>
    `).join('');
  };

  const pickDefault = (options, preferred) => {
    if (!options.length) return '';
    if (preferred && options.includes(preferred)) return preferred;
    const fallback = ['Unisex', 'Regular', 'UK', 'US', 'EU'];
    const match = fallback.find((item) => options.includes(item));
    return match || options[0];
  };

  const initModal = ({
    openBtnId,
    closeBtnId,
    modalId,
    genderSelectId,
    systemSelectId,
    widthSelectId,
    tableBodyId,
    sizeHeaderId,
    statusId,
    scrollContainerId,
    scrollUpBtnId,
    scrollDownBtnId,
    defaultSystem,
    getDefaultSystem
  }) => {
    const openBtn = document.getElementById(openBtnId);
    const closeBtn = document.getElementById(closeBtnId);
    const modal = document.getElementById(modalId);
    const genderSelect = document.getElementById(genderSelectId);
    const systemSelect = document.getElementById(systemSelectId);
    const widthSelect = document.getElementById(widthSelectId);
    const tableBody = document.getElementById(tableBodyId);
    const sizeHeader = document.getElementById(sizeHeaderId);
    const status = document.getElementById(statusId);
    const scrollContainer = scrollContainerId ? document.getElementById(scrollContainerId) : null;
    const scrollUpBtn = scrollUpBtnId ? document.getElementById(scrollUpBtnId) : null;
    const scrollDownBtn = scrollDownBtnId ? document.getElementById(scrollDownBtnId) : null;

    if (!openBtn || !modal || !tableBody) return;

    let cachedRows = null;
    let options = null;

    const renderRows = () => {
      if (!cachedRows || !options) return;

      const gender = genderSelect?.value || '';
      const system = systemSelect?.value || '';
      const width = widthSelect?.value || '';
      const rows = window.SizeChart.filterData(cachedRows, { gender, system, width })
        .sort((a, b) => (a.sizeValue || 0) - (b.sizeValue || 0));

      if (sizeHeader && system) {
        sizeHeader.textContent = `${system} Size`;
      }

      if (!rows.length) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="4" class="py-4 px-4 text-center text-slate-500 dark:text-slate-400">
              No sizes match these filters.
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = rows.map((row) => `
        <tr class="border-b border-slate-100 dark:border-slate-700">
          <td class="py-2 px-4 font-medium">${row.sizeLabel || row.sizeValue}</td>
          <td class="py-2 px-4">${formatValue(row.footLengthCm, 1)} cm</td>
          <td class="py-2 px-4">${formatValue(row.footWidthCm, 2)} cm</td>
          <td class="py-2 px-4">${row.widthLabel}</td>
        </tr>
      `).join('');
    };

    const ensureLoaded = async () => {
      if (cachedRows) return;
      if (status) status.textContent = 'Loading size chart...';
      try {
        cachedRows = await window.SizeChart.load();
        options = window.SizeChart.getOptions(cachedRows);
        setSelectOptions(genderSelect, options.genders);
        setSelectOptions(systemSelect, options.systems);
        setSelectOptions(widthSelect, options.widths);

        const systemPreference = (typeof getDefaultSystem === 'function')
          ? getDefaultSystem()
          : defaultSystem;

        if (genderSelect) {
          genderSelect.value = pickDefault(options.genders, genderSelect.value || 'Unisex');
        }
        if (systemSelect) {
          systemSelect.value = pickDefault(options.systems, systemPreference);
        }
        if (widthSelect) {
          widthSelect.value = pickDefault(options.widths, widthSelect.value || 'Regular');
        }

        renderRows();
        if (status) status.textContent = '';
      } catch (error) {
        if (status) status.textContent = 'Unable to load size chart right now.';
        tableBody.innerHTML = `
          <tr>
            <td colspan="4" class="py-4 px-4 text-center text-rose-500">
              Size chart unavailable.
            </td>
          </tr>
        `;
      }
    };

    const openModal = async () => {
      await ensureLoaded();
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    };

    openBtn.addEventListener('click', openModal);
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });

    [genderSelect, systemSelect, widthSelect].forEach((select) => {
      if (!select) return;
      select.addEventListener('change', () => {
        renderRows();
      });
    });

    if (scrollContainer && (scrollUpBtn || scrollDownBtn)) {
      const step = 180;
      if (scrollUpBtn) {
        scrollUpBtn.addEventListener('click', () => {
          scrollContainer.scrollBy({ top: -step, behavior: 'smooth' });
        });
      }
      if (scrollDownBtn) {
        scrollDownBtn.addEventListener('click', () => {
          scrollContainer.scrollBy({ top: step, behavior: 'smooth' });
        });
      }
    }
  };

  window.SizeChartUI = { initModal };
})();
