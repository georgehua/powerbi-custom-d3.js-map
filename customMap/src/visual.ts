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
import * as d3Tip from 'd3-tip';
import * as Datamap from "datamaps";


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

        let dataView: DataView = options.dataViews[0];

        var i_lat = 0
        var i_long = 1
        var i_org = 2
        var i_site = 3
        var i_total_count = 4
        var i_reg_prev = 5

        d3.select("body")
            .append("div")
            .attr("id", "container")


        var map = new Datamap({
            element: document.getElementById('container'),
            scope: 'canada',
            geographyConfig: {
                popupOnHover: false,
                highlightOnHover: false,
                borderColor: 'grey',
                borderWidth: 0.8,
                dataUrl: 'https://rawgit.com/Anujarya300/bubble_maps/master/data/geography-data/canada.topo.json'
                //dataJson: topoJsonData
            },
            fills: {
                'MAJOR': '#000',
                'MEDIUM': '#0fa0fa',
                'MINOR': '#bada55',
                defaultFill: '#dddddd'
            },
            data: {
                'SK': { fillKey: 'MINOR' }
            },
            setProjection: function (element) {
                var projection = d3.geo.mercator()
                    .center([-106.3468, 56.1304]) // always in [East Latitude, North Longitude]
                    .scale(700)
                    .translate([element.offsetWidth / 2, element.offsetHeight / 2]);

                var path = d3.geo.path().projection(projection);
                return { path: path, projection: projection };
            }
        });

        // map.labels({labelColor: 'blue', fontSize: 12});
        map.labels({'customLabelText': {'Ontario': "Ontario"}});
        /*******
   
   Marker Custom Plugin Code
   
   ********/

        function handleMarkers(layer, data, options) {
            var self = this,
                fillData = this.options.fills,
                svg = this.svg;

            if (!data || (data && !data.slice)) {
                throw "Datamaps Error - markers must be an array";
            }

            var markers = layer.selectAll('image.datamaps-marker').data(data, JSON.stringify);

            markers
                .enter()
                .append('image')
                .attr('class', 'datamaps-marker')
                .attr('xlink:href', function (datum) {
                    return datum.iconUrl || options.defaultIcon;
                })
                .attr('height', 40)
                .attr('width', 40)
                .attr('x', function (datum) {
                    var latLng;
                    if (datumHasCoords(datum)) {
                        latLng = self.latLngToXY(datum.latitude, datum.longitude);
                    }
                    else if (datum.centered) {
                        latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
                    }
                    datum.realx = latLng[0];
                    if (latLng) return latLng[0] - 10;
                })
                .attr('y', function (datum) {
                    var latLng;
                    if (datumHasCoords(datum)) {
                        latLng = self.latLngToXY(datum.latitude, datum.longitude);
                    }
                    else if (datum.centered) {
                        latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
                    }
                    datum.realy = latLng[1];
                    if (latLng) return latLng[1] - 20;
                })


            markers.exit()
                .transition()
                .attr("height", 0)
                .remove();

            function datumHasCoords(datum) {
                return typeof datum !== 'undefined' && typeof datum.latitude !== 'undefined' && typeof datum.longitude !== 'undefined';
            }

        }

        /*******
        End Marker Custom Plugin Code
        ********/


        /********
        Add & Register Plugin
        *********/

        map.addPlugin('markers', handleMarkers)


        /*******
        Zoom behavior
        ********/
        // Keep a reference to the d3 zoom behavior
        var zoom = d3.behavior.zoom();
        var currentZoom = null;

        // Reset d3.event.translate and d3.event.scale
        function resetZoom() {
            zoom.scale(1);
            zoom.translate([0, 0]);
        }
        var zoomInOpts = {
            scaleFactor: 2,
            center: {
                lat: 45,
                lng: -90
            },
            transition: {
                duration: 1000
            },
            onZoomComplete: function (zoomData) {
                currentZoom = zoomData;
                resetZoom();
            }
        };
        var zoomOutOpts = {
            scaleFactor: 0.5,
            center: {
                lat: 40,
                lng: -90
            },
            transition: {
                duration: 1000
            },
            onZoomComplete: function (zoomData) {
                currentZoom = zoomData;
                resetZoom();
            }
        };

        function transformStr(x, y, scale) {
            //var translateX = d3.event.translate[0];
            //var translateY = d3.event.translate[1];
            //var scale = d3.event.scale;
            return "translate(" + [x, y] + ")scale(" + scale + ")";
        }

        function redraw() {
            var translateX = (<any>d3.event).translate[0];
            var translateY = (<any>d3.event).translate[1];
            var scale = (<any>d3.event).scale;
            console.log("Scale: " + (<any>d3.event).scale);

            if (currentZoom) {
                console.log("CurrentZoom.scale: " + currentZoom.scale);
                scale *= currentZoom.scale;
                translateX += currentZoom.translate.x
                translateY += currentZoom.translate.y;
            }

            map.svg.selectAll("g")
                .attr("transform", transformStr(translateX, translateY, scale))
                ;

            map.svg.selectAll("image")
                .attr("height", 20 * (1 / scale))
                .attr("width", 20 * (1 / scale))
                .attr("x", function (d) {
                    return d.realx - (20 * (1 / scale) / 2);
                })
                .attr("y", function (d) {
                    return d.realy - (20 * (1 / scale));
                });
        }

        // on mousewhel
        map.svg.call(zoom.on("zoom", redraw));




        /*******
        Call Plugin and setup some button handlers
        ********/

        function setMarkers() {
            map.markers([
                { name: 'Austin, TX', iconUrl: 'http://simpleicon.com/wp-content/uploads/map-marker-1.svg', latitude: 43.651070, longitude: -79.347015, fillKey: 'gt50' },
                { name: 'Iceland', iconUrl: 'http://simpleicon.com/wp-content/uploads/map-marker-1.svg', latitude: 51.049999, longitude: -114.066666, fillKey: 'lt50' },
                { name: 'Brazil', centered: 'BRA', fillKey: 'gt50' },
                { name: 'Hot again', latitude: 10, longitude: 0, fillKey: 'gt50' }
            ],
                { defaultIcon: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-128.png' },
                {
                    popupTemplate: function (geo, data) {
                        console.log("hovered")
                        return "<div class='hoverinfo'>Popup for " + data.name + "</div>";
                    }
                }
            );
        }

        setMarkers();
    }


}


