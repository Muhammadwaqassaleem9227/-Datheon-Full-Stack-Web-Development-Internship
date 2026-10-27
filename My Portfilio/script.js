/* ================================================================
   PORTFOLIO · Muhammad Waqas Saleem
   script.js — Vanilla JS ES6+
   Handles: theme toggle, hamburger nav, scroll spy, scroll reveal,
            project data array, dynamic card rendering, modal logic.
   ================================================================ */

'use strict';

/* ----------------------------------------------------------------
   1.  PROJECT DATA ARRAY
   ---------------------------------------------------------------
   To add a new project: copy one object below, change the values,
   and the card + modal will appear automatically. No HTML needed!
---------------------------------------------------------------- */
const PROJECTS = [
  {
    id: 'real-estate',
    title: 'Real Estate Platform',
    category: 'Full Stack Web App',
    excerpt:
      'A complete web-based real estate platform enabling users to explore property listings, search & filter, manage accounts, save favourites, and receive AI-powered property price predictions.',
    description:
      'Built end-to-end as my BS Computer Science capstone project. The platform allows users to browse and search property listings with advanced filters (location, price, type), register and log in securely, save favourite properties, and get AI-based price predictions powered by a trained regression model served via a Flask API. The database layer uses SQLite with normalised schemas for users, properties, and saved favourites.',
    image: 'images/project-realestate.png',
    emoji: '🏠',
    tags: ['HTML5', 'CSS3', 'JavaScript', 'Bootstrap', 'Python', 'Flask', 'SQLite', 'AI / ML'],
    github: 'https://github.com/Real-estate-website',
    demo: '#',              // Replace with live URL when deployed
  },
  {
    id: 'portfolio-site',
    title: 'Developer Portfolio',
    category: 'Frontend',
    excerpt:
      'This very portfolio — a responsive, accessible, single-page site built with pure HTML5, CSS3, and vanilla JavaScript. Features dark/light theme, smooth scroll, and animated project modals.',
    description:
      'Designed mobile-first with CSS custom properties for theming, CSS Grid + Flexbox for layout, fluid clamp() typography, and an IntersectionObserver scroll-spy for the active nav link. The dark/light theme persists to localStorage and respects the system preference on first visit. Project cards are rendered dynamically from a JavaScript data array. The project modal uses the native HTML <dialog> element for built-in accessibility.',
    image: '',
    emoji: '💼',
    tags: ['HTML5', 'CSS3', 'JavaScript', 'Responsive Design', 'Accessibility'],
    github: 'https://github.com/Real-estate-website',
    demo: '#',
  },
  {
    id: 'ai-price-predictor',
    title: 'AI Price Predictor',
    category: 'AI / Backend',
    excerpt:
      'Machine-learning regression model trained on property features (area, location, bedrooms, amenities) to predict real estate market prices, exposed as a Flask REST API.',
    description:
      'Trained a scikit-learn regression model on a curated dataset of property listings. Key steps included data cleaning, feature engineering (one-hot encoding for categorical variables), train/test split, model evaluation (RMSE, R²), and hyper-parameter tuning. The final model is serialised with joblib and served via a Flask REST API endpoint that accepts a JSON property description and returns a predicted price with a confidence interval.',
    image: '',
    emoji: '🤖',
    tags: ['Python', 'Flask', 'scikit-learn', 'Pandas', 'REST API', 'SQLite'],
    github: 'https://github.com/Real-estate-website',
    demo: '#',
  },
];

/* ----------------------------------------------------------------
   2.  THEME TOGGLE
   Reads system preference on first visit, then persists to localStorage.
---------------------------------------------------------------- */
(function initTheme() {
  // Check localStorage first; fall back to system preference
  const stored = localStorage.getItem('theme');
  const system  = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  const theme   = stored || system;

  document.documentElement.setAttribute('data-theme', theme);
})();

function setupThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  // Update aria-label to reflect the action (not current state)
  function updateLabel() {
    const current = document.documentElement.getAttribute('data-theme');
    btn.setAttribute(
      'aria-label',
      current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
    );
  }

  updateLabel();

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next    = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateLabel();
  });
}

/* ----------------------------------------------------------------
   3.  HAMBURGER MENU
   Toggles `.nav-open` on <body>, updates aria-expanded,
   closes when: a nav link is clicked OR Escape is pressed.
---------------------------------------------------------------- */
function setupHamburger() {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');
  if (!hamburger || !navLinks) return;

  function openMenu() {
    document.body.classList.add('nav-open');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'Close navigation menu');
  }

  function closeMenu() {
    document.body.classList.remove('nav-open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open navigation menu');
  }

  function toggleMenu() {
    document.body.classList.contains('nav-open') ? closeMenu() : openMenu();
  }

  // Toggle on hamburger click
  hamburger.addEventListener('click', toggleMenu);

  // Close on any nav link click (mobile UX: section jumps, then menu closes)
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      closeMenu();
      hamburger.focus(); // return focus to trigger element
    }
  });

  // Close if user clicks the overlay (the ::before pseudo-element on body)
  document.addEventListener('click', e => {
    if (
      document.body.classList.contains('nav-open') &&
      !navLinks.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      closeMenu();
    }
  });
}

/* ----------------------------------------------------------------
   4.  SCROLL SPY — active nav link highlighting
   Uses IntersectionObserver to track which section is in view.
---------------------------------------------------------------- */
function setupScrollSpy() {
  const navLinks = document.querySelectorAll('.nav-link');
  if (!navLinks.length) return;

  // Map href → nav link element for fast lookup
  const linkMap = {};
  navLinks.forEach(link => {
    linkMap[link.getAttribute('href')] = link;
  });

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const id   = '#' + entry.target.id;
        const link = linkMap[id];
        if (!link) return;

        if (entry.isIntersecting) {
          // Remove active from all, add to current
          navLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
        }
      });
    },
    {
      // Trigger when section enters the middle 30% of the viewport
      rootMargin: `-${getNavHeight()}px 0px -60% 0px`,
    }
  );

  // Observe each section that has a matching nav link
  document.querySelectorAll('section[id]').forEach(section => {
    observer.observe(section);
  });
}

