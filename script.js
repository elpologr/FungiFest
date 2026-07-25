// FungiFest Morelia — comportamiento base

document.addEventListener('DOMContentLoaded', () => {

  // --- Navegación con desplazamiento suave ---
  const navButtons = document.querySelectorAll('.nav-btn');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // --- Respaldo visual si aún no se coloca la imagen de banner ---
  const bannerImg = document.getElementById('banner-img');
  const banner = bannerImg ? bannerImg.closest('.banner') : null;

  if (bannerImg && banner) {
    bannerImg.addEventListener('error', () => {
      bannerImg.classList.add('is-broken');
      banner.classList.add('show-fallback');
    });
  }

  // --- Respaldo simple si falta la imagen de perfil ---
  const profileImg = document.getElementById('profile-img');
  if (profileImg) {
    profileImg.addEventListener('error', () => {
      profileImg.style.display = 'none';
    });
  }

});
