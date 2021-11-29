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
import * as topojson from "topojson";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import IVisualHost = powerbi.extensibility.IVisualHost;
import * as d3 from "d3";
import * as caTopo from "ca-topo.json" 

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
    // private host: IVisualHost;
    private svg;
    private g;
    private container;
    private projection;
    private cscale;
    private zoom;
    private path;
    private width = 960;
    private height = 500;
    private active;

    private circle;
    private textValue;
    private textLabel;

    constructor(options: VisualConstructorOptions) {

        this.active = d3.select(null);

        this.projection = d3.geo.orthographic()
        .clipAngle(90).rotate([98, -60])
        .scale(600)
        .translate([500, 200])
        .scale(700)
        .translate([this.width / 2, this.height / 2]);

        this.cscale = d3.scale.linear()
            .domain([0, 52])
			.range(["rgb(197, 238, 226)", "rgb(133, 212, 216)", "rgb(72, 143, 190)"]);

        
        this.path = d3.geo.path()
        .projection(this.projection);

        this.svg = d3.select(options.element)
			.append("div")
			.attr("id", "container")
			.append("svg")
			.attr("width", this.width)
			.attr("height", this.height)

        // this.svg = d3.select(options.element)
        //     .append('svg')
        //     .classed('circleCard', true);
        // this.container = this.svg.append("g")
        //     .classed('container', true);
        // this.circle = this.container.append("circle")
        //     .classed('circle', true);
        // this.textValue = this.container.append("text")
        //     .classed("textValue", true);
        // this.textLabel = this.container.append("text")
        //     .classed("textLabel", true);


    }
    
    @logExceptions()
    public update(options: VisualUpdateOptions) {


        let dataView: DataView = options.dataViews[0];

        this.svg.append("rect")
        .attr("class", "background")
        .attr("width", this.width)
        .attr("height", this.height)
        .attr("fill", "red")
        .on("click", this.reset);

        d3.json("caTopo.json", function (error, can) {
            if (error) throw error;

            try {
                this.g.data()
            //     this.g.selectAll("path")
            //     .data(topojson.feature(can, can.objects['provinces']).features)
            //     .enter().append("path")
            //     .attr("d", this.path)
            //     .attr("class", "feature")
            //     .style("fill", function (d, i) { return this.cscale(i); })
            //     // .on("click", this.clicked);

            // this.g.append("path")
            //     .datum(topojson.mesh(can, can.objects['provinces'], function (a, b) { return a !== b; }))
            //     .attr("class", "mesh")
            //     .attr("d", this.path);
            }
            catch (e) {
                console.log(e)
                throw e
            }
            
        });
        


    }

    public clicked(d) {
        if (this.active.node() === this) return this.reset();
        this.active.classed("active", false);
        this.active = d3.select(this).classed("active", true);

        var bounds = this.path.bounds(d),
            dx = bounds[1][0] - bounds[0][0],
            dy = bounds[1][1] - bounds[0][1],
            x = (bounds[0][0] + bounds[1][0]) / 2,
            y = (bounds[0][1] + bounds[1][1]) / 2,
            scale = .9 / Math.max(dx / this.width, dy / this.height),
            translate = [this.width / 2 - scale * x, this.height / 2 - scale * y];

            this.svg.transition()
            .duration(750)
            .call(this.zoom.translate(translate).scale(scale).event);
    }

    public reset() {
        this.active.classed("active", false);
        this.active = d3.select(null);

        this.svg.transition()
            .duration(750)
            .call(this.zoom.translate([0, 0]).scale(1).event);
    }

    public zoomed() {
        this.g.style("stroke-width", 1.5 / d3.event.scale + "px");
        this.g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    // If the drag behavior prevents the default click,
	// also stop propagation so we don’t click-to-zoom.
	public stopped() {
        if (d3.event.defaultPrevented) d3.event.stopPropagation();
    }
}


