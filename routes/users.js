'use strict';

const express = require('express');
const User = require('../models/user');
const router = express.Router();

router.post('/', (req, res, next) => {
  const { username, password, fullname } = req.body;

  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(field => !(field in req.body));
  if (missingField) {
    const err = new Error(`Missing '${missingField}' in request body`);
    err.status = 422;
    return next(err);
  }

  const stringFields = ['username', 'password', 'fullname'];
  const nonStringField = stringFields.find(field => field in req.body && typeof req.body[field] !== 'string');
  if (nonStringField) {
    const err = new Error(`Incorrect field type; expected string for field the following field: '${nonStringField}' `);
    err.status = 422;
    return next(err);
  }

  const explicitlyTrimmedFields = ['username', 'password'];
  const nonTrimmedFields = explicitlyTrimmedFields.find(field => req.body[field].trim() !== req.body[field]);
  if (nonTrimmedFields) {
    const err = new Error(`Cannot start or end with whitespace for the following field: '${nonTrimmedFields}'`);
    err.status = 422;
    return next(err);
  }

  const sizeFields = {
    username: {
      min: 1
    },
    password: {
      min: 8,
      max: 72
    }
  };

  const tooSmallField =  Object.keys(sizeFields).find(field => 'min' in sizeFields[field] && req.body[field].trim().length < sizeFields[field].min);
  const tooLargeField = Object.keys(sizeFields).find(field => 'max' in sizeFields[field] && req.body[field].trim().length > sizeFields[field].max);
  if (tooSmallField || tooLargeField) {
    let err;
    if (tooSmallField) {
      err = new Error(`${tooSmallField} must be at least ${sizeFields[tooSmallField].min} characters long`);
      err.status = 422;
      next(err);
    } else {
      err = new Error(`${tooLargeField} must be at most ${sizeFields[tooLargeField].max} characters long`);
      err.status = 422;
      next(err);
    }
  }

  return User.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        fullname: fullname.trim()
      };
      return User.create(newUser);
    })
    .then(user => {
      return res.status(201).location(`/api/users/${user.id}`).json(user);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });
});

module.exports = router;