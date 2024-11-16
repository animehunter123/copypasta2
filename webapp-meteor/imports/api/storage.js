import { Meteor } from 'meteor/meteor';
import fs from 'fs';
import path from 'path';

// Use data directory from environment variable
const DATA_DIR = process.env.COPYPASTA_DATA_DIR;
if (!DATA_DIR) {
  throw new Error('COPYPASTA_DATA_DIR environment variable not set');
}

const NOTES_DIR = path.join(DATA_DIR, 'notes');
const FILES_DIR = path.join(DATA_DIR, 'files');

console.log('Storage Paths:');
console.log('Data Dir:', DATA_DIR);
console.log('Notes Dir:', NOTES_DIR);
console.log('Files Dir:', FILES_DIR);

// Create directories if they don't exist
[DATA_DIR, NOTES_DIR, FILES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log('Creating directory:', dir);
    fs.mkdirSync(dir, { recursive: true });
  } else {
    console.log('Directory exists:', dir);
  }
});

export const Storage = {
  async saveFile(fileData) {
    const timestamp = Date.now();
    const fileName = `${timestamp}-${fileData.fileName}`;
    const filePath = path.join(FILES_DIR, fileName);
    console.log('Saving file to:', filePath);

    const data = {
      id: fileName,
      content: fileData.content,
      fileName: fileData.fileName,
      language: fileData.language,
      originalSize: fileData.originalSize,
      createdAt: fileData.createdAt,
      expiresAt: fileData.expiresAt,
      type: 'file'
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return data;
  },

  async saveNote(noteData) {
    const timestamp = Date.now();
    const noteId = `${timestamp}.json`;
    const notePath = path.join(NOTES_DIR, noteId);
    console.log('Saving note to:', notePath);

    const data = {
      id: noteId,
      content: noteData.content,
      language: noteData.language,
      originalSize: noteData.originalSize,
      createdAt: noteData.createdAt,
      expiresAt: noteData.expiresAt,
      type: 'note'
    };

    fs.writeFileSync(notePath, JSON.stringify(data, null, 2));
    return data;
  },

  async getAllItems() {
    console.log('Loading items from:', DATA_DIR);
    const items = [];

    // Get files
    if (fs.existsSync(FILES_DIR)) {
      const files = fs.readdirSync(FILES_DIR);
      console.log('Found files:', files);
      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(FILES_DIR, file), 'utf8');
          items.push(JSON.parse(content));
        } catch (error) {
          console.error(`Error reading file ${file}:`, error);
        }
      }
    }

    // Get notes
    if (fs.existsSync(NOTES_DIR)) {
      const notes = fs.readdirSync(NOTES_DIR);
      console.log('Found notes:', notes);
      for (const note of notes) {
        try {
          const content = fs.readFileSync(path.join(NOTES_DIR, note), 'utf8');
          items.push(JSON.parse(content));
        } catch (error) {
          console.error(`Error reading note ${note}:`, error);
        }
      }
    }

    return items;
  },

  async removeItem(itemId) {
    console.log('Removing item:', itemId);
    
    // Get all items to find the one we want to delete
    const items = await this.getAllItems();
    const item = items.find(i => i._id === itemId || i.id === itemId);
    
    if (!item) {
      console.error('Item not found:', itemId);
      return false;
    }
    
    // Determine the correct path based on item type
    const itemPath = item.type === 'file' 
      ? path.join(FILES_DIR, item.id)
      : path.join(NOTES_DIR, item.id);
    
    if (fs.existsSync(itemPath)) {
      console.log('Deleting item:', itemPath);
      fs.unlinkSync(itemPath);
      return true;
    }
    
    console.error('Item file not found:', itemPath);
    return false;
  },

  async cleanExpired() {
    console.log('Cleaning expired items');
    const now = new Date();
    const items = await this.getAllItems();
    
    for (const item of items) {
      if (new Date(item.expiresAt) < now) {
        await this.removeItem(item.id);
      }
    }
  }
};
