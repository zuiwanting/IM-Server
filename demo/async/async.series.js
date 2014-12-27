/**
 * Created by 10000489 on 2014/11/20.
 */
var async = require('async');

async.series([
    function (cb) {
        setTimeout(function() {
            console.log('Hello')
            cb(null, 'Hello');
        }, 1000)
    }, function(cb) {
        setTimeout(function() {
            console.log('World')
            cb(null, 'World');
        }, 1000)
    }, function(cb) {
        setTimeout(function() {
            console.log('!!!')
            cb(null, '!!!');
        }, 1000)
    }
], function (err, res) {
    console.log(res);
});