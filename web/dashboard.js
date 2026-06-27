let statsData = { apps: [], details: [] };
let currentFilter = 'today';
let customStartDate = '';
let customEndDate = '';
let selectedAppFilter = null; 
let appsChart = null; 

// Gerenciamento de Tema Escuro / Claro
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-toggle-icon');

if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    themeIcon.innerText = '☀️';
} else {
    document.documentElement.classList.remove('dark');
    themeIcon.innerText = '🌙';
}

themeToggleBtn.addEventListener('click', () => {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        themeIcon.innerText = '🌙';
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        themeIcon.innerText = '☀️';
    }
    updateChartTheme(); 
});

function selectAppFilter(appName) {
    if (selectedAppFilter === appName) {
        selectedAppFilter = null; 
    } else {
        selectedAppFilter = appName;
    }
    updateFilterBadge();
    updateUI();
}

function clearAppFilter() {
    selectedAppFilter = null;
    updateFilterBadge();
    updateUI();
}

function updateFilterBadge() {
    const badgeContainer = document.getElementById('filter-badge-container');
    const badgeText = document.getElementById('filter-badge-text');
    if (selectedAppFilter) {
        badgeText.innerText = selectedAppFilter;
        badgeContainer.classList.remove('hidden');
    } else {
        badgeContainer.classList.add('hidden');
    }
}

async function fetchStats() {
    try {
        let url = `/api/stats?range=${currentFilter}`;
        if (currentFilter === 'custom') {
            url += `&start=${customStartDate}&end=${customEndDate}`;
        }
        const res = await fetch(url);
        statsData = await res.json();
        updateUI();
    } catch (err) {
        console.error("Erro ao buscar estatísticas:", err);
    }
}

async function fetchStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        document.getElementById('current-app').innerText = data.active_app || "Nenhum";
        document.getElementById('current-title').innerText = data.active_title || "Sem janela em foco";
    } catch (err) {
        console.error("Erro ao obter status em tempo real:", err);
    }
}

function setFilter(filter) {
    currentFilter = filter;
    const customPanel = document.getElementById('custom-date-panel');
    if (filter === 'custom') {
        customPanel.classList.remove('hidden');
        const todayStr = new Date().toISOString().split('T')[0];
        if (!document.getElementById('custom-start-date').value) {
            document.getElementById('custom-start-date').value = todayStr;
            document.getElementById('custom-end-date').value = todayStr;
        }
        customStartDate = document.getElementById('custom-start-date').value;
        customEndDate = document.getElementById('custom-end-date').value;
    } else {
        customPanel.classList.add('hidden');
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('bg-indigo-600', 'text-white');
            btn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300', 'border');
        } else {
            btn.classList.remove('bg-indigo-600', 'text-white');
            btn.classList.add('bg-slate-100', 'dark:bg-slate-800', 'text-slate-700', 'dark:text-slate-300', 'border');
        }
    });
    fetchStats();
}