function getNavHeight() {
  const header = document.querySelector('.site-header');
  return header ? header.offsetHeight : 64;
}

/* ----------------------------------------------------------------
   5.  SCROLL REVEAL ANIMATION
   Adds `.reveal` class to key elements, then uses
   IntersectionObserver to add `.visible` when they enter view.
---------------------------------------------------------------- */
function setupScrollReveal() {
  // Select elements to animate
  const targets = document.querySelectorAll(
    '.section-title, .section-subtitle, .about-bio, .timeline-item, ' +
    '.skill-category, .project-card, .contact-card'
  );

  targets.forEach((el, i) => {
    el.classList.add('reveal');
    // Stagger: children inside the same parent get a delay
    el.style.transitionDelay = `${(i % 6) * 60}ms`;
  });

  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target); // animate once
        }
      });
    },
    { threshold: 0.1 }
  );

  targets.forEach(el => revealObserver.observe(el));
}

/* ----------------------------------------------------------------
   6.  RENDER PROJECT CARDS
   Reads PROJECTS array and injects cards into #projects-grid.
   Each card has a tabIndex so keyboard users can activate it.
---------------------------------------------------------------- */
function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  PROJECTS.forEach(project => {
    // Build tag HTML
    const tagsHTML = project.tags
      .map(tag => `<span class="tag">${tag}</span>`)
      .join('');

    // Thumbnail: image or emoji placeholder
    const thumbHTML = project.image
      ? `<img
           class="project-thumb"
           src="${project.image}"
           alt="${project.title} screenshot"
           loading="lazy"
         />`
      : `<div class="project-thumb-placeholder" aria-hidden="true">
           <span style="font-size:3.5rem">${project.emoji}</span>
         </div>`;

    // Card element
    const card = document.createElement('article');
    card.className = 'project-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${project.title} — click to see details`);
    card.dataset.id = project.id;

    card.innerHTML = `
      ${thumbHTML}
      <div class="project-info">
        <p class="project-category">${project.category}</p>
        <h3 class="project-title">${project.title}</h3>
        <p class="project-excerpt">${project.excerpt}</p>
        <div class="project-tags">${tagsHTML}</div>
      </div>
      <div class="project-card-footer">
        <span>View Details</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    `;

    // Open modal on click or Enter/Space key
    card.addEventListener('click', () => openModal(project.id));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(project.id);
      }
    });

    grid.appendChild(card);
  });

  // After cards are in the DOM, start reveal animations
  setupScrollReveal();
}

/* ----------------------------------------------------------------
   7.  PROJECT MODAL
   Opens the native <dialog> element and populates it with
   data from the matching project object.
   Closes via: X button, click outside, Escape key.
---------------------------------------------------------------- */
const modal       = document.getElementById('project-modal');
const modalClose  = document.getElementById('modal-close');
const modalImg    = document.getElementById('modal-img');
const modalTitle  = document.getElementById('modal-title');
const modalDesc   = document.getElementById('modal-desc');
const modalTags   = document.getElementById('modal-tags');
const modalDemo   = document.getElementById('modal-demo');
const modalGithub = document.getElementById('modal-github');

function openModal(projectId) {
  const project = PROJECTS.find(p => p.id === projectId);
  if (!project || !modal) return;

  // Populate content
  if (project.image) {
    modalImg.src = project.image;
    modalImg.alt = `${project.title} screenshot`;
    modalImg.style.display = 'block';
  } else {
    modalImg.style.display = 'none';
  }

  modalTitle.textContent = project.title;
  modalDesc.textContent  = project.description;

  // Tags
  modalTags.innerHTML = project.tags
    .map(tag => `<span class="tag" role="listitem">${tag}</span>`)
    .join('');

  // Links — hide Live Demo if it's '#'
  if (project.demo && project.demo !== '#') {
    modalDemo.href = project.demo;
    modalDemo.style.display = '';
  } else {
    modalDemo.style.display = 'none';
  }

  modalGithub.href = project.github;

  // Show the dialog (provides built-in focus trap & Escape handling)
  modal.showModal();
}

function closeModal() {
  if (modal) modal.close();
}

function setupModal() {
  if (!modal || !modalClose) return;

  // X button
  modalClose.addEventListener('click', closeModal);

  // Click on backdrop (outside the modal content) — compare click target
  modal.addEventListener('click', e => {
    const rect = modal.getBoundingClientRect();
    const clickedOutside =
      e.clientX < rect.left  ||
      e.clientX > rect.right ||
      e.clientY < rect.top   ||
      e.clientY > rect.bottom;
    if (clickedOutside) closeModal();
  });

  // Escape key is handled natively by <dialog>, but we can also listen:
  modal.addEventListener('cancel', e => {
    e.preventDefault(); // prevent default close so our animation runs
    closeModal();
  });
}

/* ----------------------------------------------------------------
   8.  FOOTER YEAR
   Auto-updates copyright year so you never forget.
---------------------------------------------------------------- */
function setFooterYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* ----------------------------------------------------------------
   9.  INIT — run everything when DOM is ready
---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  setupThemeToggle();
  setupHamburger();
  renderProjects();   // must run before setupScrollSpy so sections exist
  setupModal();
  setupScrollSpy();
  setFooterYear();
});
