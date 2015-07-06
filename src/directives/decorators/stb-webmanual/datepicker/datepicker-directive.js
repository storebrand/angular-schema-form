angular.module('schemaForm').directive('stbDatepicker', ['$timeout', '$rootScope', function($timeout, $rootScope) {
  'use strict';

  var dateTimeFormat = 'YYYY-MM-DDTHH:mm:ss';
  var dateFormat = 'YYYY-MM-DD';
  var timeFormat = 'HH:mm';
  var sstimeFormat = 'HH:mm:ss';

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
      scope.$watch(scope.keyModelName, onKeyModelChange);

      scope.$on('datetimepicker.changed', function(event, data){
        if (data.name === name) return;

        var restrict = {
          min: data.name === attrs.minDate && data.value,
          max: data.name === attrs.maxDate && data.value
        };

        setDatepickerRestrictions(restrict);

        if (scope.selectedTime){
          var selectedDateTimeVal = minDate.isValid() && minDate.format(dateTimeFormat) > ngModelCtrl.$viewValue ?
                minDate.format(dateTimeFormat) :
                  (maxDate.isValid() && maxDate.format(dateTimeFormat) < ngModelCtrl.$viewValue ?
                    maxDate.format(dateTimeFormat) : ngModelCtrl.$viewValue);

          reinitTimepicker(selectedDateTimeVal);
          setDatepickerValue(selectedDateTimeVal, true);
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

      function onKeyModelChange(){
        $timeout(function(){
          scope.selectedTime = getViewTime();
          reinitTimepicker(ngModelCtrl.$viewValue);
          setDatepickerValue(ngModelCtrl.$viewValue);
        });
      }

      /* --- function is used to set model's viewValue --- */
      function getInputsDateTime(){
        return toIsoFormat($date.val(), scope.selectedTime);
      }

      /* --- helper functions --- */
      function toIsoFormat(date, time){
        return moment(date, 'DD.MM.YY').format(dateFormat) +
                (showTime ? ('T'+moment(time, timeFormat).format(sstimeFormat)) : '');
      }

      function formatTime(time){
        return (time || '').replace(/^(\d{1}):/, '0$1:');
      }

      function roundTime(time){
        if (!time) return null;

        var roundInterval = 30;
        var remainder = time.minute() % roundInterval;

        return time.subtract('minutes', remainder).format(timeFormat);
      }

      function areEqualDates(date1, date2){
        return date1 && date2 && moment(date1).isValid() && moment(date1).isValid() &&
            moment(date1).format(dateFormat) === moment(date2).format(dateFormat);
      }

      /* --- functions for initial val setting --- */
      function getViewTime(){
        return ngModelCtrl.$viewValue ?
          moment(ngModelCtrl.$viewValue).format(timeFormat) :
          calculateDefaultTime(defaultDate);
      }

      function calculateDefaultTime(selectedDate){
        var isMaxDateSelected = areEqualDates(maxDate, selectedDate);
        var isMinDateSelected = areEqualDates(minDate, selectedDate);

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
          minTime = moment(minDate, dateTimeFormat).format(timeFormat);

          if (defaultDate < minDate){
            defaultDate = minDate;
          }
          $(element).data('DateTimePicker').setMinDate(minDate);
        }

        if (restrict.max && moment(restrict.max).isValid()) {
          maxDate = moment(restrict.max);
          maxTime = maxDate.format(timeFormat);

          if (defaultDate > maxDate){
            defaultDate = maxDate;
          }
          $(element).data('DateTimePicker').setMaxDate(maxDate);
        }
      }

      function setDatepickerValue(dateTimeValue, isSilent) {
        var viewValue = moment(dateTimeValue, dateTimeFormat);

        if (viewValue.isValid()){
          var viewDate = viewValue.format('DD.MM.YY');
          $(element).data('DateTimePicker').setDate(viewDate);
          if (!isSilent) $rootScope.$broadcast('datetimepicker.changed', {name: name, value: viewValue});
        }
      }

      function setTimepickerRestrictions(maxTimeOption, minTimeOption){
          scope.timeOptions.forEach(function(timeOption){
            timeOption.isDisabled = (maxTimeOption && timeOption.value > maxTimeOption) ||
              (minTimeOption && timeOption.value < minTimeOption);
          });
      }

      function reinitTimepicker(dateTimeValue){
        var viewValue = moment(dateTimeValue, dateTimeFormat);

        if (showTime){
          var _maxTimeToSet = areEqualDates(maxDate, viewValue) && maxTime;
          var _minTimeToSet = areEqualDates(minDate, viewValue) && minTime;

          var isInMaxTimeRange = !_maxTimeToSet || scope.selectedTime <= _maxTimeToSet;
          var isInMinTimeRange = !_minTimeToSet || scope.selectedTime >= _minTimeToSet;

          if (isInMaxTimeRange  && isInMinTimeRange){
            setTimepickerRestrictions(_maxTimeToSet , _minTimeToSet);
          } else {
            ngModelCtrl.$setViewValue(toIsoFormat($date.val(), calculateDefaultTime(viewValue)));
          }
        }
      }

    }
  };
}]);