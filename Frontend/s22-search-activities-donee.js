/* ========================================================
   S22 - Search Activities by Keywords (Donee)
   ======================================================== */

// --- 1. Mock DB (Includes desc & tags for matching) ---
const activitiesDB = [
    { id: 1, title: 'Rebuild Hope Elementary', tags: 'school children', desc: 'Help us rebuild the primary school destroyed by the hurricane.', raised: 15000, goal: 50000, img: '📚' },
    { id: 2, title: 'Cancer Treatment Fund', tags: 'hospital medicine', desc: 'Providing crucial chemotherapy funds for low-income patients.', raised: 8000, goal: 20000, img: '🏥' },
    { id: 3, title: 'Flood Relief Initiative', tags: 'water rescue', desc: 'Emergency food and clean water delivery to the flood victims.', raised: 32000, goal: 40000, img: '🌊' },
    { id: 4, title: 'Rural Library Books', tags: 'learning books', desc: 'Donating 10,000 books to remote villages across the nation.', raised: 2000, goal: 5000, img: '📖' },
    { id: 5, title: 'Emergency Surgery Support', tags: 'operation life', desc: 'Immediate funds required for life-saving heart operations.', raised: 12000, goal: 15000, img: '💉' },
    { id: 6, title: 'Earthquake Recovery Village', tags: 'rebuild houses', desc: 'Construction materials for the earthquake epicenter.', raised: 5000, goal: 25000, img: '🏚️' },
    { id: 7, title: 'STEM Girls Scholarship', tags: 'education university', desc: 'Empowering future female engineers with college tuition.', raised: 300, goal: 10000, img: '🔬' },
    { id: 8, title: 'Free Wheelchair Provision', tags: 'disabled support', desc: 'Custom wheelchairs for elderly people in need.', raised: 1500, goal: 3000, img: '♿' }
];

// --- 2. DOM Elements ---
const searchInput = document.getElementById('searchInput');
const innerClearBtn = document.getElementById('innerClearBtn');
const executeSearchBtn = document.getElementById('executeSearchBtn');
const activitiesGrid = document.getElementById('activitiesGrid');
const loadingIndicator = document.getElementById('loadingIndicator');
const emptyStateMsg = document.getElementById('emptyStateMsg');
const emptyStateText = document.getElementById('emptyStateText');
const searchMetaInfo = document.getElementById('searchMetaInfo');
const displayKeyword = document.getElementById('displayKeyword');
const serverErrorToast = document.getElementById('serverErrorToast');

// Pagination State (Sub-Flow 1b)
let currentPage = 1;
const itemsPerPage = 4; 
let currentFilteredData = [];
let isFetching = false;
let currentSearchTerm = '';


// --- 3. Render Engine ---
function renderActivities(dataArray, append = false) {
    if (!append) activitiesGrid.innerHTML = '';
    
    dataArray.forEach(act => {
        const progressRaw = (act.raised / act.goal) * 100;
        const progress = progressRaw > 100 ? 100 : progressRaw.toFixed(1);

        const card = `
            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition duration-300 flex flex-col h-full transform hover:-translate-y-1">
                <div class="h-32 bg-slate-50 flex items-center justify-center text-4xl border-b border-slate-100">${act.img}</div>
                <div class="p-5 flex flex-col flex-grow">
                    <h3 class="text-lg font-bold text-slate-900 mb-2 leading-tight">${act.title}</h3>
                    <p class="text-xs text-slate-500 mb-4 line-clamp-2">${act.desc}</p>
                    
                    <div class="mt-auto pt-2">
                        <div class="flex justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                            <span>$${act.raised.toLocaleString()} raised</span>
                            <span>$${act.goal.toLocaleString()} goal</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-2">
                            <div class="bg-slate-900 h-2 rounded-full" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        activitiesGrid.insertAdjacentHTML('beforeend', card);
    });
}

// --- 4. Search & Fetch Data (Normal Flow 4-6) ---
function executeSearch(keyword, page = 1) {
    if (isFetching) return;
    
    // Normal Flow 4: Trimming trailing spaces
    const query = keyword.trim();

    // Alternative Flow 2: Empty Search. Ignore action if input is completely blank or only spaces.
    if (query === '' && currentSearchTerm !== '') {
        // Do nothing, maintain current list
        return;
    }

    currentSearchTerm = query;
    isFetching = true;
    loadingIndicator.classList.remove('hidden');
    
    if (page === 1) { 
        activitiesGrid.innerHTML = ''; 
        emptyStateMsg.classList.add('hidden'); 
    }

    // Simulate network query
    setTimeout(() => {
        // Alternative Flow 3: Server Error simulation
        if (query.toLowerCase() === 'trigger-error') {
            loadingIndicator.classList.add('hidden');
            showServerError();
            isFetching = false;
            return;
        }

        // Post-Condition 2: The searched keyword remains visible for user reference
        if (query !== '') {
            displayKeyword.textContent = query;
            searchMetaInfo.classList.remove('hidden');
        } else {
            searchMetaInfo.classList.add('hidden');
        }

        // Normal Flow 5: Queries database, matching titles, desc, and tags
        currentFilteredData = (query === '') 
            ? activitiesDB 
            : activitiesDB.filter(a => {
                const searchStr = query.toLowerCase();
                return a.title.toLowerCase().includes(searchStr) || 
                       a.desc.toLowerCase().includes(searchStr) || 
                       a.tags.toLowerCase().includes(searchStr);
            });

        // Alternative Flow 1: No Match Found exactly zero items
        if (currentFilteredData.length === 0) {
            loadingIndicator.classList.add('hidden');
            emptyStateText.textContent = `No results found for '${query}'. Please try different keywords.`;
            emptyStateMsg.classList.remove('hidden');
            isFetching = false;
            return;
        }

        // Pagination
        const startIndex = (page - 1) * itemsPerPage;
        const pageData = currentFilteredData.slice(startIndex, startIndex + itemsPerPage);

        loadingIndicator.classList.add('hidden');
        // Normal Flow 7: Dynamically renders results
        renderActivities(pageData, page > 1); 
        isFetching = false;

    }, 800); // 0.8s fake DB fetching time
}

// --- 5. Event Listeners ---

// Show/Hide inner 'X' clear icon based on input (Sub-Flow 1a part)
searchInput.addEventListener('input', (e) => {
    if (e.target.value.length > 0) {
        innerClearBtn.classList.remove('hidden');
    } else {
        innerClearBtn.classList.add('hidden');
    }
});

// Normal Flow 3 (Triggers): Submits query by clicking button
executeSearchBtn.addEventListener('click', () => {
    currentPage = 1;
    executeSearch(searchInput.value, currentPage);
});

// Normal Flow 3 (Triggers): Submits query by hitting "Enter" key
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        currentPage = 1;
        executeSearch(searchInput.value, currentPage);
    }
});

// Sub-Flow 1a: Clear Search (Reset)
innerClearBtn.addEventListener('click', () => {
    searchInput.value = '';        // 2. Clears text input
    innerClearBtn.classList.add('hidden');
    currentPage = 1;
    executeSearch('', currentPage); // 3. Immediately resets to default list
});

// Sub-Flow 1b: Pagination via scrolling
window.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 30 && !isFetching) {
        const totalPages = Math.ceil(currentFilteredData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            executeSearch(currentSearchTerm, currentPage);
        }
    }
});

// Utility
function showServerError() {
    serverErrorToast.classList.remove('hidden');
    setTimeout(() => { serverErrorToast.classList.add('hidden'); }, 4000);
}

// Initial Default Load
executeSearch('', 1);