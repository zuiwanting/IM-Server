var conf = require('../../conf/config');
var Hash = require('./ybhash');
var replicas = conf.replicas;

var ServerSettings = {};
var HashCache = {};

//load and format the conf.Server
conf.Server = conf.Server || {};
for (i in conf.Server) {
    for (j in conf.Server[i]) {
        var node = conf.Server[i][j];
        var type = i;
        var id = j;
        var ip = node['ip'];
        var port = node['port'];
        addHost(type, id, ip, port);
    }
};

/**
 * @method addHost
 * add the servers
 * @param type {String} [PNode|PRedis|GSub|GRedis|URedis]
 * @param id {String}
 * @param ip {String}
 * @param port {String}
 */
function addHost(type, id, ip, port) {
    //reset the HashCache
    delete HashCache[type];
    ServerSettings[type] = ServerSettings[type] || [];
    for (var i = 0, len = ServerSettings[type].length; i < len; i++) {
        if (ServerSettings[type][i]['id'] == id) {
            return (id+' : '+ip + ":" + port) + ' already in config';
        }
    };

    var serverInfo = {
        id : id,
        ip : ip,
        port : port,
        addr : (ip + ":" + port)
    };

    ServerSettings[type].push(serverInfo);
    return serverInfo;
};

/**
 * @method delHost
 * delete the Host form the tem list
 * @param type {String}  [PNode|PRedis|GSub|GRedis|URedis]
 * @param id {String} the host's id
 */
function delHost(type, id) {
    delete HashCache[type];
    for (var i = 0, len = ServerSettings[type].length; i < len; i++) {
        if (ServerSettings[type][i]['id'] == id) {
            ServerSettings[type].splice(i, 1);
            break;
        }
    }
}

/**
 *@method getHash
 * @param type {String}
 * @param val {String}
 * @return the node
 */
function getHash(type, val) {
    if (!HashCache[type]) {
        HashCache[type] = new Hash(ServerSettings[type], {
            replicas : replicas
        });
    };
    return HashCache[type].getNode(val.toString());
}

exports.addHost = addHost;
exports.delHost = delHost;
exports.getHash = getHash;
exports._hash=function(){return ServerSettings};