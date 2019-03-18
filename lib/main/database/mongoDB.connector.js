var tables = {
    k_users: [{
        user: "admin",
        access_token: "6e6806f725e26b9788c61e4ca6570be87afc72938ceadf1a145d502aca515f82",
        collections: []
    }]
}

function getQuery(obj) {

}

function magic(table, obj, callback) {
    var result = [];
    if (tables[table]) {
        tables[table].forEach(function (item) {
            var valid = false;
            obj.forEach(function (query) {
                Object.keys(query).forEach(function (key) {
                    if (item[key]) {
                        if (query[key][0] === "=") {
                            if (query[key][1] === item[key]) {
                                valid = true;
                            } else {
                                valid = false;

                            }
                        }
                    } else {
                        valid = false;
                    }
                })
                if (valid) {
                    result.push(item);
                }
            });

        })
    }
    callback(result)
}

function select(table, obj, order, limit, offset, count, callback) {
    var result = [];
    var query = getQuery(obj);
    magic(table, obj, function (result) {
        callback(null, result)
    });
}

module.exports = {
    //insert: insert,
    //remove: remove,
    //update: update,
    select: select
}