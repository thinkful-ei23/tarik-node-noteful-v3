'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); 

const app = require('../server');
const { TEST_MONGODB_URI, JWT_SECRET } = require('../config');

const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');
const User = require('../models/user');

const seedNotes = require('../db/seed/notes');
const seedFolders = require('../db/seed/folders');
const seedTags = require('../db/seed/tags');
const seedUsers = require('../db/seed/users');

const expect = chai.expect;
chai.use(chaiHttp);

describe ('Notes Tests', function() {
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  let token;
  let user;

  beforeEach(function () {
    return Promise.all([
      User.insertMany(seedUsers),
      Folder.insertMany(seedFolders),
      Note.insertMany(seedNotes),
      Tag.insertMany(seedTags),
      Folder.createIndexes(),
      Tag.createIndexes(),
      Note.createIndexes()
    ])
      .then(([users]) => {
        user = users[0];
        token = jwt.sign({ user }, JWT_SECRET, { subject: user.username });
      });
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });

  describe('GET /api/notes', function() {
    it('should return the default array of notes', function() {
      return Promise.all([
        Note.find({ userId: user.id }).populate('tags', 'name').sort({ _id: 'asc' }),
        chai.request(app).get('/api/notes').set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
          expect(res.body[0]).to.be.a('object'); 
          expect(res.body[0]).to.have.keys('id', 'title', 'content', 'tags', 'folderId', 'userId', 'createdAt', 'updatedAt');
        });
    });

    it('should return correct search results for a valid searchTerm query', function() {
      let data;
      let res;

      return Note.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app).get(`/api/notes?searchTerm=${data.title}`).set('Authorization', `Bearer ${token}`);
        })
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body[0]).to.be.a('object');
          expect(res.body[0]).to.have.keys('id', 'title', 'content', 'tags', 'userId', 'folderId', 'createdAt', 'updatedAt');
          return Note.findOne({_id: res.body[0].id, userId: user.id });
        })
        .then(dbData => {
          expect(res.body[0].id).to.equal(dbData.id);
          expect(res.body[0].title).to.equal(dbData.title);
          expect(res.body[0].content).to.equal(dbData.content);
          expect(new Date(res.body[0].createdAt)).to.eql(dbData.createdAt);
          expect(new Date(res.body[0].updatedAt)).to.eql(dbData.updatedAt);
        });
    });

    it('should return an empty array for an incorrect query', function() {
      let invalidQuery = 'invalidQuery';
      let res;
      return chai.request(app).get(`/api/notes?searchTerm=${invalidQuery}`).set('Authorization', `Bearer ${token}`)
        .then((_res) => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(0);
        });
    });

    it('should return correct search results for a valid folderId query', function() {
      let data; 
      let res;
      const folderId = '222222222222222222222201';

      return chai.request(app).get(`/api/notes?folderId=${folderId}`).set('Authorization', `Bearer ${token}`)
        .then(_res => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body[0]).to.be.a('object');
          expect(res.body[0]).to.have.keys('id', 'title', 'content', 'tags', 'userId', 'folderId', 'createdAt', 'updatedAt');
          return Note.findOne({ _id: res.body[0].id, userId: user.id });
        })
        .then(dbData => {
          expect(res.body[0].id).to.equal(dbData.id);
          expect(res.body[0].title).to.equal(dbData.title);
          expect(res.body[0].content).to.equal(dbData.content);
          expect(new Date(res.body[0].createdAt)).to.eql(dbData.createdAt);
          expect(new Date(res.body[0].updatedAt)).to.eql(dbData.updatedAt);
        });
    });

    it('should return correct search results for a valid tagId query', function() {
      let data;
      let res;
      const tagId = '333333333333333333333301';

      return chai.request(app).get(`/api/notes?tagId=${tagId}`).set('Authorization', `Bearer ${token}`)
        .then(_res => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body[0]).to.be.a('object');
          expect(res.body[0]).to.have.keys('id', 'title', 'content', 'tags', 'userId', 'folderId', 'createdAt', 'updatedAt');
          return Note.findOne({ _id: res.body[0].id, userId: user.id });
        })
        .then(dbData => {
          expect(res.body[0].id).to.equal(dbData.id);
          expect(res.body[0].title).to.equal(dbData.title);
          expect(res.body[0].content).to.equal(dbData.content);
          expect(new Date(res.body[0].createdAt)).to.eql(dbData.createdAt);
          expect(new Date(res.body[0].updatedAt)).to.eql(dbData.updatedAt);
        });
    });
  });

  describe('GET /api/notes/:id', function() {
    it('should return correct content for a given id', function() {
      let data;
      let res;
      return Note.findOne({ userId: user.id })
        .then((_data) => {
          data = _data;
          return chai.request(app).get(`/api/notes/${data.id}`).set('Authorization', `Bearer ${token}`);
        })
        .then((_res) => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('id', 'title', 'content', 'tags', 'userId', 'folderId', 'createdAt', 'updatedAt');
          return Note.findOne({ _id: res.body.id, userId: user.id }).populate('tags', 'name');
        })
        .then(dbData => {
          expect(res.body.id).to.equal(dbData.id);
          expect(res.body.title).to.equal(dbData.title);
          expect(res.body.content).to.equal(dbData.content);
          expect(new Date(res.body.createdAt)).to.eql(dbData.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(dbData.updatedAt);
        });
    });

    it('should respond with a 404/null for an invalid id', function() {
      let invalidId = 'DOESNOTEXIST';
      return chai.request(app).get(`/api/notes/${invalidId}`).set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(404);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('Not Found');
        });
    });
  });

  describe('POST /api/notes', function() {
    it('should create and return a new item when provided valid data', function () {
      const newItem = {
        'title': 'The best article about cats ever!',
        'content': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...'
      };

      let res;
      // 1) First, call the API
      return Note.findOne({ userId: user.id })
        .then(result => {
          newItem.tags = result.tags;
          newItem.folderId = null;
          return chai.request(app)
            .post('/api/notes')
            .send(newItem)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('id', 'title', 'content', 'userId', 'folderId', 'tags', 'createdAt', 'updatedAt');
          // 2) then call the database
          return Note.findOne({ _id: res.body.id, userId: user.id }).populate('tags', 'name');
        })
        // 3) then compare the API response to the database results
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should return object w/ message prop "Missing title in request body" when missing "title" field', function() {
      const newItem = {
        'content': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor...'
      };

      return chai.request(app)
        .post('/api/notes')
        .send(newItem)
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('Missing `title` in request body');
        });
    });
  });

  describe('PUT /api/notes/:id', function() {
    it('should update and return a note object when given valid data', function() {
      const updateData = {
        title: 'PUT updated title',
        content: 'updated content',
        tags: []
      };

      let res;

      return Note.findOne({ userId: user.id }).populate('tags', 'name')
        .then((res) => {
          updateData.id = res.id;
          updateData.folderId = null;
          return chai.request(app)
            .put(`/api/notes/${res.id}`)
            .send(updateData)
            .set('Authorization', `Bearer ${token}`);
        })
        .then((_res) => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('id', 'title', 'content', 'folderId', 'userId', 'tags', 'createdAt', 'updatedAt');
          expect(res.body.id).to.equal(updateData.id);
          expect(res.body.title).to.equal(updateData.title);
          expect(res.body.content).to.equal(updateData.content);
          expect(res.body.tags).to.eql(updateData.tags);
          return Note.findOne({_id: res.body.id, userId: user.id }).populate('tags', 'name');
        })
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should return a 400 error for an invalid id (not a valid Mongo ObjectId)', function() {
      const invalidId = 'invalidId';
      const updateData = {
        id: invalidId,
        title: 'PUT updated title',
        content: 'Updated content'
      };

      return Note.findOne({ userId: user.id }).populate('tags', 'name')
        .then(result => {
          updateData.folderId = null;
          updateData.tags = result.tags;
          return chai.request(app)
            .put(`/api/notes/${invalidId}`)
            .send(updateData)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('The `endpoint id` is not valid');
        });
    });

    it('should respond with a 404 error for a non-existent id', function() {
      const invalidId = 'microsoft123';
      const updateData = {
        id: invalidId,
        title: 'PUT updated title',
        content: 'updated content',
        tags: []
      };

      return Note.findOne({ userId: user.id }).populate('tags', 'name')
        .then(result => {
          updateData.folderId = null;
          return chai.request(app)
            .put(`/api/notes/${invalidId}`)
            .send(updateData)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(404);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('Not Found');
        });
    });

    it('should return obj w/ err message when missing title field', function() {
      const updateData = {
        content: 'updated content'
      };

      return Note.findOne({ userId: user.id })
        .then(res => {
          updateData.id = res.id;
          return chai.request(app)
            .put(`/api/notes/${updateData.id}`)
            .send(updateData)
            .set('Authorization', `Bearer ${token}`)
            .then(res => {
              expect(res).to.have.status(400);
              expect(res).to.be.json;
              expect(res.body).to.be.a('object');
              expect(res.body).to.have.keys('status', 'message');
              expect(res.body.message).to.equal('Missing `title` in request body');
            });
        });
    });
  });

  describe('DELETE /api/notes/:id', function() {
    it('should delete an item by id', function() {
      let id;

      return Note.findOne({ userId: user.id })
        .then(res => {
          id = res.id;
          return chai.request(app)
            .delete(`/api/notes/${id}`)
            .set('Authorization', `Bearer ${token}`)
            .then(res => {
              expect(res).to.have.status(204);
              return Note.findOne({ _id: id, userId: user.id });
            })
            .then(data => {
              expect(data).to.equal(null);
            });
        });
    });
  });
});



