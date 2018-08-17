'use strict';

const express = require('express');
const Tag = require('../models/tag');
const Note = require('../models/note');
const mongoose = require('mongoose');

const router = express.Router();

/* ========== GET/READ ALL TAGS ========== */
router.get('/', (req, res, next) => {
  return Tag.find()
    .sort({name : 'asc'})
    .then(result => {
      res.json(result);
    })
    .catch(err => {
      next(err);
    });
});

router.get('/:id', (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The queried id is not a valid Mongo ObjectId');
    err.status = 400;
    return next(err);
  }

  return Tag.findById(id)
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

router.post('/', (req, res, next) => {
  const newTag = {
    name: req.body.name
  };

  if (!newTag.name) {
    const err = new Error('Missing `name` in request body');
    err.status = 400;
    return next(err);
  }

  return Tag.create(newTag)
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      if(err.code === 11000) {
        err = new Error('The tag name already exists');
        err.status = 400;
      }
      next(err);
    });
});

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

  return Tag.findByIdAndUpdate(id, {$set: updateObj}, {new: true})
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      if(err.code === 11000) {
        err = new Error('The tag name already exists');
        err.status = 400;
      }
      next(err);
    });
});

router.delete('/:id', (req, res, next) => {
  const { id } = req.params;

  if(!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }
  
  return Promise.all([
    Tag.findByIdAndRemove(id),
    Note.updateMany({}, { $pull: { tags: id}})
  ])
    .then(() => {
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;