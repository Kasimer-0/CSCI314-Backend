/* ========================================================
   S28 - View Activity View Count / Bookmarks (Fundraiser)
   ======================================================== */

// --- 1. Database Mock (Tracking bookmarks relationship) ---
const myCampaignsData = [
    { id: 1, title: 'Rebuild Hope Elementary', views: 8452, bookmarks: 1245 },
    { id: 2, title: 'Cancer Treatment Fund', views: 1205, bookmarks: 320 },
    
    // Alternative Flow 1: Zero Bookmarks (Empty State) cleanly handled
    { id: 3, title: 'Rural Library Books (Newly Published)', views: 15, bookmarks: 0 },
    
    // Alternative Flow 3: System Error (Database connection times out)
    { id: 4, title: 'Emergency Surgery Support', views: 12500, bookmarks: 'error' }
];

const managementTableBody = document.getElementById('managementTableBody');
const analyticsModal = document.getElementById('analyticsModal');
const serviceErrorToast = document.getElementById('serviceErrorToast');
const privacyWarningToast = document.getElementById('privacyWarningToast');

// Modal Elements
const modalCampaignTitle = document.getElementById('modalCampaignTitle');
const modalBookmarkCount = document.getElementById('modalBookmarkCount');
const modalViewCount = document.getElementById('modalViewCount');
const modalInterestRate = document.getElementById('modalInterestRate');
const closeModalBtn = document.getElementById('closeModalBtn');
const bookmarkInteractionArea = document.getElementById('bookmarkInteractionArea');


// --- 2. Sub-Flow 1a: Render Summary Table ---
function renderOverview() {
    managementTableBody.innerHTML = '';
    
    myCampaignsData.forEach(camp => {
        let displayBookmarks = camp.bookmarks.toLocaleString();
        let bookmarkStyle = 'text-slate-900 font-bold';

        // Handling Alternative Flows gracefully in List View
        if (camp.bookmarks === 'error') {
            displayBookmarks = 'N/A'; // Alt Flow 3
            bookmarkStyle = 'text-rose-400 font-bold';
        } else if (camp.bookmarks === 0) {
            displayBookmarks = '0'; // Alt Flow 1
            bookmarkStyle = 'text-slate-400 font-medium';
        }

        const row = `
            <tr class="hover:bg-rose-50/20 transition duration-150 cursor-pointer group" onclick="openAnalytics(${camp.id})">
                <td class="px-6 py-5">
                    <div class="font-bold text-slate-800">${camp.title}</div>
                </td>
                <td class="px-6 py-5 align-middle">
                    <span class="text-sm font-semibold text-slate-600">${camp.views.toLocaleString()}</span>
                </td>
                
                <!-- Quick Overview: Total Bookmarks Column -->
                <td class="px-6 py-5 bg-rose-50/40 group-hover:bg-rose-50 border-l border-r border-rose-50 transition">
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-rose-400 opacity-80 fill-current" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                        <span class="${bookmarkStyle}">${displayBookmarks}</span>
                    </div>
                </td>

                <td class="px-6 py-5 text-right">
                    <button class="text-rose-600 font-semibold text-sm hover:underline">View Details</button>
                </td>
            </tr>
        `;
        managementTableBody.insertAdjacentHTML('beforeend', row);
    });
}


// --- 3. Normal Flow 2-6: Open Deep Analytics ---
function openAnalytics(id) {
    const camp = myCampaignsData.find(c => c.id === id);
    if (!camp) return;

    modalCampaignTitle.textContent = camp.title;
    modalViewCount.textContent = camp.views.toLocaleString();

    // Normal Flow 6: Calculate Interest Rate (Bookmarks / Views)
    if (typeof camp.bookmarks === 'number' && camp.views > 0) {
        const rate = ((camp.bookmarks / camp.views) * 100).toFixed(1);
        modalInterestRate.textContent = `${rate}%`;
        modalInterestRate.className = 'text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded';
    } else {
        modalInterestRate.textContent = '-';
        modalInterestRate.className = 'text-sm font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded';
    }

    // --- Alternative Flow 3: System Error (Timeout) ---
    if (camp.bookmarks === 'error') {
        modalBookmarkCount.textContent = 'N/A';
        modalBookmarkCount.classList.replace('text-rose-50', 'text-rose-200'); 
        
        serviceErrorToast.classList.remove('hidden');
        setTimeout(() => { serviceErrorToast.classList.add('hidden'); }, 3500);
    } 
    // --- Alternative Flow 1: Zero Bookmarks (Empty State) ---
    else if (camp.bookmarks === 0) {
        modalBookmarkCount.textContent = '0'; // Cleanly displaying 0 without errors
        modalBookmarkCount.classList.replace('text-rose-200', 'text-rose-50'); 
    } 
    // --- Normal Flow 5: Validates privacy protocols and renders raw integer ---
    else {
        modalBookmarkCount.textContent = camp.bookmarks.toLocaleString(); 
        modalBookmarkCount.classList.replace('text-rose-200', 'text-rose-50'); 
    }

    analyticsModal.classList.remove('hidden');
}


// --- 4. Alternative Flow 2 (CRUCIAL): Attempting to View User Data ---
// If the Fundraiser clicks on the big number hoping to see a list of who saved it:
bookmarkInteractionArea.addEventListener('click', () => {
    // Forcefully blocks the rendering of any user lists and displays privacy toast
    privacyWarningToast.classList.remove('hidden');
    
    // Add shake animation to the block to signify "Access Denied"
    bookmarkInteractionArea.classList.add('animate-pulse');
    setTimeout(() => { bookmarkInteractionArea.classList.remove('animate-pulse'); }, 500);

    setTimeout(() => { privacyWarningToast.classList.add('hidden'); }, 4000);
});

// Modals
closeModalBtn.addEventListener('click', () => {
    analyticsModal.classList.add('hidden');
});

// Init
renderOverview();