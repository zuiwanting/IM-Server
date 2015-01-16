'use strict';

var net = require('net');
var async = require('async');
var mongo = require('../connect/mongo');
var redis = require('../connect/redis');
var ObjectID = require('mongodb').ObjectID;
var conf = require('../conf/config');
var redisInfo = conf.sta.redis.cache;
var mongodb = conf.mongodb;
var time = new Date(2015, 0, 16);//month - 1

//connect to the redis and mongodb
redis.connect(redisInfo.port, redisInfo.ip, function(client) {
    client.select('1', function(err) {
        if (err) console.error('redis connect false');

        console.log('LogServer connected to redis ' + redisInfo.ip + ' and select 1');

        async.parallel([
            function (cb) {
                mongo.connect(function(mongoPersonMsgCon) {
                    cb(null, mongoPersonMsgCon);
                }, {ip : mongodb.mg1.person.ip, port : mongodb.mg1.person.port, name : 'read_Person_Message'});
            }, function (cb) {
                mongo.connect(function(mongoGroupMsgCon) {
                    cb(null, mongoGroupMsgCon);
                }, {ip : mongodb.mg1.group.ip, port : mongodb.mg1.group.port, name : 'read_Group_Message'});
            }, function (cb) {
                mongo.connect(function(mongoTalksCon) {
                    cb(null, mongoTalksCon);
                }, {ip : mongodb.mg3.ip, port : mongodb.mg3.port, name : 'read_Talks'});
            }
        ], function (err, res) {
            main(res[0], res[1], res[2], client);
        });
    });
});

function main(personCon, groupCon, talksCon, redis) {
    async.parallel([
        function (cb) {
            person(personCon, redis, cb)
        }, function (cb) {
            group(groupCon, redis, cb);
        }
    ], function (err, res) {
        if (err) {
            console.error('[data-mining-server][main] paraller is false, err is ', err);
            cb(err);
        }
        var personMsgs, groupMsgs;

        personMsgs = res[0];
        groupMsgs = res[1];

        if (personMsgs.concat(groupMsgs).length === 0) {
            setTimeout(function() {
                console.log('Loop');
                main(personCon, groupCon, talksCon, redis);
            }, 1000);
        } else {
            sendMessage(personMsgs, personCon, groupMsgs, groupCon, talksCon, redis);
        }
    })
}

function sendMessage(persons, personCon, groups, groupCon, talksCon, redis) {
    async.waterfall([
        function (cb) {
            beforeSendMessage(persons, groups, cb);
        }, function (res, cb) {
            choiceSendMessage(res[0], res[1], talksCon, redis, cb);
        }
    ], function (err) {
        if (err) {
            console.error('[data-mining-server][main] waterfall is false, err is ', err);
        }
        main(personCon, groupCon, talksCon, redis);
    })
}

function choiceSendMessage(personMsgs, groupMsgs, mongoTalksCon, redis, callback) {
    console.log('send to D pang zi personMsgs.length is ', personMsgs.length, 'groupMsgs.length is ', groupMsgs.length);
    async.parallel([
        function (cb) {
            if (personMsgs.length === 0) {
                cb(null);
            } else {
                async.each(personMsgs, function (message, cb) {
                    personMsg(message.content, function(data) {
                        sendLog(data, cb);
                    });
                }, function (err) {
                    if (err) cb(err);
                    setLastLogId(redis, 'lastLogId0', personMsgs[personMsgs.length - 1]._id, cb);
                });
            }
        }, function (cb) {
            if (groupMsgs.length === 0) {
                cb(null);
            } else {
                async.each(groupMsgs, function (message, cb) {
                    groupMsg(mongoTalksCon, message.content, function(data) {
                        sendLog(data, cb);
                    });
                }, function (err) {
                    if (err) cb(err);
                    setLastLogId(redis, 'lastLogId1', groupMsgs[groupMsgs.length - 1]._id, cb);
                });
            }
        }
    ], function (err) {
        if (err) callback(err);
        callback(null);
    });
}

function beforeSendMessage(persons, groups, callback) {
    async.parallel([
        function (cb) {
            filterData(persons, cb);
        }, function (cb) {
            filterData(groups, cb);
        }
    ], function (err, res) {
        if (err) callback(err);
        callback(null, res);
    });
}

