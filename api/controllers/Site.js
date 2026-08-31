//Libraries
const Site = require('./../models/sites');
const {geojson, isoCountries, modifyCountries, siteCodeObj, tahmo}= require('./../utils');
const fetch = require('node-fetch');

module.exports = function(router) {

   //=====================
 // GET SITES
 //=====================

  router.get('/api/sites', async function (req, res) {
    const format = req.query.format || req.query.type;

    try {
      let stations = [];

      // STATIONS_SERVICE_URL=http://localhost:3000/services/assets/v2/stations
      if (process.env.STATIONS_SERVICE_URL) {
        const r = await fetch(process.env.STATIONS_SERVICE_URL);
        if (!r.ok) throw new Error(`Stations service error ${r.status}`);
        const json = await r.json();

// If it's already GeoJSON, return it directly when format=geojson
  if (json && json.type === "FeatureCollection" && Array.isArray(json.features)) {
        return res.status(200).send({
          success: true,
          message: "Sites retrieved successfully.",
          data: json
        });
      }

      // Otherwise assume it returns a list or {stations:[...]}
      stations = json.stations || json.data || json;

      // Safety: ensure stations is an array
      if (!Array.isArray(stations)) stations = [];
    } else {
      // Otherwise load from Mongo DB_2
      stations = await Site.find({}).lean();
    }

    // If format=geojson, build GeoJSON from the station array
    let data;
    if (format === "geojson") {
      data = {
        type: "FeatureCollection",
        features: stations
          .filter(s =>
            (s.Longitude ?? s.longitude ?? s.lng) != null &&
            (s.Latitude ?? s.latitude ?? s.lat) != null
          )
          .map(s => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [
                Number(s.Longitude ?? s.longitude ?? s.lng),
                Number(s.Latitude ?? s.latitude ?? s.lat),
                (s.Elevation_m ?? s.elevation_m) != null ? Number(s.Elevation_m ?? s.elevation_m) : null
              ]
            },
            properties: {
              SiteCode: s.SiteCode,
              SiteName: s.SiteName,
              Country: s.Country,
              DeviceId: s.DeviceId
            }
          }))
      };
    } else {
      // otherwise return raw stations array
      data = stations;
    }

    return res.status(200).send({
      success: true,
      message: "Sites retrieved successfully.",
      data
    });

  } catch (err) {
    console.error("Stations load error:", err.message);
    return res.status(502).send({
      success: false,
      message: "Failed to load stations."
    });
  }
});

  // =====================
  // GET SITES COUNTRIES
  // =====================
  router.get('/api/sites/countries', function (req, res) {
    // If you don't want countries printed in terminal, remove console.log in your version
    return res.status(200).send({
      success: true,
      message: 'Countries retrieved successfully.',
      data: modifyCountries(isoCountries)
    });
  });

  // =====================
  // GET SITES BY SITECODE
  // =====================
  router.get('/api/sites/:sitecode', async function (req, res) {
    try {
      const sitecode = req.params.sitecode;
      const site = await Site.findOne({ SiteCode: sitecode }).lean();
      return res.status(200).send({
        success: true,
        message: 'Site retrieved successfully.',
        data: site || null
      });
    } catch (err) {
      return res.status(200).send({
        success: false,
        message: 'Could not retrieve the specified site.'
      });
    }
  });

};

 