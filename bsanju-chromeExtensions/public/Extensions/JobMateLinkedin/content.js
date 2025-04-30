// Function to highlight matching jobs
function highlightJobs() {
    // Only run on LinkedIn jobs search pages
    if (!window.location.href.includes('linkedin.com/jobs/search')) {
        return;
    }

    // Get current URL to determine what we're searching for
    const url = window.location.href;
    let targetTech = '';
    let specificSkill = '';

    // Check for Java and related skills
    if (url.includes('%22Java%22')) {
        targetTech = 'Java';

        // Check for specific Java skills with proper URL encoding patterns
        if (url.includes('%22Java%22') && url.includes('%22AWS%22')) {
            specificSkill = 'Java & AWS';
        } else if (url.includes('%22Java%22') && url.includes('%22GoLang%22')) {
            specificSkill = 'Java & GoLang';
        } else if (url.includes('%22Java%20FSD%22') || (url.includes('%22Java%22') && url.includes('%22FSD%22'))) {
            specificSkill = 'Java FSD';
        } else if (url.includes('%22Java%22') && url.includes('%22Springboot%22')) {
            specificSkill = 'Java & Springboot';
        }
    }
    // Check for ServiceNow and related skills
    else if (url.includes('%22ServiceNow%22')) {
        targetTech = 'ServiceNow';

        // Check for specific ServiceNow skills with proper URL encoding patterns
        if (url.includes('%22ServiceNow%22') && url.includes('%22Developer%22')) {
            specificSkill = 'ServiceNow Developer';
        } else if (url.includes('%22ServiceNow%22') && url.includes('%22Admin%22')) {
            specificSkill = 'ServiceNow Admin';
        } else if (url.includes('%22ServiceNow%22') && url.includes('%22Developer%22') && url.includes('%22Admin%22')) {
            specificSkill = 'ServiceNow Developer/Admin';
        } else if (url.includes('%22ServiceNow%22') && url.includes('%22ITOM%22')) {
            specificSkill = 'ServiceNow ITOM';
        }
    }
    // Check for VMware and related skills
    else if (url.includes('%22VMware%22')) {
        targetTech = 'VMware';

        // Check for specific VMware skills with proper URL encoding patterns
        if (url.includes('%22Windows%20Server%22') || (url.includes('%22Windows%22') && url.includes('%22Server%22'))) {
            specificSkill = 'Windows Server';
        } else if (url.includes('%22Active%20Directory%22') || (url.includes('%22Active%22') && url.includes('%22Directory%22'))) {
            specificSkill = 'Active Directory';
        } else if (url.includes('%22M365%22')) {
            specificSkill = 'M365';
        } else if (url.includes('%22SCCM%22')) {
            specificSkill = 'SCCM';
        }
    } else {
        return; // Not a search we're targeting
    }

    // Get all job cards
    const jobCards = document.querySelectorAll('.job-card-container');

    jobCards.forEach(card => {
        if (card.hasAttribute('data-processed')) return;
        card.setAttribute('data-processed', 'true');

        const jobTitle = card.querySelector('.job-card-list__title');
        const jobDescription = card.querySelector('.job-card-container__metadata-wrapper');

        if (!jobTitle || !jobDescription) return;

        const fullText = (jobTitle.textContent + ' ' + jobDescription.textContent).toLowerCase();

        // Check if job contains our target tech and is a contract
        const mainTechIncluded = fullText.includes(targetTech.toLowerCase());
        const specificSkillIncluded = specificSkill ? fullText.includes(specificSkill.toLowerCase()) : true;

        if (mainTechIncluded && specificSkillIncluded && fullText.includes('contract')) {
            // Add highlight styles
            card.style.position = 'relative';
            card.style.border = '2px solid #057642';
            card.style.borderRadius = '8px';
            card.style.boxShadow = '0 0 8px rgba(5, 118, 66, 0.3)';

            // Check if badge already exists
            if (!card.querySelector('.matched-job-badge')) {
                // Create badge text
                let badgeText = specificSkill ? `${specificSkill} Contract` : `${targetTech} Contract`;

                // Create badge
                const badge = document.createElement('div');
                badge.className = 'matched-job-badge';
                badge.textContent = badgeText;
                badge.style.position = 'absolute';
                badge.style.top = '10px';
                badge.style.right = '10px';
                badge.style.backgroundColor = '#057642';
                badge.style.color = 'white';
                badge.style.padding = '4px 8px';
                badge.style.borderRadius = '4px';
                badge.style.fontSize = '12px';
                badge.style.fontWeight = 'bold';
                badge.style.zIndex = '900';
                badge.style.maxWidth = '200px';
                badge.style.overflow = 'hidden';
                badge.style.textOverflow = 'ellipsis';
                badge.style.whiteSpace = 'nowrap';

                card.appendChild(badge);
            }
        }
    });
}

