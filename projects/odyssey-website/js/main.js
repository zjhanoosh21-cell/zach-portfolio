// Scroll progress bar
const progressBar = document.createElement('div');
progressBar.className = 'scroll-progress';
document.body.prepend(progressBar);

// Back-to-top button
const backToTop = document.createElement('button');
backToTop.className = 'back-to-top';
backToTop.setAttribute('aria-label', 'Back to top');
backToTop.innerHTML = '&#8593;';
document.body.appendChild(backToTop);
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// Shared scroll handler
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = maxScroll > 0 ? (scrollY / maxScroll * 100) + '%' : '0%';
  document.querySelector('.nav')?.classList.toggle('scrolled', scrollY > 20);
  backToTop.classList.toggle('visible', scrollY > 400);
}, { passive: true });

function init() {
  // Mobile nav toggle (+ UX polish: close on link tap, ESC to close, body scroll-lock)
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  const setMenu = (open) => {
    if (!links) return;
    links.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    toggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  toggle?.addEventListener('click', () => setMenu(!links?.classList.contains('open')));
  links?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && links?.classList.contains('open')) setMenu(false);
  });

  // Lead form — POST to Formspree, show success/error state
  document.querySelectorAll('.lead-form').forEach(form => {
    const formId = form.dataset.formspree;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = form.querySelector('.submit-btn');
      btn.disabled = true;
      btn.textContent = 'Sending…';
      const errorEl = form.querySelector('.form-error');
      if (errorEl) errorEl.style.display = 'none';
      try {
        const res = await fetch(`https://formspree.io/f/${formId}`, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          form.classList.add('submitted');
          btn.textContent = 'Sent!';
          form.querySelectorAll('input, select, textarea, button').forEach(el => { el.disabled = true; });
        } else {
          btn.disabled = false;
          btn.textContent = 'Send Inquiry';
          if (errorEl) errorEl.style.display = 'block';
        }
      } catch {
        btn.disabled = false;
        btn.textContent = 'Send Inquiry';
        if (errorEl) errorEl.style.display = 'block';
      }
    });
  });

  // Hero entrance — adds .is-loaded so transitions fire.
  // Uses rAF for smooth start when tab is visible, plus a setTimeout fallback
  // because rAF is throttled in hidden/background tabs (leaves hero invisible).
  const revealHeroes = () => {
    document.querySelectorAll('.hero, .page-hero').forEach(el => el.classList.add('is-loaded'));
  };
  requestAnimationFrame(revealHeroes);
  setTimeout(revealHeroes, 80);
  // If the page was loaded with tab hidden, also reveal once it becomes visible.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) revealHeroes();
  });

  // Scroll-reveal via IntersectionObserver
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('[data-reveal]').forEach(el => {
      const delay = el.dataset.revealDelay;
      if (delay) el.style.setProperty('--reveal-delay', delay + 'ms');
      io.observe(el);
    });
  } else {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-revealed'));
  }

  // Animated stat counters — fire once when stats strip enters view
  const statNums = document.querySelectorAll('.stat-num[data-count]');
  if (statNums.length && 'IntersectionObserver' in window) {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const counterIO = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        counterIO.unobserve(entry.target);
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        if (prefersReduced) { el.textContent = target; return; }
        const duration = 1200;
        const start = performance.now();
        const tick = now => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(eased * target);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    statNums.forEach(el => counterIO.observe(el));
  }

  // Smooth scroll for in-page anchor links (respects reduced-motion via CSS)
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (href === '#' || href.length < 2) return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;
  e.preventDefault();
  const text = btn.dataset.copy || btn.textContent.trim();
  const done = () => {
    btn.classList.add('copied');
    if (!btn.querySelector('.copy-tip')) {
      const tip = document.createElement('span');
      tip.className = 'copy-tip';
      tip.textContent = 'Copied!';
      btn.appendChild(tip);
    }
    setTimeout(() => btn.classList.remove('copied'), 1400);
  };
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (err) {}
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fallback);
  } else {
    fallback();
  }
});
