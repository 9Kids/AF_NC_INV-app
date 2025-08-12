import { dataSources } from './dataSources.js';
import { MapController } from './map.js';
import { ZipIndex } from './zipIndex.js';
import * as Filters from './filters.js';

// Config: no Mapbox token needed if using 'open-street-map' or 'carto-positron'
const map = new MapController('map', { style: 'carto-positron' });

const stateSelect = document.getElementById('stateSelect');
const zipInput = document.getElementById('zipInput');
const countyInput = document.getElementById('countyInput');
const applyFiltersBtn = document.getElementById('applyFilters');
const drawRadiusBtn = document.getElementById('drawRadius');
const radiusMilesInput = document.getElementById('radiusMiles');
const toggleZips = document.getElementById('toggleZips');
const toggleCounties = document.getElementById('toggleCounties');
const toggleStates = document.getElementById('toggleStates');

let zipIdx = null;  // ZipIndex instance for current state
let currentState = stateSelect.value;

async function loadState(stateAbbr) {
  const zipUrl = dataSources.zipGeoUrl(stateAbbr);   // from your repo
  const [zipGeo, countiesGeo, statesGeo] = await Promise.all([
    fetch(zipUrl).then(r => r.json()),
    fetch(dataSources.countiesGeoJson).then(r => r.json()),
    fetch(dataSources.statesGeoJson).then(r => r.json()),
  ]);

  zipIdx = new ZipIndex(zipGeo, { idProp: 'ZCTA5CE10' });  // ZCTA code
  map.setLayers({ statesGeo, countiesGeo, zipGeo, zipIdx });
  map.draw({ showZips: toggleZips.checked, showCounties: toggleCounties.checked, showStates: toggleStates.checked });

  // Reset filters
  zipInput.value = '';
  countyInput.value = '';
}

stateSelect.addEventListener('change', async () => {
  currentState = stateSelect.value;
  await loadState(currentState);
});

applyFiltersBtn.addEventListener('click', () => {
  const zipList = Filters.parseCsvInts(zipInput.value);
  const countyList = Filters.parseCsvStrings(countyInput.value);
  map.applyFilters({ zipList, countyList });
});

drawRadiusBtn.addEventListener('click', () => {
  const miles = Number(radiusMilesInput.value || 10);
  const selection = map.getSelectedFeature(); // either a point or a ZIP polygon
  if (!selection) return alert('Select a ZIP (click) or a point first.');
  const { lon, lat } = map.getSelectionCenter(selection, zipIdx);
  map.drawRadiusCircle(lon, lat, miles);
});

toggleZips.onchange = () => map.toggleLayer('zips', toggleZips.checked);
toggleCounties.onchange = () => map.toggleLayer('counties', toggleCounties.checked);
toggleStates.onchange = () => map.toggleLayer('states', toggleStates.checked);

// initial load
loadState(currentState);
