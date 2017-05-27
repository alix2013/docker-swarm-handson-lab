# Docker Swarm Hands-on LAB

## 前言
  近几年来，以Docker为代表的容器技术发展迅猛，给传统的开发运维模式提供了一种新的有颠覆性意义的标准，促进了企业应用的开发和运维更加标准化，自动化，给企业应用迁移到云平台扫除了最后的障碍；国内外云厂商纷纷加入，全面支持Docker技术，Docker给云计算厂商在PaaS领域的发展开启了新的篇章。也给互联网公司的运营平台的重构和以容器技术为基础提供服务的创业公司的发展提供了新的机遇;企业应用走向云端是个趋势，以Docker为代表的容器技术的出现和发展，打破了原有的云平台供应商的技术壁垒，让走向云端的应用不再被具体的某个云平台自身的技术锁定，企业应用可以在零代码入侵的情况顺利走向云端， 也可以平滑的在不同的云厂商之间迁移，这是容器技术给云计算技术带来的最大贡献（仅代表个人观点）本文从实践角度介绍了如何安装，配置，部署应用到Docker Swarm Cluster，帮助你更好理解Docker Swarm的核心功能。

 

## 安装 Docker Swarm cluster
### 安装Docker CE 17.03
在Digitalocean上创建3个CentOS7 droplets, 在三个node (node01, node02, node03) 上分别安装Docker CE 17.03.1-ce