// Function to highlight posts with contact info
function highlightPosts() {
    // Only run on LinkedIn content search pages
    if (!window.location.href.includes('linkedin.com/search/results/content')) {
        return;
    }

    // Get all posts
    const posts = document.querySelectorAll('.feed-shared-update-v2');

    posts.forEach(post => {
        if (post.hasAttribute('data-processed')) return;
        post.setAttribute('data-processed', 'true');

        const postText = post.textContent.toLowerCase();
        const postTime = post.querySelector('.feed-shared-actor__sub-description');

        // Check if it has contact info (email/phone)
        const hasEmail = postText.includes('@') && postText.includes('.com');
        const hasPhone = /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(postText);
        const hasContactWord = postText.includes('contact') || postText.includes('reach out') ||
            postText.includes('message me') || postText.includes('dm me');

        // Check if posted in last 24 hours
        let isRecent = false;
        if (postTime) {
            const timeText = postTime.textContent.toLowerCase();
            if (timeText.includes('hour') || timeText.includes('minute') || timeText.includes('second') || timeText.includes('today')) {
                isRecent = true;
            }
        }

        // If it has contact info and is recent, highlight it
        if ((hasEmail || hasPhone || hasContactWord) && isRecent) {
            // Add highlight styles
            post.style.border = '2px solid #0a66c2';
            post.style.borderRadius = '8px';
            post.style.boxShadow = '0 0 8px rgba(10, 102, 194, 0.3)';
            post.style.position = 'relative';

            // Check if badge already exists
            if (!post.querySelector('.contact-info-badge')) {
                // Create badge
                const badge = document.createElement('div');
                badge.className = 'contact-info-badge';
                badge.textContent = 'Contact Info';
                badge.style.position = 'absolute';
                badge.style.top = '10px';
                badge.style.right = '10px';
                badge.style.backgroundColor = '#0a66c2';
                badge.style.color = 'white';
                badge.style.padding = '4px 8px';
                badge.style.borderRadius = '4px';
                badge.style.fontSize = '12px';
                badge.style.fontWeight = 'bold';
                badge.style.zIndex = '900';

                post.appendChild(badge);
            }
        }
    });
}

// Separate function to add the button to keep code DRY
function addTemplateButtonToFooter(messageArea, footer) {
    const templateBtn = document.createElement('button');
    templateBtn.className = 'template-btn msg-form__footer-action';
    templateBtn.innerHTML = `
        <span style="display: flex; align-items: center; padding: 0 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="16" height="16" style="margin-right: 4px;">
                <path d="M15 2v12a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1h12a1 1 0 011 1zM5 4H3v8h2zm8 0H6v2h7zm0 3H6v2h7zm0 3H6v2h7z"></path>
            </svg>
            Templates
        </span>
    `;
    templateBtn.style.background = 'transparent';
    templateBtn.style.border = 'none';
    templateBtn.style.color = '#0a66c2';
    templateBtn.style.cursor = 'pointer';
    templateBtn.style.fontWeight = '600';
    templateBtn.style.display = 'flex';
    templateBtn.style.alignItems = 'center';
    templateBtn.style.marginRight = '8px';

    const actionsContainer = footer.querySelector('.msg-form__right-actions') || footer;
    if (actionsContainer) {
        actionsContainer.insertBefore(templateBtn, actionsContainer.firstChild);
    } else {
        footer.prepend(templateBtn);
    }

    templateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showTemplatesPopup(messageArea);
    });
}

