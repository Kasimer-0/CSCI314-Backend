/* ========================================================
   S24 - Save Activity to Favorites (Donee)
   ======================================================== */

// --- 1. Mock DB with Saving State & Sync Logic ---
// We add 'isFavorited' and 'anonSaves' to manage state globally (Sub-Flow 1a requires synchronization)
const activitiesDB = [
    { id: 1, title: 'Rebuild Hope Elementary', category: 'Education', desc: 'Help rebuild the primary school.', raised: 15000, goal: 50000, img: '📚', isFavorited: false, anonSaves: 142 },
    { id: 2, title: 'Cancer Treatment Fund', category: 'Medical', desc: 'Crucial chemo funds.', raised: 18000, goal: 20000, img: '🏥', isFavorited: false, anonSaves: 399 },
    { id: 3, title: 'Flood Relief Initiative', category: 'Disaster Relief', desc: 'Emergency food & water delivery.', raised: 32000, goal: 40000, img: '🌊', isFavorited: true, anonSaves: 502 }, // Already favorited test
    // ⚠️ Dedicated Error Trigger Cards (For demonstration of Alternative Flows)
    { id: 98, title: 'Session Timeout Trap (Testing)', category: 'System', desc: 'Clicking heart triggers Session Expired popup.', raised: 0, goal: 100, img: '⏱️', isFavorited: false, anonSaves: 0 },
    { id: 99, title: 'Network Drop Test (Testing)', category: 'System', desc: 'Clicking heart triggers Network rejection and revert.', raised: 0, goal: 100, img: '🔌', isFavorited: false, anonSaves: 0 }
];

let globalFavCount = 1; // ID 3 is favorited originally
document.getElementById('favCount').textContent = globalFavCount;

const activitiesGrid = document.getElementById('activitiesGrid');
const privacySuccessToast = document.getElementById('privacySuccessToast');
const sessionModal = document.getElementById('sessionModal');
const networkErrorToast = document.getElementById('networkErrorToast');

// Detail Modal Elements
const detailModal = document.getElementById('detailModal');
const detailModalPane = document.getElementById('detailModalPane');
const modalHeartBtn = document.getElementById('modalHeartBtn');
let currentOpenDetailId = null;


