var {issue_tracker_conn} = require('./connections');
var mongoose = require('mongoose');
var IssueSubscriptionSchema = new mongoose.Schema({
	user_id: String,
	issue_id: String,
	muted: { type: Boolean, default: false }
});
module.exports = issue_tracker_conn.model(
	'IssueSubscription',
	IssueSubscriptionSchema,
	'issuesubscriptions'
  );