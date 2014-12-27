/**
 * Created by 10000489 on 2014/12/26.
 */

var nutcrackerConnect = require('../../connect/nutcracker');
var pushPort = 6581;
var pushIp = '10.21.3.139';

var StackObj = {
    name: 'hello world.'
};

for (var i = 0; i < 1000; i++) {
    nutcrackerConnect.connect(pushPort, pushIp, function (client) {
        var key = 'pushStack' + new Date() % 10;
        client.RPUSH(key, JSON.stringify(StackObj), function (err, res) {
            if (err) {
                console.error('[RPUSH] is false. err is ', err);
            }
            console.log('[RPUSH] is success, StackObj is ', StackObj);
        });
    });
}
