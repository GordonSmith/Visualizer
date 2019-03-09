import { Query } from "@hpcc-js/comms";
import { leaflet, Leaflet } from "@hpcc-js/map";
import { h3ToGeo, h3ToGeoBoundary } from "h3-js";
import { Hexagons } from "./Hexagons";

type Point = [number, number];
type Poly = Point[];
/*
import { h3ToGeo, h3ToGeoBoundary, polyfill as h3Polyfill } from "h3-js";
function polyfill(poly: Poly, res: number): string[] {
    const westPoly: Poly = [];
    const eastPoly: Poly = [];
    let west;
    let east;
    poly.forEach(p => {
        if (!west || west > p[1]) west = p[1];
        if (!east || east < p[1]) east = p[1];
        westPoly.push([p[0], p[1] > 0 ? 0 : p[1]]);
        eastPoly.push([p[0], p[1] < 0 ? 0 : p[1]]);
    });
    if (east - west > 180) {
        return h3Polyfill(westPoly, res).concat(h3Polyfill(eastPoly, res));
    }
    return h3Polyfill(poly, res);
}
*/

export function tidyRes(res: number) {
    if (res > 15) return 15;
    if (res < 0) return 0;
    return res;
}

export function tidyLat(lat: number) {
    if (lat < -90) return -90;
    if (lat > 90) return 90;
    return lat;
}

export function tidyLon(lon: number) {
    if (lon < -180) return -180;
    if (lon > 180) return 180;
    return lon;
}

export function tidyBounds(bounds: leaflet.LatLngBounds) {
    return bounds.pad(0.1);
}

export type H3ResponseRow = { h3index: string, rowcount: number, childrows?: { Row: any[] } };
export type H3Response = H3ResponseRow[];

export class H3Service {
    query: Query;
    query2 = Query.attach({ baseUrl: "http://localhost:8002" }, "roxie", "cities2");

    constructor(fullUrl: string, readonly childThreshold = 10) {
        // "http://localhost:8002/WsEcl/res/query/roxie/cities.1/res/index.html"
        const [baseUrl, queryUrl] = fullUrl.split("/WsEcl/res/query/");
        const [querySet, query] = queryUrl.split("/");
        this.query = Query.attach({ baseUrl }, querySet, query);
    }

    serverPolyfill(poly: Poly, resolution: number): Promise<H3Response> {
        const polyQuery = {
            h3PolySetRes: resolution,
            childThreshold: this.childThreshold,
            h3PolySet: {
                Row: poly.map(p => {
                    return { lat: p[0], lon: p[1] };
                })
            }
        };

        return this.query.submit(polyQuery).then((response: any) => {
            return response.IndexCountSet;
        });
    }

    submit(poly: Poly, res: number): Promise<H3Response> {
        const lPoly: Poly = [];
        const rPoly: Poly = [];
        let left;
        let right;
        poly.forEach(p => {
            if (!left || left > p[1]) left = p[1];
            if (!right || right < p[1]) right = p[1];
            lPoly.push([p[0], p[1] > 0 ? 0 : p[1]]);
            rPoly.push([p[0], p[1] < 0 ? 0 : p[1]]);
        });
        if (right - left > 180) {
            return Promise.all([this.serverPolyfill(lPoly, res), this.serverPolyfill(rPoly, res)]).then(([resA, resB]) => resA.concat(resB));
        }
        return this.serverPolyfill(poly, res);
    }

