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

/**
 * Adds pointer-based dragging to a modal while leaving its native CSS resize
 * handle available. The modal's header is the drag handle.
 *
 * Keep this hook independent of the modal's contents so Monaco and normal
 * form controls continue to receive their own pointer/keyboard events.
 */
function useDraggableModal(modalRef, isOpen) {
  useEffect(() => {
    const modal = modalRef.current;
    if (!isOpen || !modal) return undefined;

    const header = modal.querySelector('.modal-header');
    if (!header) return undefined;

    let dragState = null;

    const onPointerDown = (event) => {
      // Only the header starts a drag; don't hijack clicks on its buttons.
      if (event.button !== 0 || event.target.closest('button, a, input, select, textarea')) {
        return;
      }

      const rect = modal.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
      };

      // Switch from centered flex layout to fixed coordinates on first drag.
      modal.style.position = 'fixed';
      modal.style.left = `${rect.left}px`;
      modal.style.top = `${rect.top}px`;
      modal.style.right = 'auto';
      modal.style.bottom = 'auto';
      modal.style.width = `${rect.width}px`;
      modal.style.height = `${rect.height}px`;
      modal.style.margin = '0';
      modal.style.transform = 'none';

      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event) => {
      if (!dragState || event.pointerId !== dragState.pointerId) return;

      const maxLeft = Math.max(0, window.innerWidth - modal.offsetWidth);
      const maxTop = Math.max(0, window.innerHeight - modal.offsetHeight);
      const nextLeft = Math.min(maxLeft, Math.max(0, dragState.left + event.clientX - dragState.startX));
      const nextTop = Math.min(maxTop, Math.max(0, dragState.top + event.clientY - dragState.startY));

      modal.style.left = `${nextLeft}px`;
      modal.style.top = `${nextTop}px`;
    };

    const stopDragging = (event) => {
      if (dragState && (event.pointerId === undefined || event.pointerId === dragState.pointerId)) {
        dragState = null;
      }
    };

    header.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', stopDragging);
    document.addEventListener('pointercancel', stopDragging);

    return () => {
      header.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', stopDragging);
      document.removeEventListener('pointercancel', stopDragging);
    };
  }, [modalRef, isOpen]);
}

