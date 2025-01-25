// ===================== IndexedDB Initialization =====================
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("onWebTrackDB", 3);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("sessions")) {
                db.createObjectStore("sessions", { keyPath: "date" });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// ===================== Browser Session Tracking =====================
let currentBrowserSession = null;
let lastActivity = Date.now();
let sessionSaveInterval = null;

function startBrowserSession() {
    const now = Date.now();
    currentBrowserSession = {
        id: `browserSession${now}`,
        startTimestamp: now,
        endTimestamp: null,
        totalTimeSpent: 0,
        activeTime: 0,
        startTime: new Date(now).toLocaleTimeString(),
        endTime: null
    };

    setupActivityTracking();

    sessionSaveInterval = setInterval(() => {
        if (currentBrowserSession) {
            const currentTime = Date.now();
            const activeSeconds = Math.floor((currentTime - lastActivity) / 1000);
            
            currentBrowserSession.totalTimeSpent = Math.floor(
                (currentTime - currentBrowserSession.startTimestamp) / 1000
            );
            
            if (activeSeconds <= 60) {
                currentBrowserSession.activeTime += 60;
            }
            
            saveBrowserSession(currentBrowserSession);
        }
    }, 60000);
}

function endBrowserSession() {
    if (currentBrowserSession) {
        const endTime = Date.now();
        currentBrowserSession.endTimestamp = endTime;
        currentBrowserSession.endTime = new Date(endTime).toLocaleTimeString();
        currentBrowserSession.totalTimeSpent = Math.floor(
            (endTime - currentBrowserSession.startTimestamp) / 1000
        );

        clearInterval(sessionSaveInterval);
        saveBrowserSession(currentBrowserSession);
        currentBrowserSession = null;
    }
}

// ===================== Activity Tracking =====================
function setupActivityTracking() {
    chrome.idle.setDetectionInterval(60);
    chrome.idle.onStateChanged.addListener(handleIdleStateChange);
    
    chrome.tabs.onActivated.addListener(resetActivityTimer);
    chrome.tabs.onUpdated.addListener(resetActivityTimer);
    chrome.windows.onFocusChanged.addListener(resetActivityTimer);
}

function handleIdleStateChange(newState) {
    if (newState === "active") {
        resetActivityTimer();
    }
}

function resetActivityTimer() {
    lastActivity = Date.now();
    if (currentBrowserSession) {
        currentBrowserSession.activeTime += 1;
    }
}

// ===================== Session Management =====================
async function saveBrowserSession(session) {
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction("sessions", "readwrite");
        const store = transaction.objectStore("sessions");

        const sessionDate = new Date(session.startTimestamp);
        const sessionDay = getDateString(sessionDate);

        const data = await new Promise((resolve, reject) => {
            const request = store.get(sessionDay);
            request.onsuccess = () => resolve(request.result || { 
                date: sessionDay, 
                browserSessions: {}, 
                domains: {} 
            });
            request.onerror = () => reject(request.error);
        });

        data.browserSessions[session.id] = {
            ...session,
            startTime: new Date(session.startTimestamp).toLocaleTimeString(),
            endTime: session.endTimestamp ? 
                new Date(session.endTimestamp).toLocaleTimeString() : null
        };

        store.put(data);
    } catch (error) {
        console.error("Session save error:", error);
    }
}

// ===================== Domain Tracking =====================
async function trackDomainSession(domain, url) {
    try {
        const db = await initIndexedDB();
        const transaction = db.transaction("sessions", "readwrite");
        const store = transaction.objectStore("sessions");

        const today = getDateString(new Date());
        const now = new Date().toLocaleTimeString();

        const data = await new Promise((resolve, reject) => {
            const request = store.get(today);
            request.onsuccess = () => resolve(request.result || { 
                date: today, 
                browserSessions: {}, 
                domains: {} 
            });
            request.onerror = () => reject(request.error);
        });

        if (!data.domains[domain]) {
            data.domains[domain] = {
                favicon: `https://www.google.com/s2/favicons?sz=64&domain=${domain}`,
                totalTimeSpent: 0,
                sessions: []
            };
        }

        const domainData = data.domains[domain];
        const lastSession = domainData.sessions[domainData.sessions.length - 1];

        if (lastSession && lastSession.url === url) {
            lastSession.endTime = now;
            lastSession.timeSpent += 1;
        } else {
            domainData.sessions.push({
                startTime: now,
                endTime: now,
                timeSpent: 1,
                url: url
            });
        }

        domainData.totalTimeSpent += 1;
        store.put(data);
    } catch (error) {
        console.error("Domain tracking error:", error);
    }
}

// ===================== Event Listeners =====================
chrome.runtime.onStartup.addListener(startBrowserSession);
chrome.runtime.onInstalled.addListener(startBrowserSession);
chrome.runtime.onSuspend.addListener(endBrowserSession);

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url) {
            const domain = getDomain(tab.url);
            if (domain) trackDomainSession(domain, tab.url);
        }
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.active) {
        const domain = getDomain(tab.url);
        if (domain) trackDomainSession(domain, tab.url);
    }
});


// Update badge text with the total active time
function updateBadge() {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (activeTabs) => {
        if (!activeTabs.length) return;
        const activeTab = activeTabs[0];
        const domain = getDomain(activeTab.url);

        if (!domain) return;

        const today = getDateString(new Date());
        initIndexedDB().then((db) => {
            const transaction = db.transaction("sessions", "readonly");
            const store = transaction.objectStore("sessions");
            const request = store.get(today);

            request.onsuccess = (event) => {
                const data = event.target.result;
                if (data && data.domains[domain]) {
                    const totalTimeSpent = data.domains[domain].totalTimeSpent;
                    chrome.action.setBadgeText({ text: secondsToString(totalTimeSpent, true) });
                } else {
                    chrome.action.setBadgeText({ text: "0s" });
                }
            };
        });
    });
}

// ===================== Helper Functions =====================
function getDateString(date) {
    return date.toISOString().split('T')[0];
}

function getDomain(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
}

function secondsToString(seconds, compressed = false) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (compressed) {
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
        return `${secs}s`;
    }
    
    return [hours > 0 ? `${hours}h` : '', minutes > 0 ? `${minutes}m` : '', `${secs}s`]
        .filter(Boolean).join(' ');
}

// Initialize session tracking
startBrowserSession();

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        updateTime();
        updateBadge();
    }
});
chrome.tabs.onActivated.addListener(() => {
    updateTime();
    updateBadge();
});