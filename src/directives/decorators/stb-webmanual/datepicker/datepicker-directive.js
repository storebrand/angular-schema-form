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

      scope.timeOptions = [];

      $(element).datetimepicker({
        pickTime: false,
        language: 'nb',
        format: 'DD.MM.YY',
        useCurrent: false,
        minDate: minDate,
        maxDate: maxDate
      }).on('dp.change', function () {
        scope.$apply(function () {
          ngModelCtrl.$setViewValue(getInputsDateTime());
        });
      }).on('dp.error', function () {
        scope.$apply(function () {
          ngModelCtrl.$setViewValue(undefined);
        });
      });

      scope.$watch('model', setDatepickerRestrictions);
      scope.$watch(scope.keyModelName, setDatepickerValue);

      if (showTime){
        initTimepicker();
        scope.selectedTimeChanged = function(){
          ngModelCtrl.$setViewValue(getInputsDateTime());
        };
      }

      /* --- function is used to set model's viewValue --- */
      function getInputsDateTime(){
        return toIsoFormat($date.val(), scope.selectedTime);
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
        return ngModelCtrl.$viewValue ?
          moment(ngModelCtrl.$viewValue).format('HH:mm') :
          calculateDefaultTime(defaultDate);
      }

      function calculateDefaultTime(selectedDate){
        var isMaxDateSelected = selectedDate && maxDate && maxDate.diff(selectedDate, 'days') === 0;
        var isMinDateSelected = selectedDate && minDate && minDate.diff(selectedDate, 'days') === 0;

        return attrs.defaultTime ||
          (isMaxDateSelected && maxTime < noon ? maxTime :
            (isMinDateSelected && minTime > noon ? minTime : noon));
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

        element.addClass('has-timepicker');
      }

      function setTimepickerRestrictions(maxTimeOption, minTimeOption){
        var selectedTime = scope.selectedTime;

        if (selectedTime) {
          scope.timeOptions.forEach(function(timeOption){
            timeOption.isDisabled = (maxTimeOption && timeOption.value > maxTimeOption) ||
              (minTimeOption && timeOption.value < minTimeOption);
          });
        }

        var isInMaxTimeRange = !maxTimeOption || selectedTime <= maxTimeOption;
        var isInMinTimeRange = !minTimeOption || selectedTime >= minTimeOption;

        scope.selectedTime = isInMaxTimeRange && isInMinTimeRange ? getViewTime() :
          calculateDefaultTime(ngModelCtrl.$viewValue);
      }

      function setDatepickerRestrictions() {
        $timeout(function() {
          if (!minDate.isValid()){
            var _minDate = scope.$eval(attrs.minDate);
            if (_minDate && moment(_minDate).isValid()) {
              minDate = moment(_minDate);
              if (defaultDate < minDate){
                defaultDate = minDate;
              }
              $(element).data('DateTimePicker').setMinDate(minDate);
            }
          }

          if (!maxDate.isValid()){
            var _maxDate = scope.$eval(attrs.maxDate);
            if (_maxDate && moment(_maxDate).isValid()) {
              maxDate = moment(_maxDate);
              if (defaultDate > maxDate){
                defaultDate = maxDate;
              }
              $(element).data('DateTimePicker').setMaxDate(maxDate);
            }
          }
        });
      }

      function setDatepickerValue() {
        $timeout(function() {
          var viewValue = moment(ngModelCtrl.$viewValue, 'YYYY-MM-DD');

          var isMaxDateSelected = maxDate.diff(viewValue, 'days') === 0;
          var isMinDateSelected = minDate.diff(viewValue, 'days') === 0;

          if (showTime){
            setTimepickerRestrictions(isMaxDateSelected && maxTime, isMinDateSelected && minTime);
          }

          if (viewValue.isValid()){
            var viewDate = viewValue.format('DD.MM.YY');
            $(element).data('DateTimePicker').setDate(viewDate);
          }

        });
      }

    }
  };
}]);