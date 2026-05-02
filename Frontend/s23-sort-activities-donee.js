/* ========================================================
   S23 - Sort Activities by Date or Urgency (Donee)
   ======================================================== */

// --- 1. Mock DB (Includes Dates & Open Goals for sorting) ---
const activitiesDB = [
    { id: 1, title: 'Rebuild Hope Elementary', category: 'Education', desc: 'Help rebuild the primary school.', raised: 15000, goal: 50000, img: '📚', date_created: '2023-10-01', deadline: '2023-11-15' },
    { id: 2, title: 'Cancer Treatment Fund', category: 'Medical', desc: 'Crucial chemo funds.', raised: 18000, goal: 20000, img: '🏥', date_created: '2023-10-15', deadline: '2023-10-30' },
    { id: 3, title: 'Flood Relief Initiative', category: 'Disaster Relief', desc: 'Emergency food & water delivery.', raised: 32000, goal: 40000, img: '🌊', date_created: '2023-09-28', deadline: '2023-11-05' },
    { id: 4, title: 'Rural Library Books', category: 'Education', desc: 'Donating 10,000 books.', raised: 2000, goal: 5000, img: '📖', date_created: '2023-10-20', deadline: '2023-12-10' },
    
    // Alternative Flow 1 Target: Insufficient Data (Open-ended fundraising)
    { id: 5, title: 'Emergency Surgery Line', category: 'Medical', desc: 'Ongoing heart operations.', raised: 12000, goal: null, img: '💉', date_created: '2023-10-05', deadline: '2024-01-01' },
    
    { id: 6, title: 'Earthquake Recovery Village', category: 'Disaster Relief', desc: 'Construction materials.', raised: 5000, goal: 25000, img: '🏚️', date_created: '2023-10-22', deadline: '2023-11-20' },
    { id: 7, title: 'STEM Girls Scholarship', category: 'Education', desc: 'College tuition.', raised: 300, goal: 10000, img: '🔬', date_created: '2023-10-18', deadline: '2023-11-10' },
    { id: 8, title: 'Free Wheelchair Provision', category: 'Medical', desc: 'Custom wheelchairs.', raised: 1500, goal: 3000, img: '♿', date_created: '2023-09-15', deadline: '2023-10-28' }
];

// --- 2. DOM Elements ---
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const sortFilter = document.getElementById('sortFilter'); // Normal Flow 1
const activitiesGrid = document.getElementById('activitiesGrid');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyStateMsg = document.getElementById('emptyStateMsg');
const syncErrorToast = document.getElementById('syncErrorToast');

// Pagination State (Sub-Flow 1b)
let currentPage = 1;
const itemsPerPage = 4; 
let fullyProcessedData = []; 
let isFetching = false;


