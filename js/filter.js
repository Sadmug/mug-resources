/**
 * Creative Resources - Filter & Search System
 * Pure vanilla JavaScript, zero dependencies.
 */

(function () {
  'use strict';

  function normalize(str) {
    if (!str) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Load embedded data
  const dataScript = document.getElementById('resources-data');
  if (!dataScript) return;

  const appData = JSON.parse(dataScript.textContent);
  const resourcesList = appData.resources || [];
  const groupsMap = new Map((appData.groups || []).map(g => [g.id, g.label]));
  const typesMap = new Map((appData.types || []).map(t => [t.id, t.label]));
  const pricingMap = new Map((appData.pricing || []).map(p => [p.id, p.label]));
  const platformsMap = new Map((appData.platforms || []).map(pl => [pl.id, pl.label]));
  const resourcesMap = new Map(resourcesList.map(r => [r.id, r]));

  // Pre-compute normalized search index for each resource
  resourcesList.forEach(r => {
    const terms = [
      r.name || '',
      r.description || '',
      ...(r.keywords || [])
    ];
    r._searchIndex = normalize(terms.join(' '));
  });

  // DOM Elements
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const groupButtons = document.querySelectorAll('.group-btn');
  const filterDropdowns = document.querySelectorAll('.filter-dropdown');
  const resultsCountEl = document.getElementById('results-count');
  const emptyStateEl = document.getElementById('empty-state');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  const emptyClearBtn = document.getElementById('empty-clear-btn');
  const cards = document.querySelectorAll('.resource-card');

  // Dialog Elements
  const dialog = document.getElementById('detail-dialog');
  const dialogCloseBtn = document.getElementById('dialog-close-btn');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogType = document.getElementById('dialog-type');
  const dialogGroups = document.getElementById('dialog-groups');
  const dialogDescription = document.getElementById('dialog-description');
  const dialogLicenseRow = document.getElementById('dialog-license-row');
  const dialogLicenseVal = document.getElementById('dialog-license-val');
  const dialogCommercialBadge = document.getElementById('dialog-commercial-badge');
  const dialogPricingRow = document.getElementById('dialog-pricing-row');
  const dialogPricingVal = document.getElementById('dialog-pricing-val');
  const dialogPricingNote = document.getElementById('dialog-pricing-note');
  const dialogPlatformsRow = document.getElementById('dialog-platforms-row');
  const dialogPlatformsVal = document.getElementById('dialog-platforms-val');
  const dialogLinksRow = document.getElementById('dialog-links-row');
  const dialogLinksVal = document.getElementById('dialog-links-val');
  const dialogVisitBtn = document.getElementById('dialog-visit-btn');

  // Filter state
  let currentGroup = 'all';
  const selectedTypes = new Set();
  const selectedPricings = new Set();
  const selectedPlatforms = new Set();
  const selectedLicenses = new Set();

  function updateDropdownBadge(dropdown, count) {
    const summary = dropdown.querySelector('.filter-summary');
    const badge = dropdown.querySelector('.filter-count-badge');
    if (!summary || !badge) return;

    if (count > 0) {
      badge.textContent = count;
      badge.removeAttribute('hidden');
      badge.style.display = 'inline-flex';
      summary.classList.add('is-active');
    } else {
      badge.setAttribute('hidden', '');
      badge.style.display = 'none';
      summary.classList.remove('is-active');
    }
  }

  function applyFilters() {
    const rawQuery = searchInput ? searchInput.value : '';
    const query = normalize(rawQuery);

    if (searchClearBtn) {
      searchClearBtn.hidden = !rawQuery;
      searchClearBtn.style.display = rawQuery ? 'block' : 'none';
    }

    let visibleCount = 0;

    cards.forEach(card => {
      const cardGroups = (card.getAttribute('data-groups') || '').split(',').filter(Boolean);
      const cardType = card.getAttribute('data-type') || '';
      const cardPricing = card.getAttribute('data-pricing') || '';
      const cardPlatforms = (card.getAttribute('data-platforms') || '').split(',').filter(Boolean);
      const cardLicense = card.getAttribute('data-license') || '';
      const cardSearch = card.getAttribute('data-search') || '';

      // Search match (name, description, keywords)
      let matchesSearch = true;
      if (query) {
        matchesSearch = cardSearch.includes(query);
      }

      // Group match (can be in several groups)
      let matchesGroup = true;
      if (currentGroup !== 'all') {
        matchesGroup = cardGroups.includes(currentGroup);
      }

      // Type match (OR within category)
      let matchesType = true;
      if (selectedTypes.size > 0) {
        matchesType = selectedTypes.has(cardType);
      }

      // Pricing match (OR within category)
      let matchesPricing = true;
      if (selectedPricings.size > 0) {
        matchesPricing = selectedPricings.has(cardPricing);
      }

      // Platform match (OR within category)
      let matchesPlatform = true;
      if (selectedPlatforms.size > 0) {
        matchesPlatform = cardPlatforms.some(p => selectedPlatforms.has(p));
      }

      // License match (OR within category)
      let matchesLicense = true;
      if (selectedLicenses.size > 0) {
        matchesLicense = selectedLicenses.has(cardLicense);
      }

      // AND between different categories
      const isVisible = matchesSearch && matchesGroup && matchesType && matchesPricing && matchesPlatform && matchesLicense;

      card.hidden = !isVisible;
      card.style.display = isVisible ? '' : 'none';
      if (isVisible) {
        visibleCount++;
      }
    });

    // Update live results count
    if (resultsCountEl) {
      const noun = visibleCount === 1 ? 'resource' : 'resources';
      resultsCountEl.textContent = `Showing ${visibleCount} ${noun}`;
    }

    // Toggle empty state
    if (emptyStateEl) {
      emptyStateEl.hidden = visibleCount > 0;
      emptyStateEl.style.display = visibleCount > 0 ? 'none' : 'flex';
    }

    // Sync to URL
    syncUrl();
  }

  function syncUrl() {
    const params = new URLSearchParams();
    const query = searchInput ? searchInput.value.trim() : '';

    if (query) params.set('q', query);
    if (currentGroup && currentGroup !== 'all') params.set('group', currentGroup);
    if (selectedTypes.size > 0) params.set('type', Array.from(selectedTypes).join(','));
    if (selectedPricings.size > 0) params.set('pricing', Array.from(selectedPricings).join(','));
    if (selectedPlatforms.size > 0) params.set('platform', Array.from(selectedPlatforms).join(','));
    if (selectedLicenses.size > 0) params.set('license', Array.from(selectedLicenses).join(','));

    const searchStr = params.toString();
    const newUrl = searchStr ? `${window.location.pathname}?${searchStr}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }

  function loadFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);

    // Search
    const q = params.get('q');
    if (searchInput && q) {
      searchInput.value = q;
    }

    // Group
    const groupParam = params.get('group');
    if (groupParam && (groupParam === 'all' || groupsMap.has(groupParam))) {
      currentGroup = groupParam;
    } else {
      currentGroup = 'all';
    }

    groupButtons.forEach(btn => {
      const g = btn.getAttribute('data-group');
      btn.classList.toggle('active', g === currentGroup);
    });

    // Sets reset
    selectedTypes.clear();
    selectedPricings.clear();
    selectedPlatforms.clear();
    selectedLicenses.clear();

    const typeParam = params.get('type');
    if (typeParam) {
      typeParam.split(',').forEach(v => {
        if (typesMap.has(v)) selectedTypes.add(v);
      });
    }

    const pricingParam = params.get('pricing');
    if (pricingParam) {
      pricingParam.split(',').forEach(v => {
        if (pricingMap.has(v)) selectedPricings.add(v);
      });
    }

    const platformParam = params.get('platform');
    if (platformParam) {
      platformParam.split(',').forEach(v => {
        if (platformsMap.has(v)) selectedPlatforms.add(v);
      });
    }

    const licenseParam = params.get('license');
    if (licenseParam) {
      licenseParam.split(',').forEach(v => {
        selectedLicenses.add(v);
      });
    }

    // Update checkboxes
    document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(cb => {
      const filterType = cb.getAttribute('data-filter');
      const val = cb.value;
      let checked = false;

      if (filterType === 'type') checked = selectedTypes.has(val);
      else if (filterType === 'pricing') checked = selectedPricings.has(val);
      else if (filterType === 'platform') checked = selectedPlatforms.has(val);
      else if (filterType === 'license') checked = selectedLicenses.has(val);

      cb.checked = checked;
    });

    // Update badges
    filterDropdowns.forEach(dd => {
      const f = dd.getAttribute('data-filter');
      let count = 0;
      if (f === 'type') count = selectedTypes.size;
      else if (f === 'pricing') count = selectedPricings.size;
      else if (f === 'platform') count = selectedPlatforms.size;
      else if (f === 'license') count = selectedLicenses.size;
      updateDropdownBadge(dd, count);
    });

    applyFilters();
  }

  function resetAllFilters() {
    if (searchInput) searchInput.value = '';
    currentGroup = 'all';

    groupButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-group') === 'all');
    });

    selectedTypes.clear();
    selectedPricings.clear();
    selectedPlatforms.clear();
    selectedLicenses.clear();

    document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });

    filterDropdowns.forEach(dd => {
      updateDropdownBadge(dd, 0);
    });

    applyFilters();
  }

  // Event Listeners for Search
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchInput.focus();
      applyFilters();
    });
  }

  // Event Listeners for Groups
  groupButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentGroup = btn.getAttribute('data-group') || 'all';
      groupButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });

  // Event Listeners for Filter Checkboxes
  document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const f = cb.getAttribute('data-filter');
      const val = cb.value;
      const checked = cb.checked;

      if (f === 'type') {
        if (checked) selectedTypes.add(val);
        else selectedTypes.delete(val);
      } else if (f === 'pricing') {
        if (checked) selectedPricings.add(val);
        else selectedPricings.delete(val);
      } else if (f === 'platform') {
        if (checked) selectedPlatforms.add(val);
        else selectedPlatforms.delete(val);
      } else if (f === 'license') {
        if (checked) selectedLicenses.add(val);
        else selectedLicenses.delete(val);
      }

      const dropdown = cb.closest('.filter-dropdown');
      if (dropdown) {
        let count = 0;
        if (f === 'type') count = selectedTypes.size;
        else if (f === 'pricing') count = selectedPricings.size;
        else if (f === 'platform') count = selectedPlatforms.size;
        else if (f === 'license') count = selectedLicenses.size;
        updateDropdownBadge(dropdown, count);
      }

      applyFilters();
    });
  });

  // Close filter dropdowns when clicking outside
  document.addEventListener('click', e => {
    filterDropdowns.forEach(dd => {
      if (!dd.contains(e.target)) {
        dd.removeAttribute('open');
      }
    });
  });

  // Clear filters buttons
  if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', resetAllFilters);
  if (emptyClearBtn) emptyClearBtn.addEventListener('click', resetAllFilters);

  // Popstate listener (browser back/forward navigation)
  window.addEventListener('popstate', loadFiltersFromUrl);

  // Detail Dialog Population & Display
  function openDetailPopup(resourceId) {
    if (!dialog) return;

    const r = resourcesMap.get(resourceId);
    if (!r) return;

    // Name
    if (dialogTitle) {
      dialogTitle.textContent = r.name || '';
    }

    // Type
    if (dialogType) {
      if (r.type) {
        dialogType.textContent = typesMap.get(r.type) || r.type;
        dialogType.hidden = false;
        dialogType.style.display = '';
      } else {
        dialogType.hidden = true;
        dialogType.style.display = 'none';
      }
    }

    // Groups
    if (dialogGroups) {
      if (Array.isArray(r.groups) && r.groups.length > 0) {
        dialogGroups.innerHTML = r.groups.map(gid => {
          const lbl = groupsMap.get(gid) || gid;
          return `<span class="badge badge-group">${escapeHtml(lbl)}</span>`;
        }).join('');
        dialogGroups.hidden = false;
        dialogGroups.style.display = '';
      } else {
        dialogGroups.hidden = true;
        dialogGroups.style.display = 'none';
      }
    }

    // Description
    if (dialogDescription) {
      if (r.description) {
        dialogDescription.textContent = r.description;
        dialogDescription.hidden = false;
        dialogDescription.style.display = '';
      } else {
        dialogDescription.hidden = true;
        dialogDescription.style.display = 'none';
      }
    }

    // License
    if (dialogLicenseRow && dialogLicenseVal) {
      if (r.license && r.license.name) {
        if (r.license.url) {
          dialogLicenseVal.innerHTML = `<a href="${escapeHtml(r.license.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.license.name)}</a>`;
        } else {
          dialogLicenseVal.textContent = r.license.name;
        }

        if (dialogCommercialBadge) {
          dialogCommercialBadge.hidden = !r.license.commercial_use;
          dialogCommercialBadge.style.display = r.license.commercial_use ? '' : 'none';
        }

        dialogLicenseRow.hidden = false;
        dialogLicenseRow.style.display = '';
      } else {
        dialogLicenseRow.hidden = true;
        dialogLicenseRow.style.display = 'none';
      }
    }

    // Pricing & Note
    if (dialogPricingRow && dialogPricingVal) {
      if (r.pricing) {
        const pLabel = pricingMap.get(r.pricing) || r.pricing;
        dialogPricingVal.textContent = pLabel;

        if (dialogPricingNote) {
          if (r.pricing_note && r.pricing_note.trim()) {
            dialogPricingNote.textContent = r.pricing_note;
            dialogPricingNote.hidden = false;
            dialogPricingNote.style.display = '';
          } else {
            dialogPricingNote.hidden = true;
            dialogPricingNote.style.display = 'none';
          }
        }

        dialogPricingRow.hidden = false;
        dialogPricingRow.style.display = '';
      } else {
        dialogPricingRow.hidden = true;
        dialogPricingRow.style.display = 'none';
      }
    }

    // Platforms
    if (dialogPlatformsRow && dialogPlatformsVal) {
      if (Array.isArray(r.platforms) && r.platforms.length > 0) {
        dialogPlatformsVal.innerHTML = r.platforms.map(pid => {
          const plabel = platformsMap.get(pid) || pid;
          return `<span class="badge badge-platform">${escapeHtml(plabel)}</span>`;
        }).join('');
        dialogPlatformsRow.hidden = false;
        dialogPlatformsRow.style.display = '';
      } else {
        dialogPlatformsRow.hidden = true;
        dialogPlatformsRow.style.display = 'none';
      }
    }

    // Extra Links
    if (dialogLinksRow && dialogLinksVal) {
      if (Array.isArray(r.links) && r.links.length > 0) {
        dialogLinksVal.innerHTML = r.links.map(l => {
          return `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" class="dialog-extra-link">${escapeHtml(l.label)}</a>`;
        }).join('');
        dialogLinksRow.hidden = false;
        dialogLinksRow.style.display = '';
      } else {
        dialogLinksRow.hidden = true;
        dialogLinksRow.style.display = 'none';
      }
    }

    // Visit button
    if (dialogVisitBtn) {
      if (r.url) {
        dialogVisitBtn.href = r.url;
        dialogVisitBtn.hidden = false;
        dialogVisitBtn.style.display = '';
      } else {
        dialogVisitBtn.hidden = true;
        dialogVisitBtn.style.display = 'none';
      }
    }

    // Open modal
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  // Card click / keydown handling
  cards.forEach(card => {
    const id = card.getAttribute('data-id');

    card.addEventListener('click', e => {
      // If the external arrow button was clicked, let it open link in new tab
      if (e.target.closest('.card-arrow-btn')) {
        return;
      }
      openDetailPopup(id);
    });

    card.addEventListener('keydown', e => {
      // Enter or Space opens popup if the card itself is focused
      if (e.target.closest('.card-arrow-btn')) {
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetailPopup(id);
      }
    });
  });

  // Dialog close handling
  if (dialogCloseBtn && dialog) {
    dialogCloseBtn.addEventListener('click', () => {
      dialog.close();
    });
  }

  if (dialog) {
    // Click on backdrop to close
    dialog.addEventListener('click', e => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        dialog.close();
      }
    });
  }

  // Initialize filters from URL on page load
  loadFiltersFromUrl();
})();
