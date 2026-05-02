/* ========================================================
   S25 - Remove Activity from Favorites (Donee)
   ======================================================== */

// --- 1. Database setup with already favorited items ---
let favoriteActivities = [
    { id: 1, title: 'Rebuild Hope Elementary', category: 'Education', raised: 15000, goal: 50000, img: '📚' },
    { id: 3, title: 'Flood Relief Initiative', category: 'Disaster Relief', raised: 32000, goal: 40000, img: '🌊' },
    { id: 8, title: 'Free Wheelchair Provision', category: 'Medical', raised: 1500, goal: 3000, img: '♿' },
    { id: 99, title: 'Network Drop Simulation', category: 'System Test', raised: 0, goal: 100, img: '🔌' }, 
    { id: 404, title: 'Violating Campaign (Deleted)', category: 'System Test', raised: 999, goal: 1000, img: '🗑️' } 
];

const favoritesGrid = document.getElementById('favoritesGrid');
const emptyFavoritesMsg = document.getElementById('emptyFavoritesMsg');
const navFavCount = document.getElementById('navFavCount');
const removeSuccessToast = document.getElementById('removeSuccessToast');
const networkErrorToast = document.getElementById('networkErrorToast');
const deletedModal = document.getElementById('deletedModal');

let cardPendingDeletionId = null;

// --- 2. Render Cards Core Engine ---
function renderFavorites() {
    favoritesGrid.innerHTML = '';
    navFavCount.textContent = favoriteActivities.length;

    if (favoriteActivities.length === 0) {
        emptyFavoritesMsg.classList.remove('hidden');
        return;
    }

    favoriteActivities.forEach(act => {
        const card = `
            <div id="favCard_${act.id}" class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full relative cursor-pointer">
                
                <button class="absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur rounded-full shadow-sm hover:bg-rose-100 hover:scale-110 transition z-10" 
                        onclick="initiateRemoval(${act.id}, event)" aria-label="Remove from Favorites">
                    <svg id="heartSvg_${act.id}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" class="w-6 h-6 text-rose-500 drop-shadow-sm transition-colors duration-200"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </button>

                <div class="h-32 bg-slate-50 flex items-center justify-center text-4xl border-b border-slate-100">${act.img}</div>
                <div class="p-5 flex flex-col flex-grow">
                    <span class="bg-emerald-50 text-emerald-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded w-max mb-2">${act.category}</span>
                    <h3 class="text-base font-bold text-slate-900 leading-tight">${act.title}</h3>
                </div>
            </div>
        `;
        favoritesGrid.insertAdjacentHTML('beforeend', card);
    });
}

// --- 3. Removal Action Logic ---
function initiateRemoval(id, e) {
    e.stopPropagation(); 

    const heartSvg = document.getElementById(`heartSvg_${id}`);
    const cardEl = document.getElementById(`favCard_${id}`);

    // Optimistic Heart hollow out to give instant feedback
    heartSvg.setAttribute('fill', 'none');
    heartSvg.classList.replace('text-rose-500', 'text-slate-400');
    
    setTimeout(() => {
        // Alternative Flow 1: Network Error
        if (id === 99) {
            heartSvg.setAttribute('fill', 'currentColor');
            heartSvg.classList.replace('text-slate-400', 'text-rose-500');
            networkErrorToast.classList.remove('hidden');
            setTimeout(() => networkErrorToast.classList.add('hidden'), 3500);
            return;
        }

        // Alternative Flow 2: Activity Deleted by Admin
        if (id === 404) {
            cardPendingDeletionId = id; 
            deletedModal.classList.remove('hidden');
            return;
        }

        // Normal Flow Success: Dynamically animates and removes the card
        cardEl.classList.add('fade-out-shrink'); 

        setTimeout(() => {
            favoriteActivities = favoriteActivities.filter(a => a.id !== id);
            renderFavorites();
            removeSuccessToast.classList.remove('hidden');
            setTimeout(() => removeSuccessToast.classList.add('hidden'), 3000);
        }, 400); 

    }, 600); 
}

// Alternative Flow 2 logic support
function dismissDeletedModal() {
    deletedModal.classList.add('hidden');
    if (cardPendingDeletionId) {
        const cardEl = document.getElementById(`favCard_${cardPendingDeletionId}`);
        if(cardEl) cardEl.classList.add('hidden');
        favoriteActivities = favoriteActivities.filter(a => a.id !== cardPendingDeletionId);
        renderFavorites();
        cardPendingDeletionId = null;
    }
}

// Initialize! (This line must match the function exactly)
renderFavorites();