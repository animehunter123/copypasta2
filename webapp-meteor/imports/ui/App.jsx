import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import hljs from 'highlight.js';
import '/public/cdn/highlight.js/github.css';
import '/public/cdn/highlight.js/github-dark.css';
import { Items } from '../api/collections';
import loader from "@monaco-editor/loader";
import Editor from "@monaco-editor/react";

// Configure Monaco Editor to use local files
loader.config({
  paths: {
    vs: '/monaco-editor/vs'
  }
});

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
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState(localStorage.getItem('viewMode') || 'grid');
  const [previewLanguage, setPreviewLanguage] = useState('text');
  const [previewContent, setPreviewContent] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, item: null });
  const [deleteNoteContent, setDeleteNoteContent] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [highlightedCardId, setHighlightedCardId] = useState(null);

  // Refs for focus management
  const newItemButtonRef = useRef(null);
  const textareaRef = useRef(null);
  const modalRef = useRef(null);
  const editModalRef = useRef(null);
  const editorRef = useRef(null);
  const deleteModalRef = useRef(null);
  const deleteCloseButtonRef = useRef(null);
  const deleteCancelButtonRef = useRef(null);
  const deleteConfirmButtonRef = useRef(null);
  const fileInputRef = useRef(null);

  // Subscribe to items and get them reactively
  const { items, isLoading } = useTracker(() => {
    const handle = Meteor.subscribe('items');
    // console.log('Subscription ready:', handle.ready());
    
    if (!handle.ready()) {
      return { items: [], isLoading: true };
    }

    const allItems = Items.find({}, { 
      sort: { order: 1 } 
    }).fetch();

    // console.log('Loaded items:', allItems);
    
    return {
      items: allItems,
      isLoading: false
    };
  }, []);

  // Memoize filtered counts
  const filteredCounts = useMemo(() => ({
    all: items.length,
    files: items.filter(item => item.type === 'file').length,
    notes: items.filter(item => item.type === 'note').length
  }), [items]);

  // Memoize filtered items
  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(item => 
      filter === 'files' ? item.type === 'file' : item.type === 'note'
    );
  }, [items, filter]);

  // Stats calculation
  const stats = useTracker(() => {
    const handle = Meteor.subscribe('items');
    if (!handle.ready()) return { totalSize: 0, totalItems: 0, expiredItems: 0, diskSpace: null };

    // Use the existing items array instead of making new queries
    const totalSize = items.reduce((acc, item) => acc + (item.originalSize || 0), 0);
    const totalItems = items.length;
    const now = new Date();
    const expiredItems = items.filter(item => new Date(item.expiresAt) < now).length;
    const diskSpace = diskSpaceVar.get();
    
    return {
      totalSize,
      totalItems,
      expiredItems,
      diskSpace
    };
  }, [items]);

  // Separate effect for disk space updates
  useEffect(() => {
    const updateDiskSpace = () => {
      Meteor.call('system.getDiskSpace', (err, result) => {
        if (!err && result) {
          diskSpaceVar.set(result);
        }
      });
    };

    // Update disk space initially and every 5 minutes
    updateDiskSpace();
    const interval = setInterval(updateDiskSpace, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Define handlers before useEffect
  const findMostRecentTextCard = () => {
    // Use the filtered and sorted items
    const sortedItems = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Find the first note type card
    return sortedItems.find(item => item.type === 'note' && item.isText);
  };

  const copyToClipboard = (text) => {
    // Try using the Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    
    // Fallback method using textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';  // Prevent scrolling to bottom
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful ? Promise.resolve() : Promise.reject('Copy command failed');
    } catch (err) {
      document.body.removeChild(textarea);
      return Promise.reject(err);
    }
  };

  const handleCopyRecentTextCard = () => {
    const recentTextCard = findMostRecentTextCard();
    if (recentTextCard) {
      const content = recentTextCard.content || recentTextCard.text || '';
      copyToClipboard(content).then(() => {
        // Visual feedback - highlight the card
        setHighlightedCardId(recentTextCard._id);
        setTimeout(() => {
          setHighlightedCardId(null);
        }, 1000);
        showToast('Most recent text card copied to clipboard');
      }).catch(err => {
        // console.error('Failed to copy:', err);
        showToast('Failed to copy content', 'error');
      });
    } else {
      showToast('No text card found', 'error');
    }
  };

  // Memoize the keyboard handler to prevent recreating on every render
  const handleKeyPress = useCallback((e) => {
    // Only trigger if not in an input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.key.toLowerCase() === 'n') {
      setModalOpen(true);
    } else if (e.key.toLowerCase() === 'd') {
      handleDeleteAll();
    } else if (e.key === '?') {
      setHelpModalOpen(true);
    } else if (e.key.toLowerCase() === 'c') {
      handleCopyRecentTextCard();
    }
  }, [handleCopyRecentTextCard]); // Only depends on the copy handler

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (modalOpen) {
          handleModalClose();
        }
        if (editModalOpen) {
          setEditModalOpen(false);
          setEditingItem(null);
          setEditModalContent({ content: '', language: 'plaintext' });
        }
        // Focus the New Item button
        if (newItemButtonRef.current) {
          newItemButtonRef.current.focus();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [modalOpen, editModalOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.filter-dropdown')) {
        setIsFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchNoteContent = async () => {
      if (deleteConfirmation.isOpen && deleteConfirmation.item?.type === 'note') {
        try {
          const content = await Meteor.callAsync('items.getNoteContent', deleteConfirmation.item.id);
          setDeleteNoteContent(content);
        } catch (error) {
          // console.error('Error fetching note content:', error);
          showToast('Failed to load note content', 'error');
        }
      } else {
        setDeleteNoteContent('');
      }
    };
    fetchNoteContent();
  }, [deleteConfirmation.isOpen, deleteConfirmation.item]);

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
      ? '/public/cdn/highlight.js/github-dark.css'
      : '/public/cdn/highlight.js/github.css';
    
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
        if (item.filePath) {
          // For files stored on filesystem, fetch directly
          fetch(`/files/${item.fileName}`)
            .then(response => response.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = item.fileName;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            })
            .catch(error => {
              // console.error('Download error:', error);
              showToast('Failed to download file', 'error');
            });
          return;
        } else {
          // For binary files stored in MongoDB
          const buffer = new Uint8Array(item.content);
          content = buffer;
          type = item.fileType;
        }
      }

      // For text files and small binary files in MongoDB
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
      // console.error('Download error:', error);
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
        // console.error('Error decoding file content:', error);
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
      await Meteor.callAsync('items.remove', item.id);
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
        setIsUploading(true);
        setUploadProgress(0);
        
        // Create a promise to handle file reading
        const readFile = () => new Promise((resolve, reject) => {
          const reader = new FileReader();
          
          reader.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = (event.loaded / event.total) * 50; // First 50% for reading
              setUploadProgress(progress);
            }
          };
          
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => reject(reader.error);
          
          if (fileInput.type.startsWith('text/') || 
              ['application/json', 'application/javascript', 'application/xml'].includes(fileInput.type)) {
            reader.readAsText(fileInput);
          } else {
            reader.readAsArrayBuffer(fileInput);
          }
        });

        try {
          const content = await readFile();
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
            setIsUploading(false);
            setUploadProgress(0);
            return;
          }

          // Start upload progress simulation for server upload (remaining 50%)
          const startProgress = 50;
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return 90;
              }
              return prev + 5;
            });
          }, 100);
          
          try {
            await Meteor.callAsync('files.insert', data);
            clearInterval(progressInterval);
            setUploadProgress(100);
            
            // Wait a moment to show 100% before closing
            await new Promise(resolve => setTimeout(resolve, 200));
            
            setModalOpen(false);
            setContentInput('');
            setFileInput(null);
            setIsUploading(false);
            setUploadProgress(0);
            
            // Focus the New Item button after successful upload
            if (newItemButtonRef.current) {
              newItemButtonRef.current.focus();
            }
          } catch (error) {
            clearInterval(progressInterval);
            // console.error('Upload error:', error);
            showToast('Failed to upload file', 'error');
            setIsUploading(false);
            setUploadProgress(0);
          }
        } catch (error) {
          // console.error('File reading error:', error);
          showToast('Failed to read file', 'error');
          setIsUploading(false);
          setUploadProgress(0);
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
        // Focus the New Item button after successful upload
        if (newItemButtonRef.current) {
          newItemButtonRef.current.focus();
        }
      }
    } catch (error) {
      // console.error('Error submitting:', error);
      showToast('Error uploading content: ' + error.message, 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editModalContent.content.trim()) return;

    try {
      const data = {
        id: editingItem.id,
        content: editModalContent.content,
        language: editModalContent.language
      };
      await Meteor.callAsync('items.edit', data);
      setEditModalOpen(false);
      setEditingItem(null);
      setEditModalContent({ content: '', language: 'plaintext' });
    } catch (error) {
      // console.error('Error saving edit:', error);
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
          id: editingItem.id,
          content: updatedContent,
          language: detectLanguage(updatedContent)
        }, (error) => {
          if (error) {
            // console.error('Error updating item:', error);
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
            // console.error('Error inserting note:', error);
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
      const itemIds = filteredItems.map(item => item._id);
      const fromIndex = itemIds.indexOf(draggedItem._id);
      const toIndex = itemIds.indexOf(dragOverItem._id);
      
      // Reorder the array
      const newOrder = [...itemIds];
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, draggedItem._id);
      
      // Clear drag state before making the async call
      setDraggedItem(null);
      setDragOverItem(null);
      
      try {
        await Meteor.callAsync('items.reorderAll', newOrder);
      } catch (error) {
        // console.error('Error reordering items:', error);
        showToast('Failed to reorder items', 'error');
      }
    } else {
      setDraggedItem(null);
      setDragOverItem(null);
    }
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    // Only update dragOverItem if it's actually changing
    if (item._id !== draggedItem?._id && item._id !== dragOverItem?._id) {
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
        className={`content-card ${isExpiring ? 'expiring' : ''} ${
          highlightedCardId === item._id ? 'highlight-copy' : ''
        }`}
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

  useEffect(() => {
    if (deleteConfirmation.isOpen) {
      // Focus the delete button when modal opens
      if (deleteConfirmButtonRef.current) {
        deleteConfirmButtonRef.current.focus();
      }

      // Restore focus to new item button when modal closes
      return () => {
        if (newItemButtonRef.current) {
          newItemButtonRef.current.focus();
        }
      };
    }
  }, [deleteConfirmation.isOpen]);

  useEffect(() => {
    // Save view mode preference
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  const handleModalKeyDown = useCallback((e) => {
    if (modalOpen) {
      if (e.key === 'Escape') {
        handleModalClose();
      } else if (e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          setIsUploadMode(false);
        } else if (e.key === '2') {
          e.preventDefault();
          setIsUploadMode(true);
        }
      }
    }
  }, [modalOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleModalKeyDown);
    return () => document.removeEventListener('keydown', handleModalKeyDown);
  }, [handleModalKeyDown]);

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
          <h1 className="title" 
          onClick={() => window.location.reload()} 
  title="Click to refresh page">CopyPasta</h1>
          <div className={`filter-dropdown ${isFilterDropdownOpen ? 'open' : ''}`}>
            <button 
              className="filter-dropdown-btn"
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
            >
              {filter === 'all' ? 'All' : filter === 'files' ? 'Files' : 'Notes'}
              <span className="material-symbols-rounded">expand_more</span>
            </button>
            <div className="filter-dropdown-content">
              <button
                className={`filter-option ${filter === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setFilter('all');
                  setIsFilterDropdownOpen(false);
                }}
              >
                All ({filteredCounts.all})
              </button>
              <button
                className={`filter-option ${filter === 'files' ? 'active' : ''}`}
                onClick={() => {
                  setFilter('files');
                  setIsFilterDropdownOpen(false);
                }}
              >
                Files ({filteredCounts.files})
              </button>
              <button
                className={`filter-option ${filter === 'notes' ? 'active' : ''}`}
                onClick={() => {
                  setFilter('notes');
                  setIsFilterDropdownOpen(false);
                }}
              >
                Notes ({filteredCounts.notes})
              </button>
            </div>
          </div>
          <span className="size-badge">
            Total Size: {formatBytes(stats.totalSize)}
            {stats.diskSpace && 
              <span className="disk-space">
                {` / ${formatBytes(stats.diskSpace.available)} `}
              </span>
            }
          </span>
        </div>

        <div className="nav-group">
          <button
            className="icon-btn"
            onClick={() => setHelpModalOpen(true)}
            aria-label="Help"
            title="Help (Press '?' key)"
          >
            <span className="material-symbols-rounded">help</span>
          </button>
          <button
            className="danger-btn"
            onClick={handleDeleteAll}
            title="Delete All Items (Press 'D' key)"
          >
            <span className="material-symbols-rounded">delete_forever</span>
            
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
            className="btn-icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            title={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
          >
            <span className="material-symbols-rounded">
              {viewMode === 'grid' ? 'view_list' : 'grid_view'}
            </span>
          </button>
          <button
            className="success-btn"
            onClick={handleCopyRecentTextCard}
            title="Copy Recent Text Card (Press 'C' key)"
          >
            <span className="material-symbols-rounded">content_copy</span>
            {/* Copy Recent Text */}
          </button>
          <button
            autoFocus
            className="primary-btn"
            onClick={() => setModalOpen(true)}
            ref={newItemButtonRef}
            aria-label="Create New Item"
            title="Create New Item (Press 'N' key)"
          >
            <span className="material-symbols-rounded">add</span>
            
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
        <div className="modal-overlay" onClick={(e) => handleClickOutside(e, modalRef, handleModalClose)}>
          <div className="modal" ref={modalRef}>
            <div className="modal-header">
              <h2>New Card</h2>
              <button className="close-button" onClick={handleModalClose}>
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="new-card-modal">
              <div className="input-type-selector">
                <button
                  type="button"
                  className={`input-type-button ${!isUploadMode ? 'active' : ''}`}
                  onClick={() => {
                    setIsUploadMode(false);
                    setFileInput(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  title="Text Note (Alt+1)"
                >
                  <span className="material-symbols-rounded">edit_note</span>
                  Text Note
                </button>
                <button
                  type="button"
                  className={`input-type-button ${isUploadMode ? 'active' : ''}`}
                  onClick={() => {
                    setIsUploadMode(true);
                    setContentInput('');
                    if (editorRef.current) {
                      editorRef.current.setValue('');
                    }
                    fileInputRef.current?.click();
                  }}
                  title="Upload File (Alt+2)"
                >
                  <span className="material-symbols-rounded">upload_file</span>
                  Upload File
                </button>
              </div>

              <div className="input-area">
                {!isUploadMode ? (
                  <>
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
                    {contentInput && (
                      <div className="status-message info">
                        <span className="material-symbols-rounded">info</span>
                        Click Save to create your text note
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        const MAX_FILE_SIZE = 50 * 1024 * 1024;
                        if (file.size > MAX_FILE_SIZE) {
                          alert('File size must be under 50MB');
                          e.target.value = '';
                          setFileInput(null);
                          return;
                        }
                        setFileInput(file);
                        setContentInput('');
                        if (editorRef.current) {
                          editorRef.current.setValue('');
                        }
                      }}
                      accept="*"
                    />
                    {fileInput ? (
                      <>
                        <div className="file-info">
                          <span className="material-symbols-rounded">description</span>
                          {fileInput.name}
                          <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {(fileInput.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                        <div className="status-message info">
                          <span className="material-symbols-rounded">info</span>
                          Click Upload to save this file
                        </div>
                      </>
                    ) : (
                      <div
                        className="upload-area"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.dataTransfer.files[0];
                          if (file) {
                            setFileInput(file);
                            setIsUploadMode(true);
                          }
                        }}
                      >
                        <span className="material-symbols-rounded">upload_file</span>
                        <div className="upload-instructions">
                          <span className="main-text">Click to select a file</span>
                          <span className="file-size-limit">Maximum file size: 50MB</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={handleModalClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={!contentInput.trim() && !fileInput}
                >
                  <span className="material-symbols-rounded">
                    {fileInput ? 'upload' : 'save'}
                  </span>
                  {fileInput ? 'Upload' : 'Save'}
                </button>
                {isUploading && (
                  <div className="upload-progress">
                    <span>Uploading...</span>
                    <progress value={uploadProgress} max="100" />
                    <span>{uploadProgress}%</span>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmation.isOpen && (
        <div 
          className="modal-overlay" 
          onClick={(e) => handleClickOutside(e, deleteModalRef, () => setDeleteConfirmation({ isOpen: false, item: null }))}
        >
          <div 
            className="modal" 
            ref={deleteModalRef}
            role="dialog"
            aria-labelledby="delete-modal-title"
            aria-modal="true"
            tabIndex="-1"
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const focusableElements = [
                  deleteCloseButtonRef.current,
                  deleteCancelButtonRef.current,
                  deleteConfirmButtonRef.current
                ].filter(Boolean);

                const currentIndex = focusableElements.indexOf(document.activeElement);
                let nextIndex;

                if (e.shiftKey) {
                  nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
                } else {
                  nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
                }

                focusableElements[nextIndex].focus();
              }
              if (e.key === 'Escape') {
                setDeleteConfirmation({ isOpen: false, item: null });
              }
            }}
          >
            <div className="modal-header">
              <h2 id="delete-modal-title">Confirm Delete</h2>
              <button 
                className="close-button" 
                onClick={() => setDeleteConfirmation({ isOpen: false, item: null })}
                ref={deleteCloseButtonRef}
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to delete this {deleteConfirmation.item?.type || 'item'}?</p>
              {deleteConfirmation.item?.fileName && (
                <p className="filename"><strong>{deleteConfirmation.item.fileName}</strong></p>
              )}
              {deleteConfirmation.item?.type === 'note' && (
                <pre className="delete-note-content">
                  <code className={`language-${detectLanguage(deleteNoteContent)}`}>
                    {deleteNoteContent}
                  </code>
                </pre>
              )}
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="secondary-btn" 
                onClick={() => setDeleteConfirmation({ isOpen: false, item: null })}
                ref={deleteCancelButtonRef}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="danger-btn" 
                onClick={handleDeleteConfirm}
                ref={deleteConfirmButtonRef}
                style={{ border: '0.5px solid rgba(255, 255, 255, 0.8)' }}
              >
                <span className="material-symbols-rounded">delete</span>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {helpModalOpen && (
        <div className="modal-overlay" onClick={() => setHelpModalOpen(false)}>
          <div className="modal help-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Need help on using CopyPasta?</h2>
              <button
                className="close-btn"
                onClick={() => setHelpModalOpen(false)}
                aria-label="Close"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="modal-content">
              <div className="help-section">
                <h3>Main Screen</h3>
                <ul>
                  <li>You can Drag & Drop cards to reorder cards.</li>
                  <li><kbd>d</kbd> Delete all cards forcefully</li>
                  <li><kbd>n</kbd> Create a new card</li>
                  <li><kbd>c</kbd> Copy the text of most recent text card</li>
                </ul>
              </div>
              <div className="help-section">
                <h3>Card Edit Screen</h3>
                <ul>
                  <li>Type in the text area code or paste text.</li>
                  <li><kbd>F1</kbd> Open Command Palette</li>
                  <li><kbd>Ctrl</kbd> + <kbd>Enter</kbd> Save</li>
                  <li><kbd>Alt</kbd> + <kbd>1</kbd> Switch to Text Note</li>
                  <li><kbd>Alt</kbd> + <kbd>2</kbd> Switch to File Upload</li>
                  <li><kbd>Esc</kbd> Cancel editing</li>
                </ul>
              </div>

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

      <div className={`content-cards ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
        {filteredItems.map(renderCard)}
      </div>
      <div className="stats">
        <span>Total Size: {formatBytes(stats.totalSize)}
          {stats.diskSpace && 
            <span className="disk-space">
              {` / ${formatBytes(stats.diskSpace.available)} `}
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
