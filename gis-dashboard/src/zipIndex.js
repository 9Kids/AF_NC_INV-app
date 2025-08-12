export class ZipIndex {
  constructor(geojson, { idProp = 'ZCTA5CE10' } = {}) {
    this.idProp = idProp;
    this.byZip = new Map();
    this.centroids = []; // [{x:lon, y:lat}]
    this.zipOrder = [];  // parallel array of ZIP strings

    for (const f of geojson.features) {
      const z = String(f.properties?.[this.idProp] ?? f.id);
      if (!z) continue;
      this.byZip.set(z, f);
      const c = turf.centroid(f).geometry.coordinates; // [lon,lat]
      this.centroids.push({ x: c[0], y: c[1] });
      this.zipOrder.push(z);
    }

    // spatial index for centroid queries
    // eslint-disable-next-line no-undef
    this.kd = new KDBush(this.centroids, p => p.x, p => p.y);
  }

  getFeature(zip) { return this.byZip.get(String(zip)); }

  getCentroid(zip) {
    const f = this.getFeature(zip);
    if (!f) return null;
    const c = turf.centroid(f).geometry.coordinates;
    return c; // [lon,lat]
  }

  neighborsWithin(zip, miles = 10) {
    const c = this.getCentroid(zip);
    if (!c) return [];
    const [lon, lat] = c;
    // eslint-disable-next-line no-undef
    const ids = geokdbush.around(this.kd, lon, lat, Infinity, miles * 1.60934); // km
    return ids.map(id => this.zipOrder[id]).filter(z => z !== String(zip));
  }
}
