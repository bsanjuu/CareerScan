document.addEventListener('DOMContentLoaded', async () => {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = '<div class="loading">Loading contacts...</div>';

    // Load contacts from storage
    const loadContacts = async () => {
        try {
            const data = await new Promise((resolve, reject) => {
                chrome.storage.local.get(['csvData'], result => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(result);
                    }
                });
            });

            const csvData = data.csvData || '';
            const hasData = csvData.split('\n').length > 2;

            if (hasData) {
                const contactCount = csvData.split('\n').length - 2;
                contentDiv.innerHTML = `
                    <div class="summary">
                        <p>${contactCount} contacts extracted</p>
                        <div class="actions">
                            <button id="view" class="btn">View All</button>
                            <button id="download" class="btn primary">Download CSV</button>
                            <button id="clear" class="btn danger">Clear All</button>
                        </div>
                        <div id="status"></div>
                    </div>
                `;

                document.getElementById('view').addEventListener('click', () => {
                    chrome.tabs.create({
                        url: 'data:text/html,<pre>' + encodeURIComponent(csvData) + '</pre>'
                    });
                });

                document.getElementById('download').addEventListener('click', () => {
                    // Create download link and trigger click
                    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'recruiter_contacts.csv';

                    // Append to body, trigger click, then remove
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);

                    // Revoke the object URL
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                });

                document.getElementById('clear').addEventListener('click', async () => {
                    document.getElementById('status').innerHTML = '<p class="info">Clearing data...</p>';
                    await new Promise(resolve => {
                        chrome.storage.local.clear(resolve);
                    });
                    contentDiv.innerHTML = '<p class="success">All contacts cleared</p>';
                    setTimeout(() => location.reload(), 1000);
                });
            } else {
                contentDiv.innerHTML = `
                    <div class="empty-state">
                        <p>No contacts extracted yet</p>
                        <button id="extract" class="btn primary">Extract Contacts</button>
                        <div id="status"></div>
                    </div>
                `;

                document.getElementById('extract').addEventListener('click', async () => {
                    const [tab] = await new Promise(resolve => {
                        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
                    });

                    if (!tab) {
                        document.getElementById('status').innerHTML = '<p class="error">No active tab found</p>';
                        return;
                    }

                    const isSupportedEmail = tab.url?.includes('mail.google.com') ||
                        tab.url?.includes('outlook.live.com') ||
                        tab.url?.includes('outlook.office.com');

                    if (isSupportedEmail) {
                        document.getElementById('status').innerHTML = '<p class="info">Extracting contacts...</p>';
                        try {
                            await new Promise(resolve => {
                                chrome.scripting.executeScript({
                                    target: { tabId: tab.id },
                                    files: ['content.js']
                                }, resolve);
                            });
                            document.getElementById('status').innerHTML = '<p class="success">Extraction started! Keep the email tab open.</p>';
                        } catch (error) {
                            document.getElementById('status').innerHTML = `<p class="error">Failed to start extraction: ${error.message}</p>`;
                        }
                    } else {
                        document.getElementById('status').innerHTML = '<p class="error">Please open Gmail or Outlook first</p>';
                    }
                });
            }
        } catch (error) {
            contentDiv.innerHTML = `
                <p class="error">Failed to load contacts: ${error.message}</p>
                <button id="retry" class="btn primary">Retry</button>
            `;
            document.getElementById('retry').addEventListener('click', () => location.reload());
        }
    };

    await loadContacts();
});