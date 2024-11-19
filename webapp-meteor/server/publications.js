import { Meteor } from 'meteor/meteor';
import { Items } from '/imports/api/collections';

Meteor.publish('items', function() {
  return Items.find({}, {
    sort: { createdAt: -1 }  // Default to newest first
  });
});
