angular.module('schemaForm').directive('stbCurrency', function() {
  'use strict';

  return {
    restrict: 'A',
    require : 'ngModel',
    priority: 0, // needed for angular 1.2.x
    link : function (scope, element, attrs, ngModelCtrl) {
      scope.value = {};
      var name = _.last(scope.$eval(attrs.name));

      try {
        if (ngModelCtrl.$modelValue) {
          scope.value = JSON.parse(ngModelCtrl.$modelValue);
        }
      }
      catch(err){
        console.log('Error parsing JSON', err);
      }

      scope.$watch(scope.keyModelName, function(){
        scope.value = ngModelCtrl.$viewValue ?
                        JSON.parse(ngModelCtrl.$viewValue) :
                        {currency: (scope.currencies[0] || {}).value};
      });

      scope.onSumChange = function(){
        if (scope.value){
          scope.model[name] = JSON.stringify(scope.value);
        }
        ngModelCtrl.$setViewValue(JSON.stringify(scope.value));
      };

      scope.onCurrChange = function(){
        if (scope.value){
          scope.model[name] = JSON.stringify(scope.value);
        }
      };

      scope.currencies = attrs.currencies ? JSON.parse(attrs.currencies) : [];
    }
  };
});