// Function specifically for connection notes
function addTemplateButtonToConnectionNote(noteArea, footer) {
    const templateBtn = document.createElement('button');
    templateBtn.className = 'template-btn';
    templateBtn.innerHTML = `
        <span style="display: flex; align-items: center; padding: 0 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="16" height="16" style="margin-right: 4px;">
                <path d="M15 2v12a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1h12a1 1 0 011 1zM5 4H3v8h2zm8 0H6v2h7zm0 3H6v2h7zm0 3H6v2h7z"></path>
            </svg>
            Templates
        </span>
    `;
    templateBtn.style.background = 'transparent';
    templateBtn.style.border = 'none';
    templateBtn.style.color = '#0a66c2';
    templateBtn.style.cursor = 'pointer';
    templateBtn.style.fontWeight = '600';
    templateBtn.style.display = 'flex';
    templateBtn.style.alignItems = 'center';
    templateBtn.style.marginRight = '8px';
    templateBtn.style.fontSize = '14px';

    footer.appendChild(templateBtn);

    templateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showTemplatesPopupForTextarea(noteArea);
    });
}

// Debounce function to prevent rapid execution
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add template buttons to message boxes - with debouncing
const debouncedAddTemplateButtons = debounce(() => {
    // 1. Regular messaging page
    const regularMessageAreas = document.querySelectorAll('.msg-form__contenteditable[aria-label="Write a message…"]:not([data-templates-added="true"])');

    // 2. Connection invite notes
    const connectionNoteAreas = document.querySelectorAll('#custom-message.connect-button-send-invite__custom-message:not([data-templates-added="true"])');

    // 3. Profile message dialogs
    const profileMessageAreas = document.querySelectorAll('.msg-form__contenteditable[role="textbox"]:not([data-templates-added="true"])');

    // Handle regular message areas - these are working
    regularMessageAreas.forEach((messageArea) => {
        // Mark as processed
        messageArea.setAttribute('data-templates-added', 'true');

        // Find the parent form
        const msgForm = messageArea.closest('.msg-form');
        if (!msgForm) return;

        // Find the footer
        const footer = msgForm.querySelector('.msg-form__footer');
        if (!footer || footer.querySelector('.template-btn')) return;

        addTemplateButtonToFooter(messageArea, footer);
    });

    // Handle connection note areas
    connectionNoteAreas.forEach((noteArea) => {
        // Mark as processed
        noteArea.setAttribute('data-templates-added', 'true');

        // Find the container
        const container = noteArea.closest('.connect-button-send-invite__custom-message-box');
        if (!container) return;

        // Create a custom footer if none exists
        let footer = container.querySelector('.template-footer');
        if (!footer) {
            footer = document.createElement('div');
            footer.className = 'template-footer';
            footer.style.display = 'flex';
            footer.style.justifyContent = 'flex-end';
            footer.style.marginTop = '8px';
            container.appendChild(footer);
        }

        if (footer.querySelector('.template-btn')) return;

        // Add button to connection note
        addTemplateButtonToConnectionNote(noteArea, footer);
    });

    // Handle profile message areas
    profileMessageAreas.forEach((messageArea) => {
        // Mark as processed
        messageArea.setAttribute('data-templates-added', 'true');

        // Find the parent form
        const msgForm = messageArea.closest('.msg-form');
        if (!msgForm) return;

        // Find the footer
        const footer = msgForm.querySelector('.msg-form__footer');
        if (!footer || footer.querySelector('.template-btn')) return;

        addTemplateButtonToFooter(messageArea, footer);
    });
}, 300);