    submit2(z: number, x: number, y: number): Promise<H3Response> {
        return this.query2.submit({ z, x, y, childThreshold: this.childThreshold }).then((response: any) => {
            return response.IndexCountSet;
        });
    }
}
/*
export class HexTest extends Hexagons {

    protected service = new H3Service("");

    constructor() {
        super(false);
    }

    private _polygons: { [id: string]: leaflet.Polygon } = {};
    createH3Indices(data: string[]) {
        this.clear();
        data.forEach(row => {
            let polygon = this._polygons[row];
            if (!polygon) {
                const points = h3ToGeoBoundary(row);
                polygon = new leaflet.Polygon(this.fixDateLine(points), {
                    color: "gray",
                    fillColor: "lightgray",
                    opacity: this.opacity() / 4,
                    fillOpacity: this.opacity() / 4,
                    origRow: row
                } as any).on("click", e => this.clickHandler(e, row));
                this._polygons[row] = polygon;
            }
            this.add(polygon);
        });
    }

    updateH3Indices(data: H3Response) {
        const extent = d3Extent(data, row => row.rowcount);
        data.forEach(row => {
            const polygon = this._polygons[row.h3index];
            if (polygon) {
                polygon.setStyle({
                    color: row.childrows.Row.length || row.rowcount === undefined ? "gray" : this._palette(extent[1], extent[0], extent[1]),
                    fillColor: row.childrows.Row.length || row.rowcount === undefined ? "lightgray" : row.rowcount === 0 ? "transparent" : this._palette(row.rowcount, extent[0], extent[1]),
                    opacity: this.opacity(),
                    fillOpacity: this.opacity(),
                    origRow: row
                } as any);
                polygon.bindTooltip("Row Count:  " + row.rowcount);
            }
            if (row.childrows.Row.length) {
                row.childrows.Row.forEach(r => {
                    const marker = new leaflet.Marker([r.lat, r.lng], {
                        icon: BeautifyIcon({
                            iconShape: "marker",
                            icon: "fa-circle",
                            textColor: "#ffffff",
                            borderColor: "transparent",
                            backgroundColor: "#376cea",
                            props: {
                                owner: this,
                                row
                            }
                        }),
                        origRow: row
                    } as any).on("click", e => this.clickHandler(e, row));
                    this.add(marker);
                });
            }
        });
    }

    updateHexagons() {
        this._palette = this._palette.switch(this.paletteID());
        if (this.useClonedPalette()) {
            this._palette = this._palette.cloneNotExists(this.paletteID() + "_" + this.id());
        }

        const resolution = tidyRes(this.h3Resolution());
        const bounds = tidyBounds(this.visibleBounds());
        const west = tidyLon(bounds.getWest());
        const north = tidyLat(bounds.getNorth());
        const east = tidyLon(bounds.getEast());
        const south = tidyLat(bounds.getSouth());

        const poly: Array<[number, number]> = [
            [north, west],
            [north, east],
            [south, east],
            [south, west]
        ];

        this.createH3Indices(polyfill(poly, resolution));
        this.service.submit(poly, resolution).then(resp => this.updateH3Indices(resp));
    }
}

function long2tile(lon, zoom) {
    return (lon + 180) / 360 * Math.pow(2, zoom);
}

function lat2tile(lat, zoom) {
    return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);
}

const service = new H3Service("", 0);
const CanvasLayer = leaflet.GridLayer.extend({
    createTile(coords, done) {
        console.log(coords);
        const error = undefined;
        // create a <canvas> element for drawing
        const tile: SVGSVGElement = leaflet.DomUtil.create("svg", "leaflet-tile") as unknown as SVGSVGElement;
        // setup tile width and height according to the options
        const size = this.getTileSize();
        // tile.setAttribute("width", size.x);
        // tile.setAttribute("height", size.y);

        // draw something asynchronously and pass the tile to the done() callback
        service.submit2(coords.z, coords.x, coords.y).then(response => {
            response.forEach(row => {
                const points = h3ToGeoBoundary(row.h3index).map(p => {
                    const x = (long2tile(p[1], coords.z) - coords.x) * size.x;
                    const y = (lat2tile(p[0], coords.z) - coords.y) * size.y;
                    return `${x},${y}`;

                }).join(" ");
                const polygon = leaflet.DomUtil.create("polygon") as unknown as SVGPolygonElement;
                polygon.setAttribute("points", points);
                polygon.style.stroke = "purple";
                polygon.setAttribute("fill", "red");
                polygon.setAttribute("stroke", "black");
                polygon.style.strokeWidth = "1px";
                tile.appendChild(polygon);
            });
            done(error, tile);
        });
        return tile;
    }
});

export class HexTest22 extends Hexagons {

    protected canvasLayer = new CanvasLayer();

    constructor() {
        super();
    }

    layerEnter(map: Map) {
        super.layerEnter(map);
        map.addLayer(this.canvasLayer);
    }
}
*/

