angular.module('schemaForm').directive('stbCurrency', ['$timeout', function($timeout) {
  'use strict';

  return {
    restrict: 'A',
    require : 'ngModel',
    priority: 0, // needed for angular 1.2.x
    link : function (scope, element, attrs, ngModelCtrl) {
      scope.value = {};

      try {
        scope.value = JSON.parse(ngModelCtrl.$modelValue);
      }
      catch(err){
        console.log('Error parsing JSON', err);
      }

      scope.onCurrencyChange = function(){
        ngModelCtrl.$setViewValue(JSON.stringify(scope.value));
      };

      scope.currenciesList = [
        {
          value: 'KR',
          title: 'KR'
        },
        {
          value: 'UAH',
          title: 'UAH'
        },
        {
          value: 'USD',
          title: 'USD'
        }
      ];
    }
  };
}]);