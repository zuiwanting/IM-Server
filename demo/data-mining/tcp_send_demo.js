/**
 * Created by 10000489 on 2014/12/8.
 */
var net = require("net");
var data = {
    "product": "yiban4_0",
    "platform": "mobile",
    "module": "message",
    "action": "person",
    "description": "用户单聊发送文本",
    "time": "1418024417",
    "src_obj": {"uid": "5000000", "send_txt": "Hi～我们现在可以随时联系啦！今后也会及时为您推送精彩的资讯和信息哦～"},
    "dst_obj": {"uid": "1010274"}
};

var client = {
    id: '',
    connected: false
};

(function connectServe() {
    var clientConnect = net.connect({
        host: '10.21.3.89',
        port: 5457
    }, function () {
        client.id = clientConnect;
        client.connected = true;
    });
    clientConnect.write(JSON.stringify(data));
    console.log('send to D pang zi message is : ', JSON.stringify(data));
    clientConnect.on('error', function (err) {
        console.error('net connect err, result is ', err);
        client.connected = false;
        client.id = null;
        setTimeout(function () {
            connectServe();
        }, 2000);
    });
})();
