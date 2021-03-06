'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = require('../server');
const { TEST_MONGODB_URI, JWT_SECRET } = require('../config');

const Folder = require('../models/folder');
const User = require('../models/user');


const seedFolders = require('../db/seed/folders');
const seedUsers = require('../db/seed/users');

const expect = chai.expect;
chai.use(chaiHttp);

describe ('Folder Tests', function() {
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
      Folder.createIndexes()
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

  describe('GET /api/folders', function() {
    it('should return the default array of folders', function () {
      return Promise.all([
        Folder.find({ userId: user.id }),
        chai.request(app).get('/api/folders').set('Authorization', `Bearer ${token}`)
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

  describe('GET /api/folders/:id', function() {
    it('should return correct content for a given id', function() {
      let data;
      let res;
      return Folder.findOne({ userId: user.id })
        .then((_data) => {
          data = _data;
          return chai.request(app).get(`/api/folders/${data.id}`).set('Authorization', `Bearer ${token}`);
        })
        .then((_res) => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('name', 'id', 'userId', 'createdAt', 'updatedAt');
          return Folder.findOne({_id: res.body.id, userId: user.id});
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
      return chai.request(app).get(`/api/folders/${invalidId}`).set('Authorization', `Bearer ${token}`)
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
      return chai.request(app).get(`/api/folders/${invalidId}`).set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(404);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('Not Found');
        });
    });
  });

  describe('POST /api/folders', function() {
    it('should create and return a new folder when provided valid data', function() {
      const newFolder = {'name': 'Culture'};
      let res;

      return chai.request(app)
        .post('/api/folders')
        .send(newFolder)
        .set('Authorization', `Bearer ${token}`)
        .then((_res) => {
          res = _res;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('id', 'name', 'userId', 'createdAt', 'updatedAt');
          return Folder.findOne({ _id: res.body.id, userId: user.id });
        })
        .then(data => {
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should return object w/ message prop "Missing name in request body" when missing "name" field', function() {
      const newFolder = {
        'notName': 'culture'
      };

      return chai.request(app)
        .post('/api/folders')
        .send(newFolder)
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', function () {
      return Folder.findOne({ userId: user.id })
        .then(data => {
          const newItem = { 'name': data.name };
          return chai.request(app).post('/api/folders').send(newItem).set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The folder name already exists');
        });
    });
  });

  describe('PUT /api/folders/:id', function() {
    it('should update and return a note object when given valid data', function() {
      const updateData = {
        name: 'UPDATE NAME'
      };

      let res;
      let findId;
      return Folder.findOne({ userId: user.id })
        .then((res) => {
          findId = res.id;
          return chai.request(app)
            .put(`/api/folders/${res.id}`)
            .send(updateData)
            .set('Authorization', `Bearer ${token}`);
        })
        .then((_res) => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('id', 'name', 'userId', 'createdAt', 'updatedAt');
          expect(res.body.id).to.equal(findId);
          expect(res.body.name).to.equal(updateData.name);
          return Folder.findOne({ _id: res.body.id, userId: user.id });
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
        .put(`/api/folders/${invalidId}`)
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

      return Folder.findOne({ userId: user.id })
        .then(res => {
          findId = res.id;
          return chai.request(app)
            .put(`/api/folders/${findId}`)
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

    it('should return an error when given a duplicate name', function () {
      return Folder.find({ userId: user.id }).limit(2)
        .then(results => {
          const [item1, item2] = results;
          item1.name = item2.name;
          return chai.request(app)
            .put(`/api/folders/${item1.id}`)
            .send(item1)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('The folder name already exists');
        });
    });
  });

  describe('DELETE /api/folders/:id', function() {
    it('should delete a folder by id then set folderId for related notes to null', function() {
      let id;

      return Folder.findOne({ userId: user.id })
        .then(res => {
          id = res.id;
          return chai.request(app)
            .delete(`/api/folders/${id}`)
            .set('Authorization', `Bearer ${token}`)
            .then(res => {
              expect(res).to.have.status(204);
              return Folder.findOne({ _id: id, userId: user.id });
            })
            .then(data => {
              expect(data).to.equal(null);
            });
        });
    });
  });
});