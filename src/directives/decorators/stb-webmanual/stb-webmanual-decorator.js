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
    textarea: base + 'textarea.html',
    select: base + 'select.html',
    checkbox: base + 'checkbox.html',
    checkboxes: base + 'checkboxes.html',
    condition: base + 'condition.html',
    number: base + 'default.html',
    submit: base + 'submit.html',
    text: base + 'default.html',
    date: base + 'default.html',
    password: base + 'default.html',
    datepicker: base + 'datepicker.html',
    dropdown: base + 'dropdown.html',
    input: base + 'default.html',
    radios: base + 'radios.html',
    'radios-inline': base + 'radios-inline.html',
    radiobuttons: base + 'radio-buttons.html',
    button: base + 'button.html',
    table: base + 'table.html',
    'command-panel': base + 'command-panel.html',
    'modalDialog': base + 'modal-dialog.html',
    whitebox: base + 'white-box.html',
    steps: base + 'steps.html',
    file: base + 'file.html'
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
