#!/usr/bin/env node

/**
 * Creative Resources - Static Site Generator
 * Compiles data/resources.json into:
 *  - index.html (Homepage)
 *  - <group>/index.html (Category hub pages for SEO)
 *  - sitemap.xml
 *  - robots.txt
 * Zero npm dependencies.
 */

const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const dataFile = path.join(rootDir, 'data', 'resources.json');
const baseUrl = 'https://resources.sadmug.dev';

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

// Clean data for frontend
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

// SVG icons
const chevronSvg = `<svg class="filter-summary-chevron" width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M1.5 1.75L6 6.25L10.5 1.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;

const arrowButtonSvg = `<svg width="41" height="41" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="20.5" cy="20.5" r="20.5" fill="#22B573"/>
                <path d="M11.2501 24.7009C10.5326 25.1151 10.2868 26.0325 10.701 26.75C11.1152 27.4674 12.0326 27.7132 12.7501 27.299L12.0001 26L11.2501 24.7009ZM12.0001 26L12.7501 27.299L30.0706 17.299L29.3206 16L28.5706 14.7009L11.2501 24.7009L12.0001 26ZM30.7694 16.3882C30.9839 15.588 30.509 14.7655 29.7088 14.5511L16.6688 11.057C15.8686 10.8426 15.0461 11.3175 14.8317 12.1177C14.6173 12.9179 15.0921 13.7404 15.8923 13.9548L27.4834 17.0606L24.3776 28.6517C24.1632 29.4519 24.6381 30.2744 25.4383 30.4888C26.2385 30.7033 27.061 30.2284 27.2754 29.4282L30.7694 16.3882Z" fill="#391224"/>
              </svg>`;

// Render Filter Options
const typeOptionsHtml = types.map(t => `            <label class="filter-option">
              <input type="checkbox" data-filter="type" value="${escapeHtml(t.id)}">
              <span>${escapeHtml(t.label)}</span>
            </label>`).join('\n');

const pricingOptionsHtml = pricing.map(p => `            <label class="filter-option">
              <input type="checkbox" data-filter="pricing" value="${escapeHtml(p.id)}">
              <span>${escapeHtml(p.label)}</span>
            </label>`).join('\n');

const platformOptionsHtml = platforms.map(pl => `            <label class="filter-option">
              <input type="checkbox" data-filter="platform" value="${escapeHtml(pl.id)}">
              <span>${escapeHtml(pl.label)}</span>
            </label>`).join('\n');

const licenseOptionsHtml = distinctLicenses.map(lic => `            <label class="filter-option">
              <input type="checkbox" data-filter="license" value="${escapeHtml(lic)}">
              <span>${escapeHtml(lic)}</span>
            </label>`).join('\n');

// Category SEO Metadata
const groupMetadata = {
  all: {
    title: 'Creative Resources Directory | Free Tools, Assets & Fonts | J. Sadeg',
    heading: 'Creative Resources',
    description: 'A curated directory of free and open-source creative tools, 3D textures, commercial-use fonts, sound effects, and game dev frameworks.',
    intro: 'This list is a work in constant progress. I gather every resource I can find for creative work: fonts, textures, free software, references and more. The goal is a starter pack for new and intermediate creatives who might not know where to look, though experienced creatives might find a few gems too. Use the search box and filters to narrow things down, and open any card for the full details.'
  },
  fonts: {
    title: 'Free Fonts & Typography Resources | J. Sadeg',
    heading: 'Fonts & Typography Resources',
    description: 'Curated directory of free commercial fonts, typography tools, and open-source typefaces for designers and creators.',
    intro: 'Hand-picked fonts, type design utilities, and font discovery platforms suitable for commercial and personal creative projects.'
  },
  '3d': {
    title: 'Free 3D Tools, Textures & Software | J. Sadeg',
    heading: '3D Modeling & Asset Creation Tools',
    description: 'Curated directory of free 3D software, textures for 3D modeling, shaders, and digital creation tools.',
    intro: 'Free and open-source 3D software, PBR texture libraries, sculpting tools, and asset sources for 3D artists and developers.'
  },
  raster: {
    title: 'Raster Graphics & Digital Painting Tools | J. Sadeg',
    heading: 'Raster Graphics & Painting Tools',
    description: 'Curated directory of raster image editors, digital painting apps, texture archives, and graphic design tools.',
    intro: 'Image editors, photo manipulation apps, and digital painting programs for illustrators and graphic designers.'
  },
  vector: {
    title: 'Vector Graphics & SVG Design Tools | J. Sadeg',
    heading: 'Vector Graphics & SVG Resources',
    description: 'Curated directory of vector design software, SVG tools, icon libraries, and illustration frameworks.',
    intro: 'Vector illustration software, SVG optimization tools, icon sets, and asset generators for designers and web developers.'
  },
  color: {
    title: 'Color Palette Generators & Pickers | J. Sadeg',
    heading: 'Color Palettes & Harmony Tools',
    description: 'Curated directory of color palette generators, color pickers, contrast checkers, and color accessibility tools.',
    intro: 'Color schemes, palette extractors, and color contrast tools to help you craft accessible and visually engaging palettes.'
  },
  moodboarding: {
    title: 'Moodboarding & Visual Brainstorming Tools | J. Sadeg',
    heading: 'Moodboarding & Ideation Tools',
    description: 'Curated directory of visual brainstorming canvases, moodboarding apps, and inspiration organizers for creators.',
    intro: 'Digital whiteboard apps, moodboard creators, and visual note-taking tools for project planning and creative brainstorming.'
  },
  video: {
    title: 'Video Editing & Animation Software | J. Sadeg',
    heading: 'Video & Animation Tools',
    description: 'Curated directory of free video editors, motion graphics software, and 2D/3D animation resources.',
    intro: 'Video editors, compositing software, motion design utilities, and animation packages for visual storytellers.'
  },
  audio: {
    title: 'Audio Tools, DAWs & Free Sound Effects | J. Sadeg',
    heading: 'Audio Production & Sound Effects',
    description: 'Curated directory of digital audio workstations, free sound effects for games, synthesis tools, and music software.',
    intro: 'Music production software, DAWs, sound effects libraries, and audio editing tools for musicians, game devs, and sound designers.'
  },
  'game-making': {
    title: 'Game Development Engines & Asset Tools | J. Sadeg',
    heading: 'Game Making Tools & Engines',
    description: 'Curated directory of game development engines, asset sources, sound packs, and frameworks for indie game developers.',
    intro: 'Game engines, frameworks, asset archives, and level design tools to help indie game developers build and publish games.'
  },
  artcraft: {
    title: 'ArtCraft & Pixel Art Creative Tools | J. Sadeg',
    heading: 'ArtCraft & Specialized Art Tools',
    description: 'Curated directory of pixel art editors, generative art tools, and digital crafting software for creators.',
    intro: 'Pixel art utilities, generative creation software, procedural tools, and niche crafting resources for digital artists.'
  },
  other: {
    title: 'Uncategorized Creative Resources | J. Sadeg',
    heading: 'Additional Creative Tools',
    description: 'Additional digital creation utilities, asset sources, and miscellaneous tools for creative workflows.',
    intro: 'Curated tools, reference collections, and utility libraries that span multiple creative disciplines.'
  }
};

function renderGroupButtons(activeGroup = 'all') {
  const allActive = activeGroup === 'all' ? ' active' : '';
  const buttons = [
    `        <a href="/" class="group-btn${allActive}" data-group="all">All</a>`
  ];
  for (const g of groups) {
    const isActive = activeGroup === g.id ? ' active' : '';
    buttons.push(`        <a href="/${escapeHtml(g.id)}/" class="group-btn${isActive}" data-group="${escapeHtml(g.id)}">${escapeHtml(g.label)}</a>`);
  }
  return buttons.join('\n');
}

function renderCards(activeGroup = 'all') {
  return resources.map(r => {
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

    const isMatch = activeGroup === 'all' || (r.groups || []).includes(activeGroup);
    const hiddenAttr = isMatch ? '' : ' hidden';
    const styleAttr = isMatch ? '' : ' style="display:none;"';

    return `        <article class="resource-card" role="button" tabindex="0" data-id="${escapeHtml(r.id)}" data-name="${escapeHtml(r.name)}" data-groups="${escapeHtml(groupsAttr)}" data-type="${escapeHtml(typeAttr)}" data-pricing="${escapeHtml(pricingAttr)}" data-platforms="${escapeHtml(platformsAttr)}" data-license="${escapeHtml(licenseAttr)}" data-search="${escapeHtml(searchAttr)}" aria-label="View details for ${escapeHtml(r.name)}"${hiddenAttr}${styleAttr}>
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
}

