/* =========================================
   SCROLL TO TOP ON REFRESH
   Stop the browser from restoring the previous scroll position,
   so every reload starts at the hero.
   ========================================= */
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.addEventListener('load', () => window.scrollTo(0, 0));

/* =========================================
   DARK MODE
   ========================================= */
(function() {
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = stored === 'dark' || (!stored && prefersDark);
  document.documentElement.classList.add(isDark ? 'dark' : 'light');
})();

/* =========================================
   LANGUAGE (SR / EN)
   Serbian is the default content in the HTML. Each translatable element has a
   data-en attribute; the original Serbian (innerHTML) is captured once into
   data-sr so we can switch back. Choice is remembered in localStorage.
   ========================================= */
(function() {
  function applyLang(lang) {
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-en]').forEach(el => {
      if (el.getAttribute('data-sr') === null) el.setAttribute('data-sr', el.innerHTML);
      el.innerHTML = (lang === 'en') ? el.getAttribute('data-en') : el.getAttribute('data-sr');
    });

    document.querySelectorAll('[data-en-ph]').forEach(el => {
      if (el.getAttribute('data-sr-ph') === null) el.setAttribute('data-sr-ph', el.getAttribute('placeholder') || '');
      el.setAttribute('placeholder', (lang === 'en') ? el.getAttribute('data-en-ph') : el.getAttribute('data-sr-ph'));
    });

    const btn = document.getElementById('langToggle');
    if (btn) btn.textContent = (lang === 'en') ? 'SR' : 'EN';
  }

  // main.js is loaded at the end of <body>, so the DOM already exists here.
  const stored = localStorage.getItem('lang') || 'sr';
  applyLang(stored);

  const btn = document.getElementById('langToggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const next = (document.documentElement.lang === 'en') ? 'sr' : 'en';
      applyLang(next);
      localStorage.setItem('lang', next);
    });
  }
})();

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Dark mode toggle ---- */
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const html = document.documentElement;
      const goingDark = !html.classList.contains('dark');
      html.classList.toggle('dark', goingDark);
      html.classList.toggle('light', !goingDark);
      localStorage.setItem('theme', goingDark ? 'dark' : 'light');
    });
  }

  /* ---- Hero photo slide-up (2x speed = 500ms) ---- */
  requestAnimationFrame(() => {
    const photo = document.getElementById('heroPhoto');
    if (photo) photo.classList.add('is-visible');
  });

  /* ---- Nav border on scroll ---- */
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  /* ---- Skill bar fill on scroll into view ---- */
  const fills = document.querySelectorAll('.skill__fill');
  if (fills.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.width = e.target.dataset.pct;
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    fills.forEach(el => io.observe(el));
  }

  /* ---- Mobile card fade-up on scroll-into-view ----
     CSS only applies the fade+slide on (max-width: 768px), so on desktop
     adding `is-in-view` is a no-op visually. Fallback: if IntersectionObserver
     isn't available, reveal immediately so cards aren't permanently hidden. */
  const stepCards = document.querySelectorAll('.step-card');
  if (stepCards.length) {
    if ('IntersectionObserver' in window) {
      const cardIO = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in-view');
            cardIO.unobserve(e.target);
          }
        });
      }, { threshold: 0.15 });
      stepCards.forEach(c => cardIO.observe(c));
    } else {
      stepCards.forEach(c => c.classList.add('is-in-view'));
    }
  }

  /* ---- Projects modal — open/close with click, backdrop, Escape ---- */
  const projectsModal = document.getElementById('projectsModal');
  const openProjectsBtn = document.getElementById('openProjectsModal');
  if (projectsModal && openProjectsBtn) {
    const openModal = (e) => {
      if (e) e.preventDefault();
      projectsModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
    };
    const closeModal = () => {
      projectsModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      openProjectsBtn.focus();
    };

    openProjectsBtn.addEventListener('click', openModal);

    // Close on X button or backdrop click
    projectsModal.querySelectorAll('[data-modal-close]').forEach(el => {
      el.addEventListener('click', closeModal);
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && projectsModal.getAttribute('aria-hidden') === 'false') {
        closeModal();
      }
    });
  }

  /* ---- Web3Forms submission for both forms ---- */
  const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

  // Serbian native-validation messages on required fields
  function localizeValidation(formEl) {
    formEl.querySelectorAll('[required]').forEach(field => {
      field.addEventListener('invalid', () => {
        if (field.validity.valueMissing) {
          field.setCustomValidity('Molimo popunite ovo polje.');
        } else if (field.validity.typeMismatch) {
          field.setCustomValidity('Unesite ispravnu email adresu.');
        } else {
          field.setCustomValidity('');
        }
      });
      field.addEventListener('input', () => field.setCustomValidity(''));
    });
  }

  function showFormError(formEl, msg) {
    let errEl = formEl.querySelector('.form-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'form-error';
      formEl.appendChild(errEl);
    }
    errEl.textContent = msg;
  }

  // The submit event only fires when native validation passes, so inside
  // the handler the required fields are guaranteed filled.
  function wireWeb3Form(formEl, successEl, sendingLabel) {
    if (!formEl || !successEl) return;
    localizeValidation(formEl);

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = formEl.querySelector('[type="submit"]');
      const btnLabel = btn ? btn.textContent : '';

      // Client-side file-size check (Web3Forms free tier caps attachments ~5MB).
      // Warn before we even try to send, so the user gets a clear message instead
      // of a slow "mistake occurred".
      const MAX_BYTES = 4 * 1024 * 1024; // 4 MB total
      let totalBytes = 0;
      formEl.querySelectorAll('input[type="file"]').forEach(input => {
        for (const f of input.files) totalBytes += f.size;
      });
      const enMode = () => document.documentElement.lang === 'en';

      if (totalBytes > MAX_BYTES) {
        showFormError(formEl, enMode()
          ? 'Your files are too big (over 4 MB total). Please send them via WhatsApp or email: danyswebcraft@gmail.com.'
          : 'Fajlovi su preveliki (preko 4 MB ukupno). Pošaljite ih direktno na WhatsApp ili email: danyswebcraft@gmail.com.');
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = sendingLabel; }

      // Never let the request hang forever — abort after 90s
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      try {
        const res = await fetch(WEB3FORMS_ENDPOINT, {
          method: 'POST',
          body: new FormData(formEl),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (data.success) {
          formEl.style.display = 'none';
          successEl.classList.add('is-visible');
          successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Surface the real Web3Forms message so we can see WHY it failed
          throw new Error(data.message || 'unknown');
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
        console.error('[Web3Forms]', err);

        const aborted = err && err.name === 'AbortError';
        const detail = (!aborted && err && err.message && err.message !== 'unknown')
          ? ' (' + err.message + ')' : '';

        let msg;
        if (aborted) {
          msg = enMode()
            ? 'The submission took too long (likely too-large files). Try without attachments or email danyswebcraft@gmail.com.'
            : 'Slanje je predugo trajalo (verovatno preveliki fajlovi). Pokušajte bez priloga ili pišite na danyswebcraft@gmail.com.';
        } else {
          msg = enMode()
            ? 'An error occurred while sending. Try again or email danyswebcraft@gmail.com.' + detail
            : 'Došlo je do greške pri slanju. Pokušajte ponovo ili pišite na danyswebcraft@gmail.com.' + detail;
        }

        showFormError(formEl, msg);
      }
    });
  }

  wireWeb3Form(document.getElementById('contactForm'), document.getElementById('formSuccess'), 'Šaljem…');
  wireWeb3Form(document.getElementById('intakeForm'),  document.getElementById('intakeSuccess'), 'Šaljem…');

});

/* =========================================
   STEPS STACKING ANIMATION
   Drives the scale-down per card as the user
   scrolls through the stack section.
   ========================================= */
(function() {
  const SCALE_STEP = 0.03;

  const stack = document.getElementById('stepStack');
  if (!stack) return;
  const cards = stack.querySelectorAll('.step-card');
  if (!cards.length) return;
  const N = cards.length;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let ticking = false;

  function update() {
    ticking = false;

    const rect  = stack.getBoundingClientRect();
    const vh    = window.innerHeight;
    const range = rect.height - vh;
    const progress = range > 0 ? clamp(-rect.top / range, 0, 1) : 0;

    cards.forEach((card, i) => {
      const targetScale  = 1 - (N - 1 - i) * SCALE_STEP;
      const startProg    = i / N;
      const denom        = 1 - startProg;
      const t = denom > 0 ? clamp((progress - startProg) / denom, 0, 1) : 0;
      const scale = 1 + (targetScale - 1) * t;
      card.style.transform = 'scale(' + scale.toFixed(4) + ')';
    });
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  window.addEventListener('resize', update);
  update();
})();