function filterData(data, callback) {
    async.filter(data, function (message, cb) {
        cb(message.content.poster && !isNaN(message.content.poster));
    }, function (res) {
        callback(null, res);
    })
}

function setLastLogId(redis, key, id, cb) {
    redis.set(key, id, function(err) {
        if (err) cb(err);
        cb(null);
    });
}

function person(mongoPersonMsgCon, redis, cb) {
    async.waterfall([
        function (cb) {
            getLastLogId(0, redis, cb);
        }, function (lastId, cb) {
            getMessageRecord(mongoPersonMsgCon, lastId, cb);
        }
    ], function (err, res) {
        if (err) cb(err);
        cb(null, res);
    })
}

function group(mongoGroupMsgCon, redis, cb) {
    async.waterfall([
        function (cb) {
            getLastLogId(1, redis, cb);
        }, function (lastId, cb) {
            getMessageRecord(mongoGroupMsgCon, lastId, cb);
        }
    ], function (err, res) {
        if (err) cb(err);
        cb(null, res);
    })
}

//get last log id
function getLastLogId(type, redis, callback) {

    var key = null;
    if (type === 0) {
        key = 'lastLogId0';
    } else if (type === 1) {
        key = 'lastLogId1';
    } else {
        console.error('[getLastLogId] someing wrong with type');
    }

    redis.get(key, function(err, res) {
        if (err) {
            console.error('[ log - app][getLastLogId] redis get false!');
            callback(err);
        }
        callback(null, res);
    });
}

//get messgae from mongodb
function getMessageRecord(mongoC, lastLogId, callback) {
    var query = {};

    if (lastLogId) {
        query = {
            _id: {
                $gt: new ObjectID(lastLogId)
            }
        };
    } else {
        query = {
            time: {
                $gt: +time
            }
        };
    }

    mongoC.db(mongodb.mg1.dbname).collection('Message').find(query, {
        type: true,
        content: true,
        time: true
    }).limit(10).toArray(function(err, result) {
        if (err) {
            console.error('[ log - app][getMessageRecord] find false!');
            callback(err);
        }
        callback(null, result || []);
    });
}

//deal with personal message
function personMsg(msg, callback) {
    var src_obj = {
        'uid': msg.poster,
        'send_txt': msg.text
    };
    var dst_obj = {
        'uid': msg.touser
    };
    var logJson = {
        product: 'yiban4_0',
        platform: 'mobile',
        module: 'message',
        action: 'person',
        description: '用户单聊发送文本',
        time: (msg.time ? msg.time : +new Date()).toString().substr(0, 10),
        src_obj: src_obj,
        dst_obj: dst_obj
    };
    if (callback) callback(logJson);
}

//deal with group message
function groupMsg(mongo, msg, callback) {
    var _id = parseInt(msg.togroup || msg.groupid);

    mongo.db(mongodb.mg3.dbname).collection('Talks').find({
        '_id': _id
    }).toArray(function(err, res) {
        var gid = 0,
            guid = 0;
        if (res.length >= 1) {
            gid = res[0].groupid;
            guid = res[0].creator;
        }

        var src_obj = {
            'uid': msg.poster,
            'send_txt': msg.text
        };
        var dst_obj = {
            'gid': gid,
            'guid': guid
        };
        var logJson = {
            product: 'yiban4_0',
            platform: 'mobile',
            module: 'message',
            action: 'person',
            description: '用户群组聊天发送文本',
            time: (msg.time || (+new Date())).toString().substr(0, 10),
            src_obj: src_obj,
            dst_obj: dst_obj
        };
        if (callback) callback(logJson);
    });
}

var client = {
    id: '',
    connected: false
};

(function connectServe() {
    var clientConnect = net.connect({
        host: '10.21.67.159',
        port: 5457
    }, function() {
        client.id = clientConnect;
        client.connected = true;
    });
    clientConnect.on('error', function(err) {
        console.error('net connect err, result is ', err);
        client.connected = false;
        client.id = null;
        setTimeout(function() {
            connectServe();
        }, 2000);
    });
})();

//send to the server
function sendLog(data, callback) {
    if (client.connected) {
        console.log('send to D pang zi message is : ', JSON.stringify(data));
        client.id.write(JSON.stringify(data));
        callback(null);
    } else {
        callback(false);
    }
}