// US #6 — User edits their own profile (Donee/Fundraiser self-edit).
// Resolves the target user from ?userId or the active session, pre-fills the form, and on save
// mutates usersData (rebuilding `username` from first/last) before redirecting to s3.

const params = new URLSearchParams(window.location.search);
const explicitId = parseInt(params.get('userId'), 10);

const session = window.FS.getSession();
const targetId = explicitId || (session && session.userId);

const errorBox = document.getElementById('errorBox');
const successBox = document.getElementById('successBox');
const photoTile = document.getElementById('photoTile');
const navAvatar = document.getElementById('logoutTrigger');
const cancelLink = document.getElementById('cancelLink');
const crumbProfile = document.getElementById('crumbProfile');

const inputs = {
    firstName: document.getElementById('firstName'),
    lastName: document.getElementById('lastName'),
    email: document.getElementById('email'),
    phone: document.getElementById('phone'),
    dob: document.getElementById('dob'),
    location: document.getElementById('location'),
    bio: document.getElementById('bio')
};
const saveBtn = document.getElementById('saveBtn');
const form = document.getElementById('editForm');

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideError() { errorBox.classList.add('hidden'); }

let user = targetId ? window.FS.findUserById(targetId) : null;

if (!user) {
    showError('No user selected. Sign in or open this page from your profile.');
    Object.values(inputs).forEach(i => { i.disabled = true; });
    saveBtn.disabled = true;
    saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
} else {
    // Pre-fill form
    inputs.firstName.value = user.first_name || (user.username || '').split(/\s+/)[0] || '';
    inputs.lastName.value  = user.last_name  || (user.username || '').split(/\s+/).slice(1).join(' ') || '';
    inputs.email.value     = user.email || '';
    inputs.phone.value     = user.phone || '';
    inputs.dob.value       = user.date_of_birth || '';
    inputs.location.value  = user.location || '';
    inputs.bio.value       = user.bio || '';

    photoTile.textContent = window.FS.initials(user.username);
    navAvatar.textContent = window.FS.initials(user.username);
    cancelLink.href = `s3-view-profile.html?userId=${user.user_id}`;
    crumbProfile.href = cancelLink.href;
}

// Photo controls — placeholder (no real upload in the demo)
document.getElementById('uploadBtn').addEventListener('click', () => {
    showError('Photo upload is not wired in this demo.');
});
document.getElementById('removeBtn').addEventListener('click', () => {
    photoTile.textContent = '?';
    hideError();
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    hideError();
    if (!user) return;

    const first = inputs.firstName.value.trim();
    const last = inputs.lastName.value.trim();
    const email = inputs.email.value.trim();
    const bio = inputs.bio.value.trim();

    if (!first || !last || !email) {
        showError('First name, last name, and email are required.');
        return;
    }
    if (!email.includes('@')) {
        showError('Enter a valid email address.');
        return;
    }
    const taken = usersData.some(u => u.email.toLowerCase() === email.toLowerCase() && u.user_id !== user.user_id);
    if (taken) {
        showError('That email is already in use by another account.');
        return;
    }
    if (bio.length > 280) {
        showError('Bio must be 280 characters or fewer.');
        return;
    }

    user.first_name = first;
    user.last_name = last;
    user.username = `${first} ${last}`;
    user.email = email;
    user.phone = inputs.phone.value.trim();
    user.date_of_birth = inputs.dob.value || '';
    user.location = inputs.location.value.trim();
    user.bio = bio;

    successBox.classList.remove('hidden');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saved';
    setTimeout(() => {
        window.location.href = `s3-view-profile.html?userId=${user.user_id}`;
    }, 900);
});
