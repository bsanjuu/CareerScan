// ✅ Updated popup.js with separate search options

document.addEventListener('DOMContentLoaded', function() {
    // Tab functionality
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });

    // Set up all the search buttons
    setupSearchButtons();

    // Template logic
    loadTemplates();
    document.getElementById('add-template').addEventListener('click', () => showTemplateForm('add'));
    document.getElementById('cancel-template').addEventListener('click', hideTemplateForm);
    document.getElementById('save-template').addEventListener('click', () => {
        const name = document.getElementById('template-name').value.trim();
        const content = document.getElementById('template-content').value.trim();
        if (!name || !content) return alert('Please fill in both fields');
        saveTemplate(name, content);
        hideTemplateForm();
        loadTemplates();
    });
});

// Setup search buttons for each technology and specific skill
// Setup search buttons for each technology and specific skill
function setupSearchButtons() {
    // Java buttons
    document.getElementById('javaPostBtn').addEventListener('click', () => openTabWithURL('Java', true));
    document.getElementById('javaJobBtn').addEventListener('click', () => openTabWithURL('Java', false));

    // Java specific skill buttons - Add Posts buttons too
    document.getElementById('javaAwsPostBtn').addEventListener('click', () => openTabWithURL('Java & AWS', true));
    document.getElementById('javaAwsJobBtn').addEventListener('click', () => openTabWithURL('Java & AWS', false));

    document.getElementById('javaGolangPostBtn').addEventListener('click', () => openTabWithURL('Java & GoLang', true));
    document.getElementById('javaGolangJobBtn').addEventListener('click', () => openTabWithURL('Java & GoLang', false));

    document.getElementById('javaFsdPostBtn').addEventListener('click', () => openTabWithURL('Java FSD', true));
    document.getElementById('javaFsdJobBtn').addEventListener('click', () => openTabWithURL('Java FSD', false));

    document.getElementById('javaSpringbootPostBtn').addEventListener('click', () => openTabWithURL('Java & Springboot', true));
    document.getElementById('javaSpringbootJobBtn').addEventListener('click', () => openTabWithURL('Java & Springboot', false));

    // ServiceNow buttons
    document.getElementById('serviceNowPostBtn').addEventListener('click', () => openTabWithURL('ServiceNow', true));
    document.getElementById('serviceNowJobBtn').addEventListener('click', () => openTabWithURL('ServiceNow', false));

    // ServiceNow specific skill buttons - Add Posts buttons too
    document.getElementById('serviceNowDevPostBtn').addEventListener('click', () => openTabWithURL('ServiceNow Developer', true));
    document.getElementById('serviceNowDevJobBtn').addEventListener('click', () => openTabWithURL('ServiceNow Developer', false));

    document.getElementById('serviceNowAdminPostBtn').addEventListener('click', () => openTabWithURL('ServiceNow Admin', true));
    document.getElementById('serviceNowAdminJobBtn').addEventListener('click', () => openTabWithURL('ServiceNow Admin', false));

    document.getElementById('serviceNowDevAdminPostBtn').addEventListener('click', () => openTabWithURL('ServiceNow Developer/Admin', true));
    document.getElementById('serviceNowDevAdminJobBtn').addEventListener('click', () => openTabWithURL('ServiceNow Developer/Admin', false));

    document.getElementById('serviceNowItomPostBtn').addEventListener('click', () => openTabWithURL('ServiceNow ITOM', true));
    document.getElementById('serviceNowItomJobBtn').addEventListener('click', () => openTabWithURL('ServiceNow ITOM', false));

    // VMware buttons
    document.getElementById('vmwarePostBtn').addEventListener('click', () => openTabWithURL('VMware', true));
    document.getElementById('vmwareJobBtn').addEventListener('click', () => openTabWithURL('VMware', false));

    // VMware specific skill buttons - Add Posts buttons too
    document.getElementById('windowsServerPostBtn').addEventListener('click', () => openTabWithURL('Windows Server', true));
    document.getElementById('windowsServerJobBtn').addEventListener('click', () => openTabWithURL('Windows Server', false));

    document.getElementById('activeDirectoryPostBtn').addEventListener('click', () => openTabWithURL('Active Directory', true));
    document.getElementById('activeDirectoryJobBtn').addEventListener('click', () => openTabWithURL('Active Directory', false));

    document.getElementById('m365PostBtn').addEventListener('click', () => openTabWithURL('M365', true));
    document.getElementById('m365JobBtn').addEventListener('click', () => openTabWithURL('M365', false));

    document.getElementById('sccmPostBtn').addEventListener('click', () => openTabWithURL('SCCM', true));
    document.getElementById('sccmJobBtn').addEventListener('click', () => openTabWithURL('SCCM', false));
}

