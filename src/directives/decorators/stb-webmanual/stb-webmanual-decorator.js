angular.module('schemaForm').config(['schemaFormDecoratorsProvider', function(decoratorsProvider) {
    'use strict';

  var base = 'directives/decorators/stb-webmanual/';

  decoratorsProvider.createDecorator('stbWebmanualDecorator', {
    'command-panel': base + 'command-panel.html',
    'default'      : base + 'default.html',
    'modalDialog'  : base + 'modal-dialog.html',
    'radios-inline': base + 'radios-inline.html',
    actions        : base + 'actions.html',
    array          : base + 'array.html',
    button         : base + 'button.html',
    checkbox       : base + 'checkbox.html',
    checkboxes     : base + 'checkboxes.html',
    currency       : base + 'currency.html',
    datepicker     : base + 'datepicker.html',
    dropdown       : base + 'dropdown.html',
    errorbox       : base + 'errorbox.html',
    fieldset       : base + 'fieldset.html',
    file           : base + 'file.html',
    help           : base + 'help.html',
    hidden         : base + 'hidden.html',
    infobox        : base + 'infobox.html',
    infodate       : base + 'date-info.html',
    number         : base + 'default.html',
    password       : base + 'default.html',
    radiobuttons   : base + 'radio-buttons.html',
    radios         : base + 'radios.html',
    section        : base + 'section.html',
    select         : base + 'select.html',
    steps          : base + 'steps.html',
    submit         : base + 'submit.html',
    successbox     : base + 'successbox.html',
    tabarray       : base + 'tabarray.html',
    table          : base + 'table.html',
    tabs           : base + 'tabs.html',
    textarea       : base + 'textarea.html',
    whitebox       : base + 'white-box.html'
  }, [
    function(form) {
      if (form.readonly && form.key && form.type !== 'fieldset') {
        return base + 'readonly.html';
      }
    }
  ]);

  //manual use directives
  decoratorsProvider.createDirectives({
    'command-panel': base + 'command-panel.html',
    'modalDialog'  : base + 'modal-dialog.html',
    'radios-inline': base + 'radios-inline.html',
    button         : base + 'button.html',
    checkbox       : base + 'checkbox.html',
    checkboxes     : base + 'checkboxes.html',
    condition      : base + 'condition.html',
    currency       : base + 'currency.html',
    date           : base + 'default.html',
    datepicker     : base + 'datepicker.html',
    dropdown       : base + 'dropdown.html',
    file           : base + 'file.html',
    input          : base + 'default.html',
    number         : base + 'default.html',
    password       : base + 'default.html',
    radiobuttons   : base + 'radio-buttons.html',
    radios         : base + 'radios.html',
    select         : base + 'select.html',
    steps          : base + 'steps.html',
    submit         : base + 'submit.html',
    table          : base + 'table.html',
    text           : base + 'default.html',
    textarea       : base + 'textarea.html',
    whitebox       : base + 'white-box.html'
  });

}]).directive('sfFieldset', function() {
  return {
    transclude: true,
    scope: true,
    templateUrl: 'directives/decorators/stb-webmanual/fieldset-trcl.html',
    link: function(scope, element, attrs) {
      scope.title = scope.$eval(attrs.title);
    }
  };
});
