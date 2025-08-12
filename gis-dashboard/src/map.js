export class MapController {
  constructor(containerId, { style = 'open-street-map' } = {}) {
    this.containerId = containerId;
    this.style = style; // 'open-street-map' or 'carto-positron' works without Mapbox token
    this.layers = {};
    this.selections = { zip: null, point: null };

    // seed empty map
    Plotly.newPlot(this.containerId, [], {
      mapbox: { style: this.style, center: { lon: -96.9, lat: 37.6 }, zoom: 3 },
      margin: { t: 0, r: 0, b: 0, l: 0 },
      showlegend: false,
    }, { responsive: true });
  }

  setLayers({ statesGeo, countiesGeo, zipGeo, zipIdx }) {
    this.layers.statesGeo = statesGeo;
    this.layers.countiesGeo = countiesGeo;
    this.layers.zipGeo = zipGeo;
    this.zipIdx = zipIdx;
  }

  draw({ showZips = true, showCounties = false, showStates = true } = {}) {
    const traces = [];

    // States outline (thin line)
    if (showStates && this.layers.statesGeo) {
      traces.push({
        type: 'choroplethmapbox',
        geojson: this.layers.statesGeo,
        locations: this.layers.statesGeo.features.map(f => f.properties.name),
        z: this.layers.statesGeo.features.map(_ => 1),
        colorscale: [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0)']],
        showscale: false,
        marker: { line: { width: 1, color: '#334155' } },
        hoverinfo: 'skip',
        name: 'States',
      });
    }

    // ZIP polygons (default visible)
    if (showZips && this.layers.zipGeo) {
      const zips = this.layers.zipGeo.features.map(f => f.properties?.ZCTA5CE10 ?? f.id);
      traces.push({
        type: 'choroplethmapbox',
        geojson: this.layers.zipGeo,
        featureidkey: 'properties.ZCTA5CE10', // ZCTA property for match
        locations: zips,
        z: zips.map(_ => 1),
        colorscale: [[0, 'rgba(56,189,248,0.08)'], [1, 'rgba(56,189,248,0.20)']],
        showscale: false,
        marker: { line: { width: 0.5, color: '#0891b2' } },
        name: 'ZIPs',
        hovertemplate: 'ZIP (ZCTA): %{location}<extra></extra>'
      });
    }

    // Counties (toggle, subtle outline)
    if (showCounties && this.layers.countiesGeo) {
      const fips = this.layers.countiesGeo.features.map(f => f.id);
      traces.push({
        type: 'choroplethmapbox',
        geojson: this.layers.countiesGeo,
        locations: fips,
        z: fips.map(_ => 1),
        colorscale: [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0)']],
        showscale: false,
        marker: { line: { width: 0.5, color: '#9ca3af' } },
        name: 'Counties',
        hoverinfo: 'skip',
      });
    }

    Plotly.react(this.containerId, traces, {
      mapbox: { style: this.style, center: this._autoCenter(), zoom: this._autoZoom() },
      margin: { t: 0, r: 0, b: 0, l: 0 },
      hovermode: 'closest'
    });

    // Click handler: record selection (ZIP polygon)
    const el = document.getElementById(this.containerId);
    el.on('plotly_click', (e) => {
      const pt = e.points?.[0];
      if (!pt) return;
      if (pt.fullData.type === 'choroplethmapbox' && pt.fullData.name === 'ZIPs') {
        this.selections.zip = String(pt.location);
        this.selections.point = null;
      }
    });
  }

  toggleLayer(kind, visible) {
    const gd = document.getElementById(this.containerId);
    const traces = gd.data || [];
    const idx = traces.findIndex(t => (kind === 'zips' && t.name === 'ZIPs') ||
                                      (kind === 'counties' && t.name === 'Counties') ||
                                      (kind === 'states' && t.name === 'States'));
    if (idx >= 0) {
      Plotly.restyle(this.containerId, { visible: visible ? true : 'legendonly' }, [idx]);
    }
  }

  applyFilters({ zipList = [], countyList = [] } = {}) {
    // Filter ZIPs by subset (hide others by setting z=0)
    const gd = document.getElementById(this.containerId);
    const zipsTraceIndex = (gd.data || []).findIndex(t => t.name === 'ZIPs');
    if (zipsTraceIndex < 0) return;
    const zipsTrace = gd.data[zipsTraceIndex];
    const allLocs = zipsTrace.locations;
    const newZ = allLocs.map(loc => {
      if (zipList.length && !zipList.includes(Number(loc))) return 0;
      return 1;
    });
    Plotly.restyle(this.containerId, { z: [newZ] }, [zipsTraceIndex]);

    // county filter is a visual overlay: highlight matched counties
    if (countyList.length) {
      const countiesIndex = (gd.data || []).findIndex(t => t.name === 'Counties');
      if (countiesIndex >= 0) {
        const cTrace = gd.data[countiesIndex];
        const cz = cTrace.locations.map(fips => countyList.includes(fips) ? 2 : 1);
        Plotly.restyle(this.containerId, {
          z: [cz],
          colorscale: [[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,0)'],[2,'rgba(234,88,12,0.25)']]],
        }, [countiesIndex]);
      }
    }
  }

  getSelectedFeature() {
    // prefer ZIP selection; in future we’ll add a click-to-drop-point mode
    return this.selections.zip ? { type: 'zip', value: this.selections.zip } : this.selections.point;
  }

  getSelectionCenter(selection, zipIdx) {
    if (!selection) return null;
    if (selection.type === 'zip') {
      const [lon, lat] = zipIdx.getCentroid(selection.value);
      return { lon, lat };
    }
    return selection; // {lon,lat}
  }

  drawRadiusCircle(lon, lat, miles = 10) {
    const circle = turf.circle([lon, lat], miles, { units: 'miles', steps: 128 });
    const coords = circle.geometry.coordinates[0];
    const lons = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);

    const ring = {
      type: 'scattermapbox',
      lon: lons, lat: lats,
      mode: 'lines',
      fill: 'toself',
      line: { width: 2 },
      name: `Radius ${miles} mi`,
      hoverinfo: 'skip'
    };

    Plotly.addTraces(this.containerId, [ring]);
    Plotly.relayout(this.containerId, { mapbox: { center: { lon, lat }, zoom: 9 } });
  }

  _autoCenter() { return { lon: -96.9, lat: 37.6 }; }
  _autoZoom()   { return 4; }
}
