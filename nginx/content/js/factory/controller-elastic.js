/**
 * Created by mogargaa65 on 22/12/2014.
 */
angular.module('FDAApp').factory('DataService', function($http, $q) {

    var session = {
        elasticHost: ''
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

    // prefetch airports data and save as a associative map/ simply json not exposed by factory
    var masterAirports = [];

	
    return {
        session: session,
        durationStatsData: durationStatsData,
        aircraftStatsData: aircraftStatsData,
        delayStatsData: delayStatsData,
		aircraftsData: aircraftsData,

        // this function pings the elasticsearch server
        login: function() {
            var retValue = $q.defer();
            $http({
                method: 'GET',
                url: 'http://'+session['elasticHost']+':9200?pretty=true'
            }).success(function (response) {
                retValue.resolve(true);
            }).error(function (response) {
                alert("Error " + response + " \n Refresh/Reload page again to try login again.");
                retValue.reject(false);
            });

            return retValue.promise;
        },

		// method to establish connection with elasticsearch server.. checks the configuration information
        // in the app-config.json
        initService: function() {
			// load config
            $.ajax({
                url: 'js/data/app-config.json',
                async: false,
                dataType: 'json',
                success: function (response) {
                    // do stuff with response.
                    session['elasticHost'] = response["ElasticHost"];
                },
				error: function(response) {
					alert("Error: Please setup ~/js/data/app-config.json with Elastic Server credentials.");
					return false;
				}
            });
			// establish a session... if login is successful, getMasterAirportData
			var success = this.login();
            this.getMasterAirportData();
			return success;
        },

        // method to load master airport data - masterAirports
        // This method is tricky to understand.. This query will fetch all the airports (its lat/lon)
        // So, when ultimately populating map and for mouseover actions, airport information are fetch from the above
        // data and thereby avoiding querying repeatedly

        getMasterAirportData: function () {
            /* START: Setting of durationStatsData object for directive*/
            var query = '{	\
                            "size" : 40000,\
                            "fields" : ["icao", "city", "lonlat", "name"] \
                        }';
            console.log(query);

            $http({
                method: 'POST',
                url: 'http://'+session['elasticHost']+':9200/gequest/airports/_search',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: query
            }).success(function (response) {

                var airports = response.hits.hits;

                for(var i=0; i<airports.length; i++)
                {
                    var key = airports[i]._id;
                    var value = airports[i].fields;
                    masterAirports[key] = value;
                }

            }).error(function (response) {
                console.log(response)
                alert("Error " + response);
                return;
            });
        },

        // method to set aircraftStatsData & durationStatsData
        fetchFreqGraphData : function(searchAircrafts, searchDuration, updateOnly) {
            /* START: Input variables extraction */

            var aircraftPartOfQuery = "";
            for (var i = 0; i < searchAircrafts.length; i++) {
                aircraftPartOfQuery = aircraftPartOfQuery + "{\"regexp\":{  \"icao_aircraft_type_actual\":  \""+searchAircrafts[i].trim().replace(/\*/g, '.*')+"\"  } } ";
                if (i != searchAircrafts.length - 1)
                    aircraftPartOfQuery = aircraftPartOfQuery + " , ";
            }
            /* END: Input variables extraction */

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
            // Observer setting done

            /* START: Query methods*/ // notifies the observers
            var makeQuery = function() {

                /* START: Setting of durationStatsData object for directive*/
                var query = '{ \
                    "size": 0, \
                        "query": { \
                            "filtered": { \
                                "filter": { \
                                    "bool" : { \
                                        "should" : [ \
                                            '+aircraftPartOfQuery+' \
                                            ], \
                                        "must" : { \
                                            \"range": { "actual_air_time": { "gte": '+ searchDuration[0] +', "lte" : ' + searchDuration[1]+ ' } } \
                                        }\
                                    } \
                                } \
                            } \
                        }, \
                        "aggs": { \
                            "duration": { \
                                "terms": { \
                                    "size" : 100, \
                                    "script": "Math.ceil(doc[\\"actual_air_time\\"].value as double)" \
                                }, \
                                "aggs": { \
                                    "aircrafts": { \
                                        "terms": { \
                                            "size" : 100, \
                                            "field": "icao_aircraft_type_actual" \
                                        } \
                                    } \
                                } \
                            } \
                        } \
                    } ';
                // print the query
                console.log(query);

                $http({
                    method: 'POST',
                    url: 'http://'+session['elasticHost']+':9200/gequest/flights/_search?pretty=true',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data: query
                }).success(function (response) { // on successful query, the response objects contains results in the form of json.
                    // This json objects need to be read through its hierarchy.. SO, one has to know results objects and
                    // how it looks like

                    // extract the durations cluster
                    var durations = response.aggregations.duration.buckets;
                    var map = [];

                    for (var i = 0; i < durations.length; i++) {
                        var mapI = [];

                        var hour = parseInt(durations[i].key);
                        var sum = parseInt(durations[i].doc_count);
                        var breakup = [];
                        // get all the aircrafts that clocked this duration
                        var aircrafts = durations[i].aircrafts.buckets;
                        // number of aircrafts that clocked this duration
                        //alert(aircrafts.length)
                        for (var j = 0; j < aircrafts.length; j++) {
                            var key = aircrafts[j].key;
                            key = key.toString();
                            key = key.toUpperCase();
                            // occurance of a particular aircraft
                            var val = aircrafts[j].doc_count;
                            breakup[key] = parseInt(val);
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
            // This method prepares data for pie chart
            var setAircraftStatsData = function() {
                // get the durationstats data aggregated by the previous method
                var map = durationStatsData['data'];
                // a map variable for the pie chart
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
            var aircraftPartOfQuery = "";
            for (var i = 0; i < searchAircrafts.length; i++) {
                // Regexp filter used instead of wildcard clause. Wildcards doesn't work with filters, they work with query
                aircraftPartOfQuery = aircraftPartOfQuery + "{\"regexp\":{  \"icao_aircraft_type_actual\":  \""+searchAircrafts[i].trim().replace(/\*/g, '.*')+"\"  } } ";
                if (i != searchAircrafts.length - 1)
                    aircraftPartOfQuery = aircraftPartOfQuery + " , ";
            }
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
                var query1 = '{ \
                                "size": 0, \
                                    "query": { \
                                    "filtered": { \
                                        "filter": { \
                                            "bool" : { \
                                                "should" : [ \
                                                    '+aircraftPartOfQuery+' \
                                                ], \
                                                "must" : { \
                                                    \"range": { "actual_air_time": { "gte": '+ (searchDuration[0]-1) +', "lte" : ' + searchDuration[1]+ ' } } \
                                                } \
                                            } \
                                        } \
                                    } \
                                }, \
                                "aggs": { \
                                    "Arrivals": { \
                                        "filter": { \
                                        }, \
                                        "aggs": { \
                                            "Arrival": { \
                                                "terms": { \
                                                    "size" : 1000000, \
                                                    "field": "arrival_airport_icao_code" \
                                                }, \
                                                "aggs": { \
                                                    "AverageArrivalDelay": { \
                                                        "avg": { \
                                                            "field": "delay_arrival" \
                                                        } \
                                                    } \
                                                } \
                                            } \
                                        } \
                                    }, \
                                    "Departures": { \
                                        "filter": { \
                                        }, \
                                        "aggs": { \
                                            "Departure": { \
                                                "terms": { \
                                                    "size" : 1000000, \
                                                    "field": "departure_airport_icao_code" \
                                                }, \
                                                "aggs": { \
                                                    "AverageDepartureDelay": { \
                                                        "avg": { \
                                                            "field": "delay_departure" \
                                                        } \
                                                    } \
                                                } \
                                            } \
                                        } \
                                    } \
                                } \
                            }';

                console.log(query1);

                $http({
                    method: 'POST',
                    url: 'http://'+session['elasticHost']+':9200/gequest/flights/_search?pretty=true',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data: query1
                }).success(function (response) {

                    var departureDelays = response.aggregations.Departures.Departure.buckets;
                    var arrivalDelays = response.aggregations.Arrivals.Arrival.buckets;

                    // Copy matching values from arrivalDelays
                    for (var i = 0; i < departureDelays.length; i++) {

                        departureDelays[i]['value1'] = departureDelays[i].AverageDepartureDelay.value;
                        departureDelays[i]['value2'] = null;

                        delete  departureDelays[i].AverageDepartureDelay;// Reference : "removing objects from associative arrays"

                        for(var j=0; j<arrivalDelays.length; j++) {
                            if(arrivalDelays[j]!=null)
                                if(arrivalDelays[j].key == departureDelays[i].key) {
                                    departureDelays[i]['value2'] = arrivalDelays[j].AverageArrivalDelay.value;
                                    arrivalDelays[j]= null;
                                    break;
                                }

                        }
                    }

                    // putting residual objects in arrivalDelays in departureDelays
                    for (var i = 0; i < arrivalDelays.length; i++) {
                        if(arrivalDelays[i]!=null) {
                            arrivalDelays[i]['value2'] = arrivalDelays[i].AverageArrivalDelay.value;
                            arrivalDelays[i]['value1'] = null;
                            delete  arrivalDelays[i].AverageArrivaleDelay;
                            departureDelays.push(arrivalDelays[i]);
                            arrivalDelays[i] = null;
                        }
                    }

                    console.log(departureDelays);
                    // Plug airport meta-data & cast floats
                    for(var i=0; i<departureDelays.length; i++) {
                        if(masterAirports[departureDelays[i].key.toUpperCase()] != null)  {
                            var airport= masterAirports[departureDelays[i].key.toUpperCase()];
                            departureDelays[i]['city'] = airport['city'][0];
                            departureDelays[i]['lon'] = parseFloat( airport['lonlat'][0] );
                            departureDelays[i]['lat'] = parseFloat( airport['lonlat'][1] );
                        }
                        departureDelays[i]['value1'] = parseFloat(departureDelays[i]['value1'] );
                        departureDelays[i]['value2'] = parseFloat(departureDelays[i]['value2'] );

                        departureDelays[i].code = departureDelays[i].key.toUpperCase();
                        delete departureDelays[i].key;
                        delete departureDelays[i].doc_count;
                        airportDelayData[departureDelays[i].code] = departureDelays[i];
                    }

                    airportDelayDataFilled = true;

                    notifyObservers();

                }).error(function (response) {
                    alert("Error " + response);
                    console.log(response);
                });
                /* END: Setting of airportDelayData*/
            }

            var makeQuery2 = function () {
                /* START: Setting of airportTrafficData*/
                var query2 = '{ \
                                "size": 0, \
                                    "query": { \
                                    "filtered": { \
                                        "filter": { \
                                            "bool" : { \
                                                "should" : [ \
                                                    '+aircraftPartOfQuery+' \
                                                ], \
                                                "must" : { \
                                                    \"range": { "actual_air_time": { "gte": '+ (searchDuration[0]-1) +', "lte" : ' + searchDuration[1]+ ' } } \
                                                } \
                                            } \
                                        } \
                                    } \
                                }, \
                                "aggs": { \
                                    "airport1": { \
                                        "terms": { \
                                            "size" : 1000000, \
                                            "field": "arrival_airport_icao_code" \
                                        }, \
                                        "aggs": { \
                                            "airport2": { \
                                                "terms": { \
                                                    \"size" : 1000000, \
                                                    "field": "departure_airport_icao_code" \
                                                } \
                                            } \
                                        } \
                                    } \
                                } \
                            }';

                $http({
                    method: 'POST',
                    url: 'http://'+session['elasticHost']+':9200/gequest/flights/_search?pretty=true',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data: query2
                }).success(function (response) {

                    var airportAgg = response.aggregations.airport1.buckets;
                    console.log(airportAgg);

                    for(var i=0; i<airportAgg.length; i++) {
                        var temp = airportAgg[i].airport2.buckets;
                        for(var j=0; j<temp.length; j++) {
                            var t = [];
                            t['airport1'] = airportAgg[i]['key'].toUpperCase();
                            t['airport2'] = temp[j]['key'].toUpperCase();
                            t['count'] = temp[j]['doc_count'];
                            t['type'] = "LineString";
                            t['coordinates'] = [0.0, 0.0];

                            airportTrafficData.push(t);
                        }
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

                //alert("data recieved")
                console.log(airportDelayData);
                console.log(airportTrafficData);

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