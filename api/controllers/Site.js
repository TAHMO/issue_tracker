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

 //=====================
 // GET SITES
 //=====================
//  router.get('/api/sites', function(req, res) {
// 	const {auth_type, format, provider} = req.query;
// 	if (provider) {
// 		let url = null;
// 		let username = null;
// 		let password = null;
// 		let headers = null;
// 		switch (provider) {
// 			case 'tahmo':
// 				url = "https://tahmoapi.mybluemix.net/v1/stations";
// 				username = "6WYHYT0XVY7BXZHXN7HBKYAZ8";
// 				password = "Rk7pZpdJ0gwxHVGr3kpbpHX6p8fk2+pJhhKAx2Nr77I";
// 				break;
// 			default: 
// 				break;
// 		}
// 		switch (auth_type) {
// 			case 'basic':
// 				headers = {'Authorization': 'Basic ' + Buffer.from(username + ":" + password).toString('base64')};
// 				break;
// 			default:
// 				headers = {'Authorization': 'Basic ' + Buffer.from(username + ":" + password).toString('base64')};
// 				break;
// 		}
// 		fetch(url, {
// 			method: 'GET',
// 			headers: headers,
// 		})
// 		.then(function(res) {
// 			return res.json();
// 		})
// 		.then(function(json) {
// 			data = json['stations'];
// 			switch(format) {
// 			 case 'geojson':
// 				data = geojson(tahmo(data));
// 				break;
// 			 case 'raw':
// 				break;
//        case 'siteCodeObj':
// 				data = siteCodeObj(tahmo(data));
//         break;
// 			 default:
// 				data = tahmo(data);
// 				break;
// 			}
// 			res.status(200).send({success: true, message: 'Sites retrieved successfully.', data: data});
// 		})
// 		.catch(function(err) {
// 			res.status(200).send({success: false, message: 'Could not retrieve sites.'});
// 		});
// 	} else {
// 		Site.find({}, function(err, sites) {
// 		 if (err) {
// 			res.status(200).send({success: false, message: 'Could not retrieve sites.'});
// 		 } else {
// 			let data = [];
// 			switch (format) {
// 				case 'geojson':
// 					data = geojson(tahmo(sites));
// 					break;
// 				default:
// 					data = tahmo(sites);
// 					break;
// 			}
// 			res.status(200).send({success: true, message: 'Sites retrieved successfully.', data: data});
// 		 }
// 		});
// 	}
//  });

// router.get('/api/sites', function(req, res) {
// 	const format = req.query.format || req.query.type;
// 	// const { format } = req.query;
  
// 	// Always load sites from your Mongo DB (DB_2)
// 	Site.find({}, function(err, sites) {
// 	  if (err || !sites) {
// 		return res.status(200).send({
// 		  success: false,
// 		  message: "Could not retrieve sites."
// 		});
// 	  }

// 	  // Convert Mongo docs to plain objects + ensure lat/lng fields exist
// const normalized = sites.map(s => {
//   const o = (s.toObject ? s.toObject() : s);
//   return {
//     ...o,
//     latitude: o.Latitude,     // <- take your DB field
//     longitude: o.Longitude,   // <- take your DB field
//     elevation_m: o.Elevation_m
//   };
// });

  
// 	  let data;
  
// 	  switch (format) {
// 		case 'geojson':
// 		  data = geojson(tahmo(normalized));
// 		  break;
  
// 		case 'siteCodeObj':
// 		  data = siteCodeObj(tahmo(normalized));
// 		  break;
  
// 		default:
// 		  data = tahmo(normalized);
// 		  break;
// 	  }
  
// 	  res.status(200).send({
// 		success: true,
// 		message: "Sites retrieved successfully.",
// 		data
// 	  });
// 	});
//   });

//   router.get('/api/sites', function (req, res) {
//   const format = req.query.format || req.query.type;
// // Load site from Mongodb DB_2
//   Site.find({}, function (err, sites) {
//     if (err || !sites) {
//       return res.status(200).send({
//         success: false,
//         message: "Could not retrieve sites."
//       });
//     }

//     let data;

//     //  BUILD GEOJSON DIRECTLY FROM DB (NO tahmo)
//     if (format === 'geojson') {
//       data = {
//         type: "FeatureCollection",
//         features: sites.map(s => {
//           const o = s.toObject ? s.toObject() : s;
//           return {
//             type: "Feature",
//             geometry: {
//               type: "Point",
//               // GeoJSON order: [longitude, latitude, elevation]
//               coordinates: [
//                 Number(o.Longitude),
//                 Number(o.Latitude),
//                 o.Elevation_m != null ? Number(o.Elevation_m) : null
//               ]
//             },
//             properties: {
//               SiteCode: o.SiteCode,
//               SiteName: o.SiteName,
//               Country: o.Country,
//               DeviceId: o.DeviceId
//             }
//           };
//         })
//       };
//     } else {
//       // default: return raw DB objects
//       data = sites;
//     }

//     return res.status(200).send({
//       success: true,
//       message: "Sites retrieved successfully.",
//       data
//     });
//   });
// });
//  //=====================
//  // GET SITES COUNTRIES
//  //=====================
//  router.get('/api/sites/countries', function(req, res) {
//   console.log('isoCountries', isoCountries);
//   res.status(200).send({success: true, message: 'Countries retrieved successfully.', data: modifyCountries(isoCountries)});
//  });


//  //=====================
//  // GET SITES BY SITECODE
//  //=====================
//  router.get('/api/sites/:sitecode', function(req, res) {
//   const {sitecode} = req.params;
//   Site.find({SiteCode: sitecode}, function(err, site) {
//    if (err) {
// 		res.status(200).send({success: false, message: 'Could not retrieve the specified site.'});
//    } else {
// 		res.status(200).send({success: true, message: 'Site retrieved successfully.', data: site[0]});
//    }
//   });
//  });

// }
