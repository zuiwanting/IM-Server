/**
 * Created by 10000489 on 2014/12/3.
 */

var nutcrackerConnect = require("../../connect/nutcracker");
var http = require('http');
var router = require('../../dispatch-server/data/router');
var temp = {};
var ip = '10.21.168.216';
var port = 6379 ;

function main() {
    for (var i = 0; i< 10; i++) {
        llen(i);
    }
    for (var i = 0; i< 10; i++) {
        temp.total += temp['pushStack' + i];
    }
}

function llen(i) {
    nutcrackerConnect.connect(port, ip, function (client) {
        client.llen('pushStack' + i, function(err, res) {
            console.log('pushStack' + i + ' llen is ', res);
            temp['pushStack' + i] = res;
        });
    });
}

http.createServer(function(req, res) {
    router.server(req, res);
}).listen(4202, '10.21.128.48');

router.get('/monitor', function(req, res) {

    main();

    res.writeHead(403, {
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(temp));
});