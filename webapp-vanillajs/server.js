const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static('.'));

// Create data directories if they don't exist
const dataDir = path.join(__dirname, 'data');
const notesDir = path.join(dataDir, 'notes');
const filesDir = path.join(dataDir, 'files');

[dataDir, notesDir, filesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, filesDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Handle combined upload (files and/or text content)
app.post('/upload', upload.array('files'), (req, res) => {
    const results = {
        files: [],
        notes: []
    };

    // Handle uploaded files
    if (req.files && req.files.length > 0) {
        results.files = req.files.map(file => ({
            id: file.filename,
            name: file.originalname,
            path: file.path,
            size: file.size,
            type: 'file',
            timestamp: Date.now()
        }));
    }

    // Handle text content
    if (req.body.content) {
        const timestamp = Date.now();
        const content = req.body.content;
        const language = req.body.language || 'text';
        const highlightedContent = req.body.highlightedContent || content;
        
        // Create a preview from the first few lines
        const preview = content.split('\n')
            .slice(0, 8)
            .join('\n')
            .substring(0, 500);

        const noteId = `${timestamp}.json`;
        const notePath = path.join(notesDir, noteId);

        const noteData = {
            id: noteId,
            content,
            highlightedContent,
            preview,
            language,
            type: 'note',
            timestamp
        };

        fs.writeFileSync(notePath, JSON.stringify(noteData, null, 2));
        results.notes.push(noteData);
    }

    res.json({
        message: 'Upload successful',
        ...results
    });
});

// Get all items (files and notes)
app.get('/items', (req, res) => {
    try {
        // Get files
        const files = fs.readdirSync(filesDir).map(filename => {
            const stats = fs.statSync(path.join(filesDir, filename));
            return {
                id: filename,
                name: filename.substring(filename.indexOf('-') + 1),
                size: stats.size,
                type: 'file',
                timestamp: stats.mtime.getTime()
            };
        });

        // Get notes
        const notes = fs.readdirSync(notesDir).map(filename => {
            const noteData = JSON.parse(fs.readFileSync(path.join(notesDir, filename), 'utf8'));
            return noteData;
        });

        // Combine and sort by timestamp
        const allItems = [...files, ...notes].sort((a, b) => b.timestamp - a.timestamp);

        // Calculate stats
        const stats = {
            fileCount: files.length,
            noteCount: notes.length,
            totalSize: files.reduce((acc, file) => acc + file.size, 0)
        };

        res.json({ items: allItems, stats });
    } catch (error) {
        console.error('Error getting items:', error);
        res.status(500).json({ error: 'Failed to list items' });
    }
});

// Handle file/note download
app.get('/download/:id', (req, res) => {
    const id = req.params.id;
    const filePath = path.join(filesDir, id);
    const notePath = path.join(notesDir, id);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).json({ error: 'Failed to download file' });
            }
        });
    } else if (fs.existsSync(notePath)) {
        const noteData = JSON.parse(fs.readFileSync(notePath, 'utf8'));
        res.json(noteData);
    } else {
        res.status(404).json({ error: 'Item not found' });
    }
});

// Delete item
app.delete('/items/:id', (req, res) => {
    const id = req.params.id;
    const filePath = path.join(filesDir, id);
    const notePath = path.join(notesDir, id);

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        } else if (fs.existsSync(notePath)) {
            fs.unlinkSync(notePath);
        } else {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
