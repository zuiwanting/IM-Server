/**
 * Created by 10000489 on 2014/12/4.
 */
var mongo = require('../../connect/mongo');
var fs = require('fs');
var filename = '/usr/local/app/www/nodeSocket/ybmp/temp.txt';

mongo.connect(function(mongoC) {
    mongoC.db('app').collection('Message').find({
        time: {
            $ge: +new Date(2014, 10, 29),
            $lt: +new Date(2014, 10, 30)
        }
    }, {
        type: true,
        content: true,
        time: true
    }).toArray(function(err, result) {
        if (err) {
            console.error('[ log - app][getMessageRecord] find false!');
        }
        console.log('11.29 message count is ', result.length);
        for(var i in result) {
            fs.writeFile(filename, JSON.stringify(result[i]), {
                flag: 'a'
            }, function(err) {
                if (err) {
                    console.error('[node server][saveUserInfo] is false. err is ', err);
                }
            });
        }
    });

//}, {ip : "store.1.mongo", port : 27017, name : 'read_demo'});
}, {ip : "10.21.3.64", port : 27017, name : 'read_demo'});
