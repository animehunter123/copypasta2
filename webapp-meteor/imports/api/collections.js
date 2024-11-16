import { Mongo } from 'meteor/mongo';

export const Items = new Mongo.Collection('items');

// Create indexes if needed
if (Meteor.isServer) {
  Meteor.startup(() => {
    Items.createIndex({ createdAt: 1 });
    Items.createIndex({ expiresAt: 1 });
  });
}
