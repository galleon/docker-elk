

app.directive('delayStatistics', function () {

    // isolate scope
    return {
        scope: {'data': '='},
        restrict: 'E',
        link: link
    };

	/**
	 * This link function will be called in the beginning
	 * It renders the delay statistics map
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
			width = (window.innerWidth - 60)*1.0  - margin.left - margin.right,
            height = (window.innerWidth - 60)*0.5 - margin.top - margin.bottom,
            rotate = 60,
            maxlat = 83;

        var projection = d3.geo.mercator()
            .rotate([rotate,0])
            .translate([width/2, height/2])
            .scale(1);

        // find the top left and bottom right of current projection
        function mercatorBounds(projection, maxlat) {
            var yaw = projection.rotate()[0],
                xymax = projection([-yaw+180-1e-6,-maxlat]),
                xymin = projection([-yaw-180+1e-6, maxlat]);
            return [xymin,xymax];
        }

        // set up the scale extent and initial scale for the projection
        var b = mercatorBounds(projection, maxlat),
            s = width/(b[1][0]-b[0][0]),
            scaleExtent = [s, 10*s];

        projection.scale(scaleExtent[0]);

        // zoom and pan
        var zoom = d3.behavior.zoom()
            .scaleExtent(scaleExtent)
            .scale(projection.scale())
            .translate([0,0])
            .on("zoom", redraw);

        var path = d3.geo.path()
            .projection(projection);

        // visualization svg creation
        var svg = d3.select(el)
            .append("svg")
            .attr("id", "delayStatistics")
            .attr("class", "map")
			.attr("width", width)
            .attr("height", height)
            .attr("fill", "lightslategrey")
            .call(zoom);
            //.append("g")
            //.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

		/* START: Map display */
        svg.append("rect")
            .attr("class", "overlay")
            .attr("x", -width / 2)
            .attr("y", -height / 2)
            .attr("width", width)
            .attr("height", height)
            .style("fill","none")
            .attr("pointer-events", "all");

        var g = svg.append("g");

        d3.json("js/data/world-110m2.json", function (error, topology) {
            g.selectAll("path")
                .data(topojson.object(topology, topology.objects.countries).geometries)
                .enter()
                .append("path")
                .attr("class", "geo")
                .attr("d", path)
                .style("fill", "#4d4d4d");

            redraw();
        });

        // Tooltip div: Creating on mouseOver events
        var div = d3.select("body")
            .append("div")  // declare the tooltip div
            .attr("class", "tooltip")
            .style("opacity", 0);

        // Airport Circles
        var circle = d3.geo.circle();
        var circles = g.selectAll("path.circle");
        var airportMouseOver = function (d) {
            d3.select(this)
                .style("fill", "cyan");

            div.transition()
                .duration(500)
                .style("opacity", 0);
            div.transition()
                .duration(200)
                .style("opacity", .9);

            var depDelay="";
            var arrDelay="";
            if(typeof d.value1 != 'undefined')
                depDelay = Math.round(d.value1*60) + " Mins";
            else
                depDelay = "Not Available";

            if(typeof d.value2 != 'undefined')
                arrDelay = Math.round(d.value2*60) + " Mins";
            else
                arrDelay = "Not Available";

            var htmlText= d.city  + "(" + d.code + ")"+ "<br/><br/>" + "Departure Delay: " + depDelay + "<br/>" + "Arrival Delay: " + arrDelay;

            div.html(htmlText)
                .style("left", (d3.event.pageX+20) + "px")
                .style("top", (d3.event.pageY - 38) + "px")
                .style("width", 200 + "px")
                .style("height", 70 + "px");
        }
        var airportMouseOut = function(d) {
            d3.select(this)
                .style("fill", "yellow");
            div.transition()
                .duration(0)
                .style("opacity", 0)
                .style("width", "0px")
                .style("height", "0px");
        };

        // Airport Text
        var textSize=2;
        var textXOffset = 3;
        var textYOffset = 1;
        var texts = g.selectAll("text");
        var textX = function (d) {
            return projection([d.lon, d.lat])[0] + textXOffset;
        };
        var textY = function (d) {
            return projection([d.lon, d.lat])[1] + textYOffset;
        }

        // Route lines
		var airportDelayData1 = [];
        var routes = g.selectAll(".route");
        var routeMouseOver = function (d) {
            d3.select(this)
                .attr("stroke", "cyan");
            div.transition()
                .duration(500)
                .style("opacity", 0);
            div.transition()
                .duration(200)
                .style("opacity", .9);
            div.html( airportDelayData1[d.airport1]['city'] + "-" + airportDelayData1[d.airport2]['city'] + "<br>" +"Flights: " + d.count  ) // TODO: Bring 'airportDelayData' in outer scope
                .style("left", (d3.event.pageX+20) + "px")
                .style("top", (d3.event.pageY - 38) + "px")
                .style("width", 200 + "px")
                .style("height", 50 + "px");;
        };
        var routeMouseOut = function(d) {
            d3.select(this)
                .attr("stroke", "orange");

            div.transition()
                .duration(0)
                .style("opacity", 0)
                .style("width", "0px")
                .style("height", "0px");
            ;
        };

		// Delay Pie arcs
        var r = 4;
        var p = Math.PI * 2;
        var arc1 = d3.svg.arc()
            .innerRadius(r - 2)
            .outerRadius(r-1)
            .startAngle(0);

        var arc2 = d3.svg.arc()
            .innerRadius(r - 3)
            .outerRadius(r-2)
            .startAngle(0);

		var arcs1 = g.selectAll("path.arc1");
		var arcs2 = g.selectAll("path.arc2");
        var delayArcMouseOver = function (d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
            div.transition()
                .duration(200)
                .style("opacity", .9);

            var depDelay="";
            var arrDelay="";
            if(typeof d.value1 != 'undefined')
                depDelay = Math.round(d.value1*60) + " Mins";
            else
                depDelay = "Not Available";

            if(typeof d.value2 != 'undefined')
                arrDelay = Math.round(d.value2*60) + " Mins";
            else
                arrDelay = "Not Available";

            var htmlText= d.city  + "(" + d.code + ")"+ "<br/><br/>" + "Departure Delay: " + depDelay + "<br/>" + "Arrival Delay: " + arrDelay;

            div.html(htmlText)
                .style("left", (d3.event.pageX+20) + "px")
                .style("top", (d3.event.pageY - 38) + "px")
                .style("width", 200 + "px")
                .style("height", 70 + "px");
        }
        var delayArcMouseOut = function(d) {
            div.transition()
                .duration(0)
                .style("opacity", 0)
                .style("width", "0px")
                .style("height", "0px");
        };

		var tlast = [0,0],
            slast = null,
            scaleRatio = 1
			transTime = 0;

		/**
		 * Helper functions for rendering
		 */

        function redraw() {
			if (d3.event) {
                var scale = d3.event.scale,
                    t = d3.event.translate;

                // if scaling changes, ignore translation (otherwise touch zooms are weird)
                if (scale != slast) {
                    projection.scale(scale);
					transTime = 750;
                } else {
                    var dx = t[0]-tlast[0],
                        dy = t[1]-tlast[1],
                        yaw = projection.rotate()[0],
                        tp = projection.translate();

                    // use x translation to rotate based on current scale
                    projection.rotate([yaw+360.*dx/width*scaleExtent[0]/scale, 0, 0]);
                    // use y translation to translate projection, clamped by min/max
                    var b = mercatorBounds(projection, maxlat);
                    if (b[0][1] + dy > 0) dy = -b[0][1];
                    else if (b[1][1] + dy < height) dy = height-b[1][1];
                    projection.translate([tp[0],tp[1]+dy]);
                }
                // save last values.  resetting zoom.translate() and scale() would
                // seem equivalent but doesn't seem to work reliably?
                if(slast==null)
                    scaleRatio=1;
                else
                    scaleRatio = scaleRatio * (scale/slast);

                slast = scale;
                tlast = t;
            }

			g.selectAll('path.geo')
				.transition()
				.duration(transTime)
				.attr('d', path);

			g.selectAll('path.circle')
				.transition()
				.duration(transTime/2)
                .attr("d", function(d) {
                    return path(circle
                        .origin([d.lon, d.lat])
                        .angle(0.2)());
                });

			g.selectAll('path.route')
				.style("visibility", "hidden")
				.attr('d', path)
				.transition()
				.delay(transTime)
				.style("visibility", "visible");

            g.selectAll("path.arc1")
				.style("visibility", "hidden")
                .attr("transform", function(d, i) { d.endAngle= d.endAngleArr;   return "translate(" + projection([d.lon, d.lat])[0] + ", " + projection([d.lon, d.lat])[1] + ")scale(" + scaleRatio + ")" })
                .attr("d", arc1)
				.transition()
				.delay(transTime)
				.style("visibility", "visible");

            g.selectAll("path.arc2")
				.style("visibility", "hidden")
                .attr("transform", function(d, i) { d.endAngle= d.endAngleDep;    return "translate(" + projection([d.lon, d.lat])[0] + ", " + projection([d.lon, d.lat])[1] + ")scale(" + scaleRatio + ")" })
                .attr("d", arc2)
				.transition()
				.delay(transTime)
				.style("visibility", "visible");
			
			transTime = 0;
        }

		/**
		 * Render function .. that is triggered on any changes
		 */
		
        scope.render = function (airportDelayData, airportTrafficDataAsLineString) {
			airportDelayData1 = airportDelayData;
            
			if(airportDelayData == []) {
                return;
			}

            // Updating Route lines
            routes = routes.data(airportTrafficDataAsLineString);
            routes
                .enter()
                .append("path");
            routes.exit().remove();
            routes
                .attr("class", "route")
                .attr("d", path)
                .attr("vector-effect", "non-scaling-stroke")
                .attr("fill", "none")
                .attr("stroke-width", function (d) {
                    return Math.ceil(d.count/10);
                })
                .attr("stroke", "orange")
                .on("mouseover", routeMouseOver)
                .on("mouseout", routeMouseOut);

            // Updating Airport Circles
            /*
            d3.geo.cicle() is a geo-path generator. Gives out series of lat-lon as polygon approximating a circle
            path translates a geo-path (or geo-feature) to canvas based on projection object.
            'd' in the circles is actual series of pixel locations to draw circle
             'd' should not be confused with other d (which is short for __data__ bound with d3 element)
             */
            circles = circles.data(d3.values(airportDelayData));
            circles
                .enter()
                .append("path");
            circles.exit().remove();
            circles
                .attr("class", "circle")
                .attr("d", function(d) {
                    return path(circle
                        .origin([d.lon, d.lat])
                        .angle(0.2)());
                })
                .style("fill", "yellow")
                .on("mouseover", airportMouseOver)
                .on("mouseout", airportMouseOut);


            // Updating Airport Text
            /*texts = texts.data(d3.values(airportDelayData));
            texts
                .enter()
                .append("text");
            texts.exit().remove();
            texts
                .attr("x", textX)
                .attr("y", textY)
                .text(function (d) {
                    return d.code;
                })
                .style("fill", "black")
                .style("font-size", textSize+"px");*/

			// Plotting/Updating Pie-arcs
			for (var key in airportDelayData) {
		
				var d = airportDelayData[key];

                var depDelay = 0;
                if(d.value1<-1)
                    depDelay=-1;
                else if(d.value1>1)
                    depDelay=1;
                else
                    depDelay= d.value1;

                var arrDelay = 0;
                if(d.value2<-1)
                    arrDelay=-1;
                else if(d.value2>1)
                    arrDelay=1;
                else
                    arrDelay= d.value2;
					
				d["endAngleDep"] = p * depDelay;
				d["endAngleArr"] = p * arrDelay;		
				d["endAngle"] = 0;		
			}
			
			for (var key in airportDelayData) {
				airportDelayData[key].endAngle = airportDelayData[key].endAngleArr; 
			}

			arcs1 = arcs1.data(d3.values(airportDelayData));
			arcs1
				.enter()
				.append("path");
			arcs1.exit().remove();
			arcs1	
				.attr("class","arc1")
				.attr("fill", function(d){						
                        if(d.value2<=0)
                            return "darkgreen";
                        else if(d.value2>0)
                            return "maroon";
							
                    })
				.attr("transform", function(d, i) { return "translate(" + projection([d.lon, d.lat])[0] + ", " + projection([d.lon, d.lat])[1] + ")"; })
				.attr("d", arc1);

			for (var key in airportDelayData) {
				airportDelayData[key].endAngle = airportDelayData[key].endAngleDep; 
			}

			arcs2 = arcs2.data(d3.values(airportDelayData));
			arcs2
				.enter()
				.append("path");
			arcs2.exit().remove();
			arcs2	
				.attr("class","arc2")
				.attr("fill", function(d){						
                        if(d.value1<=0)
                            return "darkgreen";
                        else if(d.value1>0)
                            return "maroon";
							
                    })
				.attr("transform", function(d, i) { return "translate(" + projection([d.lon, d.lat])[0] + ", " + projection([d.lon, d.lat])[1] + ")"; })
				.attr("d", arc2);

            redraw();
        }

		/**
		 * Watch function .. that trigger rendering on any changes
		 */

        scope.$watch('data', function (newValue, oldValue) {
			if(newValue['data'] == null) {
				return;
			}
				
			return scope.render(newValue['data'][0], newValue['data'][1]);
        }, true);
    }
});