// A calmer, lower-contrast palette that matches the app's Material-inspired dark theme.
function configureMonacoTheme(monaco, theme) {
  if (!monaco) return;
  monaco.editor.defineTheme('copypasta-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'D8DEE9', background: '20242B' },
      { token: 'comment', foreground: '7F8C9A', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C792EA' },
      { token: 'string', foreground: 'A3BE8C' },
      { token: 'number', foreground: 'D8A657' },
      { token: 'type', foreground: '88C0D0' },
    ],
    colors: {
      'editor.background': '#20242B',
      'editor.foreground': '#D8DEE9',
      'editorLineNumber.foreground': '#657080',
      'editorLineNumber.activeForeground': '#C8D0DA',
      'editorCursor.foreground': '#88C0D0',
      'editor.selectionBackground': '#3A4658',
      'editor.inactiveSelectionBackground': '#303A49',
      'editor.lineHighlightBackground': '#272D36',
      'editorIndentGuide.background1': '#343B46',
      'editorIndentGuide.activeBackground1': '#4B5868',
      'editorWidget.background': '#252B34',
      'editorWidget.border': '#3A424E',
      'input.background': '#252B34',
      'input.border': '#414B59',
      'focusBorder': '#6C9BCF',
      'scrollbarSlider.background': '#65708055',
      'scrollbarSlider.hoverBackground': '#7D899A77',
      'scrollbarSlider.activeBackground': '#93A1B388',
    },
  });
  monaco.editor.defineTheme('copypasta-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#FAFBFC',
      'editor.foreground': '#28323D',
      'editorLineNumber.foreground': '#9AA4AF',
      'editorLineNumber.activeForeground': '#4D5966',
      'editor.selectionBackground': '#D7E7F8',
      'editor.lineHighlightBackground': '#F1F5F8',
      'editorWidget.background': '#FFFFFF',
      'editorWidget.border': '#D7DEE5',
      'focusBorder': '#6C9BCF',
    },
  });
  monaco.editor.setTheme(theme === 'dark' ? 'copypasta-dark' : 'copypasta-light');
}

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
  // THIS IS WHERE I SET IT TO LIST and GRID MODE!
  const [viewMode, setViewMode] = useState(localStorage.getItem('viewMode') || 'list');
  const [previewLanguage, setPreviewLanguage] = useState('text');
  const [previewContent, setPreviewContent] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, item: null });
  const [deleteAllConfirmation, setDeleteAllConfirmation] = useState(false);
  const [deleteNoteContent, setDeleteNoteContent] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  // Protect drafts when a user clicks outside a modal or presses Escape.
  const [closeConfirmation, setCloseConfirmation] = useState({ isOpen: false, target: null });
  const [highlightedCardId, setHighlightedCardId] = useState(null);

  // Refs for focus management
  const newItemButtonRef = useRef(null);
  const textareaRef = useRef(null);
  const modalRef = useRef(null);
  const editModalRef = useRef(null);
  const helpModalRef = useRef(null);
  const helpCloseButtonRef = useRef(null);
  const closeConfirmationCancelRef = useRef(null);
  const closeConfirmationDiscardRef = useRef(null);
  const editorRef = useRef(null);
  const deleteModalRef = useRef(null);
  const deleteCloseButtonRef = useRef(null);
  const deleteCancelButtonRef = useRef(null);
  const deleteConfirmButtonRef = useRef(null);
  const deleteAllModalRef = useRef(null);
  const deleteAllCloseButtonRef = useRef(null);
  const deleteAllCancelButtonRef = useRef(null);
  const deleteAllConfirmButtonRef = useRef(null);
  const fileInputRef = useRef(null);

  // Make the three content-heavy modals movable. CSS provides the resize handle.
  useDraggableModal(modalRef, modalOpen);
  useDraggableModal(editModalRef, editModalOpen);
  useDraggableModal(helpModalRef, helpModalOpen);

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
      setDeleteAllConfirmation(true);
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
      // await navigator.clipboard.writeText(item.content);
      await copyToClipboard(item.content);
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
            setIsUploadMode(false);
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
            setIsUploadMode(false);
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
        setIsUploadMode(false);
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
    configureMonacoTheme(monaco, theme);
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

  const hasUnsavedNewCard = () => Boolean(contentInput.trim() || fileInput);

  const hasUnsavedEdit = () => {
    if (!editingItem) return false;
    const original = typeof editingItem.content === 'string'
      ? editingItem.content
      : String(editingItem.content ?? '');
    return String(editModalContent.content ?? '') !== original;
  };

  // Final close functions are only called directly when there is no draft to
  // protect, or after the user explicitly confirms discarding it.
  const handleModalClose = () => {
    setModalOpen(false);
    setContentInput('');
    setFileInput(null);
    setIsUploadMode(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (editorRef.current && !editModalOpen) editorRef.current.setValue('');
    setTimeout(() => newItemButtonRef.current?.focus(), 0);
  };

  const finalizeEditClose = () => {
    setEditModalOpen(false);
    setEditingItem(null);
    setEditModalContent({ content: '', language: 'plaintext' });
    setTimeout(() => newItemButtonRef.current?.focus(), 0);
  };

  const finalizeModalClose = (target) => {
    if (target === 'new') handleModalClose();
    else if (target === 'edit') finalizeEditClose();
    else if (target === 'help') {
      setHelpModalOpen(false);
      setTimeout(() => newItemButtonRef.current?.focus(), 0);
    } else if (target === 'switch-to-upload') {
      setContentInput('');
      setFileInput(null);
      setIsUploadMode(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => fileInputRef.current?.click(), 0);
    } else if (target === 'switch-to-text') {
      setFileInput(null);
      setIsUploadMode(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    setCloseConfirmation({ isOpen: false, target: null });
  };

  const requestModeSwitch = (target) => {
    const switchingToUpload = target === 'switch-to-upload';
    const hasDraftToReplace = switchingToUpload
      ? Boolean(contentInput.trim() || fileInput)
      : Boolean(fileInput);
    if (hasDraftToReplace) {
      setCloseConfirmation({ isOpen: true, target });
    } else {
      finalizeModalClose(target);
    }
  };

  const requestModalClose = (target) => {
    if (target === 'new' && isUploading) {
      showToast('Please wait for the upload to finish before closing this modal.', 'error');
      return;
    }
    const dirty = target === 'new'
      ? hasUnsavedNewCard()
      : target === 'edit'
        ? hasUnsavedEdit()
        : false;
    if (dirty) {
      setCloseConfirmation({ isOpen: true, target });
    } else {
      finalizeModalClose(target);
    }
  };

  const confirmDiscardChanges = () => finalizeModalClose(closeConfirmation.target);

  // Small delete-confirmation dialogs have no editable draft, so they can close
  // directly on an outside click. Content modals use requestModalClose().
  const handleClickOutside = (event, modalRef, closeModal) => {
    if (event.target === event.currentTarget) closeModal?.();
  };

  useEffect(() => {
    if (deleteConfirmation.isOpen) {
      // Focus the delete button when modal opens
      if (deleteCancelButtonRef.current) {
        deleteCancelButtonRef.current.focus();
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
    if (deleteAllConfirmation) {
      // Focus the delete button when modal opens
      if (deleteAllCancelButtonRef.current) {
        deleteAllCancelButtonRef.current.focus();
      }

      // Restore focus to new item button when modal closes
      return () => {
        if (newItemButtonRef.current) {
          newItemButtonRef.current.focus();
        }
      };
    }
  }, [deleteAllConfirmation]);

  useEffect(() => {
    // Save view mode preference
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (helpModalOpen) setTimeout(() => helpCloseButtonRef.current?.focus(), 0);
  }, [helpModalOpen]);

  useEffect(() => {
    if (isFilterDropdownOpen) {
      setTimeout(() => {
        document.querySelector('.filter-dropdown.open .filter-option.active')?.focus();
      }, 0);
    }
  }, [isFilterDropdownOpen]);

  useEffect(() => {
    if (helpModalOpen) setTimeout(() => helpCloseButtonRef.current?.focus(), 0);
  }, [helpModalOpen]);

  useEffect(() => {
    if (isFilterDropdownOpen) {
      setTimeout(() => {
        document.querySelector('.filter-dropdown.open .filter-option.active')?.focus();
      }, 0);
    }
  }, [isFilterDropdownOpen]);

  const handleModalKeyDown = useCallback((e) => {
    if (modalOpen && e.altKey) {
      if (e.key === '1') {
        e.preventDefault();
        requestModeSwitch('switch-to-text');
      } else if (e.key === '2') {
        e.preventDefault();
        requestModeSwitch('switch-to-upload');
      }
    }
  }, [modalOpen, contentInput, fileInput, isUploadMode]);

  useEffect(() => {
    document.addEventListener('keydown', handleModalKeyDown);
    return () => document.removeEventListener('keydown', handleModalKeyDown);
  }, [handleModalKeyDown]);

  // A single Escape handler prevents competing modal handlers from discarding
  // drafts. The discard prompt itself closes first, leaving the draft untouched.
  useEffect(() => {
    const onEscape = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (closeConfirmation.isOpen) {
        event.preventDefault();
        event.stopPropagation();
        setCloseConfirmation({ isOpen: false, target: null });
      } else if (deleteConfirmation.isOpen) {
        event.preventDefault();
        setDeleteConfirmation({ isOpen: false, item: null });
      } else if (deleteAllConfirmation) {
        event.preventDefault();
        setDeleteAllConfirmation(false);
      } else if (editModalOpen) {
        event.preventDefault();
        requestModalClose('edit');
      } else if (modalOpen) {
        event.preventDefault();
        requestModalClose('new');
      } else if (helpModalOpen) {
        event.preventDefault();
        requestModalClose('help');
      } else if (isFilterDropdownOpen) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', onEscape, true);
    return () => document.removeEventListener('keydown', onEscape, true);
  }, [closeConfirmation.isOpen, deleteConfirmation.isOpen, deleteAllConfirmation, editModalOpen, modalOpen, helpModalOpen, isFilterDropdownOpen, contentInput, fileInput, editingItem, editModalContent, isUploading]);

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
            onClick={() => setDeleteAllConfirmation(true)}
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
        <div className="modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) requestModalClose('new');
        }}>
          <div className="modal draggable-resizable-modal" ref={modalRef} role="dialog" aria-modal="true" aria-label="New Card">
            <div className="modal-header">
              <h2>New Card</h2>
              <button className="close-button" onClick={() => requestModalClose('new')} aria-label="Close New Card">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="new-card-modal">
              <div className="input-type-selector">
                <button
                  type="button"
                  className={`input-type-button ${!isUploadMode ? 'active' : ''}`}
                  onClick={() => requestModeSwitch('switch-to-text')}
                  title="Text Note (Alt+1)"
                >
                  <span className="material-symbols-rounded">edit_note</span>
                  Text Note
                </button>
                <button
                  type="button"
                  className={`input-type-button ${isUploadMode ? 'active' : ''}`}
                  onClick={() => requestModeSwitch('switch-to-upload')}
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
                      height="100%"
                      defaultLanguage="plaintext"
                      language={language}
                      value={contentInput}
                      theme={theme === 'dark' ? 'copypasta-dark' : 'copypasta-light'}
                      beforeMount={(monaco) => configureMonacoTheme(monaco, theme)}
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
                            if (file.size > 50 * 1024 * 1024) {
                              showToast('File size must be under 50MB', 'error');
                              return;
                            }
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
                <button type="button" className="secondary-btn" onClick={() => requestModalClose('new') }>
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

      {deleteAllConfirmation && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteAllConfirmation(false);
            }
          }}
        >
          <div
            className="modal"
            ref={deleteAllModalRef}
            role="dialog"
            aria-labelledby="delete-all-modal-title"
            aria-modal="true"
            tabIndex="-1"
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const focusableElements = [
                  deleteAllCloseButtonRef.current,
                  deleteAllCancelButtonRef.current,
                  deleteAllConfirmButtonRef.current
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
            }}
          >
            <div className="modal-header">
              <h2 id="delete-all-modal-title">Confirm Delete All</h2>
              <button
                className="close-button"
                onClick={() => setDeleteAllConfirmation(false)}
                ref={deleteAllCloseButtonRef}
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to delete all items?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setDeleteAllConfirmation(false)}
                ref={deleteAllCancelButtonRef}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={() => {
                  handleDeleteAll();
                  setDeleteAllConfirmation(false);
                }}
                ref={deleteAllConfirmButtonRef}
                style={{ border: '0.5px solid rgba(255, 255, 255, 0.8)' }}
              >
                <span className="material-symbols-rounded">delete_forever</span>
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {helpModalOpen && (
        <div className="modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) requestModalClose('help');
        }}>
          <div className="modal help-modal draggable-resizable-modal" ref={helpModalRef} role="dialog" aria-modal="true" aria-label="Help" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Need help on using CopyPasta?</h2>
              <button
                className="close-btn"
                onClick={() => requestModalClose('help')}
                aria-label="Close Help"
                ref={helpCloseButtonRef}
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            <div className="modal-content">
              <div className="help-section">
                <h3>Main Screen</h3>
                <ul>
                  <li>You can Drag & Drop cards to reorder cards.</li>
                  <li><kbd>d</kbd> Delete all cards</li>
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
        <div className="modal-overlay" onMouseDown={(e) => {
          if (e.target === e.currentTarget) requestModalClose('edit');
        }}>
          <div className="modal edit-modal draggable-resizable-modal" ref={editModalRef} role="dialog" aria-modal="true" aria-label="Edit content">
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
                onClick={() => requestModalClose('edit')}
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
                      height="100%"
                      defaultLanguage={editingItem.language || 'plaintext'}
                      value={String(editingItem.content || '')}
                      theme={theme === 'dark' ? 'copypasta-dark' : 'copypasta-light'}
                      beforeMount={(monaco) => configureMonacoTheme(monaco, theme)}
                      onMount={(editor, monaco) => configureMonacoTheme(monaco, theme)}
                      options={{
                        readOnly: true,
                        automaticLayout: true,
                        renderValidationDecorations: 'off',
                      }}
                    />
                    <div className="editor-message">Cannot edit in read-only editor</div>
                  </div>
                </>
              ) : (
                <Editor
                  height="100%"
                  defaultLanguage={editingItem?.language || 'plaintext'}
                  value={String(editModalContent?.content || '')}
                  theme={theme === 'dark' ? 'copypasta-dark' : 'copypasta-light'}
                  beforeMount={(monaco) => configureMonacoTheme(monaco, theme)}
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
                onClick={() => requestModalClose('edit')}
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
                    requestModalClose('edit');
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

      {closeConfirmation.isOpen && (
        <div
          className="modal-overlay close-confirmation-overlay"
          role="presentation"
          onMouseDown={(event) => {
            // Outside-clicking this prompt means "keep editing", never discard.
            if (event.target === event.currentTarget) {
              setCloseConfirmation({ isOpen: false, target: null });
            }
          }}
        >
          <div
            className="modal close-confirmation-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="close-confirmation-title"
            aria-describedby="close-confirmation-description"
            onKeyDown={(event) => {
              if (event.key === 'Tab') {
                event.preventDefault();
                const first = closeConfirmationCancelRef.current;
                const last = closeConfirmationDiscardRef.current;
                if (event.shiftKey) {
                  if (document.activeElement === first) last?.focus();
                  else first?.focus();
                } else {
                  if (document.activeElement === last) first?.focus();
                  else last?.focus();
                }
              }
            }}
          >
            <div className="modal-header">
              <h2 id="close-confirmation-title">
                {closeConfirmation.target === 'switch-to-upload' || closeConfirmation.target === 'switch-to-text'
                  ? 'Switch input mode?'
                  : 'Discard unsaved changes?'}
              </h2>
            </div>
            <div className="modal-content">
              <p id="close-confirmation-description">
                 {closeConfirmation.target === 'switch-to-upload' || closeConfirmation.target === 'switch-to-text'
                  ? 'Switching input modes will discard the current draft. Do you want to continue?'
                  : 'You have work in this modal that has not been saved. Close it and lose those changes?'}
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="secondary-btn"
                ref={closeConfirmationCancelRef}
                autoFocus
                onClick={() => setCloseConfirmation({ isOpen: false, target: null })}
              >
                Keep Editing
              </button>
              <button type="button" className="danger-btn" ref={closeConfirmationDiscardRef} onClick={confirmDiscardChanges}>
                {closeConfirmation.target === 'switch-to-upload' || closeConfirmation.target === 'switch-to-text'
                  ? 'Discard & Switch'
                  : 'Discard Changes'}
              </button>
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
      <footer className="app-version-footer">
        <span>CopyPasta</span>
        <span className="version-separator" aria-hidden="true">·</span>
        <span>Meteor {Meteor.release || 'version unavailable'}</span>
      </footer>
    </div>
  );
}