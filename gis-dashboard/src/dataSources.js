export const dataSources = {
  // Your fork: keep using it as the canonical ZIP source
  // Files are named like "de_delaware_zip_codes_geo.min.json"
  baseZipRepo: 'https://raw.githubusercontent.com/9StonesofIC/State-zip-code-GeoJSON/master',

  // US states + counties boundaries
  countiesGeoJson: 'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json', // FIPS keyed
  statesGeoJson:   'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json',

  // map abbreviations to repo file slugs
  stateSlug: {
    AL:'al_alabama', AK:'ak_alaska', AZ:'az_arizona', AR:'ar_arkansas', CA:'ca_california',
    CO:'co_colorado', CT:'ct_connecticut', DC:'dc_district_of_columbia', DE:'de_delaware',
    FL:'fl_florida', GA:'ga_georgia', HI:'hi_hawaii', IA:'ia_iowa', ID:'id_idaho',
    IL:'il_illinois', IN:'in_indiana', KS:'ks_kansas', KY:'ky_kentucky', LA:'la_louisiana',
    MA:'ma_massachusetts', MD:'md_maryland', ME:'me_maine', MI:'mi_michigan', MN:'mn_minnesota',
    MO:'mo_missouri', MS:'ms_mississippi', MT:'mt_montana', NC:'nc_north_carolina',
    ND:'nd_north_dakota', NE:'ne_nebraska', NH:'nh_new_hampshire', NJ:'nj_new_jersey',
    NM:'nm_new_mexico', NV:'nv_nevada', NY:'ny_new_york', OH:'oh_ohio', OK:'ok_oklahoma',
    OR:'or_oregon', PA:'pa_pennsylvania', RI:'ri_rhode_island', SC:'sc_south_carolina',
    SD:'sd_south_dakota', TN:'tn_tennessee', TX:'tx_texas', UT:'ut_utah', VA:'va_virginia',
    VT:'vt_vermont', WA:'wa_washington', WI:'wi_wisconsin', WV:'wv_west_virginia', WY:'wy_wyoming'
  },

  zipGeoUrl(abbr) {
    const slug = this.stateSlug[abbr];
    if (!slug) throw new Error(`Unknown state abbr: ${abbr}`);
    return `${this.baseZipRepo}/${slug}_zip_codes_geo.min.json`;
  },
};
