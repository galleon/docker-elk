
var app = angular.module('FDAApp', []);

app.controller('formController', function ($scope, $http, $templateCache, $interval, $timeout, DataService) {
    // initialize data service quietly when page loads
	var serviceOk = DataService.initService();
	serviceOk.then(
		function(val){
			;
		},function(val){
			if (!val) {
				alert("Error: Unable to establish connection with Data Service");
				return;
			}
		}
	);

	// method to load data for frequencyGraph directive
	$scope.fetchData = function (sourceFlag) {
		// check status of service
		var serviceOk = DataService.login();
		serviceOk.then(
			function(val){
				;
			},function(val){
				if (!val) {
					alert("Error: Unable to establish connection with Data Service");
					return;
				}
			}
		);

		/* check for any changes in the view.. that is, in the search box, duration brush
		* If there is any change, trigger appropriate action
		* */

		// make some checks to see if (a) anything should actually be done; (b) if data needs to be updated only; (c) actual calls to server is required
		var updateOnly = true;

		if ( (typeof $scope.searchStringPrev == 'undefined') || ($scope.searchStringPrev != $scope.searchString) ) {
			updateOnly = false;
		}
		else {
			if ( (typeof $scope.durationStringPrev != 'undefined') && ($scope.durationStringPrev == $scope.durationString) )
			return;
		}

		// check search string inputs
		if ($scope.searchString == "enter aircraft type search parameters")
			return;

		// check search string inputs
		var searchAircrafts = $scope.searchString.split(" ");
		if ( (searchAircrafts == null) || (searchAircrafts.length == 0) ) {
			alert("Aircraft code cannot be empty");
			return;
		}

		// bind the aircraft-pcoordinates data to service
		DataService.aircraftsData['data'] = null;
		DataService.aircraftsData['source'] = sourceFlag;
		$scope.aircraftsData = DataService.aircraftsData;

		// bind the aircraft-statistics data to service
        DataService.aircraftStatsData['data'] = null;
        $scope.aircraftStatsData = DataService.aircraftStatsData;

		// bind the delay-statistics data to service
		DataService.delayStatsData['data'] = null;
        $scope.delayStatsData = DataService.delayStatsData;

		// bind the duration-statistics data to service (if new search)
		if (!updateOnly) { // fresh search now..
			DataService.durationStatsData['data'] = null;
			$scope.durationStatsData = DataService.durationStatsData;

			$scope.durationString = "0-17"; // reset durationString
		}

		// get search duration
		var searchDuration = $scope.durationString.split("-");

		// fetch data from service
		DataService.fetchFreqGraphData(searchAircrafts, searchDuration, updateOnly);
        DataService.fetchMapData(searchAircrafts, searchDuration, updateOnly);

		// save search params for checks at next call
		$scope.searchStringPrev = $scope.searchString;
		$scope.durationStringPrev = $scope.durationString;
	};

	// when you click the search box, the text disappears..
    $scope.onClick = function() {
        if($scope.searchString == "enter aircraft type search parameters")
            $scope.searchString = "";
    };
});
