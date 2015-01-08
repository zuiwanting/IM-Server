'use strict';

var hash = require('../hash/hash.js');
var redisConnect = require('../../connect/redis');
var mongoConnect = require('../../connect/mongo');
var offline = require('./offline');
var id = require('../id');
var safe = require('./messageSafe');
var msgSave = require('./msgsave');
var config = require('../../conf/config');
var mg1 = config.mongodb.mg1;
var async = require('async');
var restful = require('../restful');
var redisPort = config.sta.redis.cache.port;
var redisIp = config.sta.redis.cache.ip;

/**
 *   method person
 *   send preson message
 *   param options {Object}
 *   param options.user {Object}
 *   param options.callback {Object}
 *
 **/
exports.person = function(rec, socket) {

    safe.friend(rec.poster, rec.touser, rec.access_token, function(isSafe) {
        if (isSafe) {
            exports.sendToPerson(rec, rec.touser, rec.poster, socket);
        } else {
            rec.status = 100;
            rec.msg = '对方还不是你的好友，请添加好友之后再发送消息';
            if (socket) socket.emit('ybmp', rec);
        }
    });
};

//  send public message to personal
exports.sendToPerson = function(msg, touser, poster, socket) {
    var redisHost = hash.getHash('PRedis', touser);
    var room = 'Room.' + touser;

    //fix message 
    var time = +new Date();
    msg.time = msg.time || time;
    msg.messageId = id.id();

    //connect to the redis
    redisConnect.connect(redisHost.port, redisHost.ip, function(client) {
        msg.status = 200;

        client.publish(room, JSON.stringify(msg));
        if (socket) socket.emit('ybmp', msg);

        client.sismember('online', touser, function(err, isOnline) {
            console.log('person-->', touser, 'isOnline', isOnline);
            if (!isOnline) {
                console.log(touser + ' is offline');
                offline.pushMessage(msg, touser, poster);
            }
        });

    });

    //save the message log & save the message statu
    var msgData = {
        'type': 0,
        'from': parseInt(msg.poster),
        'to': parseInt(msg.touser),
        'content': msg,
        'time': time,
        'messageId': msg.messageId
    };
    mongoConnect.connect(function(mongoC) {
        mongoC.db(mg1.dbname).collection('Message').insert(msgData, function() {
            //success
        });
    }, {ip: mg1.ip, port: mg1.port, name: 'insert_msgSend_Person'});
    //save msg status to redis
    msgSave.sta({
        'messageId': msg.messageId,
        'touser': msg.touser,
        'poster': msg.poster,
        'type': 0
    });
};

exports.group = function(rec, socket) {
    var groupServer = hash.getHash('GNode', rec.togroup);
    if (!groupServer) {
        console.error('can not find groupServer', rec.togroup, 'hash', hash._hash());
        return false;
    }
    rec.status = 200;
    rec.time = +new Date();
    rec.messageId = id.id();

    async.waterfall([
        //group info isExist in redis
        function (cb) {
            isExist(rec.togroup, cb);
        }, function (isExist, cb) {
            if (!isExist) {
                getGroupMember(rec.togroup, cb);
            } else {
                cb(null, true);
            }
        }, function (res, cb) {
            if (res.members) {
                saveToRedis(rec.togroup, res.members, res.chat, cb);
            } else {
                cb(null, true);
            }
        }, function (cb) {
            isChat(cb);
        }
    ], function (err, isChat) {
        if (err) {
            console.error('[msgsend][group] async isChat is false. err is ', err);
        }
        if (isChat) {
            console.log('[msgsend][group] group ',rec.togroup,' is allow chat.');
            sendGroupMessage(groupServer, rec);
        } else {
            console.log('[msgsend][group] group ',rec.togroup,' is not allow chat.');
        }
    });

    function isChat(callback) {

        redisConnect.connect(redisPort, redisIp, function(client) {
            var groupKey = 'group:' + rec.togroup + ':users';
            client.select('0', function(){
                    client.HGET(groupKey, 'isChat', function(err, chat) {
                    if (err) {
                        console.error('[msgsend][group] HGET isChat false. err is ', err);
                        callback(err);
                    }
                    if (!JSON.parse(chat)) {
                        rec.status = 100;
                        rec.msg = '由于本群人数众多，为保障各位成员能及时收到官方信息，故本群将不再支持聊天，敬请谅解';
                        if (socket) socket.emit('ybmp', rec);
                        callback(null, false);
                    } else {
                        rec.status = 200;
                        if (socket) socket.emit('ybmp', rec);
                        callback(null, true);
                    }
                });
            });
        });
    }
};

