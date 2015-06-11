angular.module('schemaForm').directive('placeholder', function() {
  'use strict';

  if (document.createElement('input').placeholder !== undefined) {
    return {};
  }

  return {
      scope: true,
      replace: false,
      restrict: 'A',
      transclude: true,
      link: function(scope, element) {
        var placeholder = scope.$eval(element.attr('placeholder').replace(/[\{,\}]/g, ''));
        var clonedEl = element.clone().addClass('placeholder-text').val(placeholder);

        clonedEl
          .focus(function() {
            clonedEl.addClass('hidden');
            element.removeClass('hidden').focus();
          });

        element
          .addClass('hidden')
          .after(clonedEl)
          .blur(function() {
            if (!element.val()) {
              clonedEl.val(placeholder).removeClass('hidden');
              element.addClass('hidden');
            }
          });

      }
  };
});
