'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server');
const { TEST_MONGODB_URI } = require('../config');

const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');

const seedNotes = require('../db/seed/notes');
const seedFolders = require('../db/seed/folders');
const seedTags = require('../db/seed/tags');

const expect = chai.expect;
chai.use(chaiHttp);

describe ('Notes Tests', function() {
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return Promise.all([
      Folder.insertMany(seedFolders),
      Note.insertMany(seedNotes),
      Tag.insertMany(seedTags),
      Folder.createIndexes(),
      Tag.createIndexes()
    ]);
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
        Note.find().populate('tags', 'name'),
        chai.request(app).get('/api/notes')
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
          expect(res.body[0]).to.be.a('object');
          expect(res.body[0]).to.have.keys('id', 'title', 'content', 'folderId', 'tags', 'createdAt', 'updatedAt');
        });
    });

    it('should return correct search results for a valid searchTerm query', function() {
      let data;
      let res;

      return Note.findOne()
        .then(_data => {
          data = _data;
          return chai.request(app).get(`/api/notes?searchTerm=${data.title}`);
        })
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body[0]).to.be.a('object');
          expect(res.body[0]).to.have.keys('id', 'title', 'content', 'folderId', 'tags', 'createdAt', 'updatedAt');
          return Note.findById(res.body[0].id);
        })
        .then(dbData => {
          expect(res.body[0].id).to.equal(dbData.id);
          expect(res.body[0].title).to.equal(dbData.title);
          expect(res.body[0].content).to.equal(dbData.content);
          expect(res.body[0].folderId).to.equal(dbData.folderId.toString());
          expect(new Date(res.body[0].createdAt)).to.eql(dbData.createdAt);
          expect(new Date(res.body[0].updatedAt)).to.eql(dbData.updatedAt);
        });
    });

    it('should return an empty array for an incorrect query', function() {
      let invalidQuery = 'invalidQuery';
      let res;
      return chai.request(app).get(`/api/notes?searchTerm=${invalidQuery}`)
        .then((_res) => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(0);
        });
    });
  });

  describe('GET /api/notes/:id', function() {
    it('should return correct content for a given id', function() {
      let data;
      let res;
      return Note.findOne()
        .then((_data) => {
          data = _data;
          return chai.request(app).get(`/api/notes/${data.id}`);
        })
        .then((_res) => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('id', 'title', 'content', 'folderId', 'tags', 'createdAt', 'updatedAt');
          return Note.findById(res.body.id).populate('tags', 'name');
        })
        .then(dbData => {
          expect(res.body.id).to.equal(dbData.id);
          expect(res.body.title).to.equal(dbData.title);
          expect(res.body.content).to.equal(dbData.content);
          expect(res.body.folderId).to.equal(dbData.folderId.toString());
          expect(new Date(res.body.createdAt)).to.eql(dbData.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(dbData.updatedAt);
        });
    });

    it('should respond with a 404/null for an invalid id', function() {
      let invalidId = 'DOESNOTEXIST';
      return chai.request(app).get(`/api/notes/${invalidId}`)
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
      return Note.findOne()
        .then(result => {
          newItem.folderId = result.folderId;
          newItem.tags = result.tags;
          return chai.request(app)
            .post('/api/notes')
            .send(newItem);
        })
        .then(function (_res) {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('id', 'title', 'content', 'folderId', 'tags', 'createdAt', 'updatedAt');
          // 2) then call the database
          return Note.findById(res.body.id).populate('tags', 'name');
        })
        // 3) then compare the API response to the database results
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(res.body.folderId).to.equal(data.folderId.toString());
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

      return Note.findOne().populate('tags', 'name')
        .then((res) => {
          updateData.id = res.id;
          updateData.folderId = res.folderId;
          return chai.request(app)
            .put(`/api/notes/${res.id}`)
            .send(updateData);
        })
        .then((_res) => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('id', 'title', 'content', 'folderId', 'tags', 'createdAt', 'updatedAt');
          expect(res.body.id).to.equal(updateData.id);
          expect(res.body.title).to.equal(updateData.title);
          expect(res.body.content).to.equal(updateData.content);
          expect(res.body.folderId).to.equal(updateData.folderId.toString());
          expect(res.body.tags).to.eql(updateData.tags);
          return Note.findById(res.body.id).populate('tags', 'name');
        })
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.title).to.equal(data.title);
          expect(res.body.content).to.equal(data.content);
          expect(res.body.folderId).to.equal(data.folderId.toString());
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

      return Note.findOne().populate('tags', 'name')
        .then(result => {
          updateData.folderId = result.folderId;
          updateData.tags = result.tags;
          return chai.request(app)
            .put(`/api/notes/${invalidId}`)
            .send(updateData);
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

      return Note.findOne().populate('tags', 'name')
        .then(result => {
          updateData.folderId = result.folderId;
          return chai.request(app)
            .put(`/api/notes/${invalidId}`)
            .send(updateData);
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

      return Note.findOne()
        .then(res => {
          updateData.id = res.id;
          return chai.request(app)
            .put(`/api/notes/${updateData.id}`)
            .send(updateData)
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

      return Note.findOne()
        .then(res => {
          id = res.id;
          return chai.request(app)
            .delete(`/api/notes/${id}`)
            .then(res => {
              expect(res).to.have.status(204);
              return Note.findById(id);
            })
            .then(data => {
              expect(data).to.equal(null);
            });
        });
    });
  });
});



