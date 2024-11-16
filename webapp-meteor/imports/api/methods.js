import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Storage } from './storage';

Meteor.methods({
  async 'files.insert'(fileData) {
    check(fileData, {
      content: String,
      fileName: String,
      language: String,
      originalSize: Number,
      createdAt: Date,
      expiresAt: Date,
      type: String
    });

    return await Storage.saveFile(fileData);
  },

  async 'notes.insert'(noteData) {
    check(noteData, {
      content: String,
      language: String,
      originalSize: Number,
      createdAt: Date,
      expiresAt: Date,
      type: String
    });

    return await Storage.saveNote(noteData);
  },

  async 'items.remove'(itemId) {
    check(itemId, String);
    return await Storage.removeItem(itemId);
  },

  async 'items.removeAll'() {
    const items = await Storage.getAllItems();
    for (const item of items) {
      await Storage.removeItem(item.id);
    }
    return true;
  },

  async 'items.getAll'() {
    return await Storage.getAllItems();
  },

  async 'items.cleanExpired'() {
    await Storage.cleanExpired();
  }
});
