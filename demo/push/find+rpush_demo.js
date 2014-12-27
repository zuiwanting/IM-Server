/**
 * Created by 10000489 on 2014/12/3.
 */
var nutcrackerConnect = require("../../connect/nutcracker");
var mongoConnect = require("../../connect/mongo");
var pushStack = {
    'name' : 'zhaoxuan'
};

console.log("########## start time is ", new Date());

mongoConnect.connect(function(mongoConnect) {
    var collection = mongoConnect.db('larvel').collection('PushCache');

    collection.find({
        'touser': 1556837
    }).toArray(function(err, res) {
        if (err) {
            console.log("find false, err is ", err);
            return false;
        }
        pushStack.temp = res[0].total;
        console.log('res is ', res);
    });
}, {ip: '10.21.3.64', port: 27018, name: 'find_demo'});

for(var i = 0; i < 10000; i++) {
    nutcrackerConnect.connect(22121, '10.21.168.217', function (client) {
        var key = 'pushStack' + new Date()%10;
        client.LPUSH(key, pushStack, function(err, res) {
            console.log(key, ' LPUSH is ', res);
            console.log("########## end time is ", new Date());
        });
    });
}