function buildHtmlForGroup(groupId = 'all') {
  const meta = groupMetadata[groupId] || {
    title: `${groupsMap.get(groupId) || groupId} Resources | J. Sadeg`,
    heading: `${groupsMap.get(groupId) || groupId} Resources`,
    description: `Curated digital creation tools and resources for ${groupsMap.get(groupId) || groupId}.`,
    intro: `Hand-picked resources for ${groupsMap.get(groupId) || groupId}.`
  };

  const canonicalUrl = groupId === 'all' ? `${baseUrl}/` : `${baseUrl}/${groupId}/`;
  const matchingCount = groupId === 'all'
    ? resources.length
    : resources.filter(r => (r.groups || []).includes(groupId)).length;

  const cardsHtml = renderCards(groupId);
  const groupButtonsHtml = renderGroupButtons(groupId);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Creative Resources">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:image" content="${baseUrl}/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Creative Resources">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(meta.title)}">
  <meta name="twitter:description" content="${escapeHtml(meta.description)}">
  <meta name="twitter:image" content="${baseUrl}/og.png">

  <!-- Theme Color -->
  <meta name="theme-color" content="#ECF1FF">

  <!-- Favicons -->
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/icon/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/icon/apple-touch-icon.png">

  <!-- Google Fonts: ABeeZee -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=ABeeZee:ital@0;1&display=swap" rel="stylesheet">

  <!-- Live Stylesheets from J. Sadeg -->
  <link rel="stylesheet" href="https://jugurthasadeg.sadmug.dev/css/tokens.css">
  <link rel="stylesheet" href="https://jugurthasadeg.sadmug.dev/css/components.css">

  <!-- Page-specific Stylesheet -->
  <link rel="stylesheet" href="/css/resources.css">
