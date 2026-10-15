const toggle = document.querySelector('.detail-toggle');
const detail = document.getElementById('auth-detail');

toggle.addEventListener('click', () => {
  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!expanded));
  detail.hidden = expanded;
  toggle.firstChild.textContent = expanded ? '자세히 보기 ' : '접기 ';
  toggle.querySelector('span').textContent = expanded ? '＋' : '−';
});