注： 个人感觉Digitalocean在国内访问要快些， Docker环境和云厂商，硬件等无关，可以选择自己的喜欢的，用这个[链接](https://m.do.co/c/333996b27f07)申请Digitalocean account，可获赠10 USD credit

```
yum install -y yum-utils
yum-config-manager \
 --add-repo \
 https://download.docker.com/linux/centos/docker-ce.repo

yum install docker-ce
systemctl start docker

run a hello-world 
docker run hello-world
```

### 防火墙端口设置
Manager node(node01)

```
 firewall-cmd --add-port=22/tcp --permanent
 firewall-cmd --add-port=2376/tcp --permanent
 firewall-cmd --add-port=2377/tcp --permanent
 firewall-cmd --add-port=7946/tcp --permanent
 firewall-cmd --add-port=7946/udp --permanent
 firewall-cmd --add-port=4789/udp --permanent
 
 firewall-cmd --reload
 #restart docker
 systemctl restart docker
 
```
 
Worker Node(node02, node03)

```
firewall-cmd --add-port=22/tcp --permanent
 firewall-cmd --add-port=2376/tcp --permanent
 firewall-cmd --add-port=7946/tcp --permanent
 firewall-cmd --add-port=7946/udp --permanent
 firewall-cmd --add-port=4789/udp --permanent
 
 firewall-cmd --reload
 restart docker
systemctl restart docker
```
### 初始化Swarm Cluster 
```
docker swarm init
or
docker swarm init  --advertise-addr <YOUR-NODEIP>

sample output:

Swarm initialized: current node (4i3ohjjyai0rbhovfd9hlx33l) is now a manager.

To add a worker to this swarm, run the following command:

docker swarm join \

–token SWMTKN-1-16k4hp7o6kwnq2jp1wxfz93tnfah2n215sjzqiecq3aw5nip1c-80eukvhe1m2fcgzf6t5giefkq \

x.x.x.x:2377

To add a manager to this swarm, run ‘docker swarm join-token manager’ and follow the instructions.

```
### 增加Worker nodes到cluster 
node02, node03分别运行下面命令加入 cluster:

```
docker swarm join \

--token <YOUR-Token>\

x.x.x.x:2377

```

注：如果manager node上运行swarm init后的输出找不到了，用下面命令查询token

查询要增加manager node的token:
```
docker swarm join-token -q manager
```

查询要增加worker node的 token:
```
docker swarm join-token -q worker
```

Check nodes status

```
[root@node01 ~]# docker node ls
ID                           HOSTNAME  STATUS  AVAILABILITY  MANAGER STATUS
hgqkuckwzvzayafro1rcj0ep9    node03    Ready   Active        
idyj2pllz9s4f07jceh6iz7zs    node02    Ready   Active        
tkbdrvy6tebf0tc0idcb9dusb *  node01    Ready   Active        Leader
```

## 部署测试service到Swarm
```
docker service create --replicas 2 -p 80:80/tcp --name nginx nginx

[root@node01 ~]# docker service ls
ID            NAME   MODE        REPLICAS  IMAGE
rc15revna8a9  nginx  replicated  2/2       nginx


[root@node01 ~]# docker service ps nginx
ID            NAME     IMAGE                            NODE    DESIRED STATE  CURRENT STATE           ERROR  PORTS
x3gx6ea7z88p  nginx.1  nginx:latest  node03  Running        Running 10 seconds ago         
4ywabc9s1qrh  nginx.2  nginx:latest  node02  Running        Running 10 seconds ago  

```
两个nginx容器分别运行在node02, node03
测试访问

```
[root@node01 ~]# curl http://node02
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>

[root@node01 ~]# curl http://node03
[root@node01 ~]# curl http://node01
```

访问node01,node02, node3会看到相同的输出结果， 尽管我们的两个nginx container只在node02, node03上,并没有在node01上运行， Swarm cluster routing mesh起了作用



Delete test service:

```
docker service rm nginx
```

## 创建一个简单的WebApp,部署到Swarm 

### 创建app Image

```
mkdir app
vi app/webapp.js

{{{var http = require('http');
var www = http.createServer(function(request, response) {
  console.log('access URL:'+request.url);
  if (request.url == '/kill') {
	process.exit();
  }
  response.writeHead(200);
  var hostname=process.env.HOSTNAME;
  var version = 'Version 1.0 \n';
  var output = version + 'Hello Docker!\n'+'Hostname: '+hostname+'\n\n';
  response.end(output);
});

var port=process.env.WEBAPP_PORT||8000;
www.listen(port,function(){
	console.log("Server is listening port: "+port);	
}); 
```

vi Dockerfile

```
FROM node:7-alpine
WORKDIR /app
COPY app/webapp.js /app
ENV WEBAPP_PORT=8000 \
    NODE_ENV=production
EXPOSE $WEBAPP_PORT
CMD node webapp.js 

```

Build image

```
docker build -t webapp-handson-01:v1 .
```

把image push到 docker hub或者私有的image registry
### 部署webapp到swarm 

```
[root@node01 compose]# docker service create --name webapp --replicas 3 -p 80:8000 webapp-handson-01:v1
e61n4hxny5m8fvry6o2jqqrc6

[root@node01 compose]# docker service ls
ID            NAME    MODE        REPLICAS  IMAGE
e61n4hxny5m8  webapp  replicated  3/3       webapp-handson-01:v1

[root@node01 compose]# docker service ps webapp
ID            NAME      IMAGE                                    NODE    DESIRED STATE  CURRENT STATE           ERROR  PORTS
gz0278r4fgt9  webapp.1  webapp-handson-01:v1  node03  Running        Running 11 seconds ago         
ezpm3tlg5atd  webapp.2  webapp-handson-01:v1  node02  Running        Running 11 seconds ago         
oi3ozukwnv13  webapp.3  webapp-handson-01:v1  node01  Running        Running 11 seconds ago         
```

### Service failover 
持续访问webapp,可以看到swarm balance load到3个不同container

```
$ while true; do curl http://node01;sleep 2; done
Version 1.0 
Hello Docker!
Hostname: f811da71f4c5

Version 1.0 
Hello Docker!
Hostname: f81c55047bfc

Version 1.0 
Hello Docker!
Hostname: dbb8bc1da943

Version 1.0 
Hello Docker!
Hostname: f811da71f4c5 
```
开启另一个shell, 

```
curl http://node01/kill
```
执行两次
查看第一个shell窗口， webapp  response的 hostname发生了变化，从3个变1个，然后很快又变成3个

```
[root@node01 compose]# docker service ps webapp
ID            NAME          IMAGE                                    NODE    DESIRED STATE  CURRENT STATE               ERROR  PORTS
3tn76hcllj4o  webapp.1      webapp-handson-01:v1  node03  Running        Running about a minute ago         
kwjggesesvqx  webapp.2      webapp-handson-01:v1  node01  Running        Running 2 seconds ago              
i8ybpo3btsmw   \_ webapp.2 webapp-handson-01:v1  node01  Shutdown       Complete 7 seconds ago             
k0g41z6b2h1d  webapp.3      webapp-handson-01:v1  node02  Running        Running 7 seconds ago              
0bgp2fb8k4n9   \_ webapp.3  webapp-handson-01:v1  node02  Shutdown       Complete 12 seconds ago            
```

### Service scale up and scale down 
```
docker service scale webapp=5
```
观察第一个shell webapp response的变化，response page来自不同的hostname,从3个变为5个 

```
docker service scale webapp=3
```

### Rolling update 
更改webapp.js version to 2.0, 重新build image 为v2

```
docker service update webapp --image webapp-handson-01:v2
```
观察第一个shell webapp response和docker service ps webapp的输出，在服务不中断的情况下，从version 1滚动升级为Version 2。

```
$ docker service ps webapp
ID            NAME          IMAGE                                    NODE    DESIRED STATE  CURRENT STATE            ERROR  PORTS
pnrz6cy53j9z  webapp.1      webapp-handson-01:v2  node03  Running        Running 39 seconds ago          
3tn76hcllj4o   \_ webapp.1  webapp-handson-01:v1  node03  Shutdown       Shutdown 39 seconds ago         
spnp7yv1wt81  webapp.2      webapp-handson-01:v2  node01  Running        Running 15 seconds ago          
kwjggesesvqx   \_ webapp.2  webapp-handson-01:v1  node01  Shutdown       Shutdown 15 seconds ago         
i8ybpo3btsmw   \_ webapp.2  webapp-handson-01:v1  node01  Shutdown       Complete 3 minutes ago          
rfzi5lrz92uf  webapp.3      webapp-handson-01:v2  node02  Running        Running 27 seconds ago          
k0g41z6b2h1d   \_ webapp.3  webapp-handson-01:v1  node02  Shutdown       Shutdown 27 seconds ago         
0bgp2fb8k4n9   \_ webapp.3  webapp-handson-01:v1  node02  Shutdown       Complete 3 minutes ago          
```

### Node下线维护 
```
docker node update --availability drain node02

```

观察第一个shell窗口webapp response不中断
docker service ps webapp, node02 container move 到其他node

```
docker node update --availability active node02
```

node重新active后， 以前的container并不会move回来。
再次Scale up webapp

```
docker service scale webapp=4
```

actived node开始接受新的创建replica的请求.


### Placement rule 

- 让webapp运行到指定的node上面

```
docker service update  --constraint-add node.hostname==node02 webapp
```
其他node上运行的webapp containers shutdown,所有的container都转移在node02上运行
 
- 如何让web app只运行在指定的一组node上面?

  可以通过在node上面加label,然后更新或者增加constraint到service来完成;Label分为engine.labels 和node.labels,  engine.labels是在node docker daemon启动时增加option --label key=value, example --label group=QA完成label node的。而node.labels可以随时动态增加到node上面.
示例:

```
docker node update --label-add disklabel=fast node02
docker node update --label-add disklabel =fast node03

docker service update --constraint-add 'node.labels.disklabel ==fast’ webapp
docker service ps webapp

docker service update  --constraint-add engine.labels.group==QA  webapp
```

## 部署一个相对复杂的WebApp到Swarm 
WebApp显示一个被访问次数的计数器，多个WebApp记录访问次数到后端的DB,用redis来实现后端数据持久层。

注： 为了简化配置，没有用持久卷保存redis的数据，每次redis service重启，以前的数据不保留。

### 创建app Image

app/webapp.js

```
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
var version = '***** 1.0 *****';
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

``` 

vi Dockerfile

```
FROM node:7-alpine
WORKDIR /app
COPY app/package.json /app
RUN npm install 
COPY app/ /app
ENV WEBAPP_PORT=8000 \
    NODE_ENV=production \
    DBNAME=redisdb
EXPOSE $WEBAPP_PORT
CMD ["node", "webapp.js"]
```
build image 

```
docker build -t webapp-handson-02:v1 .
```
push image到docker hub或者自己的image repository

### 部署app到Swarm 

- create network

```
docker network create --driver overlay  mynet
```

- create redisdb service

```
docker service create --replicas 1 --network mynet --name redisdb redis

docker service create --replicas 3 --network mynet --name webapp -p 80:8000 webapp-handson-02:v1

```
webapp通过Docker内置的DNS名字访问后端redisdb


- 访问service

开启一个shell窗口,持续访问 node01或者其他node 80端口

```
while true; do curl http://node03; sleep 1; done
```
可以看到来自不同hostname container的reponse page, 访问次数依次增加。
 
## 通过YAML文件部署Service 

- Webapp.yml sample

```
version: "3"
services:
  redisdb:
    image: redis:latest
    ports:
      - 6379
    networks:
      - myappnet
    deploy:
      placement:
        constraints: [node.role == manager]
  mywebapp:
    image: YOURNAME/webapp-handson-02:v1
    ports:
      - 80:8000
    environment:
       DBNAME: redisdb
    networks:
      - myappnet
    depends_on:
      - redisdb
    deploy:
      replicas: 3
      labels: [APP=MYWEBAPP]
      # placement constraint - in this case on 'worker' nodes only
      placement:
        constraints: [node.role == worker]

networks:
    myappnet:
    
```   

- 部署yml文件

```
 docker stack deploy -c webapp.yml webapp
```

查看stack

```
docker stack ls
```

可以直接更改webapp.yml里面的image, replicas等信息再重新执行 stack deploy,同样可以完成scale, rolling update等功能。

delete stack

```
docker stack delete webapp
```


### YAML其他配置 
可以在YAML里面设置 service resource limits, restart, update policy等。示例：

```
 #service resource management begin

      resources:

        # Hard limit - Docker does not allow to allocate more

        limits:

          cpus: '0.25'

          memory: 512M

        # Soft limit - Docker makes best effort to return to it

        reservations:

          cpus: '0.25'

          memory: 256M

      # service restart policy

      restart_policy:

        condition: on-failure

        delay: 5s

        max_attempts: 3

        window: 120s

      # service update configuration

      update_config:

        parallelism: 1

        delay: 10s

        failure_action: continue

        monitor: 60s

        max_failure_ratio: 0.3

      # service resource management end
```

YAML文件规范参考：
https://docs.docker.com/compose/compose-file/

## 总结
以上通过非常简单的App展示了Docker Swarm的核心功能，比起Kubernetes和Mesos， Swarm内嵌在docker engine中，简单易用是它的优势，什么loadbalance, failover, scale, KV store, service discovery等都不让用户操心了，从命令行到YAML文件，简单到没一句废话。从使用角度看，尽管当前的Swarm 还有一些瑕疵，比如没有类似kubectl exec 那样的docker service exec直接连到远程node container的terminal, troubleshooting的日志记录还不够详细等， 随时间的推移，相信其功能会逐渐完善，总之Swarm是大多数企业值得尝试的容器集群管理和编排技术。可以预见的是，在各大云厂商积极参与和容器编排引擎技术经过一段时间的PK过后，其标准会逐渐统一和完善，从一种编排引擎，迁移到另一种，只需要简单的重写YAML文件即可，实施的难度会越来越低，这给企业提供了更大的选择空间，所以企业最先需要考虑的是如何把现有的应用Docker化，Docker化后上云平台就水到渠成了。当然，目前来看，传统企业的应用复杂而多样，不是所有的企业应用都能很快Docker化，这需要容器技术越来也成熟，企业，软件开发商经过很长一段时间的努力才能完成。尽管道路崎岖，参与者多方共赢的结果值得期待。
   
注： 文章言论仅代表个人观点，如需转载请与作者联系（ alix2013@icloud.com ）