
var mongoClient = require('../../connect/mongo');
var conf = {
    ip  : "10.21.3.64",
    port: 27019,
    dbname: "test"
};

var count = 0;
var id = 1;
var received = [];
var unreceived = [];
for (var i = 0; i < 3000; i++) {
    received.push(i);
    unreceived.push(3000-i);
}

mongoClient.connect(function(mongoConnect) {
    var collection = mongoConnect.db(conf.dbname).collection('Notices');

    var setVal = {};
    setVal['tousers.hasrecieved'] = {
        $each: received
    };
    setVal['tousers.unrecieved'] = {
        $each: unreceived
    };

    setInterval(function() {
        collection.update({
            '_id': id++
        }, {
            $push: setVal,
            $set: {
                'status': 2
            }
        }, {
            'upsert': true
        }, function(err) {
            if (err) {
                console.log("[notification][Notices] update false", err);
                return false;
            }
            console.log('[dispatch_notification.js update success]-->', id, count++);
        });
    }, 1000);
}, {ip: conf.ip, port: conf.port, name: 'update_demo'});