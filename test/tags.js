'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken'); 

const app = require('../server');
const { TEST_MONGODB_URI, JWT_SECRET } = require('../config');

const Tag = require('../models/tag');
const Note = require('../models/note');
const User = require('../models/user');

const seedTags = require('../db/seed/tags');
const seedNotes = require('../db/seed/notes');
const seedUsers = require('../db/seed/users');

const expect = chai.expect;
chai.use(chaiHttp);

describe('Tags tests', function () {
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  let token;
  let user;
    
  beforeEach(function () {
    return Promise.all([
      User.insertMany(seedUsers),
      Tag.insertMany(seedTags),
      Note.insertMany(seedNotes),
      Tag.createIndexes()
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

  describe('GET /api/tags', function() {
    it('should return the default array of folders', function() {
      return Promise.all([
        Tag.find({ userId: user.id }),
        chai.request(app).get('/api/tags').set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
          expect(res.body[0]).to.be.a('object');
          expect(res.body[0]).to.have.keys('name', 'id', 'userId', 'createdAt', 'updatedAt');
        });
    });
  });

  describe('GET /api/tags/:id', function() {
    it('should return correct content for a given id', function() {
      let data;
      let res;
      return Tag.findOne({ userId: user.id })
        .then((_data) => {
          data = _data;
          return chai.request(app).get(`/api/tags/${data.id}`).set('Authorization', `Bearer ${token}`);
        })
        .then((_res) => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('name', 'id', 'userId', 'createdAt', 'updatedAt');
          return Tag.findOne({_id: res.body.id, userId: user.id });
        })
        .then(dbData => {
          expect(res.body.id).to.equal(dbData.id);
          expect(res.body.name).to.equal(dbData.name);
          expect(new Date(res.body.createdAt)).to.eql(dbData.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(dbData.updatedAt);
        }); 
    });

    it('should respond with a 400 for an invalid id', function() {
      let invalidId = 'RANDOM';
      return chai.request(app).get(`/api/tags/${invalidId}`).set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('The queried id is not a valid Mongo ObjectId');
        });
    });

    it('should respond with a 404: not found for a non-existent id', function() {
      let invalidId = 'DOESNOTEXIST';
      return chai.request(app).get(`/api/tags/${invalidId}`).set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(404);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('Not Found');
        });
    });
  });

  describe('POST /api/tags', function() {
    it('should create and return a new folder when provided valid data', function() {
      const newTag = {'name': 'Undead'};
      let res;

      return chai.request(app)
        .post('/api/tags')
        .send(newTag)
        .set('Authorization', `Bearer ${token}`)
        .then((_res) => {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('id', 'name', 'userId', 'createdAt', 'updatedAt');
          return Tag.findOne({ _id: res.body.id, userId: user.id });
        })
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should return object w/ message prop "Missing name in request body" when missing "name" field', function() {
      const newTag = {
        'notName': 'Undead'
      };

      return chai.request(app)
        .post('/api/tags')
        .send(newTag)
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', function() {
      return Tag.findOne({ userId: user.id })
        .then(data => {
          const newItem = { 'name': data.name };
          return chai.request(app).post('/api/tags').send(newItem).set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The tag name already exists');
        });
    });
  });

  describe('PUT /api/tags/:id', function() {
    it('should update and return a note object when given valid data', function() {
      const updateData = {
        name: 'UPDATE NAME'
      };

      let res;
      let findId;

      return Tag.findOne({ userId: user.id })
        .then((res) => {
          findId = res.id;
          return chai.request(app).put(`/api/tags/${findId}`).send(updateData).set('Authorization', `Bearer ${token}`);
        })
        .then((_res) => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('id', 'name', 'userId', 'createdAt', 'updatedAt');
          expect(res.body.id).to.equal(findId);
          expect(res.body.name).to.equal(updateData.name);
          return Tag.findOne({ _id: res.body.id, userId: user.id });
        })
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should respond with a 400 for an invalid id', function() {
      const invalidId = 'RANDOM';
      const updateData = {
        name: 'UPDATE NAME'
      };

      return chai.request(app)
        .put(`/api/tags/${invalidId}`)
        .send(updateData)
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('The queried id is not a valid Mongo ObjectId');
        });
    });

    it('should return obj w/ err message when missing name field', function() {
      const updateData = {
        notName: 'UPDATE NAME'
      };
      let findId;

      return Note.findOne({ userId: user.id })
        .then(res => {
          findId = res.id;
          return chai.request(app)
            .put(`/api/tags/${findId}`)
            .send(updateData)
            .set('Authorization', `Bearer ${token}`)
            .then(res => {
              expect(res).to.have.status(400);
              expect(res).to.be.json;
              expect(res.body).to.be.a('object');
              expect(res.body).to.have.keys('status', 'message');
              expect(res.body.message).to.equal('Missing `name` in request body');
            });
        });
    });

    it('should return an error when given a duplicate name', function() {
      return Tag.find({ userId: user.id }).limit(2)
        .then(res => {
          const [ item1, item2 ] = res;
          item1.name = item2.name;
          return chai.request(app)
            .put(`/api/tags/${item1.id}`)
            .send(item1)
            .set('Authorization', `Bearer ${token}`)
            .then(res => {
              expect(res).to.have.status(400);
              expect(res).to.be.json;
              expect(res.body).to.be.a('object');
              expect(res.body.message).to.equal('The tag name already exists');
            });
        });
    });
  });

  describe('DELETE /api/tags/:id', function() {
    it('should delete a folder by id then remove tagId from tags array for related notes', function() {
      let id;

      return Tag.findOne({ userId: user.id })
        .then(res => {
          id = res.id;
          return chai.request(app)
            .delete(`/api/tags/${id}`)
            .set('Authorization', `Bearer ${token}`)
            .then(res => {
              expect(res).to.have.status(204);
              return Tag.findOne({ _id: id, userId: user.id });
            })
            .then(data => {
              expect(data).to.equal(null);
              return Note.find({ tags: id, userId: user.id });
            })
            .then(noteData => {
              expect(noteData).to.eql([]);
            });
        });
    });
  }); 
});