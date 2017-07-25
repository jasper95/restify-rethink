const Router = require('restify-router').Router,
      router = new Router()
      Promise = require('bluebird'),
      r = require('../database').r;


router.get('/todos', Promise.coroutine(get));
router.post('/todos', Promise.coroutine(create));
router.get('/todos/:id', Promise.coroutine(getById));
router.patch('todos/:id', Promise.coroutine(update));
router.del('/todos/:id', Promise.coroutine(remove));

function* get(req, res, next) {
    try{
        const todos = yield r.table('todos').orderBy({index: "createdAt"}).run()
                                .then(cursor => cursor.toArray());
        res.send(todos);
    }catch(err){
        handleError(res)
    }
    return next();
}

function* getById(req, res, next){
    const {id} = req.params
    try{
        const todo = yield r.table('todos').get(id).run();
        res.send(todo);
    }catch(err){
        handleError(res);
    }
    return next();
}

function* create(req, res, next) {
    const {title} = req.body;
    const todo = {completed : false, createdAt: r.now(), title: title};
    try {
        const result = yield r.table('todos').insert(todo, {returnChanges: true}).run()
        if (result.inserted !== 1)
            handleError(res, next)(new Error("Document was not inserted."));
        else
            res.send(result.changes[0].new_val);
    }catch(err){
        handleError(res);
    }
    return next();
}

function* update(req, res, next){
    const { completed } = req.body;
    const { id } = req.params;
    try{
        const todo = yield r.table('todos').get(id).run();
        if(todo){
            const todo = yield r.table('todos').get(id).update({completed: completed}, {returnChanges: true}).run()
                            .then(result => result.changes[0].new_val)
            res.send(todo);
        } else handleError(res, next)(new Error(`TODO with ID ${id} does not exists`));
    }catch(err){
        handleError(err);
    }
    return next();
}

function* remove(req, res, next){
    const {id} = req.params
    try{
        const todo = yield r.table('todos').get(id).run();
        if(todo){
            const todo = yield r.table('todos').get(id).delete().run();
            res.send(`TODO with ID ${id} sucessfully deleted`);
        } else handleError(res, next)(new Error(`TODO with ID ${id} does not exists`));
    }catch(err){
        handleError(res);
    }
    return next();
}

function handleError(res) {
    return function(error) {
        res.send(500, {error: error.message});
    }
}


module.exports = router;
