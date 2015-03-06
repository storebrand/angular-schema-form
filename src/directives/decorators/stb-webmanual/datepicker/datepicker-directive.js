angular.module('schemaForm').directive('stbDatepicker', ['$timeout', function($timeout) {
  return {
    restrict: 'A',
    require : 'ngModel',
    priority: 0, // needed for angular 1.2.x
    link : function (scope, element, attrs, ngModelCtrl) {
      element.unbind('input').unbind('keydown').unbind('change');

      if (!$.fn.datetimepicker) {
        return;
      }
      var today = moment();
      var difference =  scope.$eval(attrs.monthlyDifference);

      $(element).parent().datetimepicker({
        pickTime: false,
        useCurrent: false,
        language: 'nn',
        format: "DD.MM.YY",
        minDate: scope.$eval(attrs.minDate) || scope.$eval(attrs.disableUntilToday) && today.toDate(),
        maxDate: scope.$eval(attrs.maxDate) || difference && moment(today).add(difference, 'Month').toDate()
    }).on('dp.change', function (e) {

        // TODO: remove it after debug
        console.log('dp.change fired on ' + attrs.ngModel + '!!!');

        scope.$apply(function () {
         ngModelCtrl.$setViewValue(moment(e.date).format('YYYY-MM-DD'));

          // TODO: remove it after debug
          console.log('$pristine: ' + ngModelCtrl.$pristine || 'undefined');
          console.log('$dirty: ' + ngModelCtrl.$dirty || 'undefined');
          console.log('$invalid: ' + ngModelCtrl.$invalid || 'undefined');
          console.log('$viewValue: ' + ngModelCtrl.$viewValue);
          console.log('$modelValue: ' + ngModelCtrl.$modelValue);
        });
      }).on('dp.error', function (e) {
        // TODO: remove it after debug
        console.log('dp.error fired on ' + attrs.ngModel + '!!!');
        scope.$apply(function () {

          ngModelCtrl.$setViewValue(undefined);

          // TODO: remove it after debug
          console.log('$pristine: ' + ngModelCtrl.$pristine || 'undefined');
          console.log('$dirty: ' + ngModelCtrl.$dirty || 'undefined');
          console.log('$invalid: ' + ngModelCtrl.$invalid || 'undefined');
          console.log('$viewValue: ' + ngModelCtrl.$viewValue);
          console.log('$modelValue: ' + ngModelCtrl.$modelValue);
        });
      });

      $timeout(function () {
        //$(element).parent().data("DateTimePicker").setDate(moment(ngModelCtrl.$viewValue).format("DD.MM.YY"));
      }, 0);

    }
  };
}]);