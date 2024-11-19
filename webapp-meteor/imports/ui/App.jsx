import React, { useState, useEffect, useRef } from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/github-dark.css';
import { Items } from '../api/collections';
import Editor from "@monaco-editor/react";

// Constants
const EXPIRATION_DAYS = 14;
const MAX_PREVIEW_LENGTH = 500;

// Create a reactive variable for disk space
const diskSpaceVar = new ReactiveVar(null);

export default function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [fileInput, setFileInput] = useState(null);
  const [contentInput, setContentInput] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [editModalContent, setEditModalContent] = useState({ content: '', language: 'plaintext' });
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [filter, setFilter] = useState('all');
  const [previewLanguage, setPreviewLanguage] = useState('text');
  const [previewContent, setPreviewContent] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, item: null });
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  // Refs for focus management
  const newItemButtonRef = useRef(null);
  const textareaRef = useRef(null);
  const modalRef = useRef(null);
  const editModalRef = useRef(null);
  const editorRef = useRef(null);

  // Subscribe to items and get them reactively
  const { items, isLoading } = useTracker(() => {
    const handle = Meteor.subscribe('items');
    
    return {
      items: Items.find({}, { sort: { createdAt: -1 } }).fetch(),
      isLoading: !handle.ready()
    };
  }, []);

  const itemsWithOrder = useTracker(() => {
    return Items.find({}, { sort: { order: 1 } }).fetch();
  });

  // Stats calculation
  const stats = useTracker(() => {
    const totalSize = Items.find({}).fetch().reduce((acc, item) => acc + (item.originalSize || 0), 0);
    const totalItems = Items.find({}).count();
    const expiredItems = Items.find({ expiresAt: { $lt: new Date() } }).count();

    // Get disk space info
    Meteor.call('system.getDiskSpace', (err, result) => {
      if (!err && result) {
        diskSpaceVar.set(result);
      }
    });

    const diskSpace = diskSpaceVar.get();
    
    return {
      totalSize,
      totalItems,
      expiredItems,
      diskSpace
    };
  }, []);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
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
      setLanguage('plaintext');
      setPreviewLanguage('plaintext');
      setPreviewContent('');
    }
  }, [contentInput]);

  // Focus the New Item button on mount
  useEffect(() => {
    // Use a small timeout to ensure the button is mounted
    const timeoutId = setTimeout(() => {
      if (newItemButtonRef.current) {
        newItemButtonRef.current.focus();
      }
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  // Handle keyboard shortcuts
  const handleNewItemKeyPress = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setModalOpen(true);
    }
  };

  // Focus textarea when modal opens
  useEffect(() => {
    if (modalOpen) {
      setTimeout(() => editorRef.current?.focus(), 100);
    } else {
      newItemButtonRef.current?.focus();
    }
  }, [modalOpen]);

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
        // For binary files, create a Uint8Array directly from the content
        const buffer = new Uint8Array(item.content);
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
    let content = item.content;
    
    // If it's a file, we need to ensure the content is a string
    if (item.type === 'file' && typeof content !== 'string') {
      try {
        // Try to convert ArrayBuffer to string if needed
        content = new TextDecoder().decode(content);
      } catch (error) {
        console.error('Error decoding file content:', error);
        content = String(content); // Fallback to basic string conversion
      }
    }

    const detectedLang = detectLanguage(content);
    setEditModalContent({ 
      content: content, 
      language: detectedLang 
    });
    setEditingItem(item);
    setEditModalOpen(true);
  };

  // Delete content
  const handleDeleteConfirm = async () => {
    try {
      const item = deleteConfirmation.item;
      await Meteor.callAsync('items.remove', item._id);
      showToast('Item deleted successfully');
      setDeleteConfirmation({ isOpen: false, item: null });
    } catch (error) {
      showToast('Failed to delete item', 'error');
    }
  };

  // Delete all content
  const handleDeleteAll = async () => {
    try {
      await Meteor.callAsync('items.removeAll');
      showToast('All items deleted successfully');
    } catch (error) {
      showToast('Failed to delete all items', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

      if (fileInput) {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
          const content = e.target.result;
          const isText = fileInput.type.startsWith('text/') || 
                        ['application/json', 'application/javascript', 'application/xml'].includes(fileInput.type);
          
          const data = {
            content: isText ? content : new Uint8Array(content),
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
            alert('File size must be under 50MB');
            event.target.value = ''; // Reset file input
            setFileInput(null);
            return;
          }
          
          await Meteor.callAsync('files.insert', data);
          setModalOpen(false);
          setContentInput('');
          setFileInput(null);
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
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert('Error uploading content: ' + error.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editModalContent.content.trim()) return;

    try {
      const data = {
        _id: editingItem._id,
        content: editModalContent.content,
        language: editModalContent.language
      };
      await Meteor.callAsync('items.edit', data);
      setEditModalOpen(false);
      setEditingItem(null);
      setEditModalContent({ content: '', language: 'plaintext' });
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
    if (!content) return 'plaintext';
    
    // Common language patterns
    const patterns = {
      javascript: {
        keywords: [
          'function', 'const ', 'let ', 'var ', '=>', 'return ',
          'module.exports', 'export ', 'console.log', 'import ',
          'class ', 'new ', 'this.', 'async ', 'await ',
          'Promise', 'setTimeout', 'document.', 'window.',
          '.addEventListener', '.then(', '.catch('
        ],
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      },
      python: {
        keywords: [
          'def ', 'class ', 'import ', 'from ', 'if __name__',
          'print(', 'return ', '@', 'self.', 'async def',
          'raise ', 'except:', 'try:', 'with ', 'as ',
          'lambda ', 'yield ', '__init__'
        ],
        extensions: ['.py', '.pyw']
      },
      html: {
        keywords: [
          '<html', '</html>', '<div', '<body', '<!DOCTYPE',
          '<script', '<style', '<link', '<meta', '<head',
          '<title', '<p>', '<span', '<a href', '<img'
        ],
        extensions: ['.html', '.htm']
      },
      css: {
        keywords: [
          '@media', '@import', '@keyframes', '{', 'margin:',
          'padding:', 'display:', 'color:', 'background:',
          'font-', 'border:', '.class', '#id', ':hover',
          'flex', 'grid'
        ],
        extensions: ['.css', '.scss', '.sass']
      },
      cpp: {
        keywords: [
          '#include', 'int main', 'std::', 'cout', 'cin',
          'void', 'template<', 'namespace', 'class ', 'public:',
          'private:', 'protected:', 'vector<', 'string'
        ],
        extensions: ['.cpp', '.hpp', '.cc', '.h']
      },
      rust: {
        keywords: [
          'fn ', 'pub ', 'use ', 'mod ', 'impl ', 'struct ',
          'enum ', 'let mut', 'match ', 'Option<', 'Result<',
          'async ', 'await', '-> '
        ],
        extensions: ['.rs']
      },
      go: {
        keywords: [
          'package ', 'func ', 'import (', 'type ', 'struct {',
          'interface {', 'go ', 'chan ', 'defer ', 'select ',
          'var ', 'const '
        ],
        extensions: ['.go']
      },
      java: {
        keywords: [
          'public class', 'private ', 'protected ', 'package ',
          'import java', 'extends ', 'implements ', '@Override',
          'System.out', 'new ', 'void ', 'static '
        ],
        extensions: ['.java']
      },
      php: {
        keywords: [
          '<?php', '<?=', 'namespace ', 'use ', 'function',
          'public function', 'private function', '$this->',
          'echo ', 'require ', 'include '
        ],
        extensions: ['.php']
      },
      ruby: {
        keywords: [
          'def ', 'class ', 'require ', 'module ', 'attr_',
          'initialize', 'end', 'puts ', 'yield ', 'super',
          'include ', 'extend '
        ],
        extensions: ['.rb']
      },
      sql: {
        keywords: [
          'SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ', 'CREATE TABLE',
          'ALTER TABLE', 'DROP TABLE', 'WHERE ', 'JOIN ', 'GROUP BY',
          'ORDER BY', 'HAVING '
        ],
        extensions: ['.sql']
      },
      markdown: {
        keywords: [
          '# ', '## ', '### ', '```', '---', '- [ ]',
          '* ', '> ', '[', '](', '**', '__', '|'
        ],
        extensions: ['.md', '.markdown']
      },
      json: {
        keywords: [
          '{', '[', '":', '}', ']', 'null', 'true', 'false'
        ],
        extensions: ['.json']
      },
      yaml: {
        keywords: [
          '---', 'apiVersion:', 'kind:', '- name:', 'spec:',
          'metadata:', 'containers:', 'volumes:', 'env:'
        ],
        extensions: ['.yml', '.yaml']
      }
    };

    // Check content against patterns
    for (const [lang, pattern] of Object.entries(patterns)) {
      // Look for multiple matches to increase confidence
      const matches = pattern.keywords.filter(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      );
      
      // If we find multiple matches (more confident) or a very specific match
      if (matches.length >= 2 || 
          pattern.keywords.some(k => k.length > 10 && content.toLowerCase().includes(k.toLowerCase()))) {
        return lang;
      }
    }

    // If no strong matches found, try to detect based on common patterns
    if (content.includes('console.log') || content.includes('function') || content.includes('=>')) {
      return 'javascript';
    }
    if (content.includes('def ') || content.includes('print(')) {
      return 'python';
    }
    if (content.startsWith('<') || content.includes('</')) {
      return 'html';
    }
    if (content.includes('{') && content.includes(':')) {
      return content.includes('"') ? 'json' : 'css';
    }

    return 'plaintext';
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    // Restore autofocus
    editor.focus();
    
    // Add command for Ctrl+Enter
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (editModalOpen && editingItem) {
        // For edit modal
        const updatedContent = editor.getValue();
        Meteor.call('items.edit', {
          _id: editingItem._id,
          content: updatedContent,
          language: detectLanguage(updatedContent)
        }, (error) => {
          if (error) {
            console.error('Error updating item:', error);
          } else {
            setEditModalOpen(false);
            setEditingItem(null);
            // Focus back on new card button
            if (newItemButtonRef.current) {
              newItemButtonRef.current.focus();
            }
          }
        });
      } else {
        // For new card modal
        const content = editor.getValue();
        if (!content.trim()) return;
        
        const now = new Date();
        const expiresAt = new Date(now.getTime() + EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

        Meteor.call('notes.insert', {
          content: content,
          language: detectLanguage(content),
          originalSize: new TextEncoder().encode(content).length,
          createdAt: now,
          expiresAt: expiresAt,
          type: 'note'
        }, (error) => {
          if (error) {
            console.error('Error inserting note:', error);
          } else {
            setModalOpen(false);
            setContentInput('');
            // Focus back on new card button
            if (newItemButtonRef.current) {
              newItemButtonRef.current.focus();
            }
          }
        });
      }
    });
  };

  const handleEditorChange = (value) => {
    if (editModalOpen) {
      setEditModalContent(prev => ({ 
        ...prev, 
        content: value,
        language: detectLanguage(value)
      }));
    } else {
      setContentInput(value);
      setLanguage(detectLanguage(value));
    }
  };

  const handleDoubleClick = (item) => {
    const detectedLang = detectLanguage(item.content);
    setEditModalContent({ 
      content: item.content, 
      language: detectedLang 
    });
    setEditingItem(item);
    setEditModalOpen(true);
  };

  const handleNavigate = (item) => {
    if (!item || !item.content) return;
    
    let url = item.content.trim();
    // Add https:// if no protocol is specified
    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = async (e) => {
    e.currentTarget.classList.remove('dragging');
    if (draggedItem && dragOverItem && draggedItem._id !== dragOverItem._id) {
      const itemIds = itemsWithOrder.map(item => item._id);
      const fromIndex = itemIds.indexOf(draggedItem._id);
      const toIndex = itemIds.indexOf(dragOverItem._id);
      
      // Reorder the array
      const newOrder = [...itemIds];
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, draggedItem._id);
      
      try {
        await Meteor.callAsync('items.reorderAll', newOrder);
      } catch (error) {
        showToast('Failed to reorder items: ' + error.message, 'error');
      }
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    if (item._id !== draggedItem?._id) {
      setDragOverItem(item);
    }
  };

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
        key={item._id}
        className={`content-card ${isExpiring ? 'expiring' : ''}`}
        draggable="true"
        onDragStart={(e) => handleDragStart(e, item)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, item)}
        onDoubleClick={handleCardDoubleClick}
      >
        <div className="card-header">
          <div className="card-type">
            <span className="material-symbols-rounded">
              {item.type === 'file' ? 'description' : 'note'}
            </span>
            <span title={item.fileName || 'Note'}>{truncateFileName(item.fileName) || 'Note'}</span>
          </div>
          <div className="card-actions">
            {item.type === 'note' && (
              <button
                className="card-btn navigate"
                onClick={() => handleNavigate(item)}
                title="Navigate to URL"
              >
                <span className="material-symbols-rounded">open_in_new</span>
              </button>
            )}
            {item.isText && (
              <button
                className="card-btn copy"
                onClick={() => handleCopy(item)}
                title="Copy content"
              >
                <span className="material-symbols-rounded">content_copy</span>
              </button>
            )}
            {item.isText && (
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
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmation({ isOpen: true, item });
              }}
              title="Delete"
            >
              <span className="material-symbols-rounded">delete</span>
            </button>
          </div>
        </div>
        {item.type === 'file' ? (
          <div className="card-content file-content">
            <div className="filename">
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
            <div className="info-group">
              <span className="material-symbols-rounded">folder</span>
              <span>{formatSize(item.originalSize)}</span>
            </div>
            <div className={`info-group expiration ${isExpiring ? 'expiring' : ''}`}>
              <span className="material-symbols-rounded">timer</span>
              <span>
                {daysRemaining > 0 
                  ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`
                  : 'Expiring soon'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Truncate filename if it's too long
  const truncateFileName = (fileName, maxLength = 25) => {
    if (!fileName || fileName.length <= maxLength) return fileName;
    
    const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
    const nameWithoutExt = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;
    
    const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 3) + '...';
    return extension ? `${truncatedName}.${extension}` : truncatedName;
  };

  // Handle modal close
  const handleModalClose = () => {
    setModalOpen(false);
    setContentInput('');
    setFileInput(null);
    if (editorRef.current) {
      editorRef.current.setValue('');
    }
  };

  // Handle click outside modal
  const handleClickOutside = (event, modalRef, closeModal) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      handleModalClose();
      // Return focus to New Item button
      if (newItemButtonRef.current) {
        newItemButtonRef.current.focus();
      }
    }
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
          <div className="filter-dropdown">
            <button className="filter-dropdown-btn">
              {filter === 'all' ? 'All' : filter === 'files' ? 'Files' : 'Notes'}
              <span className="material-symbols-rounded">expand_more</span>
            </button>
            <div className="filter-dropdown-content">
              <button
                className={`filter-option ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({items.length})
              </button>
              <button
                className={`filter-option ${filter === 'files' ? 'active' : ''}`}
                onClick={() => setFilter('files')}
              >
                Files ({items.filter(i => i.type === 'file').length})
              </button>
              <button
                className={`filter-option ${filter === 'notes' ? 'active' : ''}`}
                onClick={() => setFilter('notes')}
              >
                Notes ({items.filter(i => i.type === 'note').length})
              </button>
            </div>
          </div>
          <span className="size-badge">
            Total Size: {formatBytes(stats.totalSize)}
            {stats.diskSpace && 
              <span className="disk-space">
                {` / ${formatBytes(stats.diskSpace.total)}`}
              </span>
            }
          </span>
        </div>

        <div className="nav-group">
          <button
            className="danger-btn"
            onClick={handleDeleteAll}
            title="Delete All Items"
          >
            <span className="material-symbols-rounded">delete_forever</span>
            <span className="btn-text">Delete All</span>
          </button>
          <button
            className="theme-btn"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <span className="material-symbols-rounded">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <button
            autoFocus
            className="primary-btn"
            onClick={() => setModalOpen(true)}
            ref={newItemButtonRef}
            onKeyDown={handleNewItemKeyPress}
            aria-label="Create New Item"
          >
            <span className="material-symbols-rounded">add</span>
            <span className="btn-text">New Item</span>
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
        <div className="modal-overlay" onClick={(e) => handleClickOutside(e, modalRef, () => handleModalClose())}>
          <div className="modal" ref={modalRef}>
            <div className="modal-header">
              <h2>Add Content</h2>
              <div className="modal-hint">F1 to Open Command Palette, and Ctrl+Enter to Save</div>
              <button className="close-button" onClick={handleModalClose}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <form className="modal-content" onSubmit={handleSubmit}>
              <div className="upload-area">
                <label className="upload-label">
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;

                      // 50MB size limit
                      const MAX_FILE_SIZE = 50 * 1024 * 1024;
                      
                      if (file.size > MAX_FILE_SIZE) {
                        alert('File size must be under 50MB');
                        e.target.value = ''; // Reset file input
                        setFileInput(null);
                        return;
                      }
                      setFileInput(file);
                    }}
                    accept="*"
                  />
                  <span className="material-symbols-rounded">upload_file</span>
                  <span>{fileInput ? fileInput.name : 'Click to upload a file'}</span>
                </label>
              </div>
              
              <div className="separator">
                <span>or paste content</span>
              </div>

              <div className="editor-container">
                <Editor
                  height="300px"
                  defaultLanguage="plaintext"
                  language={language}
                  value={contentInput}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  onChange={handleEditorChange}
                  onMount={handleEditorMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'Fira Code', monospace",
                    fontLigatures: true,
                    lineNumbers: 'on',
                    roundedSelection: true,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: 'on',
                    quickSuggestions: true,
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnEnter: "on",
                    tabCompletion: "on",
                    contextmenu: true,
                    scrollbar: {
                      useShadows: false,
                      verticalScrollbarSize: 10,
                      horizontalScrollbarSize: 10
                    }
                  }}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={handleModalClose}>
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

      {deleteConfirmation.isOpen && (
        <div className="modal-overlay" onClick={(e) => handleClickOutside(e, modalRef, () => setDeleteConfirmation({ isOpen: false, item: null }))}>
          <div className="modal" ref={modalRef}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="close-button" onClick={() => setDeleteConfirmation({ isOpen: false, item: null })}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to delete this {deleteConfirmation.item?.type || 'item'}?</p>
              {deleteConfirmation.item?.fileName && (
                <p className="filename"><strong>{deleteConfirmation.item.fileName}</strong></p>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-btn" onClick={() => setDeleteConfirmation({ isOpen: false, item: null })}>
                Cancel
              </button>
              <button type="button" className="danger-btn" onClick={handleDeleteConfirm}>
                <span className="material-symbols-rounded">delete</span>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="modal-overlay" onClick={(e) => {
          // Only close if clicking the overlay itself, not the modal content
          if (e.target === e.currentTarget) {
            setEditModalOpen(false);
            setEditingItem(null);
            setEditModalContent({ content: '', language: 'plaintext' });
          }
        }}>
          <div className="modal edit-modal" ref={editModalRef}>
            <div className="modal-header">
              <div className="modal-title">
                <span className="material-symbols-rounded">
                  {editingItem?.type === 'file' ? 'description' : 'edit_note'}
                </span>
                <h2>Edit {editingItem?.type === 'file' ? 'File' : 'Note'}</h2>
              </div>
              <div className="modal-hint">F1 to Open Command Palette, and Ctrl+Enter to Save</div>
              <button 
                className="close-button"
                onClick={() => setEditModalOpen(false)}
                title="Close"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            
            <div className="modal-content">
              {editingItem?.type === 'file' ? (
                <>
                  <div className="editor-wrapper">
                    <Editor
                      height="400px"
                      defaultLanguage={editingItem.language || 'plaintext'}
                      value={String(editingItem.content || '')}
                      theme={theme === 'dark' ? 'vs-dark' : 'light'}
                      options={{
                        readOnly: true,
                        renderValidationDecorations: 'off',
                      }}
                    />
                    <div className="editor-message">Cannot edit in read-only editor</div>
                  </div>
                </>
              ) : (
                <Editor
                  height="400px"
                  defaultLanguage={editingItem?.language || 'plaintext'}
                  value={String(editModalContent?.content || '')}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  onChange={(value) => setEditModalContent(prev => ({
                    ...prev,
                    content: value,
                    language: detectLanguage(value)
                  }))}
                  onMount={handleEditorMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "'Fira Code', monospace",
                    fontLigatures: true,
                    lineNumbers: 'on',
                    roundedSelection: true,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    wordWrap: 'on',
                    quickSuggestions: true,
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnEnter: "on",
                    tabCompletion: "on",
                    contextmenu: true,
                    scrollbar: {
                      useShadows: false,
                      verticalScrollbarSize: 10,
                      horizontalScrollbarSize: 10
                    }
                  }}
                />
              )}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="secondary-btn" 
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingItem(null);
                  setEditModalContent({ content: '', language: 'plaintext' });
                }}
              >
                Cancel
              </button>
              {editingItem?.type === 'file' ? (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    const blob = new Blob([editingItem.content], { type: 'text/plain' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = editingItem.fileName || 'download.txt';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    setEditModalOpen(false);
                  }}
                >
                  <span className="material-symbols-rounded">download</span>
                  Download File
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleSaveEdit}
                >
                  <span className="material-symbols-rounded">save</span>
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="content-grid">
        {itemsWithOrder.filter(item => {
          if (filter === 'all') return true;
          if (filter === 'files') return item.type === 'file';
          if (filter === 'notes') return item.type === 'note';
          return true;
        }).map(renderCard)}
      </div>
      <div className="stats">
        <span>Total Size: {formatBytes(stats.totalSize)}
          {stats.diskSpace && 
            <span className="disk-space">
              {` / ${formatBytes(stats.diskSpace.total)}`}
            </span>
          }
        </span>
        <span>Items: {stats.totalItems}</span>
        {stats.expiredItems > 0 && (
          <span className="expired">
            Expired: {stats.expiredItems}
          </span>
        )}
      </div>
    </div>
  );
}
