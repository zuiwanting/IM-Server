/**
 * Created by 10000489 on 2014/11/24.
 */
var async = require('async');
var temp = {
    name : ['zx', 'zc', 'zv', 'zb'],
    time : [1000,2000,3000,4000]
};
var arr = {'zx':1000, 'zc':2000, 'zv':3000, 'zb':4000};
//var arr = [
//    {name:'zx', time:1000},
//    {name:'zc', time:2000},
//    {name:'zv', time:3000},
//    {name:'zb', time:4000}
//];

//async.forEach = async.each
async.forEach(temp.name, function (item, callback) {
    a(item, callback);
}, function (err) {
    setTimeout(function () {
        console.log('Hello zx');
    },1000);
});

function a(item, callback) {
    //temp.name = item;
    setTimeout(function(){
        console.log('name is ' + item);
        //console.log('name is ' + temp.name);
        callback();
    },arr[item]);
}