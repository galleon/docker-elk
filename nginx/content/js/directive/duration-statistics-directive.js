
app.directive('durationStatistics', function () {

    // isolate scope
    return {
        scope: {'data': '='},
        restrict: 'E',
        link: link
    };

	/**
	 * This link function will be called in the beginning
	 * It renders the duration statistics bar chart
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
		var div = d3.select("body")
			.append("div")  // declare the tooltip div
			.attr("class", "tooltip")
			.style("opacity", 0)
			.style("width", "80px")
			.style("height", "20px")
			.style("color", "cyan")
			.style("background", "black");

        var margin = {top: 20, right: 20, bottom: 20, left: 20},
            width = (window.innerWidth - 60)*0.66 - margin.left - margin.right,
            height = (window.innerHeight - 60)*0.40 - margin.top - margin.bottom;

		var xAxisMargin = 20;
		var yAxisMargin = 1;

        var x = d3.scale.linear()
			.domain([0, 18])
			.range([0, width]);

		var y = d3.scale.linear()
            .range([height-margin.bottom, 0])
			.domain([0, 1]);

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("botom")
			.tickValues([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]);

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("right")
			.ticks(0);


		// not clear the below 2 lines
		var path1 = "M0.5,33.333333333333336A6,6 0 0 1 6.5,39.333333333333336V60.66666666666667A6,6 0 0 1 0.5,66.66666666666667ZM2.5,41.333333333333336V58.66666666666667M4.5,41.333333333333336V58.66666666666667";
		var path2 = "M-0.5,33.333333333333336A6,6 0 0 0 -6.5,39.333333333333336V60.66666666666667A6,6 0 0 0 -0.5,66.66666666666667ZM-2.5,41.333333333333336V58.66666666666667M-4.5,41.333333333333336V58.66666666666667";

		var handlePath = [path1, path2];

		var dataDomain = [[0,0.5],[0,1]];
        var brush = d3.svg.brush()
            .x(x)
			.extent([0.495,0.505])
            .on("brush", brushed)
            .on("brushend", makeNewServiceRequest);
		
        var svg = d3.select(el).append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g");
			
		var brushg = svg.append("g")
			.attr("class", "x brush")
			.call(brush);
			
		brushg.selectAll("rect")
			.attr("y", 0)
			.attr("height", height);
			
		brushg.selectAll(".resize")
			.append("path")
			.attr("d", function(d,i) {
				return handlePath[i];
			})
			.style("fill", "gray");

		var xaxisg = svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + (height - xAxisMargin) + ")")
			.call(xAxis);
		
		var yaxisg = svg.append("g")
			.attr("class", "y axis")
			.attr("transform", "translate(" + yAxisMargin + ",0 )")
			.call(yAxis);
			
		var initData = [];
		for (var i=0; i<17; i++){
			mapI = [];
			mapI['key'] = i+1;
			mapI['value'] = [ 0, [] ];
			initData.push(mapI);
		}

		var barsg = svg.append("g")
            .attr("width", width - yAxisMargin)
            .attr("height", height - xAxisMargin - 2)
			.attr("transform", "translate(0," + (-1 - xAxisMargin) + ")");

		var rectsg = barsg.selectAll("bars")
			.data(initData, function(d) { return d.key; });

		var barWidth = width/18/2;
		rectsg.enter()
			.append("rect")
			.attr("width", barWidth)
			.attr("x", function(d) { return (x(d.key) - barWidth/2); })
			.attr("y", function(d) { return (y(0) + xAxisMargin + 1); })
			.attr("height", function(d) { return (height - y(0) - xAxisMargin - 1); })
			.attr("fill", "maroon");
			
		barsg.selectAll("rect")
			.on("mouseover", function (d) {
				div.transition()
					.duration(0)
					.style("opacity", 1.0);
				div.html(d.key + "(" + (d.value[0]) +")")
					.style("left", (d3.event.pageX) + "px")
					.style("top", (d3.event.pageY - 38) + "px")
					.style("width", "80px")
					.style("height", "20px");
			})
			.on("mouseout", function (d) {
				div.transition()
					.duration(0)
					.style("opacity", 0)
					.style("width", "0px")
					.style("height", "0px");
			});

		/**
		 * Helper functions for rendering
		 */

		// domain - Range of values  - useful lengthening or shortening of the height of the bar based in the identified flights
		function getDomain(data) {
			return [ [ d3.min(data, function(d) { return d.key; }) , d3.max(data, function(d) { return d.key; }) ] , [ d3.min(data, function(d) { return d.value[0]; }) , d3.max(data, function(d) { return d.value[0]; }) ] ];
		}

		function brushExtents() {
            var extent0 = brush.extent();
            var extent1 = extent0;

			extent1[0] = Math.ceil(extent0[0])-0.5;
			extent1[1] = Math.floor(extent0[1])+0.5;

			extent1[0] = Math.min(extent1[0],dataDomain[0][1]-0.5);
			extent1[0] = Math.max(extent1[0],dataDomain[0][0]-0.5);
			extent1[1] = Math.max(extent1[1],dataDomain[0][0]+0.5);
			extent1[1] = Math.min(extent1[1],dataDomain[0][1]+0.5);

			if((Math.floor(extent0[1]) - Math.ceil(extent0[0])) < 1.0) {
				extent1[0] = Math.floor(extent0[0])+0.5
                extent1[1] = extent1[0] + 1.0;
			}

			return extent1
		}

		function brushed() {
            var extent = brushExtents();

            var x1 = extent[0]+0.5;
            var x2 = extent[1]-0.5;
            barsg.selectAll("rect")
                .attr("fill", function(d) {
                    var val = d.key;
                    if(val >= x1 && val<=x2 )
                        return "maroon";
                    else
                        return "steelBlue";
                });
        }

        function makeNewServiceRequest() {
            var extent = brushExtents();

            d3.select(this)
				.transition()
				.duration(1000)
				.call(brush.extent(extent));

            var x1 = brush.extent()[0]+0.5;
            var x2 = brush.extent()[1]-0.5;
			// make call to app controller - it will check if update is required or not
			$('[ng-controller="formController"]').scope().$apply(function() {
				$('[ng-controller="formController"]').scope().durationString = x1 + " - " + x2;
				$('[ng-controller="formController"]').scope().fetchData();
			});
        }

		/**
		 * Render function .. that is triggered on any changes
		 */
		
        scope.render = function (data) {
			rectsg.transition()
				.duration(750)
				.attr("y", function(d) { return (y(0) + xAxisMargin + 1); })
				.attr("height", function(d) { return (height - y(0) - xAxisMargin - 1); });			

			var ticks = 0;
			dataDomain = [[0,1],[0,1]];
			brush.extent([0.495,0.505]);

			if(data.length != 0) {
				ticks = 5;
				dataDomain = getDomain(data);
				brush.extent([dataDomain[0][0]-0.5,dataDomain[0][1]+0.5]);
			}

			//x.domain(dataDomain[0]);
			y.domain([0, dataDomain[1][1]]);
			yAxis.scale(y).ticks(ticks);
			yaxisg.call(yAxis);

			brushg.transition()
				.duration(1500)
				.call(brush);
				
			if (data.length != 0) {
				var tempg = rectsg.data(data, function(d) { return d.key; });
				tempg.transition()
					.delay(700)
					.duration(750)
					.attr("y", function(d) { return (y(d.value[0]) + xAxisMargin + 1); })
					.attr("height", function(d) { return (height - y(d.value[0]) - xAxisMargin - 1); });

				brushed();
			}
        }
		
		/**
		 * Watch function .. that trigger rendering on any changes
		 */

        scope.$watch('data', function (newValue, oldValue) {
			if (newValue['data'] == null) {
				return;
			}
			
			return scope.render(newValue['data']);
        }, true);
	}
});
