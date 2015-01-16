'use strict';

var config = require('../../conf/config');
var nutcrackerConnect = require('../../connect/nutcracker');
var async = require('async');

var redisIp = config.Server.NRedis.pr1.ip;
var redisPort = config.Server.NRedis.pr1.port;

/**
 * save the message status to mongodb
 * @param  {Object}     obj
 * @param  {String}     obj.messageId message id
 * @param  {Number}     obj.touser the target user id
 * @param  {Number}     obj.poster the host use if
 * @param  {String}     obj.type the message's type [personage|group]
 * @param  {Timestamp}  obj.time time stamp
 * @param  {Function}   callback
 */

exports.sta = function (obj, callback) {
    if (!obj.messageId || !obj.touser || !obj.poster || !obj.type) {
        if (callback) callback('[msgsave][sta] obj is necessary');
        return false;
    }

    var selectDb;
    if (obj.type == 1 || obj.type == 6) {
        //group
        selectDb = 1;
    } else if (obj.type == 0 || obj.type == 2 || obj.type == 7) {
        //person
        selectDb = 2;
    } else {
        console.error('msgsave sta type is unnormal, type is ', obj.type);
    }

    nutcrackerConnect.connect(redisPort, redisIp, function (client) {
        var key = obj.poster + ':' + obj.touser + ':' + new Date().getMonth();

        client.select(selectDb, function () {
            async.waterfall([
                function (cb) {
                    beforeInsert(cb);
                }, function (cb) {
                    insert(cb);
                }
            ], function (err) {
                if (err) {
                    console.error('[msgsave] insert is false. err is ', err);
                    if (callback) callback(err);
                }
                if (callback) callback(null);
            });

            function beforeInsert(callback) {
                client.ZCARD(key, function (err, res) {
                    if (err) callback(err);
                    if (Math.floor(res/1000) > 0) {
                        key = key.split(':')[0] + key.split(':')[1] + Math.floor(res/1000);
                    }
                    callback(null);
                });
            }

            function insert(callback) {
                client.ZADD(key, +new Date(), obj.messageId, function (err, res) {
                    if (err) callback(err);
                    console.log('poster:touser', key, 'ZADD result is ', res);
                    callback(null);
                });
            }
        });
    });
};

/**
 * mark the statu
 * @param  {String}   messageId
 * @param  {Object}   options
 * @param  {Number}   options.userid
 * @param  {Function} callback
 * @example
 *      msgsave.staMark('12324',{type:'read',value:true});
 */

exports.staMark = function (msg) {
    if (!msg.messageId || !msg.poster || !msg.userid) {
        console.log('messageId, poster, userid is necessary.');
        return false;
    }

    var selectDb;
    if (msg.type == 1 || msg.type == 6) {
        //group
        selectDb = 1;
    } else if (msg.type == 0 || msg.type == 2 || msg.type == 7) {
        //person
        selectDb = 2;
    } else {
        console.error('msgsave staMark type is unnormal, type is ', msg.type);
    }

    nutcrackerConnect.connect(redisPort, redisIp, function (client) {
        var key = msg.poster + ':' + msg.userid + ':' + new Date().getMonth();
        client.select(selectDb, function () {
            client.ZREM(key, msg.messageId, function (err, res) {
                if (err) {
                    console.error('[msgsave][staPerson] HMSET is false. err is ', err);
                }
                console.log('poster:touser', key, 'ZREM result is ', res);
            });
        });
    });
};
