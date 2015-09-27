/**
 * Created by mogargaa65 on 18/12/2014.
 */
angular.module('FDAApp').factory('DataService', function($http) {
    var session = {
        splunkHost:'',
        userName:'',
        passWord:'',
        key: ''
    };

    var durationStatsData = {
        data: null
    };

    var aircraftStatsData = {
        data: null
    };

    var delayStatsData = {
        data: null
    };

    var aircraftsData = {
        data: null,
		source: false
    };
	
    return {
        session: session,
        durationStatsData: durationStatsData,
        aircraftStatsData: aircraftStatsData,
        delayStatsData: delayStatsData,
		aircraftsData: aircraftsData,
		
        login: function() {
            $http({
                method: 'POST',
                url: 'https://'+session['splunkHost']+':8089/servicesNS/admin/search/auth/login',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                transformRequest: function (data) {
                    var postData = [];
                    for (var prop in data)
                        postData.push(encodeURIComponent(prop) + "=" + encodeURIComponent(data[prop]));
                    return postData.join("&");
                },
                data: {username: session['userName'], password: session['passWord']}
            }).success(function (response) {
                var xmlDoc;
                if (window.DOMParser) {
                    var parser = new DOMParser();
                    xmlDoc = parser.parseFromString(response, "text/xml");
                }
                else { // Internet Explorer
                    xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                    xmlDoc.async = false;
                    xmlDoc.loadXML(response);
                }
                session['key'] = xmlDoc.getElementsByTagName("sessionKey")[0].childNodes[0].nodeValue;
				return true;
            }).error(function (response) {
                alert("Error " + response + " \n Make sure you open the https://"+session['splunkHost']+":8089 once and accept the SSL certificate. Otherwise Refresh/Reload page again to try login again.");
				return false;
            });
        },

		// method to establish connection with Splunk server
        initService: function() {
			// load config
            $.ajax({
                url: 'js/data/app-config.json',
                async: false,
                dataType: 'json',
                success: function (response) {
                    // do stuff with response.
                    session['splunkHost'] = response["SplunkHost"];
                    session['userName'] = response["username"];
                    session['passWord'] = response["password"];
                },
				error: function(response) {
					alert("Error: Please setup ~/js/data/app-config.json with Splunk Server credentials.");
					return false;
				}
            });
			// establish a session
			var success = this.login();
			return success;			
        },

		// method to load data for frequencyGraph directive
		checkService: function () {
			var serviceOk = true;

			// check status of session
			if ( (session['splunkHost'] == '') || (session['key'] == '') )

			if (!serviceOk) {
				// try to initialize service again as session might have timed out
				var serviceOk = this.initService();
			}

			return serviceOk;
		},
		
		// method to set aircraftStatsData & durationStatsData
        fetchFreqGraphData : function(searchAircrafts, searchDuration, updateOnly) {
            /* START: Input variables extraction */
			var aircraftPartOfQuery = "search (";
			for (var i = 0; i < searchAircrafts.length; i++) {
				aircraftPartOfQuery = aircraftPartOfQuery + "icao_aircraft_type_actual=" + "\"" + searchAircrafts[i].trim() + "\"";
				if (i != searchAircrafts.length - 1)
					aircraftPartOfQuery = aircraftPartOfQuery + " OR ";
			}
			aircraftPartOfQuery = aircraftPartOfQuery + ")";

            var durationPartOfQuery = "search ( actual_air_time>=" + searchDuration[0] + " AND " + " actual_air_time<=" + searchDuration[1] + ")";;

            // Observer pattern as replacement to 'scope.$watch()' for local variable
            var observerCallbacks = [];
            this.registerObserverCallback = function (callback) {
                observerCallbacks.push(callback);
            };
            
			var notifyObservers = function () {
                angular.forEach(observerCallbacks, function (callback) {
                    callback();
                });
            };
            /* END: Input variables extraction */

            /* START: Query methods*/
			var makeQuery = function() {

				/* START: Setting of durationStatsData object for directive*/
				var query = "search index=\"timedata\" | " + aircraftPartOfQuery + " | eval actual_air_time=ceiling((strptime(actual_runway_arrival,\"%Y-%m-%d %H:%M:%S\")-strptime(actual_runway_departure,\"%Y-%m-%d %H:%M:%S\"))/3600 )|  search actual_air_time!=''  | chart limit=19 count by actual_air_time icao_aircraft_type_actual | rename actual_air_time AS State";

				$http({
					method: 'POST',
					url: 'https://'+session['splunkHost']+':8089/servicesNS/admin/search/search/jobs/export',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Authorization': 'Splunk ' + session['key']
					},
					transformRequest: function (data) {
						var postData = [];
						for (var prop in data)
							postData.push(encodeURIComponent(prop) + "=" + encodeURIComponent(data[prop]));
						return postData.join("&");
					},
					data: {search: query, output_mode: 'xml'}
				}).success(function (response) {
					var xmlDoc;
					if (window.DOMParser) {
						var parser = new DOMParser();
						xmlDoc = parser.parseFromString(response, "text/xml");
					}
					else { // Internet Explorer
						xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
						xmlDoc.async = false;
						xmlDoc.loadXML(response);
					}

					var map = [];
					var results = xmlDoc.getElementsByTagName("result");				

					for (var i = 0; i < results.length; i++) {
						var mapI = [];
						
						var hour = 0;
						var sum = 0;
						var breakup = [];

						var elements = results[i].getElementsByTagName("field");
						for (var j = 0; j < elements.length; j++) {
							var key = elements[j].getAttribute("k").valueOf();
							var textEle = elements[j].getElementsByTagName("text");
							var val = textEle[0].childNodes[0].nodeValue;

							if(key != "State") {
								sum = sum + parseInt(val);
								breakup[key] = parseInt(val);						
							}
							else if(key == "State")
								hour = parseInt(val);
						}

						if ( (hour >= 1) && (hour <= 17) ) {
							mapI['key'] = hour;
							mapI['value'] = [sum, breakup]
							map.push(mapI);
						}
					}

					durationStatsData['data'] = map;
					notifyObservers();
				}).error(function (response) {
					alert("Error " + response);
					return;
				});
				/* END: Setting of durationStatsData object for directive*/
			}
            /* END: Query methods*/

			/* START: Setting of aircraftStatsData object for directive*/
            var setAircraftStatsData = function() {
				var map = durationStatsData['data'];

				var mapForPie = [];
				var jsonArr = [];
			
				for(var i = 0; i < map.length; i++){
					if( (map[i].key <= searchDuration[1]) && (map[i].key >= searchDuration[0]) )
						for(var key in map[i].value[1]){									
							if (key in mapForPie) 
									mapForPie[key] += parseInt(map[i].value[1][key]);								
								else 
									mapForPie[key] = parseInt(map[i].value[1][key]);								
						}
				}

				var jsonArr = [];
				for (var item in mapForPie) {
					var str = "{ \"aircraft\" : \"" + item + "\", \"count\" : \" " + mapForPie[item] + "\" }";
					var json = JSON.parse(str);
					if (item != "State")
						jsonArr.push(json);
				}
				jsonArr.sort(function(a,b) { return parseInt(b.count) - parseInt(a.count) } );

				aircraftStatsData['data'] = jsonArr;
				aircraftsData['data'] = jsonArr;
			}
			/* END: Setting of aircraftStatsData object for directive*/

			/* START: Main Business Logic*/
			if (!updateOnly) { // done only if it NOT update only
				this.registerObserverCallback(setAircraftStatsData);
				makeQuery();
			}
			else {
				setAircraftStatsData();
			}
			/* END: Main Business Logic*/
		},
		
		// method to set delayStatsData
        fetchMapData : function(searchAircrafts, searchDuration, updateOnly) { // updateOnly ignored - but it is the interface that app-controller uses
            /* START: Input variables extraction */
			var aircraftPartOfQuery = "search (";
			for (var i = 0; i < searchAircrafts.length; i++) {
				aircraftPartOfQuery = aircraftPartOfQuery + "icao_aircraft_type_actual=" + "\"" + searchAircrafts[i].trim() + "\"";
				if (i != searchAircrafts.length - 1)
					aircraftPartOfQuery = aircraftPartOfQuery + " OR ";
			}
			aircraftPartOfQuery = aircraftPartOfQuery + ")";

            var durationPartOfQuery = "search ( actual_air_time>=" + searchDuration[0] + " AND " + " actual_air_time<=" + searchDuration[1] + ")";;
            /* END: Input variables extraction */

            /* START: Common variables to makeQuery1() & makeQuery2() */
            var airportDelayData = []; // Airport with delays
            var airportTrafficData = []; // Frequency between airports

            var airportDelayDataFilled = false; // flag to notify that data is filled
            var airportTrafficDataFilled = false; // flag to notify that data is filled

            // Observer pattern as replacement to 'scope.$watch()' for local variable
            var observerCallbacks = [];
            this.registerObserverCallback = function (callback) {
                observerCallbacks.push(callback);
            };
            
			var notifyObservers = function () {
                angular.forEach(observerCallbacks, function (callback) {
                    callback();
                });
            };
            /* END: Common variables to makeQuery1() & makeQuery2() */

            /* START: Query methods*/
            var makeQuery1 = function() {
				/* START: Setting of airportDelayData*/
				var query1 = "search index=\"timedata\"| " + aircraftPartOfQuery + " | eval actual_air_time=round((strptime(actual_runway_arrival,\"%Y-%m-%d %H:%M:%S\")-strptime(actual_runway_departure,\"%Y-%m-%d %H:%M:%S\"))/3600 ) | eval delay_departure = (strptime(actual_gate_departure,\"%Y-%m-%d %H:%M:%S\")-strptime(scheduled_gate_departure,\"%Y-%m-%d %H:%M:%S\"))/3600 | table departure_airport_icao_code arrival_airport_icao_code actual_air_time delay_departure | search  actual_air_time!=\"\" | " + durationPartOfQuery + "  | stats avg(delay_departure) by departure_airport_icao_code | rename departure_airport_icao_code AS airport avg(delay_departure) AS avgDepDelay| append [search index=\"timedata\" | " + aircraftPartOfQuery + " | eval actual_air_time=round((strptime(actual_runway_arrival,\"%Y-%m-%d %H:%M:%S\")-strptime(actual_runway_departure,\"%Y-%m-%d %H:%M:%S\"))/3600 ) | eval delay_arrival = (strptime(actual_gate_arrival,\"%Y-%m-%d %H:%M:%S\")-strptime(scheduled_gate_arrival,\"%Y-%m-%d %H:%M:%S\"))/3600 | table departure_airport_icao_code arrival_airport_icao_code actual_air_time delay_arrival | search actual_air_time!=\"\" | " + durationPartOfQuery + "  | stats avg(delay_arrival) by arrival_airport_icao_code | rename arrival_airport_icao_code AS airport avg(delay_arrival) AS avgArrDelay] | stats values(avgDepDelay) as adata values(avgArrDelay) as bdata by airport | join airport [search index=\"airport_data3\" | dedup icao | table icao, lon, lat, city | rename icao AS airport] | rename adata AS value1, bdata AS value2, airport AS code";

                $http({
					method: 'POST',
					url: 'https://' + session['splunkHost'] + ':8089/servicesNS/admin/search/search/jobs/export',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Authorization': 'Splunk ' + session['key']
					},
					transformRequest: function (data) {
						var postData = [];
						for (var prop in data)
							postData.push(encodeURIComponent(prop) + "=" + encodeURIComponent(data[prop]));
						return postData.join("&");
					},
					data: {search: query1, output_mode: 'xml'}
				}).success(function (response) {
					var xmlDoc;
					if (window.DOMParser) {
						var parser = new DOMParser();
						xmlDoc = parser.parseFromString(response, "text/xml");
					}
					else { // Internet Explorer
						xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
						xmlDoc.async = false;
						xmlDoc.loadXML(response);
					}

					var results = xmlDoc.getElementsByTagName("result");
					for (var i = 0; i < results.length; i++) {
						var mapI = [];
						var elements = results[i].getElementsByTagName("field");
						var icaoKey = "";
						for (var j = 0; j < elements.length; j++) {
							// airport map
							var key = elements[j].getAttribute("k").valueOf();
							var textEle = elements[j].getElementsByTagName("text");
							var val = textEle[0].childNodes[0].nodeValue;
							if (key == "code")
								icaoKey = val;

							if(key=="lat" || key=="lon" || key=="value1" || key=="value2")
								mapI[key] = parseFloat(val);
							else
								mapI[key] = val;
						}
						airportDelayData[icaoKey]=mapI;
					}

					airportDelayDataFilled = true;
					notifyObservers();
				}).error(function (response) {
					alert("Error " + response);
				});
				/* END: Setting of airportDelayData*/
			}

            var makeQuery2 = function () {
				/* START: Setting of airportTrafficData*/
				var query2 = "search index=\"timedata\" | " + aircraftPartOfQuery + " | eval actual_air_time=round((strptime(actual_runway_arrival,\"%Y-%m-%d %H:%M:%S\")-strptime(actual_runway_departure,\"%Y-%m-%d %H:%M:%S\"))/3600 ) | table departure_airport_icao_code arrival_airport_icao_code actual_air_time | search  actual_air_time!=\"\" | " + durationPartOfQuery + " | stats count by departure_airport_icao_code, arrival_airport_icao_code | rename departure_airport_icao_code AS airport1, arrival_airport_icao_code AS airport2, count AS count | eval edges=airport1.\",\".airport2| makemv delim=\",\" edges | eval edgessorted=mvjoin(mvsort(edges),\",\") | stats sum(count) as count by edgessorted| rex field=edgessorted \"(?<airport1>.*),(?<airport2>.*)\"   | table airport1 airport2 count";

                $http({
                    method: 'POST',
                    url: 'https://' + session['splunkHost'] + ':8089/servicesNS/admin/search/search/jobs/export',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': 'Splunk ' + session['key']
                    },
                    transformRequest: function (data) {
                        var postData = [];
                        for (var prop in data)
                            postData.push(encodeURIComponent(prop) + "=" + encodeURIComponent(data[prop]));
                        return postData.join("&");
                    },
                    data: {search: query2, output_mode: 'xml'}
                }).success(function (response) {
                    var xmlDoc;
                    if (window.DOMParser) {
                        var parser = new DOMParser();
                        xmlDoc = parser.parseFromString(response, "text/xml");
                    }
                    else { // Internet Explorer
                        xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                        xmlDoc.async = false;
                        xmlDoc.loadXML(response);
                    }

                    var results = xmlDoc.getElementsByTagName("result");
                    for (var i = 0; i < results.length; i++) {
                        var mapI = [];
                        var elements = results[i].getElementsByTagName("field");
                        for (var j = 0; j < elements.length; j++) {
                            // airport traffic
                            var key = elements[j].getAttribute("k").valueOf();
                            var textEle = elements[j].getElementsByTagName("text");
                            var val = textEle[0].childNodes[0].nodeValue;
                            mapI[key] = val;
                        }

                        var item = [];
                        item['type']='LineString';
                        item['coordinates'] = [0.0, 0.0];
                        item['count'] = mapI.count;
                        item['airport1'] = mapI.airport1;
                        item['airport2'] = mapI.airport2;
                        airportTrafficData.push(item);
                    }

                    airportTrafficDataFilled = true;
                    notifyObservers();
                }).error(function (response) {
                    alert("Error " + response);
                });
				/* START: Setting of airportTrafficData*/
			}
            /* END: Query methods*/


            /* START: Setting of delayStatsData object for directive*/
            var setDelayStatsData = function() {
                if( (!airportDelayDataFilled) || (!airportTrafficDataFilled) )
                    return;

                for(var i = airportTrafficData.length-1; i >= 0; i--)
                {
                    if( (typeof airportDelayData[airportTrafficData[i].airport1] == 'undefined') || (typeof airportDelayData[airportTrafficData[i].airport2] == 'undefined') ) {
                        airportTrafficData.splice(i,1);
						continue;
					}
                    var point1= ([ airportDelayData[airportTrafficData[i].airport1]['lon'], airportDelayData[airportTrafficData[i].airport1]['lat']]);
                    var point2= ([ airportDelayData[airportTrafficData[i].airport2]['lon'], airportDelayData[airportTrafficData[i].airport2]['lat']]);
                    airportTrafficData[i].coordinates = [point1, point2];
                }

                delayStatsData['data'] = [airportDelayData, airportTrafficData]; // This triggers delayStatistics directive watch once
            }
            /* END: Setting of delayStatsData object for directive*/

            /* START: Main Business Logic*/
            this.registerObserverCallback(setDelayStatsData);
            makeQuery1();
            makeQuery2();
            /* END: Main Business Logic*/
        }
    }
});