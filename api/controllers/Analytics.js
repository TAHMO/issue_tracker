const Issue = require('../models/issues');
const Sites = require('../models/sites');

module.exports = function(router) {
  router.get('/api/analytics/overview', async function(req, res) {
    try {
      // Open tickets 
      const openTickets = await Issue.countDocuments({
        status: { $in: ['open', 'pending'] }
      });

      // Avg unresolved duration (days)
      const unresolved = await Issue.aggregate([
        { $match: { status: { $in: ['open', 'pending'] } } },
        {
          $project: {
            daysOpen: {
              $divide: [
                { $subtract: [new Date(), '$created_at'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        },
        { $group: { _id: null, avgDays: { $avg: '$daysOpen' } } }
      ]);

      
      // Battery vs Other 
      const batteryAgg = await Issue.aggregate([
        {
          $project: {
            // fields to strings for searching
            issue_type: { $ifNull: ['$issue_type', ''] },
            parameter: { $ifNull: ['$parameter', ''] },
            title: { $ifNull: ['$title', ''] },
            description: { $ifNull: ['$description', ''] }
          }
        },
        {
          $project: {
            isBattery: {
              $or: [
                { $regexMatch: { input: { $toLower: '$issue_type' }, regex: 'battery' } },
                { $regexMatch: { input: { $toLower: '$parameter' }, regex: 'battery' } },
                { $regexMatch: { input: { $toLower: '$title' }, regex: 'battery' } },
                { $regexMatch: { input: { $toLower: '$description' }, regex: 'battery' } }
              ]
            }
          }
        },
        { $group: { _id: '$isBattery', count: { $sum: 1 } } }
      ]);

      let batteryCount = 0;
      let otherCount = 0;
      batteryAgg.forEach(r => {
        if (r._id === true) batteryCount = r.count;
        if (r._id === false) otherCount = r.count;
      });

      const batteryPie = [
        { label: 'Battery', count: batteryCount },
        { label: 'Other', count: otherCount }
      ];

      // Opened vs Closed by Country
      const openedClosedByCountryAgg = await Issue.aggregate([
        {
          $project: {
            country: { $ifNull: ['$country', 'Unknown'] },
            status: { $ifNull: ['$status', 'unknown'] }
          }
        },
        {
          $group: {
            _id: { country: '$country', status: '$status' },
            count: { $sum: 1 }
          }
        }
      ]);

      const openedClosedMap = {};
      openedClosedByCountryAgg.forEach(row => {
        const country = row._id.country || 'Unknown';
        const status = row._id.status || 'unknown';

        if (!openedClosedMap[country]) {
          openedClosedMap[country] = { country, opened: 0, closed: 0 };
        }

        if (status === 'closed') openedClosedMap[country].closed += row.count;
        if (status === 'open' || status === 'pending') openedClosedMap[country].opened += row.count;
      });

      const openedClosedByCountry = Object.values(openedClosedMap)
        .sort((a, b) => (b.opened + b.closed) - (a.opened + a.closed))
        .slice(0, 20);

      // Most affected parameters 
      const mostAffectedParameters = await Issue.aggregate([
        {
          $group: {
            _id: '$parameter',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]).then(r =>
        r.map(i => ({ parameter: i._id || 'Unknown', count: i.count }))
      );

      // Best-performing country by station uptime 
      const bestCountryAgg = await Sites.aggregate([
        {
          $match: {
            country: { $exists: true, $ne: null },
            uptime: { $exists: true, $ne: null, $type: 'number' }
          }
        },
        {
          $group: {
            _id: '$country',
            avgUptime: { $avg: '$uptime' }
          }
        },
        { $sort: { avgUptime: -1 } },
        { $limit: 1 }
      ]);

      let bestPerformingCountry = null;
      if (bestCountryAgg.length && typeof bestCountryAgg[0].avgUptime === 'number') {
        bestPerformingCountry = {
          country: bestCountryAgg[0]._id,
          avgUptime: Number(bestCountryAgg[0].avgUptime.toFixed(2))
        };
      }

      res.status(200).send({
        success: true,
        data: {
          openTickets,
          avgUnresolvedDays: unresolved[0]?.avgDays || 0,
          batteryPie,
          openedClosedByCountry,
          mostAffectedParameters,
          bestPerformingCountry
        }
      });
    } catch (err) {
      res.status(500).send({ success: false, message: err.message });
    }
  });
};