export class HexTest2 extends Hexagons {

    protected service: H3Service;

    constructor(fullUrl: string) {
        super(false);
        this.service = new H3Service(fullUrl);
    }

    createIcon(childCount) {
        let c = " marker-cluster-";
        if (childCount < 10) {
            c += "small";
        } else if (childCount < 100) {
            c += "medium";
        } else {
            c += "large";
        }
        return new leaflet.DivIcon({ html: "<div><span>" + childCount + "</span></div>", className: "marker-cluster" + c, iconSize: new leaflet.Point(40, 40) });
    }

    createClusterIcon(cluster) {
        const childCount = cluster.getAllChildMarkers().reduce((prev, curr) => prev + curr.options.origRow.rowcount, 0);
        return this.createIcon(childCount);
    }

    createH3Indices(data: H3Response) {
        this.clear();
        data.forEach(row => {
            if (row.rowcount < this.service.childThreshold || row.childrows.Row.length) {
                row.childrows.Row.forEach(r => {
                    const marker = new leaflet.Marker([r.lat, r.lng], {
                        icon: Leaflet.BeautifyIcon({
                            iconShape: "marker",
                            icon: "fa-circle",
                            textColor: "#ffffff",
                            borderColor: "transparent",
                            backgroundColor: "#376cea",
                            props: {
                                owner: this,
                                row
                            }
                        }),
                        origRow: row
                    } as any).on("click", e => this.clickHandler(e, row));
                    let tooltip = "";
                    for (const key in r.payload) {
                        tooltip += `<b>${key}:</b>  ${r.payload[key]}<br>`;
                    }
                    marker.bindTooltip(tooltip);
                    this.add(marker);
                });
            } else {
                const points = h3ToGeoBoundary(row.h3index);
                const polygon = new leaflet.Polygon(this.fixDateLine(points), {
                    color: "gray",
                    fillColor: "lightgray",
                    opacity: this.opacity(),
                    fillOpacity: this.opacity(),
                    origRow: row
                } as any).on("click", e => this.clickHandler(e, row));
                this.add(polygon);
                const [lat, lon] = h3ToGeo(row.h3index);
                const circle = new leaflet.Marker([lat, lon], {
                    icon: this.createIcon(row.rowcount),
                    origRow: row
                } as any).on("click", e => this.clickHandler(e, row));
                circle.bindTooltip("Row Count:  " + row.rowcount);
                this.add(circle);
            }
        });
    }

    updateHexagons() {
        this._palette = this._palette.switch(this.paletteID());
        if (this.useClonedPalette()) {
            this._palette = this._palette.cloneNotExists(this.paletteID() + "_" + this.id());
        }

        const resolution = tidyRes(this.h3Resolution() - 1);
        const bounds = tidyBounds(this.visibleBounds());
        const west = tidyLon(bounds.getWest());
        const north = tidyLat(bounds.getNorth());
        const east = tidyLon(bounds.getEast());
        const south = tidyLat(bounds.getSouth());

        const poly: Array<[number, number]> = [
            [north, west],
            [north, east],
            [south, east],
            [south, west]
        ];

        const context = this;
        fetchData(poly, resolution);

        function fetchData(_poly, _resolution) {
            context.service.submit(poly, resolution).then(resp => {
                if (poly === _poly && resolution === _resolution) {
                    context.createH3Indices(resp);
                }
            });
        }
    }
}
HexTest2.prototype._class += " visualizer_HexTest2";

export interface HexTest2 {
    baseUrl(): string;
    baseUrl(_: string): this;
}

HexTest2.prototype.publish("baseUrl", null, "string");
