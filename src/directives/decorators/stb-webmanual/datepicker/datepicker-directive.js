angular.module('schemaForm').directive('stbDatepicker', ['$timeout', '$rootScope', function($timeout, $rootScope) {
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

      var name = _.last(scope.$eval(attrs.name));

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

      /* --- subscriptions --- */
      scope.$watch('model', onModelChange);
      scope.$watch(scope.keyModelName, setDatepickerValue);

      scope.$on('datetimepicker.changed', function(event, data){
        var restrict = {
          min: data.name === attrs.minDate && data.value,
          max: data.name === attrs.maxDate && data.value
        };

        setDatepickerRestrictions(restrict);

        var isMaxDateSelected = maxDate.diff(ngModelCtrl.$viewValue, 'days') === 0;
        var isMinDateSelected = minDate.diff(ngModelCtrl.$viewValue, 'days') === 0;

        if (showTime){
          setTimepickerRestrictions(isMaxDateSelected && maxTime, isMinDateSelected && minTime);
        }
      });

      if (showTime){
        initTimepicker();
        scope.selectedTimeChanged = function(){
          if(ngModelCtrl.$modelValue) {
            ngModelCtrl.$setViewValue(getInputsDateTime());
          }
        };
      } else {
        element.addClass('no-timepicker');
      }

      function onModelChange(){
        $timeout(function() {
          var restrict = {
            min: minDate.isValid() ? null : scope.$eval(attrs.minDate),
            max: maxDate.isValid() ? null : scope.$eval(attrs.maxDate)
          };

          setDatepickerRestrictions(restrict);
        });
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

      function setDatepickerRestrictions(restrict) {
        if (restrict.min && moment(restrict.min).isValid()) {
          minDate = moment(restrict.min);
          minTime = moment(minDate, 'YYYY-MM-DDTHH:mm:ss').format('HH:mm');
          if (defaultDate < minDate){
            defaultDate = minDate;
          }
          $(element).data('DateTimePicker').setMinDate(minDate);
        }

        if (restrict.max && moment(restrict.max).isValid()) {
          maxDate = moment(restrict.max);
          maxTime = maxDate.format('HH:mm');
          if (defaultDate > maxDate){
            defaultDate = maxDate;
          }
          $(element).data('DateTimePicker').setMaxDate(maxDate);
        }
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

      function setDatepickerValue() {
        $timeout(function() {
          var viewValue = moment(ngModelCtrl.$viewValue, 'YYYY-MM-DDTHH:mm:ss');

          var isMaxDateSelected = maxDate.diff(viewValue, 'days') === 0;
          var isMinDateSelected = minDate.diff(viewValue, 'days') === 0;

          if (showTime){
            setTimepickerRestrictions(isMaxDateSelected && maxTime, isMinDateSelected && minTime);
          }

          if (viewValue.isValid()){
            var viewDate = viewValue.format('DD.MM.YY');
            $(element).data('DateTimePicker').setDate(viewDate);
            $rootScope.$broadcast('datetimepicker.changed', {name: name, value: viewValue});
          }

        });
      }

    }
  };
}]);