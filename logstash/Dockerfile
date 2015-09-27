FROM logstash:latest

ADD data/airports3.csv /tmp/airports3.csv
ADD data/trainingFinalEval_flighthistory.csv /tmp/trainingFinalEval_flighthistory.csv

ADD conf.d/01-airports.conf /etc/logstash/conf.d/01-airports.conf
ADD conf.d/02-flighthistory.conf /etc/logstash/conf.d/02-flighthistory.conf

RUN touch /etc/logstash/conf.d/file.touched && ls -lrt /etc/logstash/conf.d && logstash agent --config /etc/logstash/conf.d
#RUN touch /etc/logstash/conf.d/file.touched && ls -lrt /etc/logstash/conf.d && logstash agent --config /etc/logstash/conf.d --configtest
