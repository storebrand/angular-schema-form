angular.module('schemaForm').directive('stbCurrency', function() {
  'use strict';

  return {
    restrict: 'A',
    require : 'ngModel',
    priority: 0, // needed for angular 1.2.x
    link : function (scope, element, attrs, ngModelCtrl) {
      scope.value = {};

      try {
        if (ngModelCtrl.$modelValue) {
          scope.value = JSON.parse(ngModelCtrl.$modelValue);
        }
      }
      catch(err){
        console.log('Error parsing JSON', err);
      }

      scope.$watch(scope.keyModelName, function(){
        scope.value = ngModelCtrl.$viewValue ? JSON.parse(ngModelCtrl.$viewValue) : {};
      });

      scope.onChange = function(){
        ngModelCtrl.$setViewValue(JSON.stringify(scope.value));
      };

      scope.currencies = attrs.currencies ? JSON.parse(attrs.currencies) : [];
    }
  };
});