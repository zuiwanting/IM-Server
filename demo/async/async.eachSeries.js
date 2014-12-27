var async = require('async');
var arr = [1,2,3];

async.eachSeries(arr, function (item, cb) {
    setTimeout(function() {
        console.log(item);
        cb();
    }, 1000);
}, function (err) {
    setTimeout(function() {
        console.log('hello');
    }, 1000);
});