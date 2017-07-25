const restify = require('restify'),
      config = require('./config'),
      db = require('./database'),
      todosRoute = require('./routes/todos');

const server = restify.createServer();

server.pre(restify.plugins.pre.userAgentConnection());
server.use(restify.plugins.bodyParser());
todosRoute.applyRoutes(server);


db.createDatabase();
server.listen(config.port, function() {
  console.log('%s listening at %s', server.name, server.url);
});
