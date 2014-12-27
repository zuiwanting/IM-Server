/**
 * Created by 10000489 on 2014/11/20.
 */
var async = require('async');

var arr = [1,2,3];

async.filter(arr, function(item, callback) {
    console.log(item);
    callback(item);
}, function (res) {
    console.log('#######',res);
});