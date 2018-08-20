'use strict';

const express = require('express');
const User = require('../models/user');

const router = express.Router();

router.post('/', (req, res) => {
  const { username, password, fullname } = req.body;

  return User.create({
    username,
    password,
    fullname
  })
    .then(user => {
      return res.status(201).location(`/api/users/${user.id}`).json(user);
    })
    .catch(err => {
      res.status(500).json({code: 500, message: 'Internal server error'});
    });
});

module.exports = router;