function applyCustomFilter() {
    customStartDate = document.getElementById('custom-start-date').value;
    customEndDate = document.getElementById('custom-end-date').value;
    fetchStats();
}

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    let parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function updateUI() {
    const searchVal = document.getElementById('searchInput').value.toLowerCase();
    const totalSecs = statsData.details.reduce((sum, item) => sum + item.total_duration, 0);
    
    const filteredDetails = statsData.details.filter(item => {
        const matchesSearch = item.app_name.toLowerCase().includes(searchVal) || item.window_title.toLowerCase().includes(searchVal);
        const matchesAppFilter = selectedAppFilter ? (item.app_name === selectedAppFilter) : true;
        return matchesSearch && matchesAppFilter;
    });

    const filteredTotalSecs = filteredDetails.reduce((sum, item) => sum + item.total_duration, 0);
    document.getElementById('stat-total-time').innerText = formatDuration(filteredTotalSecs);
    document.getElementById('stat-unique-apps').innerText = selectedAppFilter ? 1 : statsData.apps.length;
    document.getElementById('stat-unique-windows').innerText = filteredDetails.length;

    // Tabela de Documentos
    const tableBody = document.getElementById('details-table-body');
    tableBody.innerHTML = '';
    
    filteredDetails.forEach(item => {
        const pct = filteredTotalSecs > 0 ? ((item.total_duration / filteredTotalSecs) * 100).toFixed(1) : 0;
        const row = document.createElement('tr');
        row.className = "hover:bg-slate-100/40 dark:hover:bg-slate-800/10 transition-colors border-b border-slate-100 dark:border-slate-800/30";
        row.innerHTML = `
            <td class="px-4 py-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">${escapeHtml(item.app_name)}</td>
            <td class="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 max-w-xs md:max-w-md truncate font-medium" title="${escapeHtml(item.window_title)}">${escapeHtml(item.window_title)}</td>
            <td class="px-4 py-2.5 text-xs text-right font-mono text-slate-700 dark:text-slate-200">${formatDuration(item.total_duration)}</td>
            <td class="px-4 py-2.5 text-xs text-right">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200/40 dark:border-indigo-500/10">
                    ${pct}%
                </span>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Lista de Aplicações
    const appsList = document.getElementById('apps-list');
    appsList.innerHTML = '';
    
    statsData.apps.forEach(item => {
        const pct = totalSecs > 0 ? ((item.total_duration / totalSecs) * 100).toFixed(1) : 0;
        const isSelected = selectedAppFilter === item.app_name;
        const appRow = document.createElement('div');
        appRow.className = `p-2.5 rounded-xl cursor-pointer transition border shrink-0 ${
            isSelected 
            ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 dark:border-indigo-500' 
            : 'bg-slate-50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/30'
        }`;
        appRow.onclick = () => selectAppFilter(item.app_name);
        appRow.innerHTML = `
            <div class="flex justify-between text-[11px] font-semibold mb-1">
                <span class="text-slate-700 dark:text-slate-300 truncate pr-2">${escapeHtml(item.app_name)}</span>
                <span class="text-slate-500 dark:text-slate-400 font-mono">${formatDuration(item.total_duration)} (${pct}%)</span>
            </div>
            <div class="w-full bg-slate-200 dark:bg-slate-800/80 rounded-full h-1">
                <div class="bg-indigo-600 dark:bg-indigo-500 h-1 rounded-full transition-all" style="width: ${pct}%"></div>
            </div>
        `;
        appsList.appendChild(appRow);
    });

    renderChart(statsData.apps);
}

function renderChart(apps) {
    const ctx = document.getElementById('appsChart').getContext('2d');
    const topApps = apps.slice(0, 5);
    const labels = topApps.map(item => item.app_name);
    const data = topApps.map(item => item.total_duration);

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#1e293b' : '#f1f5f9';

    if (appsChart) {
        appsChart.data.labels = labels;
        appsChart.data.datasets[0].data = data;
        appsChart.data.datasets[0].backgroundColor = labels.map(label => 
            selectedAppFilter === label ? 'rgba(99, 102, 241, 0.9)' : 'rgba(99, 102, 241, 0.4)'
        );
        appsChart.data.datasets[0].borderColor = labels.map(label => 
            selectedAppFilter === label ? 'rgba(99, 102, 241, 1)' : 'rgba(99, 102, 241, 0.6)'
        );
        appsChart.options.scales.x.ticks.color = textColor;
        appsChart.options.scales.y.ticks.color = textColor;
        appsChart.options.scales.x.grid.color = gridColor;
        appsChart.options.scales.y.grid.color = gridColor;
        appsChart.update();
    } else {
        appsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Segundos ativos',
                    data: data,
                    backgroundColor: labels.map(label => 
                        selectedAppFilter === label ? 'rgba(99, 102, 241, 0.9)' : 'rgba(99, 102, 241, 0.4)'
                    ),
                    borderColor: labels.map(label => 
                        selectedAppFilter === label ? 'rgba(99, 102, 241, 1)' : 'rgba(99, 102, 241, 0.6)'
                    ),
                    borderWidth: 1.5,
                    borderRadius: 3
                }]
            },
            options: {
                indexAxis: 'y', 
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { size: 9 } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { size: 10, weight: 'bold' } }
                    }
                },
                onClick: (event, elements) => {
                    if (elements && elements.length > 0) {
                        const index = elements[0].index;
                        const clickedAppName = appsChart.data.labels[index];
                        selectAppFilter(clickedAppName);
                    }
                }
            }
        });
    }
}

function updateChartTheme() {
    if (appsChart) {
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? '#1e293b' : '#f1f5f9';
        
        appsChart.options.scales.x.ticks.color = textColor;
        appsChart.options.scales.y.ticks.color = textColor;
        appsChart.options.scales.x.grid.color = gridColor;
        appsChart.options.scales.y.grid.color = gridColor;
        appsChart.update();
    }
}

document.getElementById('searchInput').addEventListener('input', updateUI);

// Loop de inicialização
setFilter('today');
fetchStatus();
setInterval(fetchStatus, 2000);
setInterval(fetchStats, 5000);