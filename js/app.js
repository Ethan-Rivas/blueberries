var app = angular.module('blueberries', ['ngRoute', 'ui.bootstrap']);

app.config(function($routeProvider) {
  $routeProvider

    .when('/', {
      templateUrl : 'pages/home.tpl.html'
    })

    .when('/blueberries', {
      controller: 'ReadingController',
      templateUrl : 'pages/blueberries.tpl.html'
    })

    .when('/panel', {
      templateUrl : 'pages/panel.tpl.html'
    })
});

app.controller('ReadingController', ['$scope', '$uibModal', function($scope, $uibModal) {
  $scope.openModal = function() {
    $uibModal.open({
      templateUrl: 'pages/error.tpl.html',
      controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
        $scope.cancel = function() {
          $uibModalInstance.dismiss();
        };
      }]
    });
  };
}]);
