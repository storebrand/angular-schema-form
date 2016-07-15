// override the default input to update on blur
angular.module('schemaForm').directive('universalClick', [function(f) {
  return {
    restrict: 'A',
    link: function(scope, elm) {
      elm.bind('keydown', function (e) {
        if (e.keyCode === 13 || e.keyCode === 32) {
          $(elm).trigger('click');
        }
      })
    }
  };
}]);