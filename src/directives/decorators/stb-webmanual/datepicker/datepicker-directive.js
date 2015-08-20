angular.module('schemaForm').directive('stbDatepicker', ['$timeout', function($timeout) {
  'use strict';

  var dateTimeFormat = 'YYYY-MM-DDTHH:mm:ss';
  var dateFormat     = 'YYYY-MM-DD';
  var timeFormat     = 'HH:mm';
  var sstimeFormat   = 'HH:mm:ss';

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
      var today = moment();
      var tomorrow = moment().add(1, 'day');

      var reservedDates = {
        today: today,
        tomorrow: tomorrow
      };

      var $date = $(element).find('input');

      var difference = scope.$eval(attrs.monthlyDifference);

      var minDate = reservedDates[attrs.minDate] || moment(attrs.minDate) || scope.$eval(attrs.disableUntilToday) && today.toDate();
      var maxDate = reservedDates[attrs.maxDate] || moment(attrs.maxDate) || difference && moment(today).add(difference, 'Month').toDate();

      var minTime = roundTime(minDate);
      var maxTime = roundTime(maxDate);

      var showTime = Boolean(attrs.showTime);
      var noDefaultDate = !!attrs.noDefaultDate;

      scope.timeOptions = [];

      $(element).datetimepicker({
        pickTime: false,
        language: 'nb',
        format: 'DD.MM.YY',
        useCurrent: false,
        minDate: minDate,
        maxDate: maxDate
      }).on('dp.change', function () {
        $timeout(function () {
          ngModelCtrl.$setViewValue(getInputsDateTime());
        });
      }).on('dp.error', function () {
        $timeout(function () {
          ngModelCtrl.$setViewValue(undefined);
        });
      });

      /* --- subscriptions --- */
      scope.$watch(scope.keyModelName, onKeyModelChange);

      if (!minDate.isValid()){
        scope.$watch(attrs.minDate, getRestrictionCb('min'));
      }

      if (!maxDate.isValid()){
        scope.$watch(attrs.maxDate, getRestrictionCb('max'));
      }

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

      function onKeyModelChange(){
        $timeout(function(){
          scope.selectedTime = getViewTime();
          reinitTimepicker(ngModelCtrl.$viewValue);
          setDatepickerValue(ngModelCtrl.$viewValue);
        });
      }

      function getRestrictionCb(restrictType){
        return function(newValue){
          var restrict = {};
          restrict[restrictType] = newValue;

          setDatepickerRestrictions(restrict);

          var selectedDateTimeVal = ngModelCtrl.$viewValue;

          if (!noDefaultDate && minDate.isValid() && minDate.format(dateTimeFormat) > ngModelCtrl.$viewValue){
            selectedDateTimeVal = minDate.format(dateTimeFormat);
          } else if (!noDefaultDate && maxDate.isValid() && maxDate.format(dateTimeFormat) < ngModelCtrl.$viewValue){
            selectedDateTimeVal = maxDate.format(dateTimeFormat);
          } else {
            return;
          }

          if (showTime) { reinitTimepicker(selectedDateTimeVal); }
          setDatepickerValue(selectedDateTimeVal);

        };
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
                    attrs.defaultTime;
      }

      function calculateDefaultTime(selectedDate){
        var isMaxDateSelected = areEqualDates(maxDate, selectedDate);
        var isMinDateSelected = areEqualDates(minDate, selectedDate);

        return isMaxDateSelected && maxTime<attrs.defaultTime ? maxTime :
               isMinDateSelected && minTime>attrs.defaultTime ? minTime :
                  attrs.defaultTime;
      }

      function initTimepicker(){
        var minsList = [':00', ':30'];
        for (var h=0; h<HH; h++){
          for (var index in minsList){
            scope.timeOptions.push({
              value: formatTime(h + minsList[index]),
              isDisabled: false
            });
          }
        }

        element.addClass('has-timepicker');
      }

      function setDatepickerRestrictions(restrict) {
        if (restrict.min && moment(restrict.min).isValid()) {
          minDate = moment(restrict.min);
          minTime = moment(minDate, dateTimeFormat).format(timeFormat);
          $(element).data('DateTimePicker').setMinDate(minDate);
        }

        if (restrict.max && moment(restrict.max).isValid()) {
          maxDate = moment(restrict.max);
          maxTime = maxDate.format(timeFormat);
          $(element).data('DateTimePicker').setMaxDate(maxDate);
        }
      }

      function setDatepickerValue(dateTimeValue) {
        var viewValue = moment(dateTimeValue, dateTimeFormat);

        if (viewValue.isValid()){
          var viewDate = viewValue.format('DD.MM.YY');
          $(element).data('DateTimePicker').setDate(viewDate);
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
            ngModelCtrl.$setViewValue(toIsoFormat($date.val(), _minTimeToSet || _maxTimeToSet || calculateDefaultTime(viewValue)));
          }
        }
      }

    }
  };
}]);