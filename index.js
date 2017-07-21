const restify = require('restify'),
      r = require('rethinkdb'),
      config = require('./config');


const server = restify.createServer();

const createConnection = (req, res, next) => {
    r.connect(config.rethinkdb).then(function(conn) {
        req._rdbConn = conn;
        next();
    }).error(handleError(res));
}


const closeConnection = (req, res, next) => req._rdbConn.close()

server.use(createConnection);
server.use(closeConnection);
server.use(restify.plugins.bodyParser());

server.put('/todo/new', create);
server.get('/todo/get', get);

function get(req, res, next) {
    r.table('todos').orderBy({index: "createdAt"}).run(req._rdbConn).then(function(cursor) {
        return cursor.toArray();
    }).then(function(result) {
        res.send(JSON.stringify(result));
    }).error(handleError(res))
    .finally(function(){
      return next();
    })
}

function create(req, res, next) {
    console.log("im hereee");
    var todo = req.body;
    todo.createdAt = r.now(); // Set the field `createdAt` to the current time
    r.table('todos').insert(todo, {returnChanges: true}).run(req._rdbConn).then(function(result) {
        if (result.inserted !== 1) {
            handleError(res, next)(new Error("Document was not inserted."));
        }
        else {
            res.send(JSON.stringify(result.changes[0].new_val));
        }
    }).error(handleError(res))
    .finally(next);
}

function handleError(res) {
    return function(error) {
        res.send(500, {error: error.message});
    }
}

const startServer = () => {
  server.listen(config.port, function() {
    console.log('%s listening at %s', server.name, server.url);
  });
}

r.connect(config.rethinkdb, function(err, conn) {
    if (err) {
        console.log("Could not open a connection to initialize the database");
        console.log(err.message);
        process.exit(1);
    }
    
    r.table('todos').indexWait('createdAt').run(conn)
    .then(function(err, result) {
        console.log("Table and index are available, starting express...");
        startServer();
    }).error(function(err) {
        // The database/table/index was not available, create them
        r.dbCreate(config.rethinkdb.db).run(conn).finally(function() {
            return r.tableCreate('todos').run(conn)
        }).finally(function() {
            r.table('todos').indexCreate('createdAt').run(conn);
        }).finally(function(result) {
            r.table('todos').indexWait('createdAt').run(conn)
        }).then(function(result) {
            console.log("Table and index are available, starting express...");
            startServer();
            conn.close();
        }).error(function(err) {
            if (err) {
                console.log("Could not wait for the completion of the index `todos`");
                console.log(err);
                process.exit(1);
            }
            console.log("Table and index are available, starting express...");
            startServer();
            conn.close();
        });
    });
});
