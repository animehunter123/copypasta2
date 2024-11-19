import { Meteor } from 'meteor/meteor';
import { Items } from '/imports/api/collections';

Meteor.publish('items', function() {
  return Items.find({}, {
    sort: { order: 1 }
  });
});