function isExist(togroup, callback) {

    redisConnect.connect(redisPort, redisIp, function(client) {
        var groupKey = 'group:' + togroup + ':users';
        client.select('0', function(){
            client.HGETALL(groupKey, function(err, res) {
                if (err) {
                    console.error('[msgsend][group] HGET isChat false. err is ', err);
                    callback(err);
                }
                if (res) {
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            });
        });
    });
}

function getGroupMember(gid, callback) {

    var options = {
        'hostname': config.sta.group.api.ip,
        'port': config.sta.group.api.port,
        'path': '/api/v1/talks/' + gid + '/memberids?internal_secret=cf7be73c856c99c0fe02a78a562375c5',
        'callback': function(Jdata) {
            var data = {};
            try {
                data = JSON.parse(Jdata);
            } catch (e) {
                console.error('group data error', Jdata);
                if (callback) callback(null, data);
                return false;
            }
            console.log('[API group] got data from server', data, '!got data from server');
            if (data.response == 100) {
                if (callback) callback(null, data.data);
            } else {
                console.error('    [API requerst error]', data.response, data.message);
                if (callback) callback(null, false);
            }
        }
    };
    restful.get(options);
    console.log('[API requerst ]', options.hostname + options.path);
}

function saveToRedis(gid, usersId, isChat, callback) {

    redisConnect.connect(redisPort, redisIp, function(client) {
        var groupKey = 'group:' + gid + ':users';
        client.select('0', function(){
            //delete old data
            client.del(groupKey, function() {
                //insert
                client.hmset(groupKey, 'usersId', usersId, 'isChat', isChat, function() {
                    if (callback) callback(null, true);
                });
            });
        });
    });
}

function sendGroupMessage(groupServer, rec, callback) {

    var groupRedis = hash.getHash('GRedis', groupServer.id.toString());
    var room = 'Group.' + groupServer.id;

    redisConnect.connect(groupRedis.port, groupRedis.ip, function(client) {
        console.log('group ready', groupRedis.port, groupRedis.ip, room);
        client.publish(room, JSON.stringify(rec));
    });

    //log it to server (group msg)
    var msgData = {
        'type': 1,
        'from': parseInt(rec.poster),
        'to': parseInt(rec.togroup),
        'content': rec,
        'time': rec.time,
        'messageId': rec.messageId
    };

    mongoConnect.connect(function(mongoC) {
        mongoC.db(mg1.dbname).collection('Message').insert(msgData, function() {
            //Message insert success
            console.log('[msgsend][insert into Message] is success.');
            if (callback) callback();
        });
    }, {ip: mg1.ip, port: mg1.port, name: 'insert_msgSend_Group'});
}

exports.dispatchGroup = function(item, rec, callback) {

    if (!rec && !callback) {
        rec = item;
    }

    if (rec.action == 'sendSysMessageToGroup') {
        redisConnect.connect(redisPort, redisIp, function(client) {
            rec.togroup = item.togroup;
            var groupKey = 'group:' + rec.togroup + ':users';
            client.select('0', function(){
                client.hmset(groupKey, 'isChat', false, function(err, res) {
                    if (err || res !== 'OK') {
                        console.error('[msgsend][group] hmset is false, err is ', err);
                        if (callback) callback(err);
                    }
                    console.log('Settings group ', rec.togroup, 'can not talk success.');
                });
            });
        });
    }

    async.parallel([
        function (cb) {
            var groupRedis = item.groupRedis;
            var room = item.room;

            redisConnect.connect(groupRedis.port, groupRedis.ip, function(client) {
                console.log('group ready', groupRedis.port, groupRedis.ip, room);
                rec.togroup = item.togroup;
                rec.messageId = item.messageId;
                rec.groupname = item.groupname;
                client.publish(room, JSON.stringify(rec));
                cb(null);
            });
        }, function (cb) {
            mongoConnect.connect(function(mongoC) {
                rec.togroup = item.togroup;
                rec.messageId = item.messageId;
                rec.groupname = item.groupname;
                var msgData = {
                    'type': 1,
                    'from': parseInt(rec.poster),
                    'to': parseInt(rec.togroup),
                    'content': rec,
                    'time': rec.time,
                    'messageId': rec.messageId
                };
                mongoC.db(mg1.dbname).collection('Message').insert(msgData, function() {
                    //Message insert success
                    console.log('[msgsend][insert into Message] is success.');
                    cb(null);
                });
            }, {ip: mg1.ip, port: mg1.port, name: 'insert_msgSend_Group'});
        }
    ], function (err) {
        if (err) {
            console.error('[msgsend][dispatchGroup] is false. err is ', err);
            if (callback) callback(err);
        }
        if(callback) callback();
    });
};

exports.sys = function(touser, msg) {
    if (!touser) {
        console.error('touser is necessary');
        return false;
    }
    msg.time = +new Date();
    msg.order = 'SYS';
    msg.messageId = id.id();
    msg.touser = touser;
    msg.poster = (msg.poster || 'SYS');
    var redisHost = hash.getHash('PRedis', touser);
    redisConnect.connect(redisHost.port, redisHost.ip, function(client) {
        var room = 'Room.' + touser;

        client.publish(room, JSON.stringify(msg));

        client.sismember('online', touser, function(err, isOnline) {
            console.log('sys--->', touser, 'online:', isOnline, 'msg:', msg);
            if (!isOnline) {
                offline.pushMessage(msg, touser, 'SYS');
            }
        });
    });

    var msgData = {
        'type': 2,
        'from': -999,
        'to': parseInt(touser),
        'content': msg,
        'time': msg.time,
        'messageId': msg.messageId
    };
    mongoConnect.connect(function(mongoC) {
        mongoC.db(mg1.dbname).collection('Message').insert(msgData, function() {
            //success
        });
    }, {ip: mg1.ip, port: mg1.port, name: 'insert_Message_sys'});

    //save msg status to redis
    msgSave.sta({
        'messageId': msg.messageId,
        'touser': touser,
        'poster': -999,
        'type': 2
    });
};