var express = require('express');
var redis = require('redis'); 
var app = express();
var redisHostName = process.env.DBNAME||'redisdb';
var redisClient = redis.createClient(process.env.REDIS_PORT||'6379', redisHostName);
redisClient.on('connect', function(err,reply) {
  if (err) { 
  	console.log('Failed to connect Redis server:'+err);
  }else{
  	console.log('Connected to Redis server'); }
}); 
var version = '***** 2.0 *****';
var hostname = require("os").hostname();
app.get('/', function (req, res) {
  redisClient.incr('counter', function(err, count) {
    if(err) console.log(err);
    console.log( 'version:'+ version + ' hostname:'+hostname );
    res.send("\nWebApp Version:"+version+"\nHostname: "+ 
    hostname +"\nTotal Reviews: "+ count + "\n"  );
   }); 
});
app.get('/kill', function (req, res) {
	process.exit();
});
var port = process.env.WEBAPP_PORT||8000;
var server = app.listen(port, function() {
  console.log('Server listening on port ' + server.address().port);
});





