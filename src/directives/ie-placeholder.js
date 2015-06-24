angular.module('schemaForm').directive('placeholder', function() {
  'use strict';

  if (document.createElement('input').placeholder !== undefined) {
    return {};
  }

  return {
      replace: false,
      restrict: 'A',
      link: function(scope, element, attrs) {
        var placeholder = scope.$eval(element.attr('placeholder').replace(/[\{,\}]/g, ''));
        var clonedEl = element.clone().addClass('placeholder-text').val(placeholder);

        clonedEl
          .focus(function() {
            clonedEl.addClass('hidden');
            element.removeClass('hidden').focus();
          });

        element
          .on('change', function(){
            console.log('val changed');
          })
          .addClass('hidden')
          .after(clonedEl)
          .blur(function() {
            if (!element.val()) {
              clonedEl.val(placeholder).removeClass('hidden');
              element.addClass('hidden');
            }
          });

        scope.$watch(attrs.ngModel, function (v) {
          if(v){
            clonedEl.addClass('hidden');
            element.removeClass('hidden');
          }
        });

      }
  };
});
