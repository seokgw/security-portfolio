const toggle = document.querySelector('.detail-toggle');
const detail = document.getElementById('auth-detail');

toggle.addEventListener('click', () => {
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!expanded));
  detail.hidden = expanded;
  toggle.firstChild.textContent = expanded ? '자세히 보기 ' : '접기 ';
  toggle.querySelector('span').textContent = expanded ? '＋' : '−';
});

// Manual galleries: no automatic motion, and every project's state stays independent.
document.querySelectorAll('.project-gallery').forEach(gallery => {
  const slides = [...gallery.querySelectorAll('.project-slide')];
  const count = gallery.querySelector('.gallery-count');
  let current = 0;
  function move(direction) {
    slides[current].hidden = true;
    current = (current + direction + slides.length) % slides.length;
    slides[current].hidden = false;
    count.textContent = `${current + 1} / ${slides.length}`;
  }
  gallery.querySelectorAll('[data-slide]').forEach(button => {
    button.addEventListener('click', () => move(Number(button.dataset.slide)));
  });
  gallery.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
});
