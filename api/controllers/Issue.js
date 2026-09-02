//Libraries
const Issue = require('./../models/issues');
const IssueSubscription = require('./../models/issueSubscription');
const Comment = require('./../models/comments');
const Counter = require('./../models/counters');
const User = require('./../models/users');
const mongoose = require('mongoose');
const Sites = require('./../models/sites');
const {
  modifyCommentsDate,
  modifyIssuesDate,
  getNextSequence,
} = require('./../utils');
var fetch = require('node-fetch');


  //=====================
  // GET ISSUES
  //=====================
  // router.get('/api/issues', function(req, res) {
  //   let url = req && req.headers ? req.headers.host : '';
  //   url = 'https://'+ url + '/api/sites?provider=tahmo&format=siteCodeObj';
  //   url = 'https://tahmoissuetracker.mybluemix.net/api/sites?provider=tahmo&format=siteCodeObj';
  //   let sites = {};
  //   const {status, assignee, country} = req.query;
  //   let status_query = {};
  //   let assignee_query = {};
  //   let country_query = {};
  //   if (status) {
  //     status_query = {status};
  //   }
  //   if (assignee) {
  //     assignee_query = {'assignee._id': assignee};
  //   }

	// 	fetch(url, {
	// 		method: 'GET',
	// 	})
	// 	.then(function(res) {
	// 		return res.json();
	// 	})
	// 	.then(function(response) {
  //     if (response.success) {
  //       sites = response.data;
  //       Issue.find({$and: [status_query, assignee_query]}, function(err, issues) {


