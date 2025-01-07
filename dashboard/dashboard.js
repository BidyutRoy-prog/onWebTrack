// Navigation
document.querySelectorAll('.nav-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and sections
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.section').forEach(section => section.classList.add('hidden'));
        
        // Add active class to clicked button and show corresponding section
        button.classList.add('active');
        const sectionId = button.dataset.section + '-section';
        document.getElementById(sectionId).classList.remove('hidden');
    });
});

// Date Navigation
const currentDateElement = document.getElementById('current-date');
const currentWeekElement = document.getElementById('current-week');
const currentMonthElement = document.getElementById('current-month');
let currentDate = new Date();

function updateDateDisplay() {
    // Daily date
    currentDateElement.textContent = currentDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    // Weekly date range
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    currentWeekElement.textContent = `${weekStart.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    })} - ${weekEnd.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })}`;

    // Monthly date
    currentMonthElement.textContent = currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });
}

// Date navigation event listeners
document.getElementById('prev-day').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    updateDateDisplay();
    updateStats();
});

document.getElementById('next-day').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1);
    updateDateDisplay();
    updateStats();
});

document.getElementById('prev-week').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 7);
    updateDateDisplay();
    updateWeeklyStats();
});

document.getElementById('next-week').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 7);
    updateDateDisplay();
    updateWeeklyStats();
});

document.getElementById('prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateDateDisplay();
    updateMonthlyStats();
});

document.getElementById('next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateDateDisplay();
    updateMonthlyStats();
});

// Mock data generator
function generateMockData() {
    return {
        totalTime: Math.floor(Math.random() * 8 * 60), // 0-8 hours in minutes
        productiveTime: Math.floor(Math.random() * 6 * 60), // 0-6 hours in minutes
        sitesVisited: Math.floor(Math.random() * 30) + 10, // 10-40 sites
        topSites: [
            { name: 'github.com', time: '2h 15m', favicon: 'https://github.com/favicon.ico' },
            { name: 'stackoverflow.com', time: '1h 30m', favicon: 'https://stackoverflow.com/favicon.ico' },
            { name: 'gmail.com', time: '45m', favicon: 'https://mail.google.com/favicon.ico' },
            { name: 'docs.google.com', time: '30m', favicon: 'https://docs.google.com/favicon.ico' },
            { name: 'chat.openai.com', time: '25m', favicon: 'https://chat.openai.com/favicon.ico' }
        ]
    };
}

// Format minutes to hours and minutes
function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

// Update statistics
function updateStats() {
    const data = generateMockData();
    
    // Update stat cards
    document.getElementById('total-time').textContent = formatTime(data.totalTime);
    document.getElementById('productive-time').textContent = formatTime(data.productiveTime);
    document.getElementById('sites-count').textContent = data.sitesVisited;

    // Update top sites list
    const topSitesList = document.getElementById('top-sites-list');
    topSitesList.innerHTML = data.topSites.map(site => `
        <div class="site-item">
            <div class="site-info">
                <img src="${site.favicon}" alt="${site.name}" class="site-favicon">
                <span class="site-name">${site.name}</span>
            </div>
            <span class="site-time">${site.time}</span>
        </div>
    `).join('');
}

// Focus Timer
let timerInterval;
let timeLeft = 25 * 60; // 25 minutes in seconds

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('focus-timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

document.getElementById('start-focus').addEventListener('click', function() {
    if (!timerInterval) {
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                alert('Focus session completed!');
                timeLeft = document.getElementById('session-length').value * 60;
                updateTimerDisplay();
                this.textContent = 'Start Focus Session';
                document.getElementById('pause-focus').disabled = true;
            }
        }, 1000);
        this.textContent = 'Stop';
        document.getElementById('pause-focus').disabled = false;
    } else {
        clearInterval(timerInterval);
        timerInterval = null;
        this.textContent = 'Start Focus Session';
        document.getElementById('pause-focus').disabled = true;
    }
});

document.getElementById('pause-focus').addEventListener('click', function() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        document.getElementById('start-focus').textContent = 'Resume';
        this.disabled = true;
    }
});

document.getElementById('reset-focus').addEventListener('click', function() {
    clearInterval(timerInterval);
    timerInterval = null;
    timeLeft = document.getElementById('session-length').value * 60;
    updateTimerDisplay();
    document.getElementById('start-focus').textContent = 'Start Focus Session';
    document.getElementById('pause-focus').disabled = true;
});

document.getElementById('session-length').addEventListener('change', function() {
    if (!timerInterval) {
        timeLeft = this.value * 60;
        updateTimerDisplay();
    }
});

// Site Blocking
const blockedSites = new Set();

document.getElementById('add-block-site').addEventListener('click', () => {
    const input = document.getElementById('block-site-input');
    const site = input.value.trim();
    
    if (site && !blockedSites.has(site)) {
        blockedSites.add(site);
        updateBlockedSitesList();
        input.value = '';
    }
});

function updateBlockedSitesList() {
    const list = document.getElementById('blocked-sites-list');
    list.innerHTML = Array.from(blockedSites).map(site => `
        <div class="site-item">
            <span class="site-name">${site}</span>
            <button class="icon-btn" onclick="unblockSite('${site}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
    `).join('');
}

function unblockSite(site) {
    blockedSites.delete(site);
    updateBlockedSitesList();
}

// Settings
const settings = {
    darkMode: false,
    notifications: true
};

function updateSettings(setting) {
    settings[setting] = !settings[setting];
    const toggle = document.getElementById(`${setting}-toggle`);
    toggle.classList.toggle('active');
    
    if (setting === 'darkMode') {
        document.body.classList.toggle('dark-mode');
    }
    
    localStorage.setItem('settings', JSON.stringify(settings));
}

// Initialize
updateDateDisplay();
updateStats();
updateTimerDisplay();