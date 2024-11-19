import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const Items = new Mongo.Collection('items');

// Create indexes if needed
if (Meteor.isServer) {
  Meteor.startup(() => {
    Items.createIndex({ createdAt: 1 });
    Items.createIndex({ expiresAt: 1 });
    Items.createIndex({ order: 1 });
  });
}

// Method to update item order
Meteor.methods({
  'items.updateOrder': async function(itemId, newOrder) {
    check(itemId, String);
    check(newOrder, Number);
    
    // Update the order of the moved item
    await Items.updateAsync(
      { _id: itemId },
      { $set: { order: newOrder } }
    );
  },
  
  'items.reorderAll': async function(orderedIds) {
    check(orderedIds, [String]);
    
    // Update all items with their new order
    for (let i = 0; i < orderedIds.length; i++) {
      await Items.updateAsync(
        { _id: orderedIds[i] },
        { $set: { order: i } }
      );
    }
  }
});

// Ensure items have an order field when inserted
const originalInsert = Items.insert;
Items.insert = function(doc) {
  // Add createdAt timestamp for newest-first sorting
  doc.createdAt = new Date();
  
  // Get the lowest order value and subtract 1 to add at top
  const lowestOrder = Items.findOne({}, { sort: { order: 1 } })?.order ?? 1;
  doc.order = lowestOrder - 1;
  return originalInsert.call(this, doc);
};
