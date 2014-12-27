/**
 * Created by 10000489 on 2014/12/22.
 */
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://10.21.3.64:27017/test';

MongoClient.connect(url, function(err, mongoC) {
    setInterval(function(){
        mongoC.collection('Message').insert({
            'message': 'hello world!'
        }, function(err) {
            if (err) console.log('err',err);
            console.log('*');
        });
    }, 10000);
});