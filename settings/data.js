// Export Data
function exportData() {
    chrome.storage.local.get(null, data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'onWebTrack-data.json';
        a.click();
        URL.revokeObjectURL(url);
    });
}

// Import Data
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.addEventListener('change', event => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => {
                const data = JSON.parse(e.target.result);
                chrome.storage.local.set(data, () => {
                    console.log('Data imported');
                });
            };
            reader.readAsText(file);
        }
    });
    input.click();
}

// Clear Data
function clearData() {
    chrome.storage.local.clear(() => {
        console.log('Data cleared');
    });
}

export { exportData, importData, clearData };