// Convert DB sites into lookup format expected by modifyIssuesDate() to prevent site display error
module.exports = function(router) {
function convertSitesToMap(stations) {
  const map = {};

  stations.forEach(s => {
    const SiteCode = (s.SiteCode || '').toString().trim().toUpperCase();
    const DeviceId = (s.DeviceId || '').toString().trim();
    const site = {
      SiteCode: s.SiteCode,
      SiteName: s.SiteName,
      DeviceId: s.DeviceId,
      Country: s.Country
    };

    if (SiteCode) {
      map[SiteCode] = site;
    }

    if (DeviceId) {
      map[DeviceId] = site;
    }

    if (SiteCode && DeviceId) {
      map[`${SiteCode}/${DeviceId}`] = site;
    }
  });

  return map;
}
// GET ISSUES
router.get('/api/issues', async function(req, res) {
  const {status, assignee, country} = req.query;

  let status_query   = status   ? {status} : {};
  let assignee_query = assignee ? {'assignee._id': assignee} : {};

  // Load sites from LOCAL DATABASE instead of remote URL
 try {
    // Load stations from STATIONS_SERVICE_URL
    const r = await fetch('http://localhost:3000/api/sites?format=geojson');
if (!r.ok) throw new Error('Failed to fetch geojson sites');

const geo = await r.json();

// your /api/sites response is wrapped: { success, message, data: FeatureCollection }
const featureCollection = geo.data || geo;

// convert geojson features → stations array
const sitesRaw = (featureCollection.features || []).map(f => ({
  SiteCode: f?.properties?.SiteCode,
  SiteName: f?.properties?.SiteName,
  DeviceId: f?.properties?.DeviceId,
  Country:  f?.properties?.Country
})).filter(s => s.SiteCode);

    const sites = convertSitesToMap(sitesRaw);

    // Load Issues
    Issue.find({ $and: [status_query, assignee_query] }, function(err, issues) {
      if (err) {
        return res.status(200).send({
          success: false,
          message: "Could not retrieve issues."
        });
      }

      const data = modifyIssuesDate(issues, sites, country);

      res.status(200).send({
        success: true,
        message: "Issues retrieved successfully.",
        count: data.length,
        data
      });
    });

  } catch (err) {
    return res.status(200).send({
      success: false,
      message: "Could not retrieve sites. Therefore no issues retrieved."
    });
  }
});


  //         if (err) {
  //           res
  //             .status(200)
  //             .send({success: false, message: 'Could not retrieve issues.'});
  //         } else {
  //           let data = modifyIssuesDate(issues, sites, country);
  //           res.status(200).send({
  //             success: true,
  //             message: 'Issues retrieved successfully.',
  //             count: data.length,
  //             data: data
  //           });
  //         }
  //       });
  //     } else {
  //       res
  //         .status(200)
  //         .send({success: false, message: 'Could not retrieve sites. Therefore no issues retrieved.'});
  //     }
	// 	})
	// 	.catch(function(err) {
  //     res
  //       .status(200)
  //       .send({success: false, message: 'Could not retrieve sites. Therefore no issues retrieved.'});
	// 	});
  // });

  //=====================
  // GET ISSUE SUBSCRIBTION
  //=====================
  // 
  router.get('/api/issues/subscriptions', function(req, res) {
    const { user_id, issue_id } = req.query;
  
    // If both user_id and issue_id are provided -> return boolean whether subscription exists
    if (user_id && issue_id) {
      IssueSubscription.findOne({ user_id: user_id, issue_id: issue_id }, function(err, sub) {
        if (err) {
          return res.status(200).send({ success: false, message: 'Could not check subscription.' });
        }
        return res.status(200).send({
          success: true,
          message: 'Subscription check completed.',
          data: { subscribed: !!sub }
        });
      });
      return;
    }
    
  
    // If only user_id provided -> return distinct issue_id values the user is subscribed to
    if (user_id) {
      IssueSubscription.find({ user_id: user_id }).distinct('issue_id', function(err, issues) {
        if (err) {
          return res.status(200).send({ success: false, message: 'Could not retrieve issue subscriptions.' });
        }
        return res.status(200).send({
          success: true,
          message: 'Issue subscriptions retrieved successfully.',
          data: issues
        });
      });
      return;
    }
  
    // If only issue_id provided -> return user documents (emails) subscribed to that issue
    if (issue_id) {
      IssueSubscription.find({ issue_id: issue_id }).distinct('user_id', function(err, userIds) {
        if (err) {
          return res.status(200).send({ success: false, message: 'Could not retrieve issue subscriptions.' });
        }
        // fetch users' emails
        User.find({ _id: { $in: userIds } }, 'email full_name _id', function(err, users) {
          if (err) {
            return res.status(200).send({ success: false, message: 'Could not retrieve issue subscriptions.' });
          }
          return res.status(200).send({
            success: true,
            message: 'Issue subscriptions retrieved successfully.',
            data: users
          });
        });
      });
      return;
    }
  
    // If neither provided -> return all subscriptions (distinct user_id or issue_id might be too big)
    IssueSubscription.find({}, function(err, subs) {
      if (err) {
        return res.status(200).send({ success: false, message: 'Could not retrieve issue subscriptions.' });
      }
      return res.status(200).send({
        success: true,
        message: 'Issue subscriptions retrieved successfully.',
        data: subs
      });
    });
  });

  //=====================
// MUTE ISSUE NOTIFICATIONS
//=====================
router.post('/api/issues/:issue_id/mute', function(req, res) {
  const { issue_id } = req.params;
  const { user_id } = req.body;

  IssueSubscription.updateOne(
    { issue_id, user_id },
    { $set: { muted: true } },
    { upsert: true },
    function(err) {
      if (err) {
        return res.status(200).send({
          success: false,
          message: "Could not mute this issue."
        });
      }
      return res.status(200).send({
        success: true,
        message: "Issue muted successfully."
      });
    }
  );
});

//=====================
// UNMUTE ISSUE NOTIFICATIONS
//=====================
router.post('/api/issues/:issue_id/unmute', function(req, res) {
  const { issue_id } = req.params;
  const { user_id } = req.body;

  IssueSubscription.updateOne(
    { issue_id, user_id },
    { $set: { muted: false } },
    function(err) {
      if (err) {
        return res.status(200).send({
          success: false,
          message: "Could not unmute this issue."
        });
      }
      return res.status(200).send({
        success: true,
        message: "Issue unmuted successfully."
      });
    }
  );
});

//=====================
// GET USER MUTE STATES
//=====================
router.get('/api/issues/mute', function(req, res) {
  const { user_id } = req.query;

  IssueSubscription.find({ user_id }, 'issue_id muted', function(err, docs) {
    if (err) {
      return res.status(200).send({
        success: false,
        message: "Could not retrieve mute states."
      });
    }

    return res.status(200).send({
      success: true,
      message: "Mute states retrieved.",
      data: docs
    });
  });
});

  
  router.get('/api/issues/:id', function(req, res) {
    const { id } = req.params;
  
    // Load sites from LOCAL stations DB
    Sites.find({}, function(err, sitesRaw) {
      if (err || !sitesRaw) {
        return res.status(200).send({
          success: false,
          message: 'Could not retrieve sites. Therefore issue not retrieved.'
        });
      }
  
      const sites = convertSitesToMap(sitesRaw);
  
      // Load the issue by ID
      Issue.find({ _id: id }, function(err, issue) {
        if (err || !issue || issue.length === 0) {
          return res.status(200).send({
            success: false,
            message: 'Could not retrieve the specified issue.'
          });
        }
  
        return res.status(200).send({
          success: true,
          message: 'Issue retrieved successfully.',
          data: modifyIssuesDate(issue, sites)[0]
        });
      });
    });
  });



  
  // GET ISSUES BY STATION NAME (LOCAL DB VERSION)
router.get('/api/issues/station/:name', function(req, res) {
  const stationName = req.params.name;

  // Load sites from LOCAL stations DB
  Sites.find({}, function(err, sitesRaw) {
    if (err || !sitesRaw) {
      return res.status(200).send({
        success: false,
        message: "Could not retrieve sites. Therefore no issues retrieved."
      });
    }

    const sites = convertSitesToMap(sitesRaw);

    // Query issues that match the station name
    Issue.find({ station: stationName }, function(err, issues) {
      if (err) {
        return res.status(200).send({
          success: false,
          message: "Could not retrieve issues."
        });
      }

      const data = modifyIssuesDate(issues, sites);

      return res.status(200).send({
        success: true,
        message: "Issues retrieved successfully.",
        count: data.length,
        data
      });
    });
  });
});


  //=====================
  // GET ISSUES COMMENTS BY ID
  //=====================
  router.get('/api/issues/:id/comments', function(req, res) {
    const {id} = req.params;
    Issue.find({_id: id}, function(err, issue) {
      if (err) {
        res.status(200).send({
          success: false,
          message: 'Could not retrieve the comments for the specified issue.',
        });
      } else {
        const {comments} = issue[0];
        let query = {};
        if (typeof comments === 'object') {
          query = {
            _id: {
              $in: comments.map(function(e) {
                return mongoose.Types.ObjectId(e);
              }),
            },
          };
        } else {
          query = {_id: {$in: comments}};
        }
        Comment.find(query, function(err, comments) {
          if (err) {
            res.status(200).send({
              success: false,
              message:
                'Could not retrieve the comments for the specified issue.',
            });
          } else {
            res.status(200).send({
              success: true,
              message: 'Comment(s) retrieved successfully',
              data: modifyCommentsDate(comments),
            });
          }
        });
      }
    });
  });

  //=====================
  // POST ISSUES COMMENTS
  //=====================
  router.post('/api/issues/:id/comments', function(req, res) {
    const {id} = req.params;
    const {assignee, comments, due_date, updated_at} = req.body;
    const update = {};
    if (assignee) update.assignee = assignee;
    if (due_date) update.due_date = due_date;
    if (updated_at) update.updated_at = updated_at;

    if (comments == '' || comments == undefined) {
      res
        .status(200)
        .send({success: false, message: 'Cannot leave comments empty'});
      return;
    }
    Issue.findByIdAndUpdate(
      {_id: id},
      {$set: update, $push: {comments: req.body.comments}},
      {safe: true, upsert: true, new: true},
      function(err, issue) {
        if (err) {
          res.status(200).send({
            success: false,
            message: 'Could not add comments for the specified issue.',
          });
        }else if (issue){
          res.status(200).send({
            success: true,
            message: 'Comment added successfully',
            data: issue,
          });
        } 
        else {
          res.status(200).send({
            success: true,
            message: 'Could not recieve issue',
            data: issue,
          });
        }
      });
  });

  router.get('/api/issues/:id/comments', function(req, res) {
    const {id} = req.params;
    Issue.find({_id: id}, function(err, issue) {
      if (err) {
        res.status(200).send({
          success: false,
          message: 'Could not retrieve the comments for the specified issue.',
        });
      } else {
        const {comments} = issue[0];
        let query = {};
        if (typeof comments === 'object') {
          query = {
            _id: {
              $in: comments.map(function(e) {
                return mongoose.Types.ObjectId(e);
              }),
            },
          };
        } else {
          query = {_id: {$in: comments}};
        }
        Comment.find(query, function(err, comments) {
          if (err) {
            res.status(200).send({
              success: false,
              message:
                'Could not retrieve the comments for the specified issue.',
            });
          } else {
            res.status(200).send({
              success: true,
              message: 'Comment(s) retrieved successfully',
              data: comments,
            });
          }
        });
      }
    });
  });

  //=====================
  // POST ISSUES
  //=====================
  router.post('/api/issues', function(req, res) {
    let data = {
      title: req.body.title,
      description: req.body.description,
      opened_by: req.body.opened_by,
      assignee: req.body.assignee,
      labels: req.body.labels,
      priority: req.body.priority,
      station: req.body.station,
      deviceId: req.body.deviceId,
      status: 'open',
      updated_at: new Date(),
      due_date: req.body.due_date,
      created_at: new Date(),
    };
    for (key in data) {
      if (
        key !== 'station' &&
        key !== 'deviceId' &&
        (data[key] == '' || data[key] == undefined)
      ) {
        res
          .status(200)
          .send({success: false, message: 'Cannot leave ' + key + ' empty'});
        return;
      }
    }
    if (!data['station'] && !data['deviceId']) {
      res
        .status(200)
        .send({success: false, message: 'Cannot leave station empty'});
    }
    getNextSequence('ticket_id').then(
      function(response) {
        if (response.seq) {
          data.ticket_id = response.seq;
          let issue = new Issue(data);
          issue.save(function(err, data) {
            if (err) {
              res.status(200).send({
                success: false,
                message: 'Could not create issue. Try again later!',
              });
            } else {
              res.status(200).send({
                success: true,
                message: 'New issue created',
                data: data,
              });
            }
          });
        } else {
          res.status(200).send({
            success: false,
            message:
              'Could not get new ticket_id for new issue. Try again later!',
          });
        }
      },
      function(error) {
        res.status(200).send({
          success: false,
          message: 'Could not generate new ticket_id. Try again later!',
        });
        return;
      });
  });

  //======================
  // UPDATE ISSUES IN BULK
  //======================
  router.put('/api/issues', function(req, res) {
    const {
      ids,
      title,
      description,
      closed_by,
      assignee,
      comments,
      labels,
      priority,
      station,
      status,
      due_date,
      updated_at,
      subscribers
    } = req.body;


    if (ids && ids.length > 0) {
      let update = {};
      let isUpdated = false;

      if (title !== undefined && title !== null) {
        // Always update title even if empty
        update.title = title;
        isUpdated = true;
      }

      if (description) {
        update.description = description;
        isUpdated = true;
      }

      if (closed_by) {
        update.closed_by = closed_by;
        isUpdated = true;
      }

      if (assignee) {
        update.assignee = assignee;
        isUpdated = true;
      }

      if (comments && comments.length > 0) {
        update.comments = comments;
        isUpdated = true;
      }

      if (labels && labels.length > 0) {
        update.labels = labels;
        isUpdated = true;
      }

      if (priority) {
        update.priority = priority;
        isUpdated = true;
      }

      if (station) {
        update.station = station;
        isUpdated = true;
      }

      if (status) {
        update.status = status;
        isUpdated = true;
      }

      if (due_date) {
        update.due_date = due_date;
        isUpdated = true;
      }

      if (updated_at) {
        update.updated_at = updated_at;
        isUpdated = true;
      }

      if (isUpdated) {
        let query = {};
        if (typeof ids === 'object') {
          query = {
            _id: {
              $in: ids.map(function(e) {
                return mongoose.Types.ObjectId(e);
              }),
            },
          };
        } else {
          query = {_id: {$in: ids}};
        }
        update.updated_at = updated_at ? updated_at : new Date();
        Issue.update(query, {$set: update}, {multi: true, new: true}, function(err, issue) {
          if (err) {
            return res.status(200).send({
              success: false,
              message: 'Error updating issue(s).'
            });
          }
            
    
      if (subscribers) {
        const issueId = ids[0]; // editing only one issue in UI

        // Remove old subscriptions
        IssueSubscription.deleteMany({ issue_id: issueId }, function(err) {
          if (err) console.log("Error removing old subscriptions:", err);

          // Insert new subscriptions
          const bulkInsert = subscribers.map(u => ({
            issue_id: issueId,
            user_id: u
          }));

          IssueSubscription.insertMany(bulkInsert, function(err2) {
            if (err2) console.log("Error inserting subscribers:", err2);
          });
        });
      }
     return res.status(200).send({
        success: true,
        message: 'Issue(s) updated',
        date: update
      });
  });
}  else {
  return res.status(200).send({
    success: false,
    message: 'Nothing to update.'
  });
}

} else {
return res.status(200).send({
  success: false,
  message: "Could not update issue(s). Try again later!"
});
}
});

  //======================
  // UPDATE ISSUE STATUS BY ID
  //======================
  router.put('/api/issues/:id/status', function(req, res) {
    const {id} = req.params;
    const {status} = req.body;
    let update = {};


    if (status) {
      update.status = status;
      isUpdated = true;
    }

    Issue.update({_id: id}, {$set: update}, function(err, issue) {
      if (err) {
        res
          .status(200)
          .send({success: false, message: 'Error updating issue status.'});
      } else {
        res
          .status(200)
          .send({success: true, message: 'Issue status updated', data: update});
      }
    });
  });


  //======================
  // DELETE ISSUE BY ID
  //======================
  router.delete('/api/issues/:id', function(req, res) {
    const {id} = req.params;
    Issue.remove({_id: id}, function(err, issue) {
      if (err)
        res.status(200).send({
          success: false,
          message: 'Could not delete issue. Try again later!',
        });
      else
        res
          .status(200)
          .send({success: true, message: 'Issue deleted', data: []});
    });
  });

  //=====================
  // POST ISSUE SUBSCRIBTION
  //=====================
  router.post('/api/issues/:issue_id/subscribe', function(req, res) {
    const {issue_id} = req.params;
    const {user_id} = req.body;
    if (issue_id === '' || issue_id === undefined || user_id === '' || user_id === undefined) {
      res
        .status(200)
        .send({
          success: false,
          message: 'Unable to subscribe to issue. Please try again later!',
        });
      return;
    }
    let data = {
      user_id,
      issue_id
    };
    const issueSubscription = new IssueSubscription(data);
    issueSubscription.save(function(err, data) {
      if (err) {
        res.status(200).send({
          success: false,
          message: 'Unable to subscribe to issue. Please try again later!',
        });
      } else {
        res.status(200).send({
          success: true,
          message: 'Successfully subscribed to issue',
          data: data,
        });
      }
    });
  });
  //=====================
// DELETE ISSUE SUBSCRIPTION
//=====================
router.post('/api/issues/:issue_id/unsubscribe', function(req, res) {
  const { issue_id } = req.params;
  const { user_id } = req.body;

  IssueSubscription.remove({ issue_id, user_id }, function(err) {
    if (err) {
      return res.status(200).send({
        success: false,
        message: 'Could not unsubscribe from issue. Please try again later!',
      });
    }

    return res.status(200).send({
      success: true,
      message: 'Successfully unsubscribed from issue',
      data: [],
    });
  });
});
}; 