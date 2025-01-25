// ===================== IndexedDB Initialization =====================
function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("onWebTrackDB", 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore("sessions", { keyPath: "date" }); // Store sessions by date
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// ===================== Browser Session Tracking =====================
let currentBrowserSession = null;
let lastActivity = null;
let activityInterval = null;
let sessionSaveInterval = null;

// Start a new browser session
function startBrowserSession() {
    const now = new Date();
    const sessionId = `browserSession${now.getTime()}`;
    currentBrowserSession = {
        id: sessionId,
        startTime: now.toLocaleTimeString(), // Start time
        endTime: null, // End time
        totalTimeSpent: 0, // Total time spent in seconds
        activeTime: 0, // Active time in seconds
    };
    lastActivity = Date.now();
    startActivityTracking();

    // Save session data periodically
    sessionSaveInterval = setInterval(() => {
        saveBrowserSession(currentBrowserSession);
    }, 60000); // Save every minute
}

// End the current browser session
function endBrowserSession() {
    if (currentBrowserSession) {
        const now = new Date();
        currentBrowserSession.endTime = now.toLocaleTimeString(); // End time
        currentBrowserSession.totalTimeSpent = Math.floor(
            (now.getTime() - new Date().setHours(...currentBrowserSession.startTime.split(":"))) / 1000
        ); // Calculate total time spent

        stopActivityTracking();
        clearInterval(sessionSaveInterval); // Stop periodic saving
        saveBrowserSession(currentBrowserSession);
        currentBrowserSession = null;
    }
}

// Save browser session to IndexedDB
async function saveBrowserSession(session) {
    const db = await initIndexedDB();
    const transaction = db.transaction("sessions", "readwrite");
    const store = transaction.objectStore("sessions");

    const today = getDateString(new Date());
    const request = store.get(today);

    request.onsuccess = (event) => {
        const data = event.target.result || { date: today, browserSessions: {}, domains: {} };
        data.browserSessions[session.id] = session; // Add browser session to the object
        store.put(data);
    };

    request.onerror = (event) => {
        console.error("Error saving browser session:", event.target.error);
    };
}

// ===================== Active Time Tracking =====================
function startActivityTracking() {
    window.addEventListener("mousemove", resetActivityTimer);
    window.addEventListener("keydown", resetActivityTimer);

    activityInterval = setInterval(() => {
        if (Date.now() - lastActivity < 60000 && currentBrowserSession) {
            currentBrowserSession.activeTime += 1; // Increment active time by 1 second
        }
    }, 1000);
}

function stopActivityTracking() {
    window.removeEventListener("mousemove", resetActivityTimer);
    window.removeEventListener("keydown", resetActivityTimer);
    clearInterval(activityInterval);
}

function resetActivityTimer() {
    lastActivity = Date.now();
}

// ===================== Domain Session Tracking =====================
async function trackDomainSession(domain, url, time) {
    const db = await initIndexedDB();
    const transaction = db.transaction("sessions", "readwrite");
    const store = transaction.objectStore("sessions");

    const today = getDateString(new Date());
    const request = store.get(today);

    request.onsuccess = (event) => {
        const data = event.target.result || { date: today, browserSessions: {}, domains: {} };

        if (!data.domains[domain]) {
            data.domains[domain] = { 
                favicon: `https://www.google.com/s2/favicons?sz=64&domain=${domain}`, 
                totalTimeSpent: 0, 
                sessions: [] 
            };
        }

        const domainData = data.domains[domain];
        const sessions = domainData.sessions;
        const lastSession = sessions[sessions.length - 1];

        if (lastSession && lastSession.url === url) {
            // Extend the last session
            lastSession.endTime = time;
            lastSession.timeSpent += 1; // Increment time spent
        } else {
            // Create a new session
            sessions.push({ startTime: time, endTime: time, timeSpent: 1, url: url });
        }

        // Update total time spent for the domain
        domainData.totalTimeSpent += 1;

        // Save the updated data back to the store
        store.put(data);
    };
}

// ===================== Tab and Focus Event Listeners =====================
function updateTime() {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (activeTabs) => {
        if (!activeTabs.length) return;
        const activeTab = activeTabs[0];
        const domain = getDomain(activeTab.url);
        const url = activeTab.url;

        if (!domain) return;

        const now = new Date().toLocaleTimeString();
        trackDomainSession(domain, url, now);
    });
}

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

// ===================== Service Worker Event Listeners =====================
chrome.runtime.onStartup.addListener(() => {
    startBrowserSession();
});

chrome.runtime.onSuspend.addListener(() => {
    endBrowserSession();
});

chrome.runtime.onInstalled.addListener(() => {
    startBrowserSession();
});

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

// ===================== Interval to Track Activity =====================
setInterval(updateTime, 1000);
setInterval(updateBadge, 1000);

// ===================== Helper Functions =====================
function secondsToString(seconds, compressed = false) {
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    if (compressed) {
        if (hours) return `${hours}h`;
        if (minutes) return `${minutes}m`;
        return `${seconds}s`;
    }

    let timeString = '';
    if (hours) timeString += `${hours} hrs `;
    if (minutes) timeString += `${minutes} min `;
    if (seconds) timeString += `${seconds} sec `;
    return timeString.trim();
}

function getDateString(date) {
    return date.toISOString().split("T")[0];
}

function getDomain(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return null;
    }
}
