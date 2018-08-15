'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server');
const { TEST_MONGODB_URI } = require('../config');

const Note = require('../models/note');

const seedNotes = require('../db/seed/notes');

const expect = chai.expect;
chai.use(chaiHttp);

describe ('Node Noteful Tests', function() {
  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return Note.insertMany(seedNotes);
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
        Note.find(),
        chai.request(app).get('/api/notes')
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
          expect(res.body[0]).to.be.a('object');
          expect(res.body[0]).to.have.keys('id', 'title', 'content', 'createdAt', 'updatedAt');
        });
    });

    it('should return correct search results for a valid query', function() {
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
          expect(res.body[0]).to.have.keys('id', 'title', 'content', 'createdAt', 'updatedAt');
          return Note.findById(res.body[0].id);
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
      return chai.request(app).get(`/api/notes?searchTerm=${invalidQuery}`)
        .then((_res) => {
          res = _res;
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(0);
          return Note.find({'title': invalidQuery});
        })
        .then(dbData => {
          expect(dbData).to.be.a('array');
          expect(dbData).to.have.length(0);
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
          expect(res.body).to.have.keys('id', 'title', 'content', 'createdAt', 'updatedAt');
          return Note.findById(res.body.id);
        })
        .then(dbData => {
          expect(res.body.id).to.equal(dbData.id);
          expect(res.body.title).to.equal(dbData.title);
          expect(res.body.content).to.equal(dbData.content);
          expect(new Date(res.body.createdAt)).to.eql(dbData.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(dbData.updatedAt);
        });
    });

    it('should respond with a 404 for an invalid id', function() {
      return chai.request(app).get('/api/notes/DOESNOTEXIST')
        .then(res => {
          expect(res).to.have.status(404);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal();
        });
    });
  });
});



