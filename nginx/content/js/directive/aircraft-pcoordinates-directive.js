
app.directive('aircraftCoordinates', function () {

    // isolate scope
    return {
        scope: {'data': '='},
        restrict: 'E',
        link: link
    };

	/**
	 * This link function will be called in the beginning
	 * It renders the parallel coordinate
	 *
	 * @param scope
	 * @param element
	 */

    function link(scope, element) {
		/**
		 * Creation of visual elements
		 */

        var el = element[0];

        // variables initialization
		var margin = {top: 20, right: 20, bottom: 20, left: 20},
            width = (window.innerWidth - 60)*1.0 - margin.left - margin.right,
			height = (window.innerHeight - 60)*0.40 - margin.top - margin.bottom;

		// create a placeholder for parallel coordinate and create widget
		width = (window.innerWidth - 60)*0.83 - margin.left - margin.right;
		var div = d3.select(el).append("div")
			.attr("id", "aircraftFilters")
			.attr("class","parcoords")
			.style("float","left")
			.style("width", width + "px")
			.style("height", height + "px")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var aircraftFiltersWidget = d3.parcoords()("#aircraftFilters")
			.alpha(0.4);

		// creation of aircraft parameter filter list box
		width = (window.innerWidth - 60)*0.16 - margin.left - margin.right;
		var aircraftParamsWidget = d3.select("#aircraftParams")
			.append("select") // this is a drop-down box
			.attr("id", "list")            
			.attr("size", 16)
			.style("width", width + "px")
			.style("height", (height - 40) + "px")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		// functions for reset buttons
		var allParams = [];

        // when press reset list button, all params are displayed in the parallel coordinate widget
		var resetAircraftParams = function() {
			aircraftParamsWidget.selectAll("option")
				.style("color", "green")
                .style("font-family","arial");
			aircraftFiltersWidget.dimensions(allParams.splice());
		}

        // when press reset filter, brush selection from parallel coordinate is removed
		var resetAircraftFilters = function() {
			aircraftFiltersWidget.brushReset();
			//aircraftFiltersWidget.clear("highlight");
		}

		// load csv file and create the chart
		d3.csv('js/data/aircraft.csv', function(data) {
            // take every params in csv file into a list
			allParams = d3.keys(data[0]);

            // load the widget
			aircraftFiltersWidget
				.data(data)
				.composite("darker")
				.interactive()
				.reorderable()
				.brushMode("1D-axes") // enable brushing
				.render();

			// load the aircraft params widget, that is, the drop-down box
			aircraftParamsWidget.selectAll("option")
				.data(allParams).enter()			
				.append("option")
				.style("color", "green")
                .style("font-family","arial")
				.attr("value", function (d) { return d; })
				.text(function (d) { return d; });
		});

		// managing events related to clicking on params list
		aircraftParamsWidget.on("click", function() {
			var aircraftParamIndex = this.selectedIndex;

			if (aircraftParamIndex == 0)
				return;

			var aircraftParam = this.options[aircraftParamIndex];
			
			var curParams = aircraftFiltersWidget.dimensions();
			var curIndex = curParams.indexOf(aircraftParam.value);
			if (-1 == curIndex) {
				d3.select(aircraftParam).style("color", "green").style("font-family","arial");
				curParams.push(aircraftParam.value);
			}
			else {
				d3.select(aircraftParam).style("color", "red").style("font-family","courier");
				curParams.splice(curIndex, 1);
			}

			aircraftFiltersWidget.dimensions(curParams);
		});

		// create a reset all button
		var resetAircraftParamsButton = d3.select("#resetAircraftParams")
			.append("input")
			.attr("type","button")
			.attr("value", "Reset List" )
			.style("width", width/2 + "px")
			.on("click", function() {
				resetAircraftFilters();
				resetAircraftParams();
			});

		// create a reset filters button
		var resetAircraftFiltersButton = d3.select("#resetAircraftFilters")
			.append("input")
			.attr("type","button")
			.attr("value", "Reset Filters" )
			.style("width", width/2 + "px")
			.on("click", function() {
				resetAircraftFilters();
			});

		// variables initialization
		var aircrafts = "";

		aircraftFiltersWidget.on("brushend", function() {
			makeNewServiceRequest(aircraftFiltersWidget.state.brushed);
		});

		/**
		 * Helper functions for rendering
		 */

		function highlightAircraftsInParCoords(aircraftList) {
			aircraftFiltersWidget.state.highlighted = [];
			//aircraftFiltersWidget.state.brushed = aircraftFiltersWidget.state.data;

			if(aircraftList.trim() != "") {
				var aircraftArr = aircraftList.trim().split(" ");
				var data = aircraftFiltersWidget.state.data;

				for (var i = 0; i < aircraftArr.length; i++) {
					for (var j = 0; j < data.length; j++) {
						var regEx = new RegExp(aircraftArr[i], "gi");
						if (data[j]["aircraft_name"].match(regEx)) {
							aircraftFiltersWidget.state.highlighted.push(data[j]);
							//break; // not breaking as there are a340-200, a340-300 for aircraft type a340
						}
					}
				}
			}
			aircraftFiltersWidget.render();
		}

		function makeNewServiceRequest(state) {
			// get the aircraft names that was selected by the brush
			aircrafts = "";
			for(var i=0; i<state.length; i++) {
				d=state[i];
				aircrafts = aircrafts + " " + d["aircraft_name"];
			}
			$('[ng-controller="formController"]').scope().$apply(function() {
				// set the searchstring variable to the new aircrafts
				$('[ng-controller="formController"]').scope().searchString = aircrafts;
				// invoke fetchData method with updateOnly set to true
				$('[ng-controller="formController"]').scope().fetchData(true);
			});

		}

		/**
		 * Render function .. that is triggered on any changes
		 */
		
        scope.render = function (data, sourceFlag) {
			if(!sourceFlag) {
				aircraftFiltersWidget.brushReset();
			}

			aircrafts = "";

			for(var i=0; i<data.length; i++)
				aircrafts = aircrafts + " " + data[i]['aircraft'];

			highlightAircraftsInParCoords(aircrafts);
		}
		
		/**
		 * Watch function .. that trigger rendering on any changes
		 */

		scope.$watch('data', function (newValue, oldValue) {
			if (newValue['data'] == null) {
				return;
			}
			
			return scope.render(newValue['data'],newValue['source']);
		}, true);
	}
});
