const restify = require('restify'),
      config = require('./config'),
      db = require('./database'),
      r = db.r,
      Promise = require('bluebird');

const server = restify.createServer();

server.pre(restify.plugins.pre.userAgentConnection());
server.use(restify.plugins.bodyParser());
server.get('/todos', get);
server.post('/todos', create);
server.get('/todos/:id', getById);
server.patch('todos/:id', update);
server.del('/todos/:id', remove)

function get(req, res, next) {
  r.table('todos').orderBy({index: "createdAt"}).run().then(function(cursor) {
      return cursor.toArray();
  }).then(function(result) {
      res.send(JSON.stringify(result));
  }).error(handleError(res))
  .finally(function(){
      return next();
  });
}

function getById(req, res, next){
    const {id} = req.params
    r.table('todos').get(id).run().then(function(result){
        res.send(result);
    }).error(handleError(res))
    .finally(function(){
        return next();
    });
}

function create(req, res, next) {
    const todo = req.body;
    todo.createdAt = r.now();
    r.table('todos').insert(todo, {returnChanges: true}).run()
      .then(function(result) {
        if (result.inserted !== 1) {
            handleError(res, next)(new Error("Document was not inserted."));
        }
        else {
            res.send(JSON.stringify(result.changes[0].new_val));
        }
    }).error(handleError(res))
    .finally(function(){
        return next()
    });
}

function update(req, res, next){
    const { completed } = req.body;
    const { id } = req.params;
    r.table('todos').get(id).update({completed: completed}, {returnChanges: true}).run()
        .then(function(result){
            res.send(JSON.stringify(result.changes[0].new_val));
        }).error(handleError(res))
        .finally(function(){
            return next();
        })
}

function remove(req, res, next){
    const {id} = req.params
    r.table('todos').get(id).delete().run().then(function(result){
        res.send(result);
    }).error(handleError(res))
    .finally(function(){
        return next();
    });
}

function handleError(res) {
    return function(error) {
        res.send(500, {error: error.message});
    }
}

db.createDatabase();
server.listen(config.port, function() {
  console.log('%s listening at %s', server.name, server.url);
});
