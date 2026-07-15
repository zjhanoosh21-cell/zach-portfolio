(function () {
  const pills = document.querySelectorAll('.gallery-pill');
  const sections = document.querySelectorAll('.gallery-section');
  const allItems = Array.from(document.querySelectorAll('.gallery-item'));
  const NAV_OFFSET = 80 + 57; // main nav + category nav height

  // Pill click → smooth scroll to section
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const target = document.getElementById(pill.dataset.target);
      if (!target) return;
      const y = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET - 16;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  // Scroll spy — highlight active pill as sections enter view
  function updateActivePill() {
    let active = null;
    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= NAV_OFFSET + 40) active = section;
    });
    pills.forEach(pill => {
      pill.classList.toggle('active', active ? pill.dataset.target === active.id : false);
    });
  }

  window.addEventListener('scroll', updateActivePill, { passive: true });
  updateActivePill();

  // Lightbox — navigates across all items in the full gallery
  const lightbox = document.querySelector('.lightbox');
  const lightboxImg = lightbox?.querySelector('img');
  const lightboxCap = document.querySelector('.lightbox-caption');
  const closeBtn = document.querySelector('.lightbox-close');
  const prevBtn = document.querySelector('.lightbox-prev');
  const nextBtn = document.querySelector('.lightbox-next');

  let currentIdx = -1;

  function openLightbox(idx) {
    const item = allItems[idx];
    if (!item || !lightbox) return;
    const img = item.querySelector('img');
    if (!img) return;
    currentIdx = idx;
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    if (lightboxCap) lightboxCap.textContent = item.querySelector('.caption')?.textContent || '';
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox?.classList.remove('open');
    document.body.style.overflow = '';
    currentIdx = -1;
  }

  function step(delta) {
    const next = (currentIdx + delta + allItems.length) % allItems.length;
    openLightbox(next);
  }

  allItems.forEach((item, idx) => {
    item.addEventListener('click', () => openLightbox(idx));
  });

  closeBtn?.addEventListener('click', closeLightbox);
  prevBtn?.addEventListener('click', e => { e.stopPropagation(); step(-1); });
  nextBtn?.addEventListener('click', e => { e.stopPropagation(); step(1); });
  lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

  document.addEventListener('keydown', e => {
    if (!lightbox?.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });
})();
