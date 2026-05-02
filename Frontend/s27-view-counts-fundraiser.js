/* ========================================================
   S27 - View Activity View Count (Fundraiser)
   ======================================================== */

// --- 1. My Campaign Database (Fundraiser specific) ---
// Pre-Condition 3: The backend system tracking pages visits counts
const myCampaignsData = [
    { id: 1, title: 'Rebuild Hope Elementary', status: 'Active', views: 8452, raised: 15000, goal: 50000, shares: 340, conv: '4.2%' },
    { id: 2, title: 'Cancer Treatment Fund', status: 'Active', views: 1205, raised: 18000, goal: 20000, shares: 12, conv: '15.8%' }, // Normal Flow matched data
    
    // Alternative Flow 1: Brand New Activity (Zero Views / null state)
    { id: 3, title: 'Rural Library Books (Newly Published)', status: 'Active', views: 0, raised: 0, goal: 5000, shares: 0, conv: '0.0%' },
    
    // Alternative Flow 2: Analytics Service Error (Simulated missing connection)
    { id: 4, title: 'Emergency Surgery Support', status: 'Active', views: 'error', raised: 12000, goal: 15000, shares: 'error', conv: 'error' },
];

const managementTableBody = document.getElementById('managementTableBody');
const analyticsModal = document.getElementById('analyticsModal');
const serviceErrorToast = document.getElementById('serviceErrorToast');

// Modal Injection Elements
const modalCampaignTitle = document.getElementById('modalCampaignTitle');
const modalViewCount = document.getElementById('modalViewCount');
const modalShareCount = document.getElementById('modalShareCount');
const modalConvRate = document.getElementById('modalConvRate');
const closeModalBtn = document.getElementById('closeModalBtn');


// --- 2. Sub-Flow 1a: Render Quick Overview in List Mode ---
function renderMyCampaigns() {
    managementTableBody.innerHTML = '';
    
    myCampaignsData.forEach(camp => {
        
        // 核心测验点：在 List Mode 里就处理 Error 和 0 的显示逻辑
        let displayViews = camp.views.toLocaleString();
        let viewTextStyle = 'text-slate-900 font-bold';

        if (camp.views === 'error') {
            displayViews = '-'; // Alt Flow 2: Display "-"
            viewTextStyle = 'text-slate-400 font-bold';
        } else if (camp.views === 0) {
            displayViews = '0'; // Alt Flow 1: Display clean "0"
            viewTextStyle = 'text-slate-400 font-medium';
        }

        const row = `
            <tr class="hover:bg-blue-50/30 transition duration-150 cursor-pointer group" onclick="openAnalytics(${camp.id})">
                <td class="px-6 py-5">
                    <div class="font-bold text-slate-800 group-hover:text-blue-600 transition">${camp.title}</div>
                </td>
                <td class="px-6 py-5">
                    <span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider">${camp.status}</span>
                </td>
                
                <!-- Sub-Flow 1a: The explicitly designated Total Views column -->
                <td class="px-6 py-5 bg-blue-50/20 group-hover:bg-blue-50/50 transition border-l border-r border-blue-50/50">
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-blue-400 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        <span class="${viewTextStyle}">${displayViews}</span>
                    </div>
                </td>

                <td class="px-6 py-5 text-sm text-slate-600">
                    $${camp.raised.toLocaleString()} / $${camp.goal.toLocaleString()}
                </td>
                <td class="px-6 py-5 text-right">
                    <button class="text-blue-600 font-semibold text-sm hover:underline">View Analytics</button>
                </td>
            </tr>
        `;
        managementTableBody.insertAdjacentHTML('beforeend', row);
    });
}


// --- 3. Normal Flow 2-4: Open Specific Analytics UI ---
function openAnalytics(id) {
    const camp = myCampaignsData.find(c => c.id === id);
    if (!camp) return;

    modalCampaignTitle.textContent = camp.title;

    // --- Alternative Flow 2: Analytics Service Error ---
    if (camp.views === 'error') {
        modalViewCount.textContent = 'N/A'; // Post-Condition/AltFlow: displays N/A
        modalViewCount.classList.replace('text-blue-50', 'text-blue-200'); // Dim it to show error state
        
        modalShareCount.textContent = '-';
        modalConvRate.textContent = '-';
        
        showServiceError();
    } 
    // --- Alternative Flow 1: Brand New Activity (Zero Views) ---
    else if (camp.views === 0) {
        modalViewCount.textContent = '0'; // Clean "0" rather than returning error
        modalViewCount.classList.replace('text-blue-200', 'text-blue-50'); 
        
        modalShareCount.textContent = '0';
        modalConvRate.textContent = '0.0%';
    } 
    // --- Normal Flow 4: Formats and renders numeric metric with eye icon ---
    else {
        modalViewCount.textContent = camp.views.toLocaleString(); // e.g. "1,205"
        modalViewCount.classList.replace('text-blue-200', 'text-blue-50'); 
        
        modalShareCount.textContent = camp.camp_shares ? camp.shares.toLocaleString() : camp.shares;
        modalConvRate.textContent = camp.conv;
    }

    analyticsModal.classList.remove('hidden');
}


// --- 4. Modals & Utilities ---
closeModalBtn.addEventListener('click', () => {
    analyticsModal.classList.add('hidden');
});

function showServiceError() {
    serviceErrorToast.classList.remove('hidden');
    setTimeout(() => { serviceErrorToast.classList.add('hidden'); }, 3500);
}

// Init
renderMyCampaigns();