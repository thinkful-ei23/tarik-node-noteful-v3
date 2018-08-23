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
  const userId = req.user.id;
  return Folder.find({ userId })
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
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The queried id is not a valid Mongo ObjectId');
    err.status = 400;
    return next(err);
  }

  return Folder.findOne({ _id: id, userId})
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
  const userId = req.user.id;
  const newFolder = {
    name: req.body.name,
    userId
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
  const userId = req.user.id;
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

  return Folder.findOneAndUpdate({_id: id, userId}, {$set: updateObj}, {new: true})
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
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  return Promise.all([
    Folder.findOneAndRemove({_id: id, userId}),
    Note.updateMany({folderId: id}, {$unset: {folderId: null}}, { strict: false })
  ])
    .then(() => {
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;