</head>
<body data-current-group="${escapeHtml(groupId)}">
  <div class="page-wrapper">
    <!-- Header Navigation -->
    <header class="site-header" role="banner">
      <div class="nav-container">
        <a href="https://jugurthasadeg.sadmug.dev" class="brand-link" aria-label="Jugurtha Sadeg, graphic design" target="_blank" rel="noopener noreferrer">
          <img src="/assets/logo/logo-light.svg" alt="J. SADEG Logo" class="brand-logo" width="250" height="79">
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
            <li><a href="/" class="nav-link active" aria-current="page">Resources</a></li>
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
          <h1 id="page-title" class="page-title">${escapeHtml(meta.heading)}</h1>
          <details class="intro-details">
            <summary class="intro-summary">Why does this list exist?</summary>
            <div class="intro-text">
              <p>${escapeHtml(meta.intro)}</p>
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
              <div id="results-count" class="results-count" aria-live="polite">Showing ${matchingCount} resources</div>
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
        <span>&copy; sadmug | Curated by Jugurtha Sadeg | Under GPL-3.0.</span>
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
  <script src="/js/nav.js" defer></script>
  <script src="/js/filter.js" defer></script>
</body>
</html>
`;
}

// 1. Build Homepage (index.html)
const homeHtml = buildHtmlForGroup('all');
fs.writeFileSync(path.join(rootDir, 'index.html'), homeHtml, 'utf8');
console.log(`Generated homepage: ${path.join(rootDir, 'index.html')}`);

// 2. Build Category Hub Pages
for (const g of groups) {
  const groupDir = path.join(rootDir, g.id);
  if (!fs.existsSync(groupDir)) {
    fs.mkdirSync(groupDir, { recursive: true });
  }
  const groupHtml = buildHtmlForGroup(g.id);
  const groupFile = path.join(groupDir, 'index.html');
  fs.writeFileSync(groupFile, groupHtml, 'utf8');
  console.log(`Generated category page [${g.id}]: ${groupFile}`);
}

// 3. Build sitemap.xml
const today = new Date().toISOString().split('T')[0];
const sitemapUrls = [
  `  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`,
  ...groups.map(g => `  <url>
    <loc>${baseUrl}/${g.id}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)
];

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), sitemapContent, 'utf8');
console.log(`Generated sitemap: ${path.join(rootDir, 'sitemap.xml')}`);

// 4. Build robots.txt
const robotsContent = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
fs.writeFileSync(path.join(rootDir, 'robots.txt'), robotsContent, 'utf8');
console.log(`Generated robots.txt: ${path.join(rootDir, 'robots.txt')}`);

console.log('Build complete.');
