import React, { useState, useEffect } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/github-dark.css';

// Constants
const EXPIRATION_DAYS = 14;
const MAX_PREVIEW_LENGTH = 500;

export const App = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [fileInput, setFileInput] = useState(null);
  const [contentInput, setContentInput] = useState('');
  const [language, setLanguage] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [filter, setFilter] = useState('all');
  const [previewLanguage, setPreviewLanguage] = useState('text');
  const [previewContent, setPreviewContent] = useState('');
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [toasts, setToasts] = useState([]);

  // Load items
  const loadItems = async () => {
    try {
      const allItems = await Meteor.callAsync('items.getAll');
      setItems(allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading items:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // Reload items every minute
    const interval = setInterval(loadItems, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Stats calculation
  const stats = {
    files: items.filter(item => item.type === 'file').length,
    notes: items.filter(item => item.type === 'note').length,
    totalSize: items.reduce((acc, item) => acc + (item.originalSize || 0), 0)
  };

  useEffect(() => {
    // Set theme on load and when it changes
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Switch highlight.js theme
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = theme === 'dark' 
      ? '/packages/highlightjs/styles/github-dark.css'
      : '/packages/highlightjs/styles/github.css';
    
    // Remove any existing highlight.js styles
    document.querySelectorAll('link[href*="highlightjs"]').forEach(el => el.remove());
    document.head.appendChild(style);
  }, [theme]);

  useEffect(() => {
    // Clean up expired items on mount and every hour
    const cleanExpiredItems = async () => {
      await Meteor.callAsync('items.cleanExpired');
    };

    cleanExpiredItems();
    const interval = setInterval(cleanExpiredItems, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (contentInput) {
      const detectedLanguage = detectLanguage(contentInput);
      setLanguage(detectedLanguage);
      setPreviewLanguage(detectedLanguage);
      setPreviewContent(contentInput);
    } else {
      setLanguage('text');
      setPreviewLanguage('text');
      setPreviewContent('');
    }
  }, [contentInput]);

  // Show a toast notification
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.map(toast => 
        toast.id === id ? { ...toast, removing: true } : toast
      ));
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, 300);
    }, 3000);
  };

  // Copy content to clipboard
  const handleCopy = async (item) => {
    try {
      await navigator.clipboard.writeText(item.content);
      showToast('Content copied to clipboard');
    } catch (error) {
      showToast('Failed to copy content', 'error');
    }
  };

  // Download content
  const handleDownload = (item) => {
    try {
      let content = item.content;
      let type = 'text/plain';
      
      if (!item.isText) {
        content = atob(item.content); // Decode base64
        const buffer = new Uint8Array(content.length);
        for (let i = 0; i < content.length; i++) {
          buffer[i] = content.charCodeAt(i);
        }
        content = buffer;
        type = item.fileType;
      }

      const blob = new Blob([content], { type });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.fileName || 'note.txt';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Content download started');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download content', 'error');
    }
  };

  // Edit content
  const handleEdit = (item) => {
    setEditingItem(item);
    setEditContent(item.content);
    setEditModalOpen(true);
  };

  // Delete content
  const handleDelete = async (item) => {
    try {
      await Meteor.call('items.remove', item.id);
      await loadItems();  // Reload items after successful deletion
      showToast('Item deleted successfully');
    } catch (error) {
      showToast('Failed to delete item', 'error');
    }
  };

  // Delete all content
  const handleDeleteAll = async () => {
    try {
      await Meteor.call('items.removeAll');
      await loadItems();  // Reload items after deletion
      showToast('All items deleted successfully');
    } catch (error) {
      showToast('Failed to delete all items', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contentInput.trim() && !fileInput) {
      alert('Please provide either text content or a file');
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (EXPIRATION_DAYS * 24 * 60 * 60 * 1000));

    try {
      if (fileInput) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = e.target.result;
          const isText = fileInput.type.startsWith('text/') || 
                        ['application/json', 'application/javascript', 'application/xml'].includes(fileInput.type);
          
          const data = {
            content: isText ? content : btoa(content), // Base64 encode binary files
            fileName: fileInput.name,
            fileType: fileInput.type || 'application/octet-stream',
            language: isText ? detectLanguage(content) : 'binary',
            originalSize: fileInput.size,
            createdAt: now,
            expiresAt: expiresAt,
            type: 'file',
            isText: isText
          };
          
          if (fileInput.size > 50 * 1024 * 1024) { // 50MB limit
            throw new Error('File size must be under 50MB');
          }
          
          await Meteor.callAsync('files.insert', data);
          setModalOpen(false);
          setContentInput('');
          setFileInput(null);
          loadItems(); // Reload items after insert
        };
        
        if (fileInput.type.startsWith('text/') || 
            ['application/json', 'application/javascript', 'application/xml'].includes(fileInput.type)) {
          reader.readAsText(fileInput);
        } else {
          reader.readAsArrayBuffer(fileInput);
        }
      }

      if (contentInput.trim()) {
        const data = {
          content: contentInput,
          language: detectLanguage(contentInput),
          originalSize: contentInput.length,
          createdAt: now,
          expiresAt: expiresAt,
          type: 'note'
        };
        await Meteor.callAsync('notes.insert', data);
        setModalOpen(false);
        setContentInput('');
        setFileInput(null);
        loadItems(); // Reload items after insert
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Error uploading content: ' + error.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editContent.trim()) return;

    try {
      const now = new Date();
      const data = {
        content: editContent,
        language: detectLanguage(editContent),
        originalSize: editContent.length,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        type: editingItem.type
      };

      if (editingItem.type === 'file') {
        data.fileName = editingItem.fileName;
      }

      // Remove the old item
      await Meteor.callAsync('items.remove', editingItem.id);

      // Save the updated item
      if (editingItem.type === 'file') {
        await Meteor.callAsync('files.insert', data);
      } else {
        await Meteor.callAsync('notes.insert', data);
      }

      setEditModalOpen(false);
      setEditingItem(null);
      setEditContent('');
      loadItems();
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('Error saving edit: ' + error.message);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getDaysRemaining = (expiresAt) => {
    const now = new Date();
    const diff = new Date(expiresAt) - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const detectLanguage = (content) => {
    if (!content) return 'text';
    const result = hljs.highlightAuto(content);
    return result.language || 'text';
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'files') return item.type === 'file';
    if (filter === 'notes') return item.type === 'note';
    return true;
  });

  const renderCard = (item) => {
    const daysRemaining = getDaysRemaining(item.expiresAt);
    const isExpiring = daysRemaining <= 3;

    const handleCardDoubleClick = (e) => {
      // Don't trigger if clicking on action buttons
      if (e.target.closest('.card-actions')) {
        return;
      }
      handleEdit(item);
    };

    return (
      <div 
        key={item.id} 
        className={`content-card ${isExpiring ? 'expiring' : ''}`}
        onDoubleClick={handleCardDoubleClick}
      >
        <div className="card-header">
          <div className="card-type">
            <span className="material-symbols-rounded">
              {item.type === 'file' ? 'description' : 'note'}
            </span>
            <span>{item.fileName || 'Note'}</span>
          </div>
          <div className="card-actions">
            {(item.isText !== false) && (
              <button
                className="card-btn copy"
                onClick={() => handleCopy(item)}
                title="Copy content"
              >
                <span className="material-symbols-rounded">content_copy</span>
              </button>
            )}
            {(item.isText !== false) && (
              <button
                className="card-btn edit"
                onClick={() => handleEdit(item)}
                title="Edit content"
              >
                <span className="material-symbols-rounded">edit</span>
              </button>
            )}
            <button
              className="card-btn download"
              onClick={() => handleDownload(item)}
              title="Download content"
            >
              <span className="material-symbols-rounded">download</span>
            </button>
            <button
              className="card-btn delete"
              onClick={() => handleDelete(item)}
              title="Delete content"
            >
              <span className="material-symbols-rounded">delete</span>
            </button>
          </div>
        </div>
        {item.type === 'file' ? (
          <div className="card-content file-content">
            <div className="filename">
              <span className="material-symbols-rounded">description</span>
              {item.fileName}
              <div className="file-info">
                <span className="file-type">{item.fileType}</span>
              </div>
            </div>
          </div>
        ) : (
          <pre className="card-content">
            <code className={`language-${item.language}`}>
              {item.content.length > MAX_PREVIEW_LENGTH
                ? item.content.slice(0, MAX_PREVIEW_LENGTH) + '...'
                : item.content}
            </code>
          </pre>
        )}
        <div className="card-footer">
          <div className="card-info">
            <span>{formatSize(item.originalSize)}</span>
            {isExpiring && (
              <div className="expiration-warning">
                <span className="material-symbols-rounded">timer</span>
                <span>Expires in {daysRemaining} days</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="loading">
        <span className="material-symbols-rounded">sync</span>
      </div>
    );
  }

  return (
    <div className="container">
      <nav className="navbar">
        <div className="nav-group">
          <h1 className="title">CopyPasta</h1>
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({items.length})
          </button>
          <button
            className={`filter-btn ${filter === 'files' ? 'active' : ''}`}
            onClick={() => setFilter('files')}
          >
            Files ({items.filter(i => i.type === 'file').length})
          </button>
          <button
            className={`filter-btn ${filter === 'notes' ? 'active' : ''}`}
            onClick={() => setFilter('notes')}
          >
            Notes ({items.filter(i => i.type === 'note').length})
          </button>
          <span className="size-badge">
            Total Size: {formatSize(items.reduce((acc, item) => acc + item.originalSize, 0))}
          </span>
        </div>

        <div className="nav-group">
          <button
            className="danger-btn"
            onClick={handleDeleteAll}
            title="Delete All Items"
          >
            <span className="material-symbols-rounded">delete_forever</span>
            Delete All
          </button>
          <button
            className="theme-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span className="material-symbols-rounded">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <button
            className="primary-btn"
            onClick={() => setModalOpen(true)}
          >
            <span className="material-symbols-rounded">add</span>
            New Item
          </button>
        </div>
      </nav>

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type} ${toast.removing ? 'removing' : ''}`}>
            <span className="material-symbols-rounded">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            {toast.message}
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Content</h2>
              <button className="close-button" onClick={() => setModalOpen(false)}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <form className="modal-content" onSubmit={handleSubmit}>
              <div className="upload-area">
                <label className="upload-label">
                  <input
                    type="file"
                    onChange={(e) => setFileInput(e.target.files[0])}
                    accept="*"
                  />
                  <span className="material-symbols-rounded">upload_file</span>
                  <span>{fileInput ? fileInput.name : 'Click to upload a file'}</span>
                </label>
              </div>
              
              <div className="separator">
                <span>or paste content</span>
              </div>

              <textarea
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                placeholder="Enter text content..."
              />

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={!contentInput.trim() && !fileInput}>
                  <span className="material-symbols-rounded">upload</span>
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Content</h2>
              <button className="close-button" onClick={() => {
                setEditModalOpen(false);
                setEditingItem(null);
                setEditContent('');
              }}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <form className="modal-content" onSubmit={handleSaveEdit}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Edit content here..."
              />
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => {
                  setEditModalOpen(false);
                  setEditingItem(null);
                  setEditContent('');
                }}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={!editContent.trim()}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="content-grid">
        {filteredItems.map(renderCard)}
      </div>
    </div>
  );
};
