angular.module('schemaForm').directive('schemaValidate', ['sfValidator', function (sfValidator) {
  return {
    restrict: 'A',
    scope: false,
    // We want the link function to be *after* the input directives link function so we get access
    // the parsed value, ex. a number instead of a string
    priority: 1000,
    require: 'ngModel',
    link: function (scope, element, attrs, ngModel) {

      var error = null;

      if (attrs.type === 'radio') {
        scope = scope.$parent;
        if (!scope.ngModel) {
          scope.ngModel = ngModel
        }
      } else {
        //Since we have scope false this is the same scope
        //as the decorator
        scope.ngModel = ngModel;
      }

      var getForm = function () {
        if (!form) {
          form = scope.$eval(attrs.schemaValidate);
        }
        return form;
      };

      var form = getForm();
      if (form.copyValueTo) {
        ngModel.$viewChangeListeners.push(function () {
          var paths = form.copyValueTo;
          angular.forEach(paths, function (path) {
            sfSelect(path, scope.model, ngModel.$modelValue);
          });
        });
      }

      // Validate against the schema.

      // Get in last of the parses so the parsed value has the correct type.
      if (ngModel.$validators) { // Angular 1.3
        ngModel.$validators.schema = function (value) {
          var result = sfValidator.validate(getForm(), value);
          error = result.error;
          return result.valid;
        };
      } else {

        // Angular 1.2
        ngModel.$parsers.push(function (viewValue) {
          form = getForm();
          //Still might be undefined
          if (!form) {
            return viewValue;
          }

          var result = sfValidator.validate(form, viewValue);

          if (result.valid) {
            // it is valid
            ngModel.$setValidity('schema', true);
            return viewValue;
          } else {
            // it is invalid, return undefined (no model update)
            ngModel.$setValidity('schema', false);
            error = result.error;
            return undefined;
          }
        });
      }

      var isNeedToValidate = function (currentKey, keysToValidate) {
        var result = true;

        if (keysToValidate && keysToValidate.indexOf(currentKey) < 0) {
          result = false;
        }

        return result;
      };

      // Listen to an event so we can validate the input on request
      scope.$on('schemaFormValidate', function (event, args) {

        var modelKeys = args && args.modelKeys;
        var modelKeysValidationResult = args && args.modelKeysValidationResult;

        if (modelKeys && !modelKeys.indexOf) {
          throw '"modelKeys" property of arguments passed should be an array';
        }

        if (isNeedToValidate(form.key[0], modelKeys)) {

          if (modelKeys && !modelKeysValidationResult) {
            throw '"modelKeysValidationResult" property of arguments passed should be defined';
          }

          if (ngModel.$validate) {
            ngModel.$validate();

            modelKeysValidationResult[form.key[0]] = {
              isValid: ngModel.$valid
            };

            if (ngModel.$invalid) { // The field must be made dirty so the error message is displayed
              ngModel.$dirty = true;
              ngModel.$pristine = false;
            }
          } else {
            ngModel.$setViewValue(ngModel.$viewValue);
          }
        }

      });


      //This works since we now we're inside a decorator and that this is the decorators scope.
      //If $pristine and empty don't show success (even if it's valid)
      scope.hasSuccess = function () {
        return ngModel.$valid && (!ngModel.$pristine || !ngModel.$isEmpty(ngModel.$modelValue));
      };

      scope.hasError = function () {
        return ngModel.$invalid && !ngModel.$pristine;
      };

      scope.schemaError = function () {
        return error;
      };

    }
  };
}]);
