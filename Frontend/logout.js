// Shared logout-confirmation handler.
// Pages with a header/sidebar embed `#logoutModal` markup and a `#logoutTrigger` (or any element
// with `data-logout-trigger`). This script wires both up consistently.

(function () {
    const modal = document.getElementById('logoutModal');
    if (!modal) return;

    const triggers = [document.getElementById('logoutTrigger')]
        .concat(Array.from(document.querySelectorAll('[data-logout-trigger]')))
        .filter(Boolean);
    const cancelBtn = document.getElementById('logoutCancel');
    const confirmBtn = document.getElementById('logoutConfirm');

    function open() {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    function close() {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    triggers.forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); open(); }));
    if (cancelBtn) cancelBtn.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
    });

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            try {
                // Clear mock data
                localStorage.removeItem('fs.session');
                sessionStorage.removeItem('fs.session');
                
                // Clear the new version's backend integration tokens and user info
                localStorage.removeItem('fs_token');
                sessionStorage.removeItem('fs_token');
                localStorage.removeItem('fs_user');
                sessionStorage.removeItem('fs_user');
            } catch (_) { /* ignore quota or privacy-mode errors */ }
            window.location.href = 's1-login.html';
        });
    }
})();