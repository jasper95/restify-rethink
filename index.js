const restify = require('restify'),
      r = require('rethinkdb'),
      config = require('./config'),;


const server = restify.createServer();

server.pre(createConnection);
/**
 * Middleware
 */
server.use(closeConnection);
server.use(restify.jsonBodyParser({ mapParams: true }))
server.use(restify.acceptParser(server.acceptable))
server.use(restify.queryParser({ mapParams: true }))
server.use(restify.fullResponse())

/*
 * Create a RethinkDB connection, and save it in req._rdbConn
 */
const createConnection = (req, res, next) => {
    r.connect(config.rethinkdb).then(function(conn) {
        req._rdbConn = conn;
        next();
    }).error(handleError(res));
}

/*
 * Close the RethinkDB connection
 */
const closeConnection = (req, res, next) => req._rdbConn.close()

const startServer = () => {
  server.listen(8080, () =>
    console.log('%s listening at %s', server.name, server.url)
  );
}


r.connect(config.rethinkdb, function(err, conn) {
    if (err) {
        console.log("Could not open a connection to initialize the database");
        console.log(err.message);
        process.exit(1);
    }

    r.table('todos').indexWait('createdAt').run(conn).then(function(err, result) {
        console.log("Table and index are available, starting server...");
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
            console.log("Table and index are available, starting server...");
            startServer();
            conn.close();
        }).error(function(err) {
            if (err) {
                console.log("Could not wait for the completion of the index `todos`");
                console.log(err);
                process.exit(1);
            }
            console.log("Table and index are available, starting server...");
            startServer();
            conn.close();
        });
    });
});
