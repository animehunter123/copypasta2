// This is where all of our javascript code to make the frontend look nice, as well as the backend for the ./data directory saving to work properly.

// DOM Elements
const modal = document.getElementById('fileModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeBtn = document.querySelector('.close');
const fileInput = document.getElementById('fileInput');
const contentInput = document.getElementById('contentInput');
const saveBtn = document.getElementById('saveBtn');
const contentGrid = document.getElementById('contentGrid');
const languageIndicator = document.getElementById('languageIndicator');

// Stats Elements
const fileCountEl = document.getElementById('fileCount');
const noteCountEl = document.getElementById('noteCount');
const totalSizeEl = document.getElementById('totalSize');

// Store items
let items = [];

// Load items when the page loads
window.addEventListener('load', loadItems);

// Open modal
openModalBtn.addEventListener('click', () => {
    modal.style.display = 'block';
});

// Close modal
closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    clearInputs();
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
        clearInputs();
    }
});

// Auto-detect language as user types
let typingTimer;
contentInput.addEventListener('input', () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(detectLanguage, 500);
});

// Detect programming language from content
function detectLanguage() {
    const content = contentInput.value.trim();
    if (!content) {
        languageIndicator.textContent = '';
        return;
    }

    try {
        const result = hljs.highlightAuto(content);
        const language = result.language || 'text';
        languageIndicator.textContent = language.toUpperCase();
        return { language, highlightedCode: result.value };
    } catch (error) {
        console.error('Error detecting language:', error);
        languageIndicator.textContent = 'TEXT';
        return { language: 'text', highlightedCode: content };
    }
}

// Load items from server
async function loadItems() {
    try {
        const response = await fetch('http://localhost:3000/items');
        const data = await response.json();
        items = data.items;
        
        // Update stats
        updateStats(data.stats);
        
        // Rebuild the content grid
        renderItems();
    } catch (error) {
        console.error('Error loading items:', error);
    }
}

// Update stats display
function updateStats(stats) {
    fileCountEl.textContent = stats.fileCount;
    noteCountEl.textContent = stats.noteCount;
    totalSizeEl.textContent = formatFileSize(stats.totalSize);
}

// Handle save button click
saveBtn.addEventListener('click', async () => {
    const files = fileInput.files;
    const content = contentInput.value.trim();
    
    if (!files.length && !content) {
        alert('Please provide either files or text content');
        return;
    }

    const formData = new FormData();
    
    // Add files if present
    if (files.length > 0) {
        Array.from(files).forEach(file => {
            formData.append('files', file);
        });
    }

    // Add text content if present
    if (content) {
        const { language, highlightedCode } = detectLanguage();
        formData.append('content', content);
        formData.append('language', language);
        formData.append('highlightedContent', highlightedCode);
    }

    try {
        const response = await fetch('http://localhost:3000/upload', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        console.log('Upload successful:', result);

        // Reload items and close modal
        await loadItems();
        modal.style.display = 'none';
        clearInputs();
    } catch (error) {
        console.error('Error uploading:', error);
        alert('Error uploading. Please try again.');
    }
});

// Render items in the content grid
function renderItems() {
    contentGrid.innerHTML = '';
    
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        
        if (item.type === 'file') {
            card.innerHTML = `
                <div class="card-content">
                    <div class="file-icon">${getFileIcon(item.name)}</div>
                    <div class="text-preview">
                        <strong>${item.name}</strong><br>
                        Size: ${formatFileSize(item.size)}<br>
                        Uploaded: ${formatDate(item.timestamp)}
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn primary" onclick="downloadItem('${item.id}')">Download</button>
                    <button class="btn" onclick="deleteItem('${item.id}')">Delete</button>
                </div>
            `;
        } else {
            const content = item.highlightedContent || item.content;
            card.innerHTML = `
                <div class="card-content">
                    <pre><code class="language-${item.language}">${content}</code></pre>
                </div>
                <div class="card-footer">
                    <span class="language-indicator">${item.language.toUpperCase()}</span>
                    <div>
                        <button class="btn primary" onclick="viewNote('${item.id}')">View</button>
                        <button class="btn" onclick="deleteItem('${item.id}')">Delete</button>
                    </div>
                </div>
            `;

            // Initialize syntax highlighting
            const codeBlock = card.querySelector('code');
            hljs.highlightElement(codeBlock);
        }
        
        contentGrid.appendChild(card);
    });
}

// Download or view item
async function downloadItem(id) {
    window.open(`http://localhost:3000/download/${id}`, '_blank');
}

// View note
async function viewNote(id) {
    try {
        const response = await fetch(`http://localhost:3000/download/${id}`);
        const note = await response.json();
        
        // Create a modal to display the full content
        const viewModal = document.createElement('div');
        viewModal.className = 'modal';
        viewModal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <pre><code class="language-${note.language}">${note.content}</code></pre>
                <button class="btn" onclick="copyToClipboard('${note.id}')">Copy Source</button>
            </div>
        `;
        
        document.body.appendChild(viewModal);
        
        // Initialize syntax highlighting
        const codeBlock = viewModal.querySelector('code');
        hljs.highlightElement(codeBlock);
        
        // Show modal
        viewModal.style.display = 'block';
        
        // Handle close button
        const closeBtn = viewModal.querySelector('.close');
        closeBtn.onclick = () => {
            viewModal.remove();
        };
        
        // Handle click outside
        viewModal.onclick = (e) => {
            if (e.target === viewModal) {
                viewModal.remove();
            }
        };
    } catch (error) {
        console.error('Error viewing note:', error);
        alert('Error viewing note. Please try again.');
    }
}

// Copy source code to clipboard
async function copyToClipboard(id) {
    try {
        const response = await fetch(`http://localhost:3000/download/${id}`);
        const note = await response.json();
        await navigator.clipboard.writeText(note.content);
        alert('Source code copied to clipboard!');
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        alert('Error copying to clipboard. Please try again.');
    }
}

// Delete item
async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/items/${id}`, {
            method: 'DELETE'
        });
        await response.json();
        await loadItems();
    } catch (error) {
        console.error('Error deleting item:', error);
        alert('Error deleting item. Please try again.');
    }
}

// Clear modal inputs
function clearInputs() {
    fileInput.value = '';
    contentInput.value = '';
    languageIndicator.textContent = '';
}

// Get file icon based on extension
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        pdf: '📄',
        doc: '📝',
        docx: '📝',
        txt: '📝',
        jpg: '🖼️',
        jpeg: '🖼️',
        png: '🖼️',
        gif: '🖼️',
        mp3: '🎵',
        mp4: '🎥',
        default: '📁'
    };
    return icons[ext] || icons.default;
}

// Format date
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
