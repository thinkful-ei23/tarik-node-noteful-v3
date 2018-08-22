'use strict';

const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {type: String, required: true},
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

folderSchema.index({ name: 1, userId: 1}, { unique: true });

folderSchema.set('timestamps', true);

folderSchema.set('toObject', {
  virtuals: true,     // include built-in virtual `id`
  versionKey: false,  // remove `__v` version key
  transform: (doc, ret) => {
    delete ret._id; // delete `_id`
  }
});

module.exports = mongoose.model('Folder', folderSchema);

