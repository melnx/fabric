'use strict';

const fs = require('fs');
const util = require('util');
const ssri = require('ssri');
const jade = require('jade');
const express = require('express');
const bodyParser = require('body-parser');

const App = require('./app');
const Resource = require('./resource');

function HTTP (init) {
  if (!init) init = {};

  let self = this;
  let config = {
    precompile: init.precompile || true,
    port: init.port || 3000
  };

  this.app = new App();
  this.config = config;
  this.router = express();

  this.router.use('/assets', express.static('assets'));
  this.router.set('views', 'assets');

  this.router.use(bodyParser.json());

  if (config.client && config.client.precompile) {
    this.router.set('view engine', 'js');
    this.router.engine('js', require('compiled-jade-render'));
  } else {
    this.router.set('view engine', 'jade');
  }

  config.scripts = [
    '/assets/webcomponents-loader.js',
    //'/assets/app.js'
  ].map(function(x) {
    return {
      link: x,
      integrity: ssri.fromData(fs.readFileSync(__dirname + '/..' + x))
    };
  });

  config.stylesheets = [];

  // TODO: read from directory
  config.components = [
    //'/components/application',
    //'/components/component',
    //'/components/index'
  ].map(function (x) {
    return {
      link: x,
      content: fs.readFileSync(__dirname + '/..' + x + '.jade')
    }
  });

  this.router.get('/', function (req, res) {
    res.render('app', config);
  });

  this.router.options('/', function (req, res) {
    res.send(self.app.resources);
  });

  this.router.get('/components/:name', function (req, res, next) {
    return res.render('../components/' + req.param('name'), config);
  });

  this.router.get('/assets', function (req, res, next) {
    return res.send([]); // empty array for now.
    // TODO: finish this endpoint
  });

}

util.inherits(HTTP, require('./vector'));

HTTP.prototype.define = async function (name, definition) {
  let self = this;
  let resource = await this.app.define(name, definition);
  
  resource.attach(self.app);
  
  this.router.post(resource.routes.query, async function (req, res, next) {
    let obj = await resource.create(req.body);
    
    //res.status(303, )
    return res.send(obj);
  });
  
  this.router.get(resource.routes.query, async function (req, res, next) {
    let obj = await resource.query(req.params);
    return res.send(obj);
  });

  console.log('defined:', name, resource);

};

HTTP.prototype.stop = async function () {
  this.server.close();
  await this.app.tips.close();
  await this.app.stash.close();
};

HTTP.prototype.start = async function () {
  this.server = await this.router.listen(3000);
};

module.exports = HTTP;