const config = require('./config'),
      r = require('rethinkdbdash')(config.rethinkdb),
      Promise = require('bluebird');

module.exports.createDatabase = function(){
  Promise.coroutine(function*(){
    try{
      yield r.dbCreate(config.rethinkdb.db).run();
      yield r.db(config.rethinkdb.db).tableCreate("todos").run();
      yield r.db(config.rethinkdb.db).table("todos")
                         .indexCreate("createdAt").run();
    }catch (err) {
        console.log(err.message);
    }
  })();
}
module.exports.r = r
