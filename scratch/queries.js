'use strict';

const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config');

const Note = require('../models/note');

/*mongoose.connect(MONGODB_URI)
  .then(() => {
    const searchTerm = 'lady gaga';
    const contSearch = 'aliquam';
    let filter = {};

    if (searchTerm) {
      filter.title = { $regex: searchTerm, $options: 'i' };
    }

    if (contSearch) {
      filter.content = { $regex: contSearch, $options: 'i'};
    }

    return Note.find({
      $or: [
        {'title': filter.title}, {'content': filter.content}
      ]}).sort({ updatedAt: 'desc' });
  })
  .then(results => {
    console.log(results);
  })
  .then(() => {
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });*/

/*mongoose.connect(MONGODB_URI)
  .then(() => {
    const id = '000000000000000000000001';

    return Note.findById(id);
  })
  .then(results => {
    console.log(results);
  })
  .then(() => {
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });*/

/*mongoose.connect(MONGODB_URI)
  .then(() => {
    const newObj = {
      title: 'New note',
      content: 'New content'
    };

    return Note.create(newObj);
  })
  .then(result => {
    console.log(result);
  })
  .then(() => {
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });*/

/*mongoose.connect(MONGODB_URI)
  .then(() => {
    const id = '5b73325a1b572c1d64efc62d';
    const updateObj = {
      id: id,
      title: 'Updated title',
      content: 'Updated content'
    }

    return Note.findByIdAndUpdate(id, {$set: updateObj}, {new: true});
  })
  .then(result => {
    console.log(result);
  })
  .then(() => {
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });*/

/*mongoose.connect(MONGODB_URI)
  .then(() => {
    const id = '5b73325a1b572c1d64efc62d';

    return Note.findByIdAndRemove(id);
  })
  .then(() => {
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error(`ERROR: ${err.message}`);
    console.error(err);
  });*/