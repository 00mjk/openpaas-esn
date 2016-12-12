'use strict';

var tmp = 'tmp';
var DEFAULT_PORTS = {
  express: 23455,
  mongo: 23456,
  redis: 23457,
  ldap: 23458,
  elasticsearch: 23459,
  elasticsearch_comm: 23460,
  davserver: 23461
};

var images = require('../../docker/images.json');
var host = process.env.HOSTNAME || process.env.DOCKER_HOST || 'localhost';
var dbName = 'tests';
var mongoPort = process.env.PORT_MONGODB || DEFAULT_PORTS.mongo;

module.exports = {
  tmp: tmp,

  default_ports: DEFAULT_PORTS,

  host: host,

  express: {
    port: process.env.PORT_EXPRESS || DEFAULT_PORTS.express
  },

  mongodb: {
    cmd: process.env.CMD_MONGODB || 'mongod',
    port: mongoPort,
    interval_replica_set: process.env.MONGODB_INTERVAL_REPLICA_SET || 1000,
    tries_replica_set: process.env.MONGODB_TRIES_REPLICA_SET || 20,
    connectionString: 'mongodb://' + host + ':' + mongoPort + '/' + dbName,
    replicat_set_name: 'rs',
    dbname: dbName,
    dbpath: tmp + '/mongo/',
    logpath: '',
    elasticsearch: {},
    container: {
      image: images.mongodb,
      name: 'mongo_for_esn_test'
    }
  },

  redis: {
    cmd: process.env.CMD_REDIS || 'redis-server',
    port: process.env.PORT_REDIS || DEFAULT_PORTS.redis,
    conf_file: '',
    log_path: '',
    pwd: '',
    container: {
      image: images.redis,
      name: 'redis_for_esn_test'
    }
  },

  ldap: {
    cmd: 'node ./test/inmemory-ldap.js',
    port: process.env.PORT_LDAP || DEFAULT_PORTS.ldap,
    suffix: 'o=rse',
    ldapadmin: 'cn=root',
    pwd: 'secret'
  },

  elasticsearch: {
    cmd: process.env.CMD_ELASTICSEARCH || 'elasticsearch',
    port: process.env.PORT_ELASTICSEARCH || DEFAULT_PORTS.elasticsearch,
    communication_port: process.env.COMMUNICATION_PORT_ELASTICSEARCH || DEFAULT_PORTS.elasticsearch_comm,
    interval_index: process.env.ELASTICSEARCH_INTERVAL_INDEX || 1000,
    tries_index: process.env.ELASTICSEARCH_TRIES_INDEX || 20,
    cluster_name: 'elasticsearch',
    data_path: tmp + '/elasticsearch/data',
    work_path: tmp + '/elasticsearch/work',
    logs_path: tmp + '/elasticsearch/logs',
    container: {
      image: images.elasticsearch,
      name: 'elasticsearch_for_esn_test'
    }
  },

  davserver: {
    port: process.env.PORT_DAVSERVER || DEFAULT_PORTS.davserver
  }
};
