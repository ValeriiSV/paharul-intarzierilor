(() => {
  const enterLocal = () => {
    document.body.classList.remove('auth-pending');
    document.body.classList.add('auth-signed-in');

    const name = document.querySelector('#authName');
    const email = document.querySelector('#authEmail');
    const avatar = document.querySelector('#authAvatar');
    const logout = document.querySelector('#logoutButton');

    if (name) name.textContent = 'Mod local';
    if (email) email.textContent = 'date pe acest dispozitiv';
    if (avatar) {
      avatar.src = './assets/icon.svg';
      avatar.alt = 'Halba întârzierilor';
    }
    if (logout) logout.hidden = true;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enterLocal, { once: true });
  } else {
    enterLocal();
  }
})();
