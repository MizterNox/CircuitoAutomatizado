(() => {
  'use strict';

  const slides = Array.from(document.querySelectorAll('.slide'));
  const dots = Array.from(document.querySelectorAll('.slide-dot'));
  const previousButton = document.querySelector('.nav-button.previous');
  const nextButton = document.querySelector('.nav-button.next');
  const fullscreenButton = document.getElementById('fullscreen-toggle');
  const appShell = document.querySelector('.app-shell');
  const currentSlideLabel = document.getElementById('current-slide');
  const progressBar = document.querySelector('.progress-track');
  const progressFill = document.querySelector('.progress-fill');
  let currentIndex = 0;
  let fallbackFullscreen = false;
  const signalDisplay = document.getElementById('signal-display');
  const signalStatus = document.getElementById('signal-status');
  const simulateButton = document.getElementById('simulate-access');

  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

  function updateFullscreenButton() {
    if (!fullscreenButton) return;
    const isFullscreen = document.fullscreenElement === appShell || fallbackFullscreen;
    fullscreenButton.setAttribute('aria-pressed', String(isFullscreen));
    fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Salir de pantalla completa' : 'Activar pantalla completa');
    const label = fullscreenButton.querySelector('b');
    if (label) label.textContent = isFullscreen ? 'Salir' : 'Pantalla completa';
  }

  function enterFallbackFullscreen() {
    fallbackFullscreen = true;
    appShell?.classList.add('fullscreen-fallback');
    document.body.classList.add('fullscreen-fallback-active');
    updateFullscreenButton();
  }

  function leaveFallbackFullscreen() {
    fallbackFullscreen = false;
    appShell?.classList.remove('fullscreen-fallback');
    document.body.classList.remove('fullscreen-fallback-active');
    updateFullscreenButton();
  }

  async function toggleFullscreen() {
    if (fallbackFullscreen) {
      leaveFallbackFullscreen();
      return;
    }
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (appShell?.requestFullscreen) {
        await appShell.requestFullscreen();
      } else {
        enterFallbackFullscreen();
      }
    } catch (error) {
      // Algunos previews embebidos bloquean Fullscreen API; se usa modo expandido local como respaldo.
      enterFallbackFullscreen();
      console.info('Se activó el modo de pantalla completa compatible con el preview.', error);
    }
  }

  async function simulateAccess() {
    if (!signalDisplay || !simulateButton || simulateButton.disabled) return;
    simulateButton.disabled = true;
    simulateButton.querySelector('span:last-child').textContent = 'VEHÍCULO DETECTADO';
    signalDisplay.dataset.state = 'blink';
    signalDisplay.querySelector('.lamp-red').classList.remove('is-lit');
    signalDisplay.querySelector('.lamp-green').classList.add('is-lit');

    for (let blink = 1; blink <= 3; blink += 1) {
      signalStatus.firstChild.textContent = `AVANCE · ${blink}/3 `;
      await wait(350);
      signalDisplay.querySelector('.lamp-green').classList.add('blink-off');
      await wait(350);
      signalDisplay.querySelector('.lamp-green').classList.remove('blink-off');
    }

    signalDisplay.dataset.state = 'green';
    signalStatus.firstChild.textContent = 'PUEDE AVANZAR ';
    simulateButton.querySelector('span:last-child').textContent = 'PASO HABILITADO · 3 S';
    await wait(3000);

    signalDisplay.dataset.state = 'red';
    signalDisplay.querySelector('.lamp-green').classList.remove('is-lit', 'blink-off');
    signalDisplay.querySelector('.lamp-red').classList.add('is-lit');
    signalStatus.firstChild.textContent = 'DETENERSE ';
    simulateButton.querySelector('span:last-child').textContent = 'SIMULAR INGRESO';
    simulateButton.disabled = false;
  }

  function showSlide(index) {
    currentIndex = Math.max(0, Math.min(index, slides.length - 1));

    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === currentIndex;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
      if (!isActive) {
        slide.querySelectorAll('video').forEach((video) => video.pause());
      }
    });

    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === currentIndex;
      dot.classList.toggle('active', isActive);
      if (isActive) {
        dot.setAttribute('aria-current', 'step');
      } else {
        dot.removeAttribute('aria-current');
      }
    });

    const displayedNumber = String(currentIndex + 1).padStart(2, '0');
    currentSlideLabel.textContent = displayedNumber;
    progressFill.style.width = `${((currentIndex + 1) / slides.length) * 100}%`;
    progressBar.setAttribute('aria-valuenow', String(currentIndex + 1));
    previousButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === slides.length - 1;
    document.title = `${String(currentIndex + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')} · Control de Acceso Vehicular`;
  }

  simulateButton?.addEventListener('click', simulateAccess);
  fullscreenButton?.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreenButton);

  previousButton.addEventListener('click', () => showSlide(currentIndex - 1));
  nextButton.addEventListener('click', () => showSlide(currentIndex + 1));
  dots.forEach((dot) => {
    dot.addEventListener('click', () => showSlide(Number(dot.dataset.slide)));
  });

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const isTyping = target instanceof HTMLElement && (
      target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'VIDEO', 'AUDIO'].includes(target.tagName)
    );
    if (isTyping || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape' && fallbackFullscreen) {
      leaveFallbackFullscreen();
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      showSlide(currentIndex + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      showSlide(currentIndex - 1);
    } else if (event.key === 'Home') {
      showSlide(0);
    } else if (event.key === 'End') {
      showSlide(slides.length - 1);
    }
  });

  // Soporte táctil: deslizar horizontalmente para avanzar o retroceder.
  let touchStartX = null;
  const presentation = document.querySelector('.presentation');
  presentation.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });
  presentation.addEventListener('touchend', (event) => {
    if (touchStartX === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 65) showSlide(currentIndex + (deltaX < 0 ? 1 : -1));
    touchStartX = null;
  }, { passive: true });

  showSlide(0);
})();