function openTabWithURL(keyword, isPost) {
    let searchKeyword = keyword;

    // Handle multi-word keywords by properly quoting each part
    if (keyword.includes('&')) {
        const parts = keyword.split('&').map(part => part.trim());
        searchKeyword = parts.map(part => `"${part}"`).join(' & ');
    } else {
        searchKeyword = `"${keyword}"`;
    }

    const baseUrl = isPost ?
        `https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=${encodeURIComponent(searchKeyword)}%20%22Hiring%22%20(email%20OR%20phone%20OR%20contact)&origin=FACETED_SEARCH&sortBy=%22date_posted%22`
        : `https://www.linkedin.com/jobs/search/?f_JT=C&f_TPR=r86400&keywords=${encodeURIComponent(searchKeyword)}&sortBy=DD&spellCorrectionEnabled=true`;

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.update(tabs[0].id, {url: baseUrl});
    });
}

function loadTemplates() {
    chrome.storage.sync.get('linkedinTemplates', function(data) {
        const templates = data.linkedinTemplates || [];
        const templateList = document.getElementById('template-list');
        templateList.innerHTML = '';

        if (templates.length === 0) {
            const defaultTemplates = [
                {
                    name: 'Thank You for Connecting',
                    content: 'Hi [Name], Thanks for connecting! Looking forward to staying in touch.'
                },
                {
                    name: 'Job Follow-up',
                    content: 'Hi [Recruiter], just following up on my application for [Position] at [Company]. Thanks again!'
                }
            ];
            chrome.storage.sync.set({ linkedinTemplates: defaultTemplates }, loadTemplates);
            return;
        }

        templates.forEach((template, index) => {
            const div = document.createElement('div');
            div.className = 'template-item';
            div.innerHTML = `
                <div class="template-title">
                    ${template.name}
                    <div class="template-actions">
                        <span class="template-action edit-template" data-index="${index}"><i class="fas fa-edit"></i></span>
                        <span class="template-action delete-template" data-index="${index}"><i class="fas fa-trash"></i></span>
                    </div>
                </div>
                <div class="template-preview">${template.content.substring(0, 100)}${template.content.length > 100 ? '...' : ''}</div>
            `;
            div.addEventListener('click', function(e) {
                if (!e.target.closest('.template-action')) useTemplate(template.content);
            });
            templateList.appendChild(div);
        });

        document.querySelectorAll('.edit-template').forEach(btn => btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const idx = this.dataset.index;
            editTemplate(idx);
        }));

        document.querySelectorAll('.delete-template').forEach(btn => btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const idx = this.dataset.index;
            deleteTemplate(idx);
        }));
    });
}

function saveTemplate(name, content) {
    chrome.storage.sync.get('linkedinTemplates', function(data) {
        const templates = data.linkedinTemplates || [];
        const editIndex = document.getElementById('save-template').getAttribute('data-edit-index');
        if (editIndex) templates[editIndex] = { name, content };
        else templates.push({ name, content });
        chrome.storage.sync.set({ linkedinTemplates: templates });
    });
}

function editTemplate(index) {
    chrome.storage.sync.get('linkedinTemplates', function(data) {
        const t = data.linkedinTemplates[index];
        document.getElementById('template-name').value = t.name;
        document.getElementById('template-content').value = t.content;
        document.getElementById('form-title').textContent = 'Edit Template';
        document.getElementById('save-template').setAttribute('data-edit-index', index);
        showTemplateForm('edit');
    });
}

function deleteTemplate(index) {
    if (!confirm('Are you sure you want to delete this template?')) return;
    chrome.storage.sync.get('linkedinTemplates', function(data) {
        const templates = data.linkedinTemplates;
        templates.splice(index, 1);
        chrome.storage.sync.set({ linkedinTemplates: templates }, loadTemplates);
    });
}

function useTemplate(content) {
    navigator.clipboard.writeText(content).then(function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "insertTemplate",
                content: content
            }, function (response) {
                if (chrome.runtime.lastError) {
                    alert("Open a LinkedIn messaging tab before using a template.");
                    return;
                }
                if (response && response.success) {
                    window.close();
                } else {
                    alert("Template copied to clipboard. Message box not found.");
                }
            });
        });
    }).catch(() => alert('Could not copy template to clipboard.'));
}

function showTemplateForm(mode) {
    document.getElementById('template-list').style.display = 'none';
    document.getElementById('add-template').style.display = 'none';
    document.getElementById('template-form').style.display = 'block';
    if (mode === 'add') {
        document.getElementById('form-title').textContent = 'Add Template';
        document.getElementById('template-name').value = '';
        document.getElementById('template-content').value = '';
        document.getElementById('save-template').removeAttribute('data-edit-index');
    }
}

function hideTemplateForm() {
    document.getElementById('template-list').style.display = 'block';
    document.getElementById('add-template').style.display = 'block';
    document.getElementById('template-form').style.display = 'none';
}