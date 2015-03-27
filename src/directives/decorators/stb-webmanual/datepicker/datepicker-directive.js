angular.module('schemaForm').directive('stbDatepicker', ['$timeout', function($timeout) {
  'use strict';

  return {
    restrict: 'A',
    require : 'ngModel',
    priority: 0, // needed for angular 1.2.x
    link : function (scope, element, attrs, ngModelCtrl) {
      element.unbind('input').unbind('keydown').unbind('change');

      if (!$.fn.datetimepicker) {
        return;
      }

      var HH = 24;
      var noon = '12:00';
      var today = moment();
      var tomorrow = moment().add(1, 'day');

      var reservedDates = {
        today: today,
        tomorrow: tomorrow
      };

      var $date = $(element).find('input');

      var difference =  scope.$eval(attrs.monthlyDifference);

      var minDate = reservedDates[attrs.minDate] || moment(attrs.minDate) || scope.$eval(attrs.disableUntilToday) && today.toDate();
      var maxDate = reservedDates[attrs.maxDate] || moment(attrs.maxDate) || difference && moment(today).add(difference, 'Month').toDate();

      var minTime = roundTime(minDate);
      var maxTime = roundTime(maxDate);

      var showTime = Boolean(attrs.showTime);

      var defaultDate = attrs.defaultDate;

      var defaultTime = attrs.defaultTime ||
        (maxDate && maxDate.diff(moment(defaultDate)) === 0 && maxTime<noon ? maxTime :
          (minDate && minDate.diff(moment(defaultDate)) === 0 && minTime>noon ? minTime : noon));

      scope.timeOptions = [];

      var events = attrs.events || {};

      $(element).datetimepicker({
        pickTime: false,
        language: 'nn',
        format: 'DD.MM.YY',
        useCurrent: false,
        minDate: minDate,
        maxDate: maxDate
      }).on('dp.change', function () {
        scope.$apply(function () {
          var modelDateTime = getModelDateTime();

          if (showTime && maxDate){
            var isMaxDateSelected = maxDate.diff(modelDateTime, 'days') === 0;
            var isMinDateSelected = minDate.diff(modelDateTime, 'days') === 0;
            if (isMaxDateSelected && scope.selectedTime>maxTime || isMinDateSelected && scope.selectedTime<minTime){
              scope.selectedTime = defaultTime;
              modelDateTime = getModelDateTime();
            }
          }
          ngModelCtrl.$setViewValue(modelDateTime);
        });
      }).on('dp.error', function () {
        scope.$apply(function () {
          ngModelCtrl.$setViewValue(undefined);
        });
      });

      var evaledDate;
      scope.$watch(scope.keyModelName, function() {
        $timeout(function() {
          evaledDate = scope.$eval(attrs.minDate);
          console.log('minDate', evaledDate);
          if (!minDate.isValid() && evaledDate && moment(evaledDate).isValid()) {
            minDate = moment(evaledDate);
            if (defaultDate < minDate){
              defaultDate = minDate;
            }
            $(element).data('DateTimePicker').setMinDate(minDate);
          }

          evaledDate = scope.$eval(attrs.maxDate);
          console.log('maxDate', evaledDate);
          if (!maxDate.isValid() && evaledDate && moment(evaledDate).isValid()) {
            maxDate = moment(evaledDate);
            if (defaultDate > maxDate){
              defaultDate = maxDate;
            }
            $(element).data('DateTimePicker').setMaxDate(maxDate);
          }

          var isMaxDateSelected = maxDate.diff(ngModelCtrl.$viewValue, 'days') === 0;
          var isMinDateSelected = minDate.diff(ngModelCtrl.$viewValue, 'days') === 0;
          setTimepickerRestrictions(showTime && isMaxDateSelected && maxTime, showTime && isMinDateSelected && minTime);

          scope.selectedTime = getViewTime();

          var viewVal = ngModelCtrl.$viewValue;

          if (viewVal){
            var viewDate = getViewDate();
            $(element).data('DateTimePicker').setDate(viewDate);
          }
        });
      });

      if (showTime){
        initTimepicker();
        scope.selectedTimeChanged = function(){
          ngModelCtrl.$setViewValue(getModelDateTime());
        };
      }

      /* --- function is used to set model's viewValue --- */
      function getModelDateTime(){
        var date = $date.val();
        return toIsoFormat(date, scope.selectedTime);
      }

      /* --- helper functions --- */
      function toIsoFormat(date, time){
        return moment(date, 'DD.MM.YY').format('YYYY-MM-DD') +
                (showTime ? ('T'+moment(time, 'HH:mm').format('HH:mm:ss')) : '');
      }

      function formatTime(time){
        return (time || '').replace(/^(\d{1}):/, '0$1:');
      }

      function roundTime(time){
        if (!time) return null;

        var roundInterval = 30;
        var remainder = time.minute() % roundInterval;

        return time
                .subtract('minutes', remainder)
                .format('HH:mm');
      }

      /* --- functions for initial val setting --- */
      function getViewTime(){
        return ngModelCtrl.$viewValue ? moment(ngModelCtrl.$viewValue).format('HH:mm') : defaultTime;
      }

      function getViewDate(){
        return ngModelCtrl.$viewValue && moment(ngModelCtrl.$viewValue).format('DD.MM.YY');
      }

      function initTimepicker(){
        for (var h=0; h<HH; h++){
          [':00', ':30'].forEach(function(mins){
            scope.timeOptions.push({
              value: formatTime(h + mins),
              isDisabled: false
            });
          });
        }
      }

      function setTimepickerRestrictions(maxTimeOption, minTimeOption){
        scope.timeOptions.forEach(function(timeOption){
          timeOption.isDisabled = (maxTimeOption && timeOption.value > maxTimeOption) ||
            (minTimeOption && timeOption.value < minTimeOption);
        });
      }

    }
  };
}]);