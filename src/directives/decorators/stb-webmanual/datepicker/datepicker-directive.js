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

      var HH = 24;
      var noon = '12:00';
      var today = moment();
      var tomorrow = moment().add(1, 'day');

      var reservedDates = {
        today: today,
        tomorrow: tomorrow
      };

      var $date = $(element).find('input');
      var $time = $(element).find('select');

      var difference =  scope.$eval(attrs.monthlyDifference);
      var minDate = reservedDates[attrs.minDate] || moment(attrs.minDate) || scope.$eval(attrs.disableUntilToday) && today.toDate();
      var maxDate = reservedDates[attrs.maxDate] || moment(attrs.maxDate) || difference && moment(today).add(difference, 'Month').toDate();

      var maxTime = roundTime(maxDate);

      var showTime = Boolean(attrs.showTime);
      var defaultDate = attrs.defaultDate || today;

      var defaultTime = attrs.defaultTime || (maxDate && maxDate.diff(moment(defaultDate)) === 0 && maxTime<noon ? maxTime : noon);

      $(element).datetimepicker({
        pickTime: false,
        language: 'nn',
        format: 'DD.MM.YY',
        minDate: minDate,
        maxDate: maxDate
      }).on('dp.change', function () {
        scope.$apply(function () {
          var modelDateTime = getModelDateTime();
console.log('modelDateTime',modelDateTime);
          if (showTime && maxDate){
            var isMaxDateSelected = maxDate.diff(modelDateTime, 'days') === 0;
console.log('isMaxDateSelected',isMaxDateSelected);
            if (isMaxDateSelected && $time.val()>maxTime ){
              $time.val(defaultTime);
              modelDateTime = getModelDateTime();
            }

            setTimepickerOptions( isMaxDateSelected && maxTime, true);
          }

          ngModelCtrl.$setViewValue(modelDateTime);
        });
      }).on('dp.error', function () {
        scope.$apply(function () {
          ngModelCtrl.$setViewValue(undefined);
        });
      });

      scope.$watch(scope.keyModelName, function() {
        $timeout(function() {
          console.log('$watch', getViewTime(), defaultTime, ngModelCtrl.$viewValue ? getViewTime() : defaultTime);
          $time.val(ngModelCtrl.$viewValue ? getViewTime() : defaultTime);
          $(element).data('DateTimePicker').setDate(ngModelCtrl.$viewValue ? getViewDate() : defaultDate);
        });
      });

      if (showTime){
        setTimepickerOptions(maxTime);

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
console.log('-getModelDateTime-');
console.log(date, time)
        return toIsoFormat(date, time);
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
                .add('minutes', remainder > roundInterval/2 ? roundInterval : 0)
                .format('HH:mm');
      }

      /* --- functions for initial val setting --- */
      function getViewTime(){
        return moment(ngModelCtrl.$viewValue).format('HH:mm');
      }

      function getViewDate(){
        return moment(ngModelCtrl.$viewValue).format('DD.MM.YY');
      }

      function setTimepickerOptions(maxTimeOption, isUpdate){
        var timeValue, isDisabled;

        if (isUpdate){
          $time.find('option').each(function(index, el){
            var $el = $(el);
            timeValue = $el.text();
            isDisabled = maxTimeOption && timeValue > maxTimeOption;
            $(el).attr('disabled', isDisabled);
          });

        } else {
          for (var h=0; h<HH; h++){
            [':00', ':30'].forEach(function(mins){
              timeValue = formatTime(h + mins);
              isDisabled = maxTimeOption && timeValue > maxTimeOption;
              $time.append(
                '<option ' + (isDisabled ? 'disabled' : '') + '>'+timeValue+'</option>'
              );
            });
          }
        }

      }

    }
  };
}]);