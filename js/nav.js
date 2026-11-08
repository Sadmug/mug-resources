/**
 * J. SADEG - Mobile Navigation
 * Accessible burger menu toggle and dropdown panel handling
 */

(function () {
  'use strict';

  const header = document.querySelector('.site-header');
  const button = document.getElementById('burger-btn');
  const nav = document.getElementById('site-nav');

  if (!header || !button || !nav) return;

  header.classList.add('js-nav-ready');

  function openMenu() {
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', 'Close menu');
    nav.classList.add('is-open');
  }

  function closeMenu(focusButton = false) {
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open menu');
    nav.classList.remove('is-open');
    if (focusButton) {
      button.focus();
    }
  }

  function toggleMenu() {
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  button.addEventListener('click', toggleMenu);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      closeMenu(true);
    }
  });

  document.addEventListener('click', function (e) {
    if (button.getAttribute('aria-expanded') === 'true' && !header.contains(e.target)) {
      closeMenu();
    }
  });
})();