// --- 2. Render Cards (Normal Flow 1 & 2) ---
function renderActivities() {
    activitiesGrid.innerHTML = '';
    
    activitiesDB.forEach(act => {
        const progressRaw = (act.raised / act.goal) * 100;
        const progress = progressRaw > 100 ? 100 : progressRaw.toFixed(1);

        // Heart UI Logic: Empty vs Filled
        const heartSvgParams = act.isFavorited 
            ? 'fill="currentColor" stroke="currentColor" class="w-6 h-6 text-rose-500 transition-colors drop-shadow-sm"' 
            : 'fill="none" stroke="currentColor" class="w-6 h-6 text-slate-400 group-hover:text-rose-400 transition-colors"';

        const card = `
            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition duration-300 flex flex-col h-full relative cursor-pointer" onclick="openDetailModal(${act.id}, event)">
                
                <!-- Normal Flow 2: The Heart Icon -->
                <button class="heart-trigger absolute top-3 right-3 p-2.5 bg-white/90 backdrop-blur rounded-full shadow-sm hover:bg-rose-50 hover:scale-110 transition z-10 group" 
                        data-id="${act.id}" aria-label="Save to Favorites">
                    <svg viewBox="0 0 24 24" ${heartSvgParams}><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </button>

                <div class="h-32 bg-slate-50 flex items-center justify-center text-4xl border-b border-slate-100">${act.img}</div>
                <div class="p-5 flex flex-col flex-grow">
                    <span class="bg-emerald-50 text-emerald-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded w-max mb-2">${act.category}</span>
                    <h3 class="text-base font-bold text-slate-900 mb-1 leading-tight">${act.title}</h3>
                    
                    <div class="mt-auto pt-4">
                        <div class="w-full bg-slate-100 rounded-full h-1.5">
                            <div class="bg-emerald-500 h-1.5 rounded-full" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        activitiesGrid.insertAdjacentHTML('beforeend', card);
    });

    // Attach listeners to freshly rendered hearts
    document.querySelectorAll('.heart-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent opening the detail modal
            const id = parseInt(btn.getAttribute('data-id'));
            toggleFavoriteAction(id);
        });
    });
}


// --- 3. Core Logic: Toggle Favorite (Normal & Alternative Flows) ---
function toggleFavoriteAction(id) {
    const act = activitiesDB.find(a => a.id === id);
    if (!act) return;

    const isLiking = !act.isFavorited; // Are we saving it, or removing it?

    // Normal Flow 5 (Optimistic UI Update): Instantly update visual state to provide confirmation
    act.isFavorited = isLiking; 
    syncUIGlobally(id); 

    // Normal Flow 3: Execute secure database operation (Simulating delay via setTimeout)
    setTimeout(() => {
        
        // --- Alternative Flow 1: Session Expired ---
        if (id === 98) {
            revertFavoriteState(act); // Undo optimistic update
            sessionModal.classList.remove('hidden');
            return;
        }

        // --- Alternative Flow 2: Network / Database Failure ---
        if (id === 99) {
            revertFavoriteState(act);
            networkErrorToast.classList.remove('hidden');
            setTimeout(() => networkErrorToast.classList.add('hidden'), 3500);
            return;
        }

        // --- Normal Flow Success ---
        // Normal Flow 4 / Post Condition 2: Privacy Validated & Counts Updated
        if (isLiking) {
            act.anonSaves += 1;
            globalFavCount++;
            
            // Show specifically tailored privacy success toast
            privacySuccessToast.classList.remove('hidden');
            setTimeout(() => privacySuccessToast.classList.add('hidden'), 3000);
        } else {
            act.anonSaves -= 1;
            globalFavCount--;
        }
        
        // Update the header count and modal anon count if open
        document.getElementById('favCount').textContent = globalFavCount;
        if (currentOpenDetailId === id) {
            document.getElementById('anonSaves').textContent = act.anonSaves;
        }

    }, 800); // 0.8s fake DB latency
}

// Utility: Reverts heart if backend fails (Crucial for Alt Flows)
function revertFavoriteState(act) {
    act.isFavorited = !act.isFavorited; // Flip back
    syncUIGlobally(act.id);
}

// Updates both the List Grid AND the Modal (if open) to keep Sub-Flow 1a "Omnichannel" in perfect sync
function syncUIGlobally(id) {
    renderActivities(); // Re-renders the grid with new state
    
    // If the modal happens to be open for this exact activity, update its heart instantly too
    if (currentOpenDetailId === id) {
        const act = activitiesDB.find(a => a.id === id);
        updateModalHeartVisual(act.isFavorited);
    }
}


// --- 4. Sub-Flow 1a: Omnichannel Saving (Detail Modal) ---
function openDetailModal(id, e) {
    const act = activitiesDB.find(a => a.id === id);
    if (!act) return;
    
    currentOpenDetailId = id;
    
    // Populate Data
    document.getElementById('detailImg').innerHTML = `${act.img} <button id="modalHeartBtn" class="absolute top-4 right-4 p-3 bg-white/80 backdrop-blur rounded-full shadow hover:bg-rose-50 hover:scale-110 transition cursor-pointer group z-10"></button>`;
    document.getElementById('detailCat').textContent = act.category;
    document.getElementById('detailTitle').textContent = act.title;
    document.getElementById('detailDesc').textContent = act.desc;
    document.getElementById('detailRaised').textContent = `$${act.raised.toLocaleString()}`;
    document.getElementById('detailGoal').textContent = `$${act.goal.toLocaleString()}`;
    document.getElementById('anonSaves').textContent = act.anonSaves.toLocaleString();

    // Re-attach modal heart listener based on fresh injection
    const newModalHeart = document.getElementById('modalHeartBtn');
    updateModalHeartVisual(act.isFavorited);
    
    newModalHeart.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavoriteAction(id); // Executes identical underlying privacy protocol!
    });

    // Show Modal
    detailModal.classList.remove('hidden');
    // Tiny delay for entrance animation
    setTimeout(() => {
        detailModal.classList.remove('opacity-0');
        detailModalPane.classList.remove('scale-95');
    }, 10);
}

// Visual update for the big heart inside the modal
function updateModalHeartVisual(isFaved) {
    const btn = document.getElementById('modalHeartBtn');
    if(btn) {
        if(isFaved) {
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" class="w-6 h-6 text-rose-500 transition-colors drop-shadow-sm"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>`;
        } else {
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-6 h-6 text-slate-400 group-hover:text-rose-400 transition-colors"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>`;
        }
    }
}

document.getElementById('closeModalBtn').addEventListener('click', () => {
    detailModal.classList.add('opacity-0');
    detailModalPane.classList.add('scale-95');
    setTimeout(() => { detailModal.classList.add('hidden'); currentOpenDetailId = null; }, 200);
});

// Initialize
renderActivities();