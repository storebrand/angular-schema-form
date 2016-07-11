// override the default input to update on blur

function addSpaces(val) {
  var commas, decimals, wholeNumbers;
  decimals = val.indexOf('.') == -1 ? '' : val.replace(/^-?\d+(?=\.)/, '');
  wholeNumbers = val.replace(/(\.\d+)$/, '');
  commas = wholeNumbers.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
  return "" + commas + decimals;
}

function isValid(val) {
  val = typeof val === 'string' ? val : val.toString();
  var withoutSpaces = val.replace(/\s/g, '');
  var parsed = parseFloat(withoutSpaces);
  return !isNaN(parsed) && parsed.toString().length === withoutSpaces.length;
}

angular.module('schemaForm').directive('numberFormat', function() {
  return {
    restrict: 'A',
    priority: 1,
    require: 'ngModel',
    link: function(scope, elm, attr, ngModelCtrl) {

      elm.unbind('input').unbind('keydown').unbind('change');

      ngModelCtrl.$parsers.unshift(function(viewVal) {
        var noSpacesVal = viewVal.replace(/\s/g, '');
        var parsed = parseFloat(noSpacesVal);
          if (isNaN(parsed) || !isValid(viewVal)) {
            return undefined;
          } else {
            return parsed;
          }
      });
      ngModelCtrl.$formatters.push(function(val) {
        if (!val || val === '') {
          return '';
        }
        if (val == null) {
          return val;
        }

        
        val = addSpaces(val.toString());
        return val;
      });
      elm.bind('blur', function() {
        scope.$apply(function() {
          var formatter, viewValue, _i, _len, _ref;
          viewValue = elm.val();
          if (!/[^\s]/.test(viewValue) && ngModelCtrl.$pristine && !ngModelCtrl.$viewValue) {
            return;
          }
          _ref = ngModelCtrl.$formatters;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            formatter = _ref[_i];
            viewValue = formatter(viewValue);
          }
          ngModelCtrl.$setViewValue(viewValue);
          ngModelCtrl.$render();
        });
      });

      elm.bind('focus', function() {
        var val;
        val = elm.val();
        elm.val(val.replace(/\s/g, ''));
      });
    }
  };
});