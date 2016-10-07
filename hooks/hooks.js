'use strict';

var config = require('../modules/config');
var fs = require('fs');
var path = require('path');
var passport = require('passport');
var cookieParser = require('cookie-parser')
var Cookies = require('cookies');
var User = require('../modules/User');
var jwt = require('jwt-simple');
var flash = require('connect-flash');
var helmet = require('helmet');
var Limiter = require('ratelimiter');
var redis = require('redis');
var csrf = require('csurf');

var hooks = {
  afterImport: function(res, file, conf, ctx, abe) {
    if (file === 'right-list-head') {
      var workflows = config.getConfig('workflow', abe);
      var html = ''
      Array.prototype.forEach.call(workflows, (workflow) => {
        if (workflow !== 'draft' && workflow !== 'publish') {
          html += '<th align="center">' + workflow + '</th>'
        }
      })
      return  html
    }else if (file === 'toolbar') {
      var workflows = JSON.parse(JSON.stringify(config.getConfig('workflow', abe)));
      if (workflows[0] === 'draft') {
        workflows.shift()
      }

      function addBtn (type, hidden) {
        var btn = "\n<button class=\"btn btn-info btn-save " + ((hidden && type !== 'draft') ? 'btn-hidden' : '') + "\" data-action=\"" + type + "\">";
        btn += "\n<span class=\"before\">";
        btn += "\n" + type;
        btn += "\n</span>";
        btn += "\n<span class=\"loading\">";
        btn += "\n{{text.saving}}";
        btn += "\n</span>";
        btn += "\n<span class=\"after\">";
        btn += "\n{{text.done}}";
        btn += "\n</span>";
        btn += "\n</button>";

        return btn
      }

      var html = ''
      html += "\n{{#ifCond @root.json.abe_meta.status 'draft'}}";
      html += addBtn('draft', true);

      html += "\n{{#role '" + workflows[0] + "' @root}}";
      html += addBtn(workflows[0], false);
      html += "\n{{/role}}";

      html += "\n{{else}}";
      html += "\n<button class=\"btn btn-info btn-save\" data-action=\"reject\">";
      html += "\n<span class=\"before\">";
      html += "\n{{#ifCond @root.json.abe_meta.status 'publish'}}";
      html += "\nedit";
      html += "\n{{else}}";
      html += "\nreject";
      html += "\n{{/ifCond}}";
      html += "\n</span>";
      html += "\n<span class=\"loading\">";
      html += "\n{{text.saving}}";
      html += "\n</span>";
      html += "\n<span class=\"after\">";
      html += "\n{{text.done}}";
      html += "\n</span>";
      html += "\n</button>";
      html += "\n{{/ifCond}}";

      var prev = workflows[0];

      workflows.shift();

      Array.prototype.forEach.call(workflows, (workflow) => {
        html += "\n{{#ifCond @root.json.abe_meta.status '" + prev + "'}}";
        html += "\n{{#role '" + workflow + "' @root}}";
        html += addBtn(workflow, false);
        html += "\n{{/role}}";
        html += "\n{{/ifCond}}";

        prev = workflow
      })

      return  html
    }
    return res;
  },
  beforeReject: function(url, abe) {
    var workflow = config.getConfig('workflow', abe)
    workflow.forEach(function (flow) {
      abe.coreData.revision.deleteOlderRevisionByType(abe.cmsData.fileAttr.delete(url), flow[0])
    })

    return url;
  },
  afterListPageDraft: function(workflow, file, index, text, abe) {
    var newRes = '';

    var status = file.abe_meta.status;
    var workflowUser = JSON.parse(JSON.stringify(config.getConfig('workflow', abe)));
    Array.prototype.forEach.call(workflowUser, (flow) => {
      var hidden = ''
      if(status !== flow) {
        hidden = 'hidden'
      }

      newRes += `<td align="center" class="${flow}">`
      if(file[flow]) {
        if (flow === 'publish') {
          newRes += `<a href="/abe/${file.abe_meta.template}?filePath=${file[flow].html}" class="checkmark label-published">&#10004;</a>`
        }else {
          newRes += `<a href="/abe/${file.abe_meta.template}?filePath=${file[flow].html}" class="${hidden} label label-default label-draft">${flow}</a>`
        }
      }else {

      }
      newRes += '</td>'
    })

   return newRes
  },
  afterExpress: function(app, express, abe) {

    var userBddUrl = path.join(abe.config.root, 'users/bdd.json')
    if(!abe.fileUtils.isFile(userBddUrl)) {
      mkdirp(path.dirname(userBddUrl))
      abe.fse.writeJsonSync(userBddUrl, [], { space: 2, encoding: 'utf-8' })
      var admin = User.add({
          "username": "admin",
          "name": "admin",
          "email": "admin@test.com",
          "password": "Adm1n@test",
          "role": {
            "workflow":"admin",
            "name":"Admin"
          }
        }, abe);
      User.activate(admin.user.id, abe)
    }
    app.use(flash());
    app.use(helmet());
    app.use(cookieParser());
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(csrf({
      cookie: {
        secure: abe.config.cookie.secure
      }
    }));

    app.use(function (req, res, next) {
      var send = res.send;
      res.send = function (string) {
        var body = string instanceof Buffer ? string.toString() : string;
        body = body.replace(/<\/body>/g, function (w) {
           return '<input type=\'hidden\' id=\'globalCsrfToken\' value=\'' + token + '\' /><script src=\'/user-input.js\'></script>' + w;
        });
        send.call(this, body);
      };
      var token = req.csrfToken();
      res.locals.csrfToken = token;

      next();
    })

    // error handler 
    app.use(function (err, req, res, next) {
      if (err.code !== 'EBADCSRFTOKEN') return next(err)

      var isHtml = /text\/html/.test(req.get('accept')) ? true : false
      if(isHtml) {
        var login = config.getConfig('login', abe);
        res.redirect(login)
      }else {
        var notAuthorized = {
          success: 0,
          message: 'form tampered with !'
        }
        res.set('Content-Type', 'application/json')
        res.send(JSON.stringify(notAuthorized))
      }
    })

    app.use( function( req, res, next ) {
      var isNexted = false
      if( req.url === '/abe/plugin/users/login' && req.method === 'POST' ) {
        var redisReady = false;
        try {
          var username = req.body.username;  
          var limiterConfig = config.getConfig('limiter', abe)

          var client = redis.createClient()
          client.on('error', function(err) {
            if (!isNexted) {
              isNexted = true
              next();
            }
          });

          var limit = new Limiter({
            id: username,
            db: client,
            duration: limiterConfig.duration,
            max: limiterConfig.max
          });

          limit.get(function(err, limit) {
            if (err) return next(err);

            try {
              res.set('X-RateLimit-Limit', limit.total);
              res.set('X-RateLimit-Remaining', limit.remaining - 1);
              res.set('X-RateLimit-Reset', limit.reset);

              // all good
              console.log('remaining ', limit.remaining - 1, limit.total, username);
              if (limit.remaining) return next();

              // not good
              var delta = (limit.reset * 1000) - Date.now() | 0;
              var after = limit.reset - (Date.now() / 1000) | 0;
              res.set('Retry-After', after);
              res.send(429, 'Rate limit exceeded');
              } catch(e) {
                console.log('e', e)
                next();
              }
          });
        } catch(e) {
          console.log('e', e)
          next();
        }
      }else {
        next();
      }

    });

    return app
  },
  afterHandlebarsHelpers: function(Handlebars, abe) {
    Handlebars.registerHelper('role', function(role, obj, ctx) {
      if(typeof obj.express !== 'undefined' && obj.express !== null) {
        var cookies = new Cookies(obj.express.req, obj.express.res, {
          secure: abe.config.cookie.secure
        })
        var token = cookies.get('x-access-token');

        if(typeof token !== 'undefined' && token !== null && token !== '') {
          var secret = config.getConfig('secret', abe);
          var decoded = jwt.decode(token, secret);

          var user = User.findSync(decoded.iss)

          var roles = config.getConfig('roles', abe);
          var cpt = 0;
          var cptUser = 0;
          var cptRole = 0;
          Array.prototype.forEach.call(roles, (currentRole) => {
            if(currentRole.workflow === user.role.workflow) {
              cptUser = cpt
            }
            if(currentRole.workflow === role) {
              cptRole = cpt
            }
            cpt++;
          })

          if(cptRole > cptUser) {
            return '';
          }
        }

        var content = ctx.fn(this)
        return content
          
      }else {
        return '';
      }
    })
    return Handlebars
  },
  beforeAddRoute: function(router, abe) {
    var workflows = config.getConfig('workflow', abe)
    Array.prototype.forEach.call(workflows, function(workflow) {

      if (workflow !== 'draft' && workflow !== 'publish' && workflow !== 'reject') {

        router.post('/' + workflow, function(req, res, next){

          abe.Hooks.instance.trigger('beforeRoute', req, res, next)
          if(typeof res._header !== 'undefined' && res._header !== null) return;

          var p = new Promise(function(resolve, reject) {
            abe.cmsOperations.save.save(
              path.join(abe.config.root, abe.config.draft.url, req.body.filePath.replace(abe.config.root)),
              req.body.tplPath,
              req.body.json,
              '',
              'draft',
              null,
              workflow)
              .then(function() {
                resolve()
              }.bind(this)).catch(function(e) {
                console.error(e.stack)
              })
          }.bind(this))
          .catch(function(e) {
            console.error(e.stack) // "oh, no!"
          })

          p.then(function(resSave) {

            abe.cmsOperations.save.save(
              path.join(abe.config.root, abe.config.draft.url, req.body.filePath.replace(abe.config.root)),
              req.body.tplPath,
              req.body.json,
              '',
              workflow,
              null,
              workflow)
              .then(function(resSave) {
                abe.Manager.instance.updateList()
                if(typeof resSave.error !== 'undefined' && resSave.error !== null  ){
                  res.set('Content-Type', 'application/json')
                  res.send(JSON.stringify({error: resSave.error}))
                }
                var result
                if(typeof resSave.reject !== 'undefined' && resSave.reject !== null){
                  result = resSave
                }
                if(typeof resSave.json !== 'undefined' && resSave.json !== null){
                  result = {
                    success: 1,
                    json: resSave.json
                  }
                }
                res.set('Content-Type', 'application/json')
                res.send(JSON.stringify(result))
              }.bind(this))
            }.bind(this))
          })
      }
      
    }.bind(this))

    return router
  },
  beforeRoute: function(req, res, next, abe) {
    if( req.url === '/abe/plugin/abe-users/forgot' ) {
      next();
      return;
    }

    var isHtml = /text\/html/.test(req.get('accept')) ? true : false
    var isAllowed = true

    var cookies = new Cookies(req, res, {
      secure: abe.config.cookie.secure
    })
    var token = cookies.get('x-access-token');
    var login = config.getConfig('login', abe);

    if(typeof token !== 'undefined' && token !== null && token !== '') {
      try {
        var secret = config.getConfig('secret', abe);
        var decoded = jwt.decode(token, secret);

        if (decoded.exp <= Date.now()) {
          // res.end('Access token has expired', 400);
          var login = config.getConfig('login', abe);
          isAllowed = false
        }

        var user = User.findSync(decoded.iss)

        var allowed = false
        var routes = config.getConfig('routes', abe);
        if(typeof routes[user.role.workflow] !== 'undefined' && routes[user.role.workflow] !== null) {
          Array.prototype.forEach.call(routes[user.role.workflow], (route) => {
            var reg = new RegExp(route)
            if(reg.test(req.url)) {
              allowed = true
            }
          })
        }
        if(!allowed) {
          isAllowed = false
        }
      } catch (err) {
        isAllowed = false
      }
    }else {
      isAllowed = false
    }

    if(!isAllowed) {
      if(isHtml) {
        res.redirect(login)
      }else {
        var notAuthorized = {
          success: 0,
          message: 'Not authorized !'
        }
        res.set('Content-Type', 'application/json')
        res.send(JSON.stringify(notAuthorized))
      }
    }

    return req
  }
};

exports.default = hooks;