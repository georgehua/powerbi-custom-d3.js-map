/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
// import * as topojson from "topojson";
import * as topojson from "topojson-client";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import IVisualHost = powerbi.extensibility.IVisualHost;
import * as d3 from "d3";
import d3Tip from "d3-tip";

// var topology = topojson.topology({ foo: geojson });
export function logExceptions(): MethodDecorator {
    return function (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any> {
        return {
            value: function () {
                try {
                    return descriptor.value.apply(this, arguments);
                } catch (e) {
                    console.error(e);
                    throw e;
                }
            }
        }
    }
}

export class Visual implements IVisual {

    constructor(options: VisualConstructorOptions) {
    }

    @logExceptions()
    public update(options: VisualUpdateOptions) {

        var width = 960,
            height = 500,
            active = d3.select(null);



        var projection = d3.geo.orthographic().clipAngle(90).rotate([98, -60]).scale(600).translate([500, 200])
            .scale(700)
            .translate([width / 2, height / 2]);

        var cscale = d3.scale.linear()
            .domain([0, 52])
            .range(["rgb(197, 238, 226)", "rgb(133, 212, 216)",
                "rgb(72, 143, 190)"]);

        var zoom = d3.behavior.zoom()
            .translate([0, 0])
            .scale(1)
            .scaleExtent([1, 100])
            .on("zoom", zoomed);

        var path = d3.geo.path()
            .projection(projection);

        var svg = d3.select("body")
            .append("div")
            .attr("id", "container")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("id", "my_dataviz")
            .on("click", stopped, true);

        svg.append("rect")
            .attr("class", "background")
            .attr("width", width)
            .attr("height", height)
            .on("click", reset);

        var g = svg.append("g");

        svg
            .call(zoom) // delete this line to disable free zooming
            .call(zoom.event);


        const marks = [
            { long: -79.347015, lat: 43.651070, name: "Toronto" }, // corsica
            { long: -114.066666, lat: 51.049999, name: "Otterburn Park, QC" }, // nice

        ];


        // var tip = d3Tip
        //     .attr('class', 'd3-tip')
        //     .offset([-5, 0])
        //     .html(function (d) {
        //         return d.name
        //     })
        // svg.call(tip);

        d3.json("https://raw.githubusercontent.com/georgehua/powerbi-custom-d3.js-map/main/customMap/ca-topo.json", function (error, can) {
            if (error) throw error;

            g.selectAll("path")
                .data(topojson.feature(can, can.objects['provinces']).features)
                .enter().append("path")
                .attr("d", path)
                .attr("class", "feature")
                .style("fill", function (d, i) { return cscale(i); })
                .on("click", clicked);

            g.append("path")
                .datum(topojson.mesh(can, can.objects['provinces'], function (a, b) { return a !== b; }))
                .attr("class", "mesh")
                .attr("d", path);



            g.selectAll(".mark")//adding mark in the group
                .data(marks)
                .enter()
                .append("path")
                .attr('class', 'mark')
                .attr("viewBox", "0 0 5 5")
                .attr('width', 5)
                .attr('height', 5)
                .attr("d", "M12 0c-4.198 0-8 3.403-8 7.602 0 4.198 3.469 9.21 8 16.398 4.531-7.188 8-12.2 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z")
                .attr("fill", "#000")
                .attr("transform", function (d) {
                    return "translate(" + projection([d.long, d.lat]) + ")";
                })
                // .on("mouseover", tip.show)
                // .on("mouseleave", tip.hide)



        });




        function clicked(d) {
            if (active.node() === this) return reset();
            active.classed("active", false);
            active = d3.select(this).classed("active", true);

            var bounds = path.bounds(d),
                dx = bounds[1][0] - bounds[0][0],
                dy = bounds[1][1] - bounds[0][1],
                x = (bounds[0][0] + bounds[1][0]) / 2,
                y = (bounds[0][1] + bounds[1][1]) / 2,
                scale = .9 / Math.max(dx / width, dy / height),
                translate = [width / 2 - scale * x, height / 2 - scale * y];

            svg.transition()
                .duration(750)
                .call(zoom.translate(translate).scale(scale).event);
        }

        function reset() {
            active.classed("active", false);
            active = d3.select(null);

            svg.transition()
                .duration(750)
                .call(zoom.translate([0, 0]).scale(1).event);
        }

        function zoomed() {
            g.style("stroke-width", 1.5 / d3.event.scale + "px");
            g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        }

        // If the drag behavior prevents the default click,
        // also stop propagation so we don’t click-to-zoom.
        function stopped() {
            if (d3.event.defaultPrevented) d3.event.stopPropagation();
        }

    }


}


