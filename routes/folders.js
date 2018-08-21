'use strict';

const express = require('express');
const Folder = require('../models/folder');
const Note = require('../models/folder');
const mongoose = require('mongoose');
const passport = require('passport');

const router = express.Router();

// Protect endpoints using JWT Strategy
router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  return Folder.find()
    .sort({ name: 'asc' })
    .then(result => {
      res.json(result);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE FOLDER ========== */
router.get('/:id', (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The queried id is not a valid Mongo ObjectId');
    err.status = 400;
    return next(err);
  }

  return Folder.findById(id)
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

/* ========== POST/CREATE A FOLDER ========== */
router.post('/', (req, res, next) => {
  const newFolder = {
    name: req.body.name
  };

  if (!newFolder.name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  return Folder.create(newFolder)
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      if(err.code === 11000) {
        err = new Error('The folder name already exists');
        err.status = 400;
      }
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE FOLDER ========== */
router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  const updateObj = {};
  const updatableField = 'name';

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The queried id is not a valid Mongo ObjectId');
    err.status = 400;
    return next(err);
  }

  if (updatableField in req.body) {
    updateObj[updatableField] = req.body[updatableField];
  }

  if (!updateObj.name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  return Folder.findByIdAndUpdate(id, {$set: updateObj}, {new: true})
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      if(err.code === 11000) {
        err = new Error('The folder name already exists');
        err.status = 400;
      }
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE FOLDER + SET NOTES.folderId to null ========== */
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  return Promise.all([
    Folder.findByIdAndRemove(id),
    Note.updateMany({folderId: id}, {$unset: {folderId: ''}}, { strict: false })
  ])
    .then(() => {
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;