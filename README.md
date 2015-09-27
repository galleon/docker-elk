# Docker ELK stack for AWI project

[![Join the chat at https://gitter.im/deviantony/fig-elk](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/deviantony/fig-elk?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Run part of the ELK (Elasticseach, Logstash, Kibana) stack with Docker and Docker-compose. The AWI GUI is using a simple Angular app through NGINX.


Based on the official images:

* [elasticsearch](https://registry.hub.docker.com/_/elasticsearch/)
* [logstash](https://registry.hub.docker.com/_/logstash/)
* [kibana](https://registry.hub.docker.com/_/kibana/)
* [nginx](https://registry.hub.docker.com/_/nginx/)

# Requirements

## Setup

1. Install [Docker](http://docker.io).
2. Install [Docker-compose](http://docs.docker.com/compose/install/).
3. Clone this repository

## SELinux

On distributions which have SELinux enabled out-of-the-box you will need to either re-context the files or set SELinux into Permissive mode in order for fig-elk to start properly.
For example on Redhat and CentOS, the following will apply the proper context:

````bash
.-root@centos ~
-$ chcon -R system_u:object_r:admin_home_t:s0 fig-elk/
````

# Usage

Start the stack using *docker-compose*:

```bash
$ docker-compose up
```

You can also choose to run it in background (detached mode):

```bash
$ docker-compose up -d
```

Now that the stack is running, you'll want to inject logs in it. The shipped logstash configuration allows you to send content via tcp:

```bash
$ nc localhost 5000 < /path/to/logfile.log
```

By default, the stack exposes the following ports:
* 5000: Logstash TCP input.
* 9200: Elasticsearch HTTP (with Marvel plugin accessible via [http://localhost:9200/_plugin/marvel](http://localhost:9200/_plugin/marvel))
* 80: Nginx

*WARNING*: If you're using *boot2docker*, you must access it via the *boot2docker* IP address instead of *localhost*.

*WARNING*: If you're using *Docker Toolbox*, you must access it via the *docker-machine* IP address instead of *localhost*.
