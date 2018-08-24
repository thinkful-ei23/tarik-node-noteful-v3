'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server');
const { TEST_MONGODB_URI } = require('../config');

const User = require('../models/user');

const expect = chai.expect;

chai.use(chaiHttp);

describe('Users Tests', function() {
  const username = 'exampleUser';
  const password = 'examplePass';
  const fullname = 'Example User';

  const usernameB = 'exampleUser';
  const passwordB = 'examplePassB';
  const fullnameB = 'Example UserB';
  
  before(function() {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function() {
    return User.createIndexes();
  });

  afterEach(function() {
    return mongoose.connection.db.dropDatabase();
  });

  after(function() {
    return mongoose.disconnect();
  });

  describe('POST /api/users', function() {
    it('should create a new user', function() {
      const testUser = { username, password, fullname };

      let res;
      
      return chai.request(app)
        .post('/api/users')
        .send(testUser)
        .then(_res => {
          res = _res;
          expect(res).to.have.status(201);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'username', 'fullname');

          expect(res.body.id).to.exist;
          expect(res.body.username).to.equal(testUser.username);
          expect(res.body.fullname).to.equal(testUser.fullname);
          return User.findOne({ username });
        })
        .then(user => {
          expect(user).to.exist;
          expect(user.id).to.equal(res.body.id);
          expect(user.fullname).to.equal(res.body.fullname);
          return user.validatePassword(password);
        })
        .then(isValid => {
          expect(isValid).to.be.true;
        });
    });

    it('should reject users with missing username', function() {
      const testUser = { fullname, password };
      return chai.request(app)
        .post('/api/users')
        .send(testUser)
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('Missing \'username\' in request body');
        });
    });

    it('should reject users with missing password', function() {
      const testUser = { fullname, username };
      return chai.request(app)
        .post('/api/users')
        .send(testUser)
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('Missing \'password\' in request body');
        });
    });

    it('should reject users with non-string username', function() {
      const testUser = { fullname, password };
      testUser.username = 123;
      return chai.request(app)
        .post('/api/users')
        .send(testUser)
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('Incorrect field type; expected string for field the following field: \'username\' ');
        });
    });

    it('should reject users with non-string password', function() {
      const testUser = { fullname, username };
      testUser.password = 12345678;
      return chai.request(app)
        .post('/api/users')
        .send(testUser)
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('Incorrect field type; expected string for field the following field: \'password\' ');
        }); 
    });

    it('should reject users with non-trimmed username', function() {
      const testUser = { fullname, password };
      testUser.username = ' whitespace ';
      return chai.request(app)
        .post('/api/users')
        .send(testUser)
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('Cannot start or end with whitespace for the following field: \'username\'');
        });
    });

    it('should reject users with non-trimmed password', function() {
      const testUser = { fullname, username };
      testUser.password = ' whitespace ';
      return chai.request(app)
        .post('/api/users')
        .send(testUser)
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('Cannot start or end with whitespace for the following field: \'password\'');
        });
    });

    it('should reject users with empty username', function() {
      const testUser = { fullname, password };
      testUser.username = '';
      return chai.request(app)
        .post('/api/users')
        .send(testUser)
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('username must be at least 1 characters long');
        });
    });

    it('should reject users with password less than 8 characters', function() {
      const testUser = { fullname, username };
      testUser.password = '';
      return chai.request(app)
        .post('/api/users')
        .send(testUser)
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('password must be at least 8 characters long');
        });
    });

    it('should reject users with password greater than 72 characters', function() {
      const testUser = { fullname, username };
      testUser.password = '72727272727272727272727272727272727272727272727272727272727272727272727272727';
      return chai.request(app)
        .post('/api/users')
        .send(testUser)
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('status', 'message');
          expect(res.body.message).to.equal('password must be at most 72 characters long');
        });
    });

    it('should reject users with duplicate username', function() {
      const testUser = { fullname, username, password };
      const testUserB = { fullname: fullnameB, username: usernameB, password: passwordB };
      return chai.request(app).post('/api/users').send(testUser)
        .then(() => {
          return chai.request(app).post('/api/users').send(testUserB);
        })
        .then(res2 => {
          expect(res2).to.have.status(400);
          expect(res2.body).to.be.an('object');
          expect(res2.body).to.have.keys('status', 'message');
          expect(res2.body.message).to.equal('The username already exists');
        });
    });

    it('should trim fullname', function() {
      const testUser = { fullname: ' whitespace ', username, password};
      return chai.request(app)
        .post('/api/users')
        .send(testUser)
        .then(res => {
          expect(res.body.fullname).to.equal(testUser.fullname.trim());
        });
    });
  });
});