angular.module('schemaForm').directive('schemaValidate', ['sfValidator', function(sfValidator) {
  return {
    restrict: 'A',
    scope: false,
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {

      var error = null;

      if (attrs.type === 'radio') {
        scope = scope.$parent;
      }
      //Since we have scope false this is the same scope
      //as the decorator
      if (!scope.ngModelHolder) {
        scope.ngModelHolder = ngModel;
      }

      var form   = scope.$eval(attrs.schemaValidate);
      // Validate against the schema.
      var validate = function(viewValue) {
        if (!form) {
          form = scope.$eval(attrs.schemaValidate);
        }

        //Still might be undefined
        if (!form) {
          return viewValue;
        }

        // Is required is handled by ng-required?
        if (angular.isDefined(attrs.ngRequired) && angular.isUndefined(viewValue)) {
          return undefined;
        }

        // An empty field gives us the an empty string, which JSON schema
        // happily accepts as a proper defined string, but an empty field
        // for the user should trigger "required". So we set it to undefined.
        if (viewValue === '') {
          viewValue = undefined;
        }

        var result = sfValidator.validate(form, viewValue);

          if (result.valid) {
            // it is valid
            scope.ngModelHolder.$setValidity('schema', true);
            return viewValue;
          } else {
            // it is invalid, return undefined (no model update)
            scope.ngModelHolder.$setValidity('schema', false);
            error = result.error;
            return undefined;
          }
        };

      // Unshift onto parsers of the ng-model.
      ngModel.$parsers.unshift(validate);


      // Listen to an event so we can validate the input on request
      scope.$on('schemaFormValidate', function() {

        if (scope.ngModelHolder.$commitViewValue) {
          scope.ngModelHolder.$commitViewValue(true);
        } else {
          scope.ngModelHolder.$setViewValue(scope.ngModelHolder.$viewValue);
        }
      });

      //This works since we now we're inside a decorator and that this is the decorators scope.
      //If empty don't show success (even if it's valid)
      scope.hasSuccess = function() {
        return scope.ngModelHolder.$valid && !scope.ngModelHolder.$isEmpty(scope.ngModelHolder.$modelValue);
      };

      scope.hasError = function() {
        return scope.ngModelHolder.$invalid && !scope.ngModelHolder.$pristine;
      };

      scope.schemaError = function() {
        return error;
      };

    }
  };
}]);
