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
      
      elm.bind('keydown', function (e) {

        var maxLength = scope.$eval(attr.modelMaxLength);

        // Allow: backspace, delete, tab, escape, enter and .
        if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) !== -1 ||
            // Allow: Ctrl+A
            (e.keyCode == 65 && e.ctrlKey === true) ||
            // Allow: Ctrl+C
            (e.keyCode == 67 && e.ctrlKey === true) ||
            // Allow: Ctrl+X
            (e.keyCode == 88 && e.ctrlKey === true) ||
            // Allow: Ctrl+V
            (e.keyCode == 86 && e.ctrlKey === true) ||
            // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)) {
          // let it happen, don't do anything
          return;
        }
        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
          e.preventDefault();
        }

        if (angular.isDefined(maxLength) &&  elm.val().length >= maxLength) {
          e.preventDefault();
        }
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