'use strict';

const express = require('express');
const Note = require('../models/note');
const mongoose = require('mongoose');
const passport = require('passport');

const router = express.Router();

// Protect endpoints using JWT Strategy
router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  let filter = {};

  const { searchTerm } = req.query;
  const { folderId } = req.query;
  const { tagId } = req.query;
  const userId = req.user.id;

  filter = { userId };
  
  if (searchTerm) {
    filter.$or = [
      {title: {$regex: searchTerm, $options: 'i'}},
      {content: {$regex: searchTerm, $options: 'i'}}
    ];
  }

  if (folderId) {
    filter.folderId = folderId;
  }
  
  if (tagId) {
    filter.tags = tagId;
  }

  return Note.find(filter)
    .sort({ updatedAt: 'desc' })
    .populate('tags', 'name')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  return Note.findOne({ _id: id, userId })
    .populate('tags', 'name')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const userId = req.user.id;

  const newNote = {
    title: req.body.title,
    content: req.body.title,
    folderId: req.body.folderId,
    tags: req.body.tags,
    userId
  };

  if (!newNote.title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (!newNote.folderId && newNote.folderId !== null) {
    const err = new Error('Missing `folderId` in request body');
    err.status = 400;
    return next(err);
  }

  if (!newNote.tags && newNote.tags !== []) {
    const err = new Error('Missing `tags` in request body');
    err.status = 400;
    return next(err);
  }

  if (!mongoose.Types.ObjectId.isValid(newNote.folderId) && newNote.folderId !== null) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  if (newNote.tags !== []) {
    newNote.tags.forEach(tag => {
      if (!mongoose.Types.ObjectId.isValid(tag)) {
        const err = new Error('The `tag id(s)` are not valid');
        err.status = 400;
        return next(err);
      }
    });
  }

  return Note.create(newNote)
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message = (
      `Request path id (${req.params.id}) and request body id ` +
      `(${req.body.id}) must match`);
    console.error(message);
    return res.status(400).json({message: message});
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const err = new Error('The `endpoint id` is not valid');
    err.status = 400;
    return next(err);
  }

  const updateObj = {};
  const userId = req.user.id;
  const updateableFields = ['title', 'content', 'folderId', 'tags'];
  updateableFields.forEach(field => {
    if (field in req.body) {
      updateObj[field] = req.body[field];
    }
  });

  updateObj.userId = userId;

  if (!updateObj.title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (!updateObj.folderId && updateObj.folderId !== null) {
    const err = new Error('Missing `folderId` in request body');
    err.status = 400;
    return next(err);
  }

  if (!updateObj.tags && updateObj.tags !== []) {
    const err = new Error('Missing `tags` in request body');
    err.status = 400;
    return next(err);
  }

  if (!mongoose.Types.ObjectId.isValid(updateObj.folderId) && updateObj.folderId !== null) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  if (updateObj.tags !== []) {
    updateObj.tags.forEach(tag => {
      if (!mongoose.Types.ObjectId.isValid(tag)) {
        const err = new Error('The `tag id(s)` are not valid');
        err.status = 400;
        return next(err);
      }
    });
  }

  return Note.findByIdAndUpdate(req.params.id, {$set: updateObj}, {new: true})
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  return Note.findOneAndDelete({ _id: id, userId})
    .then(() => {
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;