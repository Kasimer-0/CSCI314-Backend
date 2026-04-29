// ====== DOM Elements ======
const regName = document.getElementById('regName');
const regEmail = document.getElementById('regEmail');
const regPassword = document.getElementById('regPassword');
const regRole = document.getElementById('regRole');
const privacyCheck = document.getElementById('privacyCheck');

const registerBtn = document.getElementById('registerBtn');
const errorBox = document.getElementById('errorBox');
const errorText = document.getElementById('errorText');

// Modal Elements (Sub-Flow 1)
const termsModal = document.getElementById('termsModal');
const openTermsBtn = document.getElementById('openTermsBtn');
const closeTermsBtn = document.getElementById('closeTermsBtn');
const acceptTermsBtn = document.getElementById('acceptTermsBtn');

// Success & Encryption State
const encryptionOverlay = document.getElementById('encryptionOverlay');
const toastSuccess = document.getElementById('toastSuccess');
const toastSubtext = document.getElementById('toastSubtext');

// ====== Utility Functions ======
function showError(message) {
    errorText.textContent = message;
    errorBox.classList.remove('hidden');
    // Apply a slight shake effect
    errorBox.classList.add('animate-pulse');
    setTimeout(() => errorBox.classList.remove('animate-pulse'), 500);
}

function hideError() {
    errorBox.classList.add('hidden');
}


// ====== Privacy Terms Logic (Sub-Flow 1 & 2) ======
openTermsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    termsModal.classList.remove('hidden');
});

closeTermsBtn.addEventListener('click', () => {
    termsModal.classList.add('hidden');
});

// If user clicks "Agree" inside the modal, auto-check the box and close.
acceptTermsBtn.addEventListener('click', () => {
    privacyCheck.checked = true;
    termsModal.classList.add('hidden');
    hideError();
});


// ====== Registration Logic (Normal & Alternative Flows) ======
registerBtn.addEventListener('click', () => {
    hideError();

    const name = regName.value.trim();
    const email = regEmail.value.trim();
    const password = regPassword.value.trim();
    
    // Alternative Flow 2: Missing or invalid info
    if (!name || !email || !password) {
        showError("Missing Information: Please fill out all required basic info and password.");
        return;
    }

    // Checking email validity (basic)
    if (!email.includes('@')) {
        showError("Invalid Email: Please enter a valid email format.");
        return;
    }

    // Form logic: Check if email already registered (mock check using data.js)
    if (typeof usersData !== 'undefined') {
        const emailTaken = usersData.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (emailTaken) {
            showError("Error: That email address has already been registered.");
            return;
        }
    }

    // Alternative Flow 1: Did not agree to privacy terms
    if (!privacyCheck.checked) {
        showError("Agreement Required: You must accept the Privacy Terms to register.");
        return;
    }

    // ====== Normal Flow 5: Validates, encrypts, and creates ======
    // Simulate system engaging in encryption to show the user
    encryptionOverlay.classList.remove('hidden');

    setTimeout(() => {
        // Assume failure condition (Alternative Flow 3) 
        // Example: if system threw error, we would hide overlay and showError("Encryption failed.")
        // But for our happy path, encryption succeeds.
        
        encryptionOverlay.classList.add('hidden');

        // Post-Condition 2 & 3 Met. Add to mock database (for preview purposes)
        if (typeof usersData !== 'undefined') {
            const newId = usersData.length > 0 ? usersData[usersData.length-1].user_id + 1 : 1;
            usersData.push({
                user_id: newId,
                username: name,
                email: email,
                role_name: regRole.value,
                status: 'Pending' // Standard behavior for new account
            });
        }

        // Normal Flow 6: Displays success message
        toastSubtext.textContent = `Welcome ${name}! Your sensitive data was encrypted.`;
        toastSuccess.classList.remove('hidden');

        // Reset form for demo
        regName.value = '';
        regEmail.value = '';
        regPassword.value = '';
        privacyCheck.checked = false;

        // Auto hide success toast after 4s
        setTimeout(() => toastSuccess.classList.add('hidden'), 4000);

    }, 2000); // 2 second mock delay for "Encryption Processing"
});