// Show templates popup for contenteditable elements
function showTemplatesPopup(messageArea) {
    // Remove any existing popup
    const existingPopup = document.querySelector('.templates-popup');
    if (existingPopup) {
        existingPopup.remove();
        return;
    }

    // Get templates from storage
    chrome.storage.sync.get('linkedinTemplates', function(data) {
        const templates = data.linkedinTemplates || [];

        if (templates.length === 0) {
            alert('No templates found. Add templates in the extension popup.');
            return;
        }

        // Create popup
        const popup = document.createElement('div');
        popup.className = 'templates-popup';

        // Style popup - make it fixed position
        popup.style.position = 'fixed';  // Changed from 'absolute' to 'fixed'
        popup.style.bottom = '150px';    // Fixed position from bottom
        popup.style.right = '80px';      // Fixed position from right
        popup.style.width = '320px';
        popup.style.maxHeight = '300px';
        popup.style.overflowY = 'auto';
        popup.style.backgroundColor = 'white';
        popup.style.border = '1px solid #e1e9ee';
        popup.style.borderRadius = '8px';
        popup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        popup.style.zIndex = '9999';
        popup.style.padding = '0';

        // Add header
        const header = document.createElement('div');
        header.textContent = 'Quick Reply Templates';
        header.style.padding = '12px 16px';
        header.style.borderBottom = '1px solid #e1e9ee';
        header.style.fontWeight = '600';
        header.style.fontSize = '16px';
        header.style.color = '#000000';
        popup.appendChild(header);

        // Add templates
        const templatesList = document.createElement('div');
        templatesList.style.padding = '8px 0';

        templates.forEach(template => {
            const templateItem = document.createElement('div');
            templateItem.className = 'template-item';
            templateItem.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${template.name}</div>
        <div style="color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px;">
          ${template.content.substring(0, 60)}${template.content.length > 60 ? '...' : ''}
        </div>
      `;

            // Style template item
            templateItem.style.padding = '8px 16px';
            templateItem.style.borderBottom = '1px solid #f3f6f8';
            templateItem.style.cursor = 'pointer';
            templateItem.style.transition = 'background-color 0.2s';

            // Hover effect
            templateItem.addEventListener('mouseover', function() {
                this.style.backgroundColor = '#f3f6f8';
            });

            templateItem.addEventListener('mouseout', function() {
                this.style.backgroundColor = 'transparent';
            });

            // Click event to use template
            templateItem.addEventListener('click', function() {
                insertTemplate(template.content, messageArea);
                popup.remove();
            });

            templatesList.appendChild(templateItem);
        });

        popup.appendChild(templatesList);

        // Append to body
        document.body.appendChild(popup);

        // Close when clicking outside
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && !e.target.closest('.template-btn')) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    });
}

// Modified function for textarea elements
function showTemplatesPopupForTextarea(textArea) {
    // Remove any existing popup
    const existingPopup = document.querySelector('.templates-popup');
    if (existingPopup) {
        existingPopup.remove();
        return;
    }

    // Get templates from storage
    chrome.storage.sync.get('linkedinTemplates', function(data) {
        const templates = data.linkedinTemplates || [];

        if (templates.length === 0) {
            alert('No templates found. Add templates in the extension popup.');
            return;
        }

        // Create popup
        const popup = document.createElement('div');
        popup.className = 'templates-popup';

        // Style popup - fixed position
        popup.style.position = 'fixed';  // Changed from 'absolute' to 'fixed'
        popup.style.bottom = '150px';    // Fixed position from bottom
        popup.style.right = '80px';      // Fixed position from right
        popup.style.width = '320px';
        popup.style.maxHeight = '300px';
        popup.style.overflowY = 'auto';
        popup.style.backgroundColor = 'white';
        popup.style.border = '1px solid #e1e9ee';
        popup.style.borderRadius = '8px';
        popup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        popup.style.zIndex = '9999';
        popup.style.padding = '0';

        // Add header
        const header = document.createElement('div');
        header.textContent = 'Quick Reply Templates';
        header.style.padding = '12px 16px';
        header.style.borderBottom = '1px solid #e1e9ee';
        header.style.fontWeight = '600';
        header.style.fontSize = '16px';
        header.style.color = '#000000';
        popup.appendChild(header);

        // Add templates
        const templatesList = document.createElement('div');
        templatesList.style.padding = '8px 0';

        templates.forEach(template => {
            const templateItem = document.createElement('div');
            templateItem.className = 'template-item';
            templateItem.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${template.name}</div>
        <div style="color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px;">
          ${template.content.substring(0, 60)}${template.content.length > 60 ? '...' : ''}
        </div>
      `;

            // Style template item
            templateItem.style.padding = '8px 16px';
            templateItem.style.borderBottom = '1px solid #f3f6f8';
            templateItem.style.cursor = 'pointer';
            templateItem.style.transition = 'background-color 0.2s';

            // Hover effect
            templateItem.addEventListener('mouseover', function() {
                this.style.backgroundColor = '#f3f6f8';
            });

            templateItem.addEventListener('mouseout', function() {
                this.style.backgroundColor = 'transparent';
            });

            // Click event to use template
            templateItem.addEventListener('click', function() {
                insertTemplateIntoTextarea(template.content, textArea);
                popup.remove();
            });

            templatesList.appendChild(templateItem);
        });

        popup.appendChild(templatesList);

        // Append to body
        document.body.appendChild(popup);

        // Close when clicking outside
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && !e.target.closest('.template-btn')) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    });
}

// Insert template into contenteditable element
function insertTemplate(content, messageArea) {
    messageArea.focus();

    // Insert content
    document.execCommand('insertText', false, content);

    // Trigger input event to activate send button
    const inputEvent = new Event('input', { bubbles: true });
    messageArea.dispatchEvent(inputEvent);
}

