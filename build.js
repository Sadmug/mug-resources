#!/usr/bin/env node

/**
 * Creative Resources - Static Site Generator
 * Compiles data/resources.json into index.html
 * Zero npm dependencies.
 */

const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const dataFile = path.join(rootDir, 'data', 'resources.json');
const outputFile = path.join(rootDir, 'index.html');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalize(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

if (!fs.existsSync(dataFile)) {
  console.error(`Error: data file not found at ${dataFile}`);
  process.exit(1);
}

const rawData = fs.readFileSync(dataFile, 'utf8');
const data = JSON.parse(rawData);

const groups = data.groups || [];
const types = data.types || [];
const pricing = data.pricing || [];
const platforms = data.platforms || [];
const resources = data.resources || [];

// Lookup maps
const groupsMap = new Map(groups.map(g => [g.id, g.label]));
const typesMap = new Map(types.map(t => [t.id, t.label]));
const pricingMap = new Map(pricing.map(p => [p.id, p.label]));
const platformsMap = new Map(platforms.map(pl => [pl.id, pl.label]));

// Distinct license names from data
const distinctLicenses = Array.from(
  new Set(
    resources
      .map(r => (r.license && r.license.name ? r.license.name.trim() : ''))
      .filter(Boolean)
  )
).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

// Pre-sort resources alphabetically by name
resources.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

// Render Group Buttons: "All" plus all items in groups
const groupButtonsHtml = [
  '        <button type="button" class="group-btn active" data-group="all">All</button>',
  ...groups.map(g => `        <button type="button" class="group-btn" data-group="${escapeHtml(g.id)}">${escapeHtml(g.label)}</button>`)
].join('\n');

// Render Type Filter Options
const typeOptionsHtml = types.map(t => {
  return `            <label class="filter-option">
              <input type="checkbox" data-filter="type" value="${escapeHtml(t.id)}">
              <span>${escapeHtml(t.label)}</span>
            </label>`;
}).join('\n');

// Render Pricing Filter Options
const pricingOptionsHtml = pricing.map(p => {
  return `            <label class="filter-option">
              <input type="checkbox" data-filter="pricing" value="${escapeHtml(p.id)}">
              <span>${escapeHtml(p.label)}</span>
            </label>`;
}).join('\n');

// Render Platform Filter Options
const platformOptionsHtml = platforms.map(pl => {
  return `            <label class="filter-option">
              <input type="checkbox" data-filter="platform" value="${escapeHtml(pl.id)}">
              <span>${escapeHtml(pl.label)}</span>
            </label>`;
}).join('\n');

// Render License Filter Options
const licenseOptionsHtml = distinctLicenses.map(lic => {
  return `            <label class="filter-option">
              <input type="checkbox" data-filter="license" value="${escapeHtml(lic)}">
              <span>${escapeHtml(lic)}</span>
            </label>`;
}).join('\n');

// Chevron SVG for dropdowns
const chevronSvg = `<svg class="filter-summary-chevron" width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M1.5 1.75L6 6.25L10.5 1.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;

// Circular arrow button SVG
const arrowButtonSvg = `<svg width="41" height="41" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="20.5" cy="20.5" r="20.5" fill="#22B573"/>
                <path d="M11.2501 24.7009C10.5326 25.1151 10.2868 26.0325 10.701 26.75C11.1152 27.4674 12.0326 27.7132 12.7501 27.299L12.0001 26L11.2501 24.7009ZM12.0001 26L12.7501 27.299L30.0706 17.299L29.3206 16L28.5706 14.7009L11.2501 24.7009L12.0001 26ZM30.7694 16.3882C30.9839 15.588 30.509 14.7655 29.7088 14.5511L16.6688 11.057C15.8686 10.8426 15.0461 11.3175 14.8317 12.1177C14.6173 12.9179 15.0921 13.7404 15.8923 13.9548L27.4834 17.0606L24.3776 28.6517C24.1632 29.4519 24.6381 30.2744 25.4383 30.4888C26.2385 30.7033 27.061 30.2284 27.2754 29.4282L30.7694 16.3882Z" fill="#391224"/>
              </svg>`;

// Render Cards
const cardsHtml = resources.map(r => {
  const typeLabel = r.type ? typesMap.get(r.type) || r.type : '';
  const pricingLabel = r.pricing ? pricingMap.get(r.pricing) || r.pricing : '';
  const licenseName = r.license && r.license.name ? r.license.name : '';

  const pList = r.platforms || [];
  let platformChipsHtml = '';
  if (pList.length > 0) {
    const maxChips = 3;
    const visibleChips = pList.slice(0, maxChips).map(pid => {
      const pLabel = platformsMap.get(pid) || pid;
      return `<span class="badge badge-platform">${escapeHtml(pLabel)}</span>`;
    });
    if (pList.length > maxChips) {
      const extraCount = pList.length - maxChips;
      visibleChips.push(`<span class="badge badge-platform badge-platform-more">+${extraCount}</span>`);
    }
    platformChipsHtml = `<div class="card-platforms-preview">${visibleChips.join('')}</div>`;
  }

  const typeBadgeHtml = typeLabel
    ? `<span class="badge badge-type card-type-badge">${escapeHtml(typeLabel)}</span>`
    : '';

  const licenseBadgeHtml = licenseName
    ? `<span class="badge badge-license">${escapeHtml(licenseName)}</span>`
    : '';

  const pricingBadgeHtml = pricingLabel
    ? `<span class="badge badge-pricing">${escapeHtml(pricingLabel)}</span>`
    : '';

  const metaLineHtml = (licenseBadgeHtml || pricingBadgeHtml)
    ? `            <div class="card-meta-line">
              ${licenseBadgeHtml}
              ${pricingBadgeHtml}
            </div>`
    : '';

  const descriptionHtml = r.description
    ? `          <p class="card-description">${escapeHtml(r.description)}</p>`
    : '';

  const groupsAttr = (r.groups || []).join(',');
  const platformsAttr = (r.platforms || []).join(',');
  const typeAttr = r.type || '';
  const pricingAttr = r.pricing || '';
  const licenseAttr = r.license && r.license.name ? r.license.name : '';
  const searchAttr = normalize([r.name, r.description, ...(r.keywords || [])].join(' '));

  return `        <article class="resource-card" role="button" tabindex="0" data-id="${escapeHtml(r.id)}" data-name="${escapeHtml(r.name)}" data-groups="${escapeHtml(groupsAttr)}" data-type="${escapeHtml(typeAttr)}" data-pricing="${escapeHtml(pricingAttr)}" data-platforms="${escapeHtml(platformsAttr)}" data-license="${escapeHtml(licenseAttr)}" data-search="${escapeHtml(searchAttr)}" aria-label="View details for ${escapeHtml(r.name)}">
          <div class="card-left">
            <div class="card-title-row">
              <h2 class="card-name">${escapeHtml(r.name)}</h2>
              ${platformChipsHtml}
            </div>
${metaLineHtml}
${descriptionHtml}
          </div>
          ${typeBadgeHtml}
          <div class="card-arrow-wrap">
            <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer" class="card-arrow-btn" aria-label="Open ${escapeHtml(r.name)}" title="Open ${escapeHtml(r.name)}">
              ${arrowButtonSvg}
            </a>
          </div>
        </article>`;
}).join('\n');

// Clean data for frontend (ignore needs_review, do not display keywords)
const clientData = {
  groups,
  types,
  pricing,
  platforms,
  resources: resources.map(r => ({
    id: r.id,
    name: r.name,
    url: r.url,
    groups: r.groups || [],
    type: r.type || '',
    license: r.license || null,
    pricing: r.pricing || '',
    pricing_note: r.pricing_note || '',
    platforms: r.platforms || [],
    description: r.description || '',
    keywords: r.keywords || [],
    links: r.links || [],
    icon: r.icon || null
  }))
};

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Creative Resources | J. Sadeg</title>
  <meta name="description" content="A curated directory of digital creation tools, sources, textures, fonts, and frameworks for creative work.">
  <link rel="canonical" href="https://resources.sadmug.dev/">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Creative Resources">
  <meta property="og:title" content="Creative Resources | J. Sadeg">
  <meta property="og:description" content="A curated directory of digital creation tools, sources, textures, fonts, and frameworks for creative work.">
  <meta property="og:url" content="https://resources.sadmug.dev/">
  <meta property="og:image" content="https://resources.sadmug.dev/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Creative Resources">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Creative Resources | J. Sadeg">
  <meta name="twitter:description" content="A curated directory of digital creation tools, sources, textures, fonts, and frameworks for creative work.">
  <meta name="twitter:image" content="https://resources.sadmug.dev/og.png">

  <!-- Theme Color -->
  <meta name="theme-color" content="#ECF1FF">

  <!-- Favicons -->
  <link rel="icon" href="favicon.ico" sizes="32x32">
  <link rel="icon" href="icon/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="icon/apple-touch-icon.png">

  <!-- Google Fonts: ABeeZee -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=ABeeZee:ital@0;1&display=swap" rel="stylesheet">

  <!-- Live Stylesheets from J. Sadeg -->
  <link rel="stylesheet" href="https://jugurthasadeg.sadmug.dev/css/tokens.css">
  <link rel="stylesheet" href="https://jugurthasadeg.sadmug.dev/css/components.css">

  <!-- Page-specific Stylesheet -->
  <link rel="stylesheet" href="css/resources.css">
</head>
<body>
  <div class="page-wrapper">
    <!-- Header Navigation -->
    <header class="site-header" role="banner">
      <div class="nav-container">
        <a href="https://jugurthasadeg.sadmug.dev" class="brand-link" aria-label="Jugurtha Sadeg, graphic design" target="_blank" rel="noopener noreferrer">
          <img src="assets/logo/logo-dark.svg" alt="J. SADEG Logo" class="brand-logo" width="250" height="79">
        </a>
        <button type="button" class="burger-btn" id="burger-btn" aria-label="Open menu" aria-expanded="false" aria-controls="site-nav">
          <svg class="burger-icon burger-icon-open" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="18" x2="20" y2="18"></line>
          </svg>
          <svg class="burger-icon burger-icon-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <line x1="5" y1="5" x2="19" y2="19"></line>
            <line x1="19" y1="5" x2="5" y2="19"></line>
          </svg>
        </button>
        <nav class="site-nav" id="site-nav" role="navigation" aria-label="Main Navigation">
          <ul class="nav-list">
            <li><a href="https://jugurthasadeg.sadmug.dev/index.html" class="nav-link">Home</a></li>
            <li><a href="https://jugurthasadeg.sadmug.dev/about.html" class="nav-link">About me</a></li>
            <li><a href="https://jugurthasadeg.sadmug.dev/contact.html" class="nav-link">Contact</a></li>
            <li><a href="https://resources.sadmug.dev" class="nav-link active" aria-current="page">Resources</a></li>
            <li><a href="https://sadmug.dev" class="nav-link" target="_blank" rel="noopener noreferrer">Sadmug</a></li>
          </ul>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main id="main-content">
      <!-- Intro Section -->
      <section class="intro-section" aria-labelledby="page-title">
        <div class="intro-content">
          <h1 id="page-title" class="page-title">Creative Resources</h1>
          <details class="intro-details">
            <summary class="intro-summary">Why does this list exist?</summary>
            <div class="intro-text">
              <p>This file is a work in constant progress. I gather all the resources I can find for creative work. The goal is to create some kind of starter-pack for new and intermediate creatives who might not know where to look, though these might come in handy for experienced creatives too, who knows?</p>
            </div>
          </details>
        </div>
      </section>

      <!-- Filter & Search Section -->
      <section class="filters-section" aria-label="Filters and Search">
        <div class="filters-wrapper">
          <!-- Search Box -->
          <div class="search-container">
            <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="search" id="search-input" class="search-input" placeholder="Search resources by name, topic, description..." aria-label="Search resources">
            <button type="button" id="search-clear-btn" class="search-clear-btn" aria-label="Clear search text" hidden>&times;</button>
          </div>

          <!-- Group Buttons -->
          <div class="groups-container" role="toolbar" aria-label="Resource Groups">
${groupButtonsHtml}
          </div>

          <!-- Secondary Filters Row -->
          <div class="filter-controls-row">
            <div class="filter-dropdowns">
              <!-- Type Dropdown -->
              <details class="filter-dropdown" data-filter="type">
                <summary class="filter-summary">
                  <span>Type</span>
                  <span class="filter-count-badge" hidden>0</span>
                  ${chevronSvg}
                </summary>
                <div class="filter-dropdown-menu">
${typeOptionsHtml}
                </div>
              </details>

              <!-- Pricing Dropdown -->
              <details class="filter-dropdown" data-filter="pricing">
                <summary class="filter-summary">
                  <span>Pricing</span>
                  <span class="filter-count-badge" hidden>0</span>
                  ${chevronSvg}
                </summary>
                <div class="filter-dropdown-menu">
${pricingOptionsHtml}
                </div>
              </details>

              <!-- Platform Dropdown -->
              <details class="filter-dropdown" data-filter="platform">
                <summary class="filter-summary">
                  <span>Platform</span>
                  <span class="filter-count-badge" hidden>0</span>
                  ${chevronSvg}
                </summary>
                <div class="filter-dropdown-menu">
${platformOptionsHtml}
                </div>
              </details>

              <!-- License Dropdown -->
              <details class="filter-dropdown" data-filter="license">
                <summary class="filter-summary">
                  <span>License</span>
                  <span class="filter-count-badge" hidden>0</span>
                  ${chevronSvg}
                </summary>
                <div class="filter-dropdown-menu">
${licenseOptionsHtml}
                </div>
              </details>
            </div>

            <!-- Actions and Results Count -->
            <div class="filter-actions">
              <div id="results-count" class="results-count" aria-live="polite">Showing ${resources.length} resources</div>
              <button type="button" class="btn-clear-filters" id="clear-filters-btn">Clear filters</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Empty State -->
      <div class="empty-state" id="empty-state" hidden>
        <p class="empty-title">No resources found matching your current filters.</p>
        <button type="button" class="btn-clear-filters" id="empty-clear-btn">Clear all filters</button>
      </div>

      <!-- Resource Cards Grid -->
      <section class="resources-section" aria-label="Resources List">
        <div class="resources-grid" id="resources-grid">
${cardsHtml}
        </div>
      </section>
    </main>

    <!-- Detail Popup Dialog -->
    <dialog id="detail-dialog" class="detail-dialog" aria-labelledby="dialog-title">
      <div class="dialog-container">
        <header class="dialog-header">
          <div class="dialog-header-left">
            <div class="dialog-title-block">
              <h2 id="dialog-title" class="dialog-title"></h2>
              <div class="dialog-tags">
                <span id="dialog-type" class="badge badge-type" hidden></span>
                <div id="dialog-groups" class="dialog-tags" hidden></div>
              </div>
            </div>
          </div>
          <button type="button" class="dialog-close-btn" id="dialog-close-btn" aria-label="Close details">&times;</button>
        </header>

        <div class="dialog-body">
          <div id="dialog-desc-wrap">
            <p id="dialog-description" class="dialog-description"></p>
          </div>

          <div class="dialog-meta-grid">
            <div id="dialog-license-row" class="dialog-meta-item" hidden>
              <strong>License</strong>
              <p>
                <span id="dialog-license-val"></span>
                <span id="dialog-commercial-badge" class="badge badge-commercial" style="margin-left: 6px;" hidden>Free for commercial use</span>
              </p>
            </div>

            <div id="dialog-pricing-row" class="dialog-meta-item" hidden>
              <strong>Pricing</strong>
              <p id="dialog-pricing-val"></p>
              <p id="dialog-pricing-note" class="pricing-note" hidden></p>
            </div>

            <div id="dialog-platforms-row" class="dialog-meta-item" hidden>
              <strong>Platforms</strong>
              <div id="dialog-platforms-val" class="dialog-tags" style="margin-top: 4px;"></div>
            </div>

            <div id="dialog-links-row" class="dialog-meta-item" hidden>
              <strong>Additional Links</strong>
              <div id="dialog-links-val" class="dialog-extra-links" style="margin-top: 4px;"></div>
            </div>
          </div>
        </div>

        <footer class="dialog-footer">
          <a id="dialog-visit-btn" href="#" target="_blank" rel="noopener noreferrer" class="btn btn-tertiary dialog-visit-btn">Visit Website</a>
        </footer>
      </div>
    </dialog>

    <!-- Footer -->
    <footer class="site-footer" role="contentinfo">
      <div class="footer-content">
        <span>&copy; sadmug | This page is under GPL-3.0.</span>
        <ul class="footer-links">
          <li><a href="https://jugurthasadeg.sadmug.dev" class="footer-link" target="_blank" rel="noopener noreferrer">Jugurtha Sadeg</a></li>
          <li><a href="https://sadmug.dev" class="footer-link" target="_blank" rel="noopener noreferrer">SadMug</a></li>
        </ul>
      </div>
    </footer>
  </div>

  <!-- Embedded Resource Data for Filter System -->
  <script id="resources-data" type="application/json">
${JSON.stringify(clientData)}
  </script>

  <!-- Scripts -->
  <script src="js/nav.js" defer></script>
  <script src="js/filter.js" defer></script>
</body>
</html>
`;

fs.writeFileSync(outputFile, fullHtml, 'utf8');
console.log(`Successfully generated ${outputFile} with ${resources.length} resources.`);
