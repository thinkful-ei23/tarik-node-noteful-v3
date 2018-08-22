'use strict';

const mongoose = require('mongoose');

const { MONGODB_URI } = require('../config');
const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');
const User = require('../models/user');

const seedNotes = require('../db/seed/notes');
const seedFolders = require('../db/seed/folders');
const seedTags = require('../db/seed/tags');
const seedUser = require('../db/seed/users');

mongoose.connect(MONGODB_URI)
  .then(() => mongoose.connection.db.dropDatabase())
  .then(() => {
    return Promise.all([
      Note.insertMany(seedNotes),
      Note.createIndexes(),
      Folder.insertMany(seedFolders),
      Tag.insertMany(seedTags),
      Folder.createIndexes(),
      Tag.createIndexes(),
      User.insertMany(seedUser),
      User.createIndexes()
    ]);
  })
  .then(() => mongoose.disconnect())
  .catch(err => {
    console.error(err);
  });