// --- 3. Render Engine ---
function renderActivities(dataArray, append = false) {
    if (!append) activitiesGrid.innerHTML = '';
    
    dataArray.forEach(act => {
        // Alternative Flow 1: Handle Open Goals visually
        const isOpenGoal = act.goal === null;
        const progressRaw = isOpenGoal ? 0 : (act.raised / act.goal) * 100;
        const progress = progressRaw > 100 ? 100 : progressRaw.toFixed(1);

        const goalDisplay = isOpenGoal 
            ? `<span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold text-[10px]">Open Goal</span>` 
            : `$${act.goal.toLocaleString()} goal`;

        const urgentTag = (!isOpenGoal && (act.goal - act.raised) < 3000) 
            ? `<span class="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm animate-pulse">Urgent Needed</span>`
            : '';

        const card = `
            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition duration-300 flex flex-col h-full relative">
                ${urgentTag}
                <div class="h-32 bg-slate-50 flex items-center justify-center text-4xl border-b border-slate-100">${act.img}</div>
                <div class="p-5 flex flex-col flex-grow">
                    <span class="bg-emerald-50 text-emerald-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded w-max mb-2">${act.category}</span>
                    <h3 class="text-base font-bold text-slate-900 mb-1 leading-tight">${act.title}</h3>
                    <p class="text-xs text-slate-400 font-semibold mb-4 border-b border-slate-50 pb-3">Ends: ${act.deadline || 'Ongoing'}</p>
                    
                    <div class="mt-auto pt-2">
                        <div class="flex justify-between items-center text-[11px] font-bold mb-2">
                            <span class="text-emerald-600">$${act.raised.toLocaleString()} raised</span>
                            <span class="text-slate-500">${goalDisplay}</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-2">
                            <div class="bg-emerald-500 h-2 rounded-full" style="${isOpenGoal ? 'width: 100%; background-color:#818cf8;' : `width: ${progress}%`}"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        activitiesGrid.insertAdjacentHTML('beforeend', card);
    });
}

// --- 4. Sub-Flow 1a: Composite Filter & Sort Pipeline ---
function executePipeline(page = 1) {
    if (isFetching) return;
    isFetching = true;
    loadingIndicator.classList.remove('hidden');
    if (page === 1) { activitiesGrid.innerHTML = ''; emptyStateMsg.classList.add('hidden'); }

    // Grab all parameters
    const query = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value;
    const sortLogic = sortFilter.value;

    setTimeout(() => {
        // Alternative Flow 2: Simulate Database Sync Delay parsing crash
        if (sortLogic === 'errorMock') {
            loadingIndicator.classList.add('hidden');
            showSyncError();
            isFetching = false;
            sortFilter.value = 'default'; // auto reset
            return;
        }

        // Sub-Flow 1a: Apply preexisting filters FIRST
        let filteredSet = activitiesDB.filter(a => {
            const matchQuery = (query === '') || (a.title.toLowerCase().includes(query) || a.desc.toLowerCase().includes(query));
            const matchCat = (category === 'all') || (a.category === category);
            return matchQuery && matchCat;
        });

        // Normal Flow 4 & 5: Calculate and Sort
        if (sortLogic === 'newest') {
            filteredSet.sort((a, b) => new Date(b.date_created) - new Date(a.date_created)); // Latest Date
        } else if (sortLogic === 'ending') {
            filteredSet.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)); // Closest Deadline
        } else if (sortLogic === 'urgency') {
            // Evaluates based on remaining amount (Goal - Raised)
            filteredSet.sort((a, b) => {
                // Alternative Flow 1: Push Open-ended (goal: null) to the very bottom
                if (a.goal === null) return 1;
                if (b.goal === null) return -1;
                
                const aRemaining = a.goal - a.raised;
                const bRemaining = b.goal - b.raised;
                return aRemaining - bRemaining; // Ascending: smallest remaining amount at top
            });
        }

        fullyProcessedData = filteredSet;

        if (fullyProcessedData.length === 0) {
            loadingIndicator.classList.add('hidden');
            emptyStateMsg.classList.remove('hidden');
            isFetching = false;
            return;
        }

        // Sub-Flow 1b: Paginate the sorted view
        const startIndex = (page - 1) * itemsPerPage;
        const pageData = fullyProcessedData.slice(startIndex, startIndex + itemsPerPage);

        loadingIndicator.classList.add('hidden');
        renderActivities(pageData, page > 1); 
        isFetching = false;

    }, 700); // 0.7s calc delay
}

// --- 5. Triggers ---

// Input field triggers live update on typing (Debounced UX improvement)
let typingTimer;
searchInput.addEventListener('input', () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => { currentPage = 1; executePipeline(1); }, 400); // Wait 0.4s
});

categoryFilter.addEventListener('change', () => {
    currentPage = 1; executePipeline(1);
});

// Normal Flow 2 & 3: User changes sort criterion
sortFilter.addEventListener('change', () => {
    currentPage = 1; executePipeline(1);
});

// Sub-Flow 1b: Infinite Paginated Scrolling
window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 30 && !isFetching) {
        const totalPages = Math.ceil(fullyProcessedData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            executePipeline(currentPage);
        }
    }
});

// Utility
function showSyncError() {
    syncErrorToast.classList.remove('hidden');
    setTimeout(() => { syncErrorToast.classList.add('hidden'); }, 3500);
}

// Init
executePipeline(1);