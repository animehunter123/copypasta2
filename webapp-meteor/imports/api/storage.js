import { Meteor } from 'meteor/meteor';
import fs from 'fs';
import path from 'path';
import { Items } from './collections';

// Use data directory from environment variable
const DATA_DIR = process.env.COPYPASTA_DATA_DIR;
if (!DATA_DIR) {
  throw new Error('COPYPASTA_DATA_DIR environment variable not set');
}

const NOTES_DIR = path.join(DATA_DIR, 'notes');
const FILES_DIR = path.join(DATA_DIR, 'files');

// Storage Paths:
// console.log('Storage Paths:');
// console.log('Data Dir:', DATA_DIR);
// console.log('Notes Dir:', NOTES_DIR);
// console.log('Files Dir:', FILES_DIR);

// Create directories if they don't exist
[DATA_DIR, NOTES_DIR, FILES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    // console.log('Creating directory:', dir);
    fs.mkdirSync(dir, { recursive: true });
  } else {
    // console.log('Directory exists:', dir);
  }
});

export const Storage = {
  async saveFile(fileData) {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}-${fileData.fileName}`;
      const filePath = path.join(FILES_DIR, fileName);
      // console.log('Saving file to:', filePath);

      // For large binary files (>16MB), store only metadata in MongoDB
      const isLargeFile = !fileData.isText && fileData.originalSize > 16 * 1024 * 1024;

      const data = {
        id: fileName,
        fileName: fileData.fileName,
        language: fileData.language,
        originalSize: fileData.originalSize,
        createdAt: fileData.createdAt,
        expiresAt: fileData.expiresAt,
        type: fileData.type,
        isText: fileData.isText
      };

      // Write content to file system
      if (fileData.isText) {
        fs.writeFileSync(filePath, fileData.content, 'utf8');
        data.content = fileData.content; // Store text content in MongoDB
      } else {
        // For binary files, write the buffer directly
        fs.writeFileSync(filePath, fileData.content);
        if (!isLargeFile) {
          data.content = fileData.content; // Only store small binary files in MongoDB
        }
      }

      // Store file path for large files
      if (isLargeFile) {
        data.filePath = filePath;
      }

      // Get the lowest order value and subtract 1 to add at top
      const lowestOrder = await Items.findOneAsync({}, { sort: { order: 1 } });
      data.order = (lowestOrder?.order ?? 1) - 1;

      // Insert into MongoDB using async method
      const insertedId = await Items.insertAsync(data);
      if (!insertedId) {
        throw new Error('Failed to insert item into MongoDB');
      }

      return data;
    } catch (error) {
      // console.error('Error in saveFile:', error);
      throw new Meteor.Error('save-file-failed', error.message);
    }
  },

  async saveNote(noteData) {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}-note.txt`;
      const filePath = path.join(NOTES_DIR, fileName);
      // console.log('Saving note to:', filePath);

      const data = {
        id: fileName,
        content: noteData.content,
        fileName: 'note.txt',
        language: noteData.language,
        originalSize: noteData.originalSize,
        createdAt: noteData.createdAt,
        expiresAt: noteData.expiresAt,
        type: 'note',  // Ensure type is always 'note'
        isText: true   // Always true for notes
      };

      // Write content to file system
      fs.writeFileSync(filePath, noteData.content, 'utf8');

      // Get the lowest order value and subtract 1 to add at top
      const lowestOrder = await Items.findOneAsync({}, { sort: { order: 1 } });
      data.order = (lowestOrder?.order ?? 1) - 1;

      // Insert into MongoDB using async method
      const insertedId = await Items.insertAsync(data);
      // console.log('Saved note with ID:', insertedId, 'Data:', data);
      
      if (!insertedId) {
        throw new Error('Failed to insert note into MongoDB');
      }

      return data;
    } catch (error) {
      // console.error('Error in saveNote:', error);
      throw new Meteor.Error('save-note-failed', error.message);
    }
  },

  async getAllItems() {
    // console.log('Getting all items...');
    const items = await Items.find({}).fetchAsync();
    // console.log('Found items:', items);
    return items;
  },

  async removeItem(itemId) {
    try {
      // Find the item first using async method
      const item = await Items.findOneAsync({ id: itemId });
      if (!item) {
        throw new Meteor.Error('not-found', 'Item not found');
      }

      // Remove from filesystem
      const filePath = path.join(item.type === 'note' ? NOTES_DIR : FILES_DIR, item.id);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Remove from MongoDB using async method
      const removed = await Items.removeAsync({ id: itemId });
      if (!removed) {
        throw new Error('Failed to remove item from MongoDB');
      }

      return true;
    } catch (error) {
      // console.error('Error in removeItem:', error);
      throw new Meteor.Error('remove-item-failed', error.message);
    }
  },

  async cleanExpired() {
    try {
      const now = new Date();
      
      // Find expired items using async method
      const expiredItems = await Items.find({
        expiresAt: { $lt: now }
      }).fetchAsync();

      // Remove each expired item
      let removedCount = 0;
      for (const item of expiredItems) {
        const filePath = path.join(item.type === 'note' ? NOTES_DIR : FILES_DIR, item.id);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        await Items.removeAsync({ id: item.id });
        removedCount++;
      }

      return removedCount;
    } catch (error) {
      // console.error('Error in cleanExpired:', error);
      throw new Meteor.Error('clean-expired-failed', error.message);
    }
  },

  async removeAll() {
    try {
      // Remove all items from the database
      await Items.removeAsync({});

      // Clean up files directory
      if (fs.existsSync(FILES_DIR)) {
        const files = await fs.promises.readdir(FILES_DIR);
        for (const file of files) {
          await fs.promises.unlink(path.join(FILES_DIR, file));
        }
      }

      // Clean up notes directory
      if (fs.existsSync(NOTES_DIR)) {
        const notes = await fs.promises.readdir(NOTES_DIR);
        for (const note of notes) {
          await fs.promises.unlink(path.join(NOTES_DIR, note));
        }
      }

      // Recreate empty directories
      await fs.promises.mkdir(FILES_DIR, { recursive: true });
      await fs.promises.mkdir(NOTES_DIR, { recursive: true });

      return true;
    } catch (error) {
      // console.error('Error in Storage.removeAll:', error);
      throw error;
    }
  },

  async getNoteContent(itemId) {
    try {
      const item = await Items.findOneAsync({ id: itemId });
      if (!item || item.type !== 'note') {
        throw new Meteor.Error('not-found', 'Note not found');
      }

      const filePath = path.join(NOTES_DIR, item.id);
      if (!fs.existsSync(filePath)) {
        throw new Meteor.Error('file-not-found', 'Note file not found');
      }

      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      // console.error('Error in getNoteContent:', error);
      throw error;
    }
  },
};
