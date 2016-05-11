var app = angular.module('blueberries', ['ngRoute']);

app.config(function($routeProvider) {
  $routeProvider

    .when('/', {
      templateUrl : 'pages/home.tpl.html',
    })

    .when('/blueberries', {
      templateUrl : 'pages/blueberries.tpl.html',
    })

    .when('/panel', {
      templateUrl : 'pages/panel.tpl.html',
    })
});
