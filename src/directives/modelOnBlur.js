// override the default input to update on blur
angular.module('schemaForm').directive('ngModelOnblur', ['formFormatters', '$parse', function(formFormatters, $parse) {
  return {
    restrict: 'A',
    require: 'ngModel',
    priority: 1, // needed for angular 1.2.x
    link: function(scope, elm, attr, ngModelCtrl) {
      if (attr.type === 'radio' || attr.type === 'checkbox') return;

      var formatter = formFormatters.getFormatter(scope.$eval(attr.formatterName)) || function (input) {
          return input;
      };

      elm.unbind('input').unbind('keydown').unbind('change');
      elm.bind('blur', function() {

        // TODO: remove it after debug
        console.log(attr.ngModel + ': elm.bind("blur") fired!!!');

        scope.$apply(function() {
          if (!/[^\s]/.test(elm.val()) && ngModelCtrl.$pristine) {
          } else {
            ngModelCtrl.$setViewValue(formatter(elm.val()));
            ngModelCtrl.$render();
          }
        });
      });

      var maxLength = scope.$eval(attr.modelMaxLength);


      if (angular.isDefined(maxLength)) {

        elm.bind('keydown', function (e) {
          var charCode = e.which;
          var nonPrintableAllowed =
              charCode < 32
              || (charCode > 34 && charCode < 41) // home, end, arrows
              || charCode === 46; // delete

          if (nonPrintableAllowed) {
            return true;
          }

          if (elm.val().length >= maxLength) {
            e.preventDefault();
          }
        });

      }
    }
  };
}]);