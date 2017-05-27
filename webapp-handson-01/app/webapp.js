var http = require('http');
var www = http.createServer(function(request, response) {
  console.log('access URL:'+request.url);
  if (request.url == '/kill') {
	process.exit();
  }
  response.writeHead(200);
  var hostname=process.env.HOSTNAME;
  var version = 'Version 2.0 \n';
  var output = version + 'Hello Docker!\n'+'Hostname: '+hostname+'\n\n';
  response.end(output);
});

var port=process.env.WEBAPP_PORT||8000;
www.listen(port,function(){
	console.log("Server is listening port: "+port);	
});


