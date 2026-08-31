App.factory('AnalyticsService', ['$http', function($http) {
    return {
      getOverview: function() {
        return $http.get('/api/analytics/overview');
      }
    };
  }]);
  