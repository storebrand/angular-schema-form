angular.module('schemaForm').directive('stbDatepicker', ['$timeout', function($timeout) {
  'use strict';

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

      var $date = $(element).find('input');
      var $time = $(element).find('select');

      var defaultTime = attrs.defaultTime || '12:00';
      var defaultDate = attrs.defaultDate || moment();
      var showTime = Boolean(attrs.showTime);

      $(element).datetimepicker({
        pickTime: false,
        language: 'nn',
        format: 'DD.MM.YY',
        minDate: scope.$eval(attrs.minDate) || scope.$eval(attrs.disableUntilToday) && today.toDate(),
        maxDate: scope.$eval(attrs.maxDate) || difference && moment(today).add(difference, 'Month').toDate()
      }).on('dp.change', function () {
        scope.$apply(function () {
          ngModelCtrl.$setViewValue(getModelDateTime());
        });
      }).on('dp.error', function () {
        scope.$apply(function () {
          ngModelCtrl.$setViewValue(undefined);
        });
      });

      scope.$watch(scope.keyModelName, function() {
          /* --- set initial values for date and time --- */
          $timeout(function() {
            $time.val(ngModelCtrl.$viewValue ? getViewTime() : defaultTime);
            $(element).data('DateTimePicker').setDate(ngModelCtrl.$viewValue ? getViewDate() : defaultDate);
          });
      });

      if (showTime){
        var HH = 24;

        for (var h=0; h < HH; h++){
          $time.append(
            '<option>'+formatTime(h+':00')+'</option>'+
            '<option>'+formatTime(h+':30')+'</option>'
          );
        }

        $time.change(function() {
          scope.$apply(function () {
            ngModelCtrl.$setViewValue(getModelDateTime());
         });
        });
      }

      /* --- function is used to set model's viewValue --- */
      function getModelDateTime(){
        var date = $date.val();
        var time = $time.val();

        return toIsoFormat(date, time);
      }

      /* --- helper functions --- */
      function toIsoFormat(date, time){
        return moment(date, 'DD.MM.YY').format('YYYY-MM-DD')+(showTime ? ('T'+moment(time, 'HH:mm').format('HH:mm:ss')) : '');
      }

      function formatTime(time){
        return (time || '').replace(/^(\d{1}):/, '0$1:');
      }

      /* --- functions for initial val setting --- */
      function getViewTime(){
        return moment(ngModelCtrl.$viewValue).format('HH:mm');
      }

      function getViewDate(){
        return moment(ngModelCtrl.$viewValue).format('DD.MM.YY');
      }

    }
  };
}]);