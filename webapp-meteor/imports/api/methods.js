import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Storage } from './storage';
import { Items } from './collections';
import path from 'path';
import fs from 'fs';

// Use data directory from environment variable
const DATA_DIR = process.env.COPYPASTA_DATA_DIR;
if (!DATA_DIR) {
  throw new Error('COPYPASTA_DATA_DIR environment variable not set');
}

const NOTES_DIR = path.join(DATA_DIR, 'notes');
const FILES_DIR = path.join(DATA_DIR, 'files');

Meteor.methods({
  async 'files.insert'(fileData) {
    try {
      check(fileData, {
        content: Match.Any, // Allow any type of content (string or ArrayBuffer)
        fileName: String,
        fileType: String,
        language: String,
        originalSize: Number,
        createdAt: Date,
        expiresAt: Date,
        type: String,
        isText: Boolean
      });

      if (fileData.originalSize > 50 * 1024 * 1024) { // 50MB
        throw new Meteor.Error('file-too-large', 'File size must be under 50MB');
      }

      // Convert ArrayBuffer to Buffer for binary files
      if (!fileData.isText && fileData.content instanceof Uint8Array) {
        fileData.content = Buffer.from(fileData.content);
      }

      return await Storage.saveFile(fileData);
    } catch (error) {
      console.error('Error in files.insert:', error);
      throw new Meteor.Error('insert-failed', error.message);
    }
  },

  async 'notes.insert'(noteData) {
    try {
      check(noteData, {
        content: String,
        language: String,
        originalSize: Number,
        createdAt: Date,
        expiresAt: Date,
        type: String
      });

      return await Storage.saveNote(noteData);
    } catch (error) {
      console.error('Error in notes.insert:', error);
      throw new Meteor.Error('insert-failed', error.message);
    }
  },

  async 'items.edit'(data) {
    try {
      check(data, {
        id: String,
        content: String,
        language: String
      });

      // Find the existing item
      const item = await Items.findOneAsync({ id: data.id });
      if (!item) {
        throw new Meteor.Error('not-found', 'Item not found');
      }

      // Update the content and language
      const filePath = path.join(
        item.type === 'note' ? NOTES_DIR : FILES_DIR,
        item.id
      );

      // Update the file content
      fs.writeFileSync(filePath, data.content, 'utf8');

      // Update MongoDB
      const updated = await Items.updateAsync(
        { id: data.id },
        {
          $set: {
            content: data.content,
            language: data.language
          }
        }
      );

      if (!updated) {
        throw new Error('Failed to update item in MongoDB');
      }

      return true;
    } catch (error) {
      console.error('Error in items.edit:', error);
      throw new Meteor.Error('edit-failed', error.message);
    }
  },

  async 'items.remove'(itemId) {
    try {
      check(itemId, String);
      return await Storage.removeItem(itemId);
    } catch (error) {
      console.error('Error in items.remove:', error);
      throw new Meteor.Error('remove-failed', error.message);
    }
  },

  async 'items.removeAll'() {
    try {
      const items = await Storage.getAllItems();
      for (const item of items) {
        await Storage.removeItem(item.id);
      }
      return true;
    } catch (error) {
      console.error('Error in items.removeAll:', error);
      throw new Meteor.Error('remove-all-failed', error.message);
    }
  },

  async 'items.getAll'() {
    try {
      return await Storage.getAllItems();
    } catch (error) {
      console.error('Error in items.getAll:', error);
      throw new Meteor.Error('get-all-failed', error.message);
    }
  },

  async 'items.cleanExpired'() {
    try {
      return await Storage.cleanExpired();
    } catch (error) {
      console.error('Error in items.cleanExpired:', error);
      throw new Meteor.Error('clean-expired-failed', error.message);
    }
  },

  'system.getDiskSpace'() {
    if (!Meteor.isServer) return;
    
    try {
      const fs = require('fs');
      const path = require('path');
      // Go up one directory from PWD to get to the project root where data directory is
      const projectRoot = path.resolve(process.env.PWD, '..');
      const dataPath = path.join(projectRoot, 'data');
      
      // Create data directory if it doesn't exist
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
      }
      
      const stats = fs.statfsSync(dataPath);
      const total = stats.blocks * stats.bsize;
      const free = stats.bfree * stats.bsize;
      const used = total - free;
      
      return {
        total,
        free,
        available: stats.bavail * stats.bsize,
        used
      };
    } catch (error) {
      console.error('Error getting disk space:', error);
      return null;
    }
  }
});
