angular.module('schemaForm').directive('placeholder', function() {
  'use strict';

  if (document.createElement('input').placeholder !== undefined) {
    return {};
  }

  return {
      replace: false,
      restrict: 'A',
      link: function(scope, element) {
        var placeholder = scope.$eval(element.attr('placeholder').replace(/[\{,\}]/g, ''));
        var clonedEl = element.clone().val(placeholder).css('color', '#ccc');

        clonedEl
          .focus(function() {
            clonedEl.css('display', 'none');
            element.css('display', 'block').focus();
          });

        element
          .css('display', 'none')
          .after(clonedEl)
          .blur(function() {
            if (!element.val()) {
              clonedEl.val(placeholder).css('display', 'block');
              element.css('display', 'none');
            }
          });

      }
  };
});
