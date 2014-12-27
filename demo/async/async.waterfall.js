/**
 * Created by 10000489 on 2014/11/17.
 */
var async = require('async');

async.waterfall([
    function(cb) {
        setTimeout(function() {
            console.log('hello');
            cb();
        }, 10000);
    }
], function (err) {
    console.log('hello?1');

    setTimeout(function() {
        console.log('hello?');
    }, 5000);
});