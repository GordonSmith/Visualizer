// import { deck, mapboxgl } from "@hpcc-js/deck-shim";
// import * as test from "@hpcc-js/deck-shim";
import { HTMLWidget, Palette } from "@hpcc-js/common";
import { extent as d3Extent } from "d3-array";
import { rgb } from "d3-color";
import { scaleLinear, scaleLog } from "d3-scale";
import { Deck, mapboxgl, PolygonLayer, Viewport } from "../mapbox/dist/app";
import { H3Response, H3Service, tidyLat, tidyLon, tidyRes } from "./HexTest";

declare const window: any;

const degBufferScale = scaleLog().base(1.5).domain([1, 100]).range([15, 0.0001]);
const resScale = scaleLinear().domain([1, 18]).range([0, 16]);

const INITIAL_VIEW_STATE = {
    latitude: 51.47,
    longitude: 0.45,
    zoom: 4,
    bearing: 0,
    pitch: 30
};

mapboxgl.accessToken = "pk.eyJ1IjoibGVzY2htb28iLCJhIjoiY2psY2FqY3l3MDhqNDN3cDl1MzFmZnkwcCJ9.HRoFwmz1j80gyz18ruggqw";

export class DeckTest extends HTMLWidget {

    protected service: H3Service;

    constructor(fullUrl: string) {
        super();
        this.service = new H3Service(fullUrl);
    }

    _mapgl: any;
    _deckgl: any;
    _div: any;
    _hexLayer: any;
    _viewPort: any;

    enter(domNode, element) {
        super.enter(domNode, element);

        this._div = element.append("div")
            .attr("id", "container")
            .style("width", this.width() + "px")
            .style("height", this.height() + "px")
            ;
        this._div.append("div").attr("id", "map");
        this._div.append("canvas").attr("id", "deck-canvas");

        // this._viewPort = new Viewport({});
        this._mapgl = new mapboxgl.Map({
            container: "map",
            style: "mapbox://styles/mapbox/light-v9",
            // Note: deck.gl will be in charge of interaction and event handling
            interactive: false,
            center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
            zoom: INITIAL_VIEW_STATE.zoom,
            bearing: INITIAL_VIEW_STATE.bearing,
            pitch: INITIAL_VIEW_STATE.pitch
        });

        this._deckgl = new Deck({
            id: "deck-main",
            canvas: "deck-canvas",
            width: "100%",
            height: "100%",
            controller: true,
            initialViewState: INITIAL_VIEW_STATE, /*
            map: mapboxgl,
            mapboxAccessToken: "",
            mapboxApiAccessToken: window.__hpcc_mapbox_apikey || "pk.eyJ1IjoibGVzY2htb28iLCJhIjoiY2psY2FqY3l3MDhqNDN3cDl1MzFmZnkwcCJ9.HRoFwmz1j80gyz18ruggqw",
            mapStyle: "mapbox://styles/mapbox/dark-v9",
            longitude: -98.35,
            latitude: 39.5,
            zoom: 4,
            pitch: 0,*/
            onViewStateChange: ({ viewState }) => {
                this._mapgl.jumpTo({
                    center: [viewState.longitude, viewState.latitude],
                    zoom: viewState.zoom,
                    bearing: viewState.bearing,
                    pitch: viewState.pitch
                });
                return this.viewStateChange(viewState);
            },
            onDragEnd: (info, event) => {
                this.dragEnd(info, event);
            },
            layers: [
            ]
        });

        this.viewStateChange(this._deckgl.viewState);
        this.dragEnd();
    }

    _palette = Palette.rainbow("Reds");
    renderLayer(polys: H3Response, res) {
        const extent = d3Extent(polys, row => row.rowcount);

        const polyLayer = new PolygonLayer({
            id: "polygon-layer",
            data: polys.filter(row => row.rowcount > 0),
            pickable: false,
            stroked: true,
            filled: true,
            wireframe: true,
            lineWidthMinPixels: 1,
            extruded: true,
            getPolygon: d => {
                const points = d.boundary.Row.map(p => [p.lat, p.lon]);
                points.push(points[0]);
                return points.map(p => [p[1], p[0]]);
            },
            getElevation: d => d.rowcount * 100,
            getFillColor: d => {
                const color = this._palette(d.rowcount, extent[0], extent[1]);
                const c = rgb(color);
                return [c.r, c.g, c.b, 255]; // row.rowcount;
            },
            getLineColor: [80, 80, 80],
            getLineWidth: 1,
            onHover: ({ object, x, y }) => {
                // const tooltip = `Population: ${object.rowcount}`;
                /* Update tooltip
                   http://deck.gl/#/documentation/developer-guide/adding-interactivity?section=example-display-a-tooltip-for-hovered-object
                */
            }
        });

        /*
        const hexLayer = new deck.HexagonCellLayer({
            id: "hexagon-layer",
            data: polys.filter(row => row.rowcount > 0),
            getColor: (row: CrowdingserviceResponseRow) => {
                const color = this._palette(row.rowcount, extent[0], extent[1]);
                const c = rgb(color);
                return [c.r, c.g, c.b, 255]; // row.rowcount;
            },
            getElevation: (row: CrowdingserviceResponseRow) => {
                return row.rowcount * 100;
            },
            getCentroid: (row: CrowdingserviceResponseRow) => {
                const latLon = h3ToGeo(row.h3index);
                return [latLon[1], latLon[0]];
            },
            extruded: true,
            radius: edgeLength(res, "m")
        });
        */

        this._deckgl.setProps({ layers: [polyLayer] });
    }

    _viewState;
    viewStateChange(viewState) {
        this._viewState = viewState;
        return this._viewState;
    }

    dragEnd(info?, event?) {
        if (!this._viewState) return;
        const resolution = resScale(this._viewState.zoom); // tidyRes(Math.floor(this._viewState.zoom / 1.33) - 1);
        console.log(resolution);

        /*
        const bounds = this._deckgl._map.map.getBounds();
        const tl = this._deckgl._viewPort.unproject(0, 0);
        const tr = this._deckgl._viewPort.unproject(0, this.width());
        const bl = this._deckgl._viewPort.unproject(this.height(), 0);
        const br = this._deckgl._viewPort.unproject(this.height(), this.width());
        const buffer = 0;
        const west = tidyLon(bounds._sw.lng);
        const north = tidyLat(bounds._ne.lat);
        const east = tidyLon(bounds._ne.lng);
        const south = tidyLat(bounds._sw.lat);

        const degBuff = degBufferScale(this._viewState.zoom);
        console.log("degBuff:  " + degBuff);
        const west = tidyLon(this._viewState.longitude - degBuff);
        const north = tidyLat(this._viewState.latitude - degBuff);
        const east = tidyLon(this._viewState.longitude + degBuff);
        const south = tidyLat(this._viewState.latitude + degBuff);
        */

        const canvas = this._mapgl.getCanvas();
        const w = canvas.width;
        const h = canvas.height;
        const cUL = this._mapgl.unproject([0, 0]).toArray();
        const cUR = this._mapgl.unproject([w, 0]).toArray();
        const cLR = this._mapgl.unproject([w, h]).toArray();
        const cLL = this._mapgl.unproject([0, h]).toArray();


        const poly: Array<[number, number]> = [
            [tidyLat(cUL[1]), tidyLon(cUL[0])],
            [tidyLat(cUR[1]), tidyLon(cUR[0])],
            [tidyLat(cLR[1]), tidyLon(cLR[0])],
            [tidyLat(cLL[1]), tidyLon(cLL[0])]
        ];

        /*
        this.renderLayer(polyfill(poly, resolution).map(r => {
            return {
                h3index: r, rowcount: 1
            };
        }), resolution);
        */
        const context = this;
        fetchData(poly, resolution);

        function fetchData(_poly, _resolution) {
            context.service.submit(poly, resolution).then(resp => {
                if (poly === _poly && resolution === _resolution) {
                    context.renderLayer(resp, resolution);
                }
            });
        }
    }

    update(domNode, element) {
        super.update(domNode, element);
        this._div
            .style("width", this.width() + "px")
            .style("height", this.height() + "px")
            ;

        // this.service.submit(poly, resolution).then(resp => this.updateH3Indecies(resp));
    }
}
