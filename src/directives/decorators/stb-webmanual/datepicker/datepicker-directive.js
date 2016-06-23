angular.module('schemaForm').directive('stbDatepicker', ['$timeout', function($timeout) {
  return {
    restrict: 'A',
    require : 'ngModel',
    priority: 1, // needed for angular 1.2.x
    link : function (scope, element, attrs, ngModelCtrl) {
      element.unbind('input').unbind('keydown').unbind('change');

      if (!$.fn.datetimepicker) {
        return;
      }
      var today = moment();
      var difference =  scope.$eval(attrs.monthlyDifference);
      var hasDefaultDate = scope.$eval(attrs.hasDefaultDate);



      $(element).parent().datetimepicker({
        pickTime: false,
        language: 'nb',
        format: "DD.MM.YYYY",
        minDate: scope.$eval(attrs.minDate) || scope.$eval(attrs.disableUntilToday) && today.toDate(),
        maxDate: scope.$eval(attrs.maxDate) || difference && moment(today).add(difference, 'Month').toDate()
    }).on('dp.change', function (e) {
        scope.$apply(function () {
          ngModelCtrl.$setViewValue(moment(e.date).format('YYYY-MM-DD'));
        });
      }).on('dp.error', function (e) {
        scope.$apply(function () {
          ngModelCtrl.$setViewValue(undefined);
        });
      });

      $timeout(function () {
        if(hasDefaultDate) {
          $(element).parent().data("DateTimePicker").setDate(moment(ngModelCtrl.$viewValue).format("DD.MM.YYYY"));
        }
      }, 0);

    }
  };
}]);