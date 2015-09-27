
app.directive('aircraftStatistics', function () {

    // isolate scope
    return {
        scope: {'data': '='},
        restrict: 'E',
        link: link
    };

	/**
	 * This link function will be called in the beginning
	 * It renders the aircraft statistics pie chart
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
            width = (window.innerWidth - 60)*0.33 - margin.left - margin.right,
            height = (window.innerHeight - 60)*0.40 - margin.top - margin.bottom;

        // visualization svg creation
        var svg = d3.select(el)
            .append('svg')
            .attr("id", "aircraftStatistics")
            .attr("class", "aircraftStats")
            .attr("width", width)
            .attr("height", height)
            .append('g') //  	group all the objects under him
            .attr('transform', 'translate(' + width*0.5 + ',' + height*0.5 + ')');

		var color = d3.scale.category20(); //

        var min = Math.min(width, height);

        var radius = min / 2 * 0.75;

        var pie = d3.layout.pie().value(function (d) {
            return parseInt(d.count);
        })

        var arc = d3.svg.arc()
            .outerRadius(min / 2 * 0.75)
            .innerRadius(min / 2 * 0.4);
		
		var div = d3.select("body")
			.append("div")  // declare the tooltip div
			.attr("class", "tooltip")
			.style("opacity", 0)
			.style("color", "cyan")
			.style("background", "black");

		var path = svg.selectAll('path');
			
		var arcMouseOver = function (d) {
			d3.select(this)
				.style("fill", "cyan");
			/*div.transition()
				.duration(500)
				.style("opacity", 0);*/
			div.transition()
				.duration(200)
				.style("opacity", .9);
			div.html(d.data.aircraft + " (" + d.data.count + ")")
				.style("left", (d3.event.pageX) + "px")
				.style("top", (d3.event.pageY - 38) + "px")
				.style("width", 120 + "px")
				.style("height", 20 + "px");
		}
			
		var arcMouseOut = function (d,i) {
			d3.select(this)
				.style("fill", function (d) {
					return color(i);
				})
				.style("width", "0px")
				.style("height", "0px");

			div.transition()
				.duration(0)
				.style("opacity", 0)
				.style("width", "0px")
				.style("height", "0px");
		}
			
		var ticks = svg.selectAll("line");

		var tickRot = function (d) {
			return "rotate(" + (d.startAngle + d.endAngle) / 2 * (180 / Math.PI) + ")";
		};

		// That small label to print the total aircrafts found
		var totalLabel = svg
			.append("text")
			.attr("class","total")
			.attr("transform", function (d) {
				return "translate(" + -25 + "," + 0 + ")";
			})
			.style("font-size", "10px")
			totalLabel.text("Total=0");;

		var labels = svg.selectAll("text.label");

		var labelTransform = function (d) {
			var dist = radius + 25;
			var angle = (d.startAngle + d.endAngle) / 2; // Middle of wedge
			var x = (dist) * Math.sin(angle);
			var y = -(dist)*0.95 * Math.cos(angle);
			return "translate(" + x + "," + y + ")";
		};

		var labelText = function (d) {
			total = total + parseInt(d.data.count);
			if(Math.abs(d.startAngle - d.endAngle)>0.25)
				return d.data.aircraft + " (" + d.data.count + ")";
		};

		var total = 0;		
		var data0 = path.data();

		// initialize pie with 20 "empty" data points for nice transitions later
		var initData = [];
		for (var i=0; i<20; i++){
			mapI = [];
			mapI['aircraft'] = "";
			mapI['count'] = 1;
			initData.push(mapI);
		}
		path = path.data(pie(initData));

		path.enter()
			.append("path")
			.each(function(d, i) { this._current = findNeighborArc(i, data0, initData, key) || d; })
			.attr("fill", function(d,i) { return color(i); });
		
		/**
		 * Helper functions for rendering
		 */

		function key(d) {
		  return d.count;
		}
		
		function findNeighborArc(i, data0, data1, key) {
		  var d;
		  return (d = findPreceding(i, data0, data1, key)) ? {startAngle: d.endAngle, endAngle: d.endAngle}
			  : (d = findFollowing(i, data0, data1, key)) ? {startAngle: d.startAngle, endAngle: d.startAngle}
			  : null;
		}

		// Find the element in data0 that joins the highest preceding element in data1.
		function findPreceding(i, data0, data1, key) {
		  var m = data0.length;
		  while (--i >= 0) {
			var k = key(data1[i]);
			for (var j = 0; j < m; ++j) {
			  if (key(data0[j]) === k) return data0[j];
			}
		  }
		}

		// Find the element in data0 that joins the lowest following element in data1.
		function findFollowing(i, data0, data1, key) {
		  var n = data1.length, m = data0.length;
		  while (++i < n) {
			var k = key(data1[i]);
			for (var j = 0; j < m; ++j) {
			  if (key(data0[j]) === k) return data0[j];
			}
		  }
		}

		function arcTween(d) {
		  var i = d3.interpolate(this._current, d);
		  this._current = i(0);
		  return function(t) { return arc(i(t)); };
		}

		/**
		 * Render function .. that is triggered on any changes
		 */
		
        scope.render = function (data) {
			data0 = path.data();
			total = 0;
			// updating the arcs: Regeneration of paths is must.
			path = path.data(pie(data));
			path.enter()
				.append("path")
				.each(function(d, i) { this._current = findNeighborArc(i, data0, data, key) || d; })
				.attr("fill", function(d,i) { return color(i); });
			path.exit()
				.datum(function(d, i) { return findNeighborArc(i, data, data0, key) || d; })
				.transition()
				.duration(250)
				.attrTween("d", arcTween)
				.remove();
			path.transition()
				.duration(750)
				.attrTween("d", arcTween);
			path.style('stroke', 'white')
				.on("mouseover", arcMouseOver)
				.on("mouseout", arcMouseOut);		

			// Updating ticks: Tried setting x1,x2,y1,y2 etc outside render, but did not work.
			ticks = ticks.data(pie(data));
			ticks.enter()
                .append("line");
			ticks.exit()
				.remove();
			ticks.transition()
				.duration(750)
				.attr("x1", 0)
                .attr("x2", 0)
                .attr("y1", -radius)
                .attr("y2", function(d) { if(Math.abs(d.startAngle - d.endAngle)>0.25) { return (-radius - 8); } else { return (-radius); } })
                .attr("stroke", "gray")
                .attr("transform", tickRot);				
				
			// Updating Aircraft labels: Applying transform/text attr outside did not work 				
            labels = labels.data(pie(data));
			labels.enter()
                .append("text");
			labels.exit()
				.remove();
			labels.transition()
				.duration(750)
				.attr("class", "label")
                .attr("transform", labelTransform )
                .attr("dy", "0.35em")
                .attr("text-anchor", "middle")
                .text(labelText);
			
			// Updating totalLabel	
			totalLabel.text("Total="+total);
        }

		/**
		 * Watch function .. that trigger rendering on any changes
		 */

		scope.$watch('data', function (newValue, oldValue) {
			if(newValue['data']==null) {
				return;
			}

            return scope.render(newValue['data']);
        }, true);
    }
});