// Insert template into textarea
function insertTemplateIntoTextarea(content, textArea) {
    textArea.focus();
    textArea.value = content;

    // Trigger input event to activate send button
    const inputEvent = new Event('input', { bubbles: true });
    textArea.dispatchEvent(inputEvent);

    // Also trigger change event
    const changeEvent = new Event('change', { bubbles: true });
    textArea.dispatchEvent(changeEvent);
}

// Add a new function to show templates when no message box is available
function showTemplatesPopupForClipboard() {
    // Remove any existing popup
    const existingPopup = document.querySelector('.templates-popup');
    if (existingPopup) {
        existingPopup.remove();
        return;
    }

    // Get templates from storage
    chrome.storage.sync.get('linkedinTemplates', function(data) {
        const templates = data.linkedinTemplates || [];

        if (templates.length === 0) {
            alert('No templates found. Add templates in the extension popup.');
            return;
        }

        // Create popup
        const popup = document.createElement('div');
        popup.className = 'templates-popup';

        // Style popup
        popup.style.position = 'fixed'; // Fixed position
        popup.style.bottom = '150px';
        popup.style.right = '80px';
        popup.style.width = '320px';
        popup.style.maxHeight = '300px';
        popup.style.overflowY = 'auto';
        popup.style.backgroundColor = 'white';
        popup.style.border = '1px solid #e1e9ee';
        popup.style.borderRadius = '8px';
        popup.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        popup.style.zIndex = '9999';
        popup.style.padding = '0';

        // Add header
        const header = document.createElement('div');
        header.textContent = 'Quick Reply Templates (Copy to Clipboard)';
        header.style.padding = '12px 16px';
        header.style.borderBottom = '1px solid #e1e9ee';
        header.style.fontWeight = '600';
        header.style.fontSize = '16px';
        header.style.color = '#000000';
        popup.appendChild(header);

        // Add templates
        const templatesList = document.createElement('div');
        templatesList.style.padding = '8px 0';

        templates.forEach(template => {
            const templateItem = document.createElement('div');
            templateItem.className = 'template-item';
            templateItem.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${template.name}</div>
        <div style="color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px;">
          ${template.content.substring(0, 60)}${template.content.length > 60 ? '...' : ''}
        </div>
      `;

            // Style template item
            templateItem.style.padding = '8px 16px';
            templateItem.style.borderBottom = '1px solid #f3f6f8';
            templateItem.style.cursor = 'pointer';
            templateItem.style.transition = 'background-color 0.2s';

            // Hover effect
            templateItem.addEventListener('mouseover', function() {
                this.style.backgroundColor = '#f3f6f8';
            });

            templateItem.addEventListener('mouseout', function() {
                this.style.backgroundColor = 'transparent';
            });

            // Click event to copy to clipboard
            templateItem.addEventListener('click', function() {
                navigator.clipboard.writeText(template.content)
                    .then(() => {
                        // Show feedback
                        const originalBackground = this.style.backgroundColor;
                        this.style.backgroundColor = '#e0f7e9';
                        this.innerHTML += '<div style="color: #057642; font-size: 12px; margin-top: 4px;">✓ Copied to clipboard</div>';

                        setTimeout(() => {
                            this.style.backgroundColor = originalBackground;
                            this.innerHTML = `
                                <div style="font-weight: 600; margin-bottom: 4px;">${template.name}</div>
                                <div style="color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px;">
                                  ${template.content.substring(0, 60)}${template.content.length > 60 ? '...' : ''}
                                </div>
                            `;
                        }, 1500);
                    })
                    .catch(() => {
                        alert('Could not copy to clipboard. Please try again.');
                    });
            });

            templatesList.appendChild(templateItem);
        });

        popup.appendChild(templatesList);

        // Append to body
        document.body.appendChild(popup);

        // Close when clicking outside
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && !e.target.closest('#floating-template-icon')) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    });
}

// Load FontAwesome - only load once
let fontAwesomeLoaded = false;
function loadFontAwesome() {
    if (fontAwesomeLoaded || document.querySelector('link[href*="font-awesome"]')) {
        return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
    document.head.appendChild(link);
    fontAwesomeLoaded = true;
}

// Initialize floating template icon for all LinkedIn pages - with conditional check
function addFloatingTemplateIcon() {
    // Only run on LinkedIn pages
    if (!window.location.href.includes('linkedin.com')) return;

    // Check if icon already exists
    if (document.querySelector('#floating-template-icon')) return;

    const icon = document.createElement('div');
    icon.id = 'floating-template-icon';
    icon.innerHTML = '💬';
    icon.style.position = 'fixed';
    icon.style.bottom = '100px';
    icon.style.right = '20px';
    icon.style.fontSize = '24px';
    icon.style.cursor = 'pointer';
    icon.style.zIndex = '9999';
    icon.style.backgroundColor = '#0a66c2';
    icon.style.color = 'white';
    icon.style.width = '40px';
    icon.style.height = '40px';
    icon.style.borderRadius = '50%';
    icon.style.display = 'flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    icon.style.transition = 'transform 0.2s ease';

    // Add hover effect
    icon.addEventListener('mouseover', () => {
        icon.style.transform = 'scale(1.1)';
    });

    icon.addEventListener('mouseout', () => {
        icon.style.transform = 'scale(1)';
    });

    icon.addEventListener('click', () => {
        // Find any available message area to use with the popup
        const messageAreas = document.querySelectorAll('.msg-form__contenteditable, [contenteditable="true"][aria-label="Write a message…"], textarea.connect-button-send-invite__custom-message');

        if (messageAreas.length > 0) {
            // Check if it's a textarea or contenteditable
            if (messageAreas[0].tagName.toLowerCase() === 'textarea') {
                showTemplatesPopupForTextarea(messageAreas[0]);
            } else {
                showTemplatesPopup(messageAreas[0]);
            }
        } else {
            // If no message area is found, show the templates popup for clipboard
            showTemplatesPopupForClipboard();
        }
    });

    document.body.appendChild(icon);
}

// Handle message from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "insertTemplate" && request.content) {
        // Add more selectors to catch all possible message input areas
        const messageInputs = document.querySelectorAll('.msg-form__contenteditable, [contenteditable="true"][aria-label="Write a message…"], textarea.connect-button-send-invite__custom-message');

        if (messageInputs.length > 0) {
            const input = messageInputs[0];

            if (input.tagName.toLowerCase() === 'textarea') {
                input.focus();
                input.value = request.content;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                input.focus();
                document.execCommand('insertText', false, request.content);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }

            sendResponse({ success: true });
        } else {
            // Copy to clipboard instead if no input field is found
            navigator.clipboard.writeText(request.content)
                .then(() => {
                    sendResponse({ success: true, clipboard: true });
                })
                .catch(() => {
                    sendResponse({ success: false, error: 'Could not copy to clipboard' });
                });
            return true; // Required for async response
        }
    }
});

// Setup the mutation observer for DOM changes - with optimizations
let observer = null;
function setupObserver() {
    if (observer) return; // Only set up once

    observer = new MutationObserver(function(mutations) {
        let shouldProcess = false;

        // Check if any mutations are relevant before processing
        for (let mutation of mutations) {
            if (mutation.type === 'childList' && mutation.addedNodes.length) {
                // Check for specific nodes that might contain message areas
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === 1) { // Element node
                        if (
                            node.querySelector && (
                                node.querySelector('.msg-form__contenteditable') ||
                                node.querySelector('#custom-message') ||
                                node.classList && (
                                    node.classList.contains('msg-form') ||
                                    node.classList.contains('msg-overlay-conversation-bubble')
                                )
                            )
                        ) {
                            shouldProcess = true;
                            break;
                        }
                    }
                }
                if (shouldProcess) break;
            }
        }

        // Only process if relevant nodes were added
        if (shouldProcess) {
            debouncedAddTemplateButtons();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Main initialization function
function init() {
    // Only run these operations once
    loadFontAwesome();
    setupObserver();

    // Functions that need to run on page load or URL change
    highlightJobs();
    highlightPosts();
    debouncedAddTemplateButtons();
    addFloatingTemplateIcon();
}

// Check for URL changes - LinkedIn is a SPA (Single Page Application)
let lastUrl = location.href;
function checkURLChange() {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        setTimeout(init, 500); // Slight delay to let the page render
    }
}

// Set up URL change detection
const urlObserver = new MutationObserver(checkURLChange);
urlObserver.observe(document, { subtree: true, childList: true });

// Add a template button function that directly adds buttons
function addTemplateButtons() {
    debouncedAddTemplateButtons();
}

// Initialize on page load
window.addEventListener('load', init);

// Run immediately for cases where the page is already loaded
init();