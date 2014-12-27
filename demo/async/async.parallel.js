/**
 * Created by 10000489 on 2014/12/23.
 */
var async = require('async');

async.parallel([
    function (cb) {
        setTimeout(function () {
            console.log('hello');
            cb(null, 'hello');
        }, 4000)
    }, function (cb) {
        setTimeout(function () {
            console.log('world');
            cb(null, 'world');
        }, 2000)
    }, function (cb) {
        setTimeout(function () {
            console.log('zx');
            cb(null, 'zx');
        }, 3000)
    }
], function (err, res) {
    console.log('res is ' + res, 'typeof is ' + typeof res);
    console.log('end');
});