/**
 * Inscription — formulaire multi-étapes
 */
(function initRegisterWizard() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  const panels = [...form.querySelectorAll('.register-panel')];
  const progressSteps = [...document.querySelectorAll('.register-progress-step')];
  const btnPrev = document.getElementById('registerPrev');
  const btnNext = document.getElementById('registerNext');
  const btnSubmit = document.getElementById('registerSubmit');
  const hint = document.getElementById('registerStepHint');
  const note = document.getElementById('registerNote');

  const hints = [
    typeof t === 'function' ? t('register.step1.hint') : 'Vos coordonnées professionnelles.',
    typeof t === 'function' ? t('register.step2.hint') : 'Informations légales de votre société.',
    typeof t === 'function' ? t('register.step3.hint') : 'Choisissez un mot de passe sécurisé.'
  ];

  let step = 0;

  function showStep(idx) {
    step = idx;
    panels.forEach((p, i) => p.classList.toggle('is-active', i === idx));
    progressSteps.forEach((s, i) => {
      s.classList.toggle('is-active', i === idx);
      s.classList.toggle('is-done', i < idx);
    });
    if (hint) hint.textContent = hints[idx] || '';
    if (btnPrev) btnPrev.hidden = idx === 0;
    if (btnNext) btnNext.hidden = idx === panels.length - 1;
    if (btnSubmit) btnSubmit.hidden = idx !== panels.length - 1;
    if (note) note.textContent = '';
  }

  function validateStep(idx) {
    const panel = panels[idx];
    if (!panel) return true;
    const fields = [...panel.querySelectorAll('input[required]')];
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        field.focus();
        return false;
      }
    }
    return true;
  }

  btnPrev?.addEventListener('click', () => {
    if (step > 0) showStep(step - 1);
  });

  btnNext?.addEventListener('click', () => {
    if (!validateStep(step)) return;
    if (step < panels.length - 1) showStep(step + 1);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    const fd = new FormData(form);
    if (fd.get('password') !== fd.get('passwordConfirm')) {
      if (typeof showAlert === 'function') {
        showAlert(note, typeof t === 'function' ? t('register.password.mismatch') : 'Les mots de passe ne correspondent pas.');
      }
      showStep(2);
      return;
    }

    if (!isConfigured()) {
      if (typeof showAlert === 'function') showAlert(note, configErrorMessage());
      return;
    }

    if (btnSubmit) btnSubmit.disabled = true;

    try {
      const { user } = await signUp({
        email: fd.get('email'),
        password: fd.get('password'),
        fullName: fd.get('fullName'),
        phone: fd.get('phone'),
        company: fd.get('company'),
        address: fd.get('address'),
        siren: fd.get('siren'),
        vatNumber: fd.get('vatNumber')
      });

      const successMsg = typeof t === 'function'
        ? t('register.success')
        : 'Compte créé ! Vérifiez votre e-mail. HB Commerce validera votre profil professionnel.';

      if (user && !user.confirmed_at) {
        if (typeof showAlert === 'function') showAlert(note, successMsg, 'success');
        form.reset();
        showStep(0);
      } else {
        window.location.href = 'compte.html';
      }
    } catch (err) {
      if (typeof showAlert === 'function') showAlert(note, mapAuthError(err));
    } finally {
      if (btnSubmit) btnSubmit.disabled = false;
    }
  });

  showStep(0);
})();
