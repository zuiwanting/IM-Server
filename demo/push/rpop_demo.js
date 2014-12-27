/**
 * Created by 10000489 on 2014/12/3.
 */

var nutcrackerConnect = require("../../connect/nutcracker");
var http = require('http');
var router = require('../../dispatch-server/data/router');
var temp = 'have rpop all.';
var ip = '10.21.168.216';
var port = 6380;

function rpop() {
    for (var i = 0;i < 10; i ++) {
        nutcrackerConnect.connect(port, ip, function (client) {
            client.rpop('pushStack' + i, function(err, res) {
                console.log('pushStack' + i + ' is rpop success, result is  ', res);
            });
        });
    }
}


http.createServer(function(req, res) {
    router.server(req, res);
}).listen(4203, '10.21.128.48');

router.get('/monitor', function(req, res) {

    rpop();

    res.writeHead(403, {
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(temp));
});