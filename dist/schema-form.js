// Deps is sort of a problem for us, maybe in the future we will ask the user to depend
// on modules for add-ons

var deps = ['ObjectPath'];
try {
  //This throws an expection if module does not exist.
  angular.module('ngSanitize');
  deps.push('ngSanitize');
} catch (e) {}

try {
  //This throws an expection if module does not exist.
  angular.module('ui.sortable');
  deps.push('ui.sortable');
} catch (e) {}

try {
  //This throws an expection if module does not exist.
  angular.module('angularSpectrumColorpicker');
  deps.push('angularSpectrumColorpicker');
} catch (e) {}

try {
  //This throws an expection if module does not exist.
  angular.module('ui.bootstrap');
  deps.push('ui.bootstrap');
} catch (e) {}

try {
  //This throws an expection if module does not exist.
  angular.module('angularFileUpload');
  deps.push('angularFileUpload');
} catch (e) {}

angular.module('schemaForm', deps);

angular.module('schemaForm').provider('sfPath',
['ObjectPathProvider', function(ObjectPathProvider) {
  var ObjectPath = {parse: ObjectPathProvider.parse};

  // if we're on Angular 1.2.x, we need to continue using dot notation
  if (angular.version.major === 1 && angular.version.minor < 3) {
    ObjectPath.stringify = function(arr) {
      return Array.isArray(arr) ? arr.join('.') : arr.toString();
    };
  } else {
    ObjectPath.stringify = ObjectPathProvider.stringify;
  }

  // We want this to use whichever stringify method is defined above,
  // so we have to copy the code here.
  ObjectPath.normalize = function(data, quote) {
    return ObjectPath.stringify(Array.isArray(data) ? data : ObjectPath.parse(data), quote);
  };

  this.parse = ObjectPath.parse;
  this.stringify = ObjectPath.stringify;
  this.normalize = ObjectPath.normalize;
  this.$get = function () {
    return ObjectPath;
  };
}]);

/**
 * @ngdoc service
 * @name sfSelect
 * @kind function
 *
 */
angular.module('schemaForm').factory('sfSelect', ['sfPath', function (sfPath) {
  var numRe = /^\d+$/;

  /**
    * @description
    * Utility method to access deep properties without
    * throwing errors when things are not defined.
    * Can also set a value in a deep structure, creating objects when missing
    * ex.
    * var foo = Select('address.contact.name',obj)
    * Select('address.contact.name',obj,'Leeroy')
    *
    * @param {string} projection A dot path to the property you want to get/set
    * @param {object} obj   (optional) The object to project on, defaults to 'this'
    * @param {Any}    valueToSet (opional)  The value to set, if parts of the path of
    *                 the projection is missing empty objects will be created.
    * @returns {Any|undefined} returns the value at the end of the projection path
    *                          or undefined if there is none.
    */
  return function(projection, obj, valueToSet) {
    if (!obj) {
      obj = this;
    }
    //Support [] array syntax
    var parts = typeof projection === 'string' ? sfPath.parse(projection) : projection;

    if (typeof valueToSet !== 'undefined' && parts.length === 1) {
      //special case, just setting one variable
      obj[parts[0]] = valueToSet;
      return obj;
    }

    if (typeof valueToSet !== 'undefined' &&
        typeof obj[parts[0]] === 'undefined') {
       // We need to look ahead to check if array is appropriate
      obj[parts[0]] = parts.length > 2 && numRe.test(parts[1]) ? [] : {};
    }

    var value = obj[parts[0]];
    for (var i = 1; i < parts.length; i++) {
      // Special case: We allow JSON Form syntax for arrays using empty brackets
      // These will of course not work here so we exit if they are found.
      if (parts[i] === '') {
        return undefined;
      }
      if (typeof valueToSet !== 'undefined') {
        if (i === parts.length - 1) {
          //last step. Let's set the value
          value[parts[i]] = valueToSet;
          return valueToSet;
        } else {
          // Make sure to create new objects on the way if they are not there.
          // We need to look ahead to check if array is appropriate
          var tmp = value[parts[i]];
          if (typeof tmp === 'undefined' || tmp === null) {
            tmp = numRe.test(parts[i + 1]) ? [] : {};
            value[parts[i]] = tmp;
          }
          value = tmp;
        }
      } else if (value) {
        //Just get nex value.
        value = value[parts[i]];
      }
    }
    return value;
  };
}]);

angular.module('schemaForm').provider('schemaFormDecorators',
['$compileProvider', 'sfPathProvider', function($compileProvider, sfPathProvider) {
  var defaultDecorator = '';
  var directives = {};

  var templateUrl = function(name, form) {
    //schemaDecorator is alias for whatever is set as default
    if (name === 'sfDecorator') {
      name = defaultDecorator;
    }

    var directive = directives[name];

    //rules first
    var rules = directive.rules;
    for (var i = 0; i < rules.length; i++) {
      var res = rules[i](form);
      if (res) {
        return res;
      }
    }

    //then check mapping
    if (directive.mappings[form.type]) {
      return directive.mappings[form.type];
    }

    //try default
    return directive.mappings['default'];
  };


  var addDotOrHashNotaion = function (name) {
    if (/^#/.test(name)) {
      return '[\'' + name + '\']';
    } else {
      return '.' + name;
    }
  };

  var createModelName = function (form, defGlobals, key) {
    var res = '';
    if (angular.isDefined(form.schema)) {
      var visibility = form.schema.visibility || defGlobals.visibility.visibility;

      if (visibility) {
        res += addDotOrHashNotaion(visibility);
      }

      var category = form.schema.category || defGlobals.category;

      if (category) {
        res += addDotOrHashNotaion(category);
      }
    }

    res += (key[0] !== '[' ? '.' : '') + key;

    return 'model' + res;

  };

  var createDirective = function(name) {
    $compileProvider.directive(name, ['$parse', '$compile', '$http', '$templateCache', 'scrollingTop', '$timeout', '$filter', 'FileUploader',
      function($parse,  $compile,  $http,  $templateCache, scrollingTop, $timeout, $filter, FileUploader) {

        return {
          restrict: 'AE',
          replace: false,
          transclude: false,
          scope: true,
          require: '?^sfSchema',
          link: function(scope, element, attrs, sfSchema) {
            //rebind our part of the form to the scope.
            var defaultGlobals = scope.defaultGlobals || scope.$eval(attrs.defaultGlobals);

            var once = scope.$watch(attrs.form, function(form) {

              if (form) {
                scope.form  = form;
                scope.defaultGlobals = defaultGlobals;

                //ok let's replace that template!
                //We do this manually since we need to bind ng-model properly and also
                //for fieldsets to recurse properly.
                var url = templateUrl(name, form);

                $http.get(url, {cache: $templateCache}).then(function(res) {
                  var key = form.key ?
                            sfPathProvider.stringify(form.key).replace(/"/g, '&quot;') : '';

                  scope.keyModelName = createModelName(form, scope.defaultGlobals, key);

                  var template = res.data.replace(/\$\$value\$\$/g, scope.keyModelName);

                  element.html(template);
                  $compile(element.contents())(scope);
                });
                once();
              }
            });

            scope.globalSchema = sfSchema.evalInMainScope('schema');

            //Keep error prone logic from the template
            scope.showTitle = function() {
              return scope.form && scope.form.notitle !== true && scope.form.title;
            };

            scope.listToCheckboxValues = function(list) {
              var values = {};
              angular.forEach(list, function(v) {
                values[v] = true;
              });
              return values;
            };

            scope.checkboxValuesToList = function(values) {
              var lst = [];
              angular.forEach(values, function(v, k) {
                if (v) {
                  lst.push(k);
                }
              });
              return lst;
            };

              scope.updateModelForInputFile = function (fileSource) {
                scope.$apply(function () {
                  var file = {};
                  file.fileName = fileSource.split('\\').pop();
                  file.fileExt = file.fileName.split('.').pop();
                  if (!scope.form.fileList) {
                    scope.form.fileList = [];
                  }
                  if (file) {
                    scope.form.fileList.push(file)
                  };
                });
              };

            scope.removeFileFromList = function (index) {
              scope.form.fileList.splice(index, 1);
            };


              var lookupForKey = function (key) {
              var res = '';

              var schema = scope.globalSchema.properties[key];

              if (angular.isDefined(schema)) {
                var visibility = schema.visibility || scope.defaultGlobals.visibility;

                if (visibility) {
                  res += addDotOrHashNotaion(visibility);
                }

                var category = schema.category || scope.defaultGlobals.category;

                if (category) {
                  res += addDotOrHashNotaion(category);
                }
              }


              res += (key[0] !== '[' ? '.' : '') + key;

              return 'model' + res;
            };

            var evalExpression = function (expression) {
              angular.forEach(scope.form.dependencies, function (key) {
                expression = expression.replace(key, lookupForKey(key));
              });

              return scope.$eval(expression)
            };

            var getConditionalValue = function () {
              var value;
              angular.forEach(scope.form.conditionalValues, function (conditionalObject) {
                if (evalExpression(conditionalObject.expression)) {
                  value = conditionalObject.value;
                }
              });

              return value;
            };

            scope.showCondition = function () {
              var expressionString = scope.form.expression;
              if (angular.isUndefined(expressionString)) {
                return true;
              }

              var show = evalExpression(expressionString);
              var model = $parse(scope.keyModelName);

              if (angular.isDefined(scope.form.required)) {
                scope.form.required = show;
                scope.form.schema.required = show;
              }


              if (angular.isArray(scope.form.conditionalValues)) {
                var conditionalValue = getConditionalValue();
                if (angular.isDefined(conditionalValue)) {
                  model.assign(scope, conditionalValue);
                }

              } else if (scope.form.key && !show) {

                model.assign(scope, undefined);
                if (scope.ngModelHolder) {
                  scope.ngModelHolder.$render();
                  scope.ngModelHolder.$setPristine();
                }

              }

              return show;

            };

            scope.clickCheckbox = function (event) {
              var inputEl = angular.element(event.currentTarget).find('input');
              var checked = !!inputEl.attr('checked');
              $timeout(function() {
                inputEl.attr('checked', !checked);

                var model = $parse(scope.keyModelName);
                model.assign(scope, !checked);
                scope.$apply();
              }, 0);
            };

            scope.disabledElement = function () {
              var expressionString = scope.form.disableExpression;

              if (angular.isUndefined(expressionString) && angular.isUndefined(scope.form.disabled)) {
                return false;
              }

              var disabled = evalExpression(expressionString);

              if (angular.isDefined(scope.form.required)) {
                scope.form.required = !disabled;
                scope.form.schema.required = !disabled;
              }

              if (disabled) {
                scope.ngModelHolder.$setViewValue(undefined);
                element.find('input').val('');
              }
              return disabled || scope.form.disabled;
            };


            var updateInfoDate = function (date, alwaysAddMonlthlyDifferent) {
              var today = moment();
              var minMonthlyDifference = scope.form.minMonthlyDifference || 0;
              var maxMonthlyDifference = scope.form.maxMonthlyDifference;
              var additionalMonthlyDifference = scope.form.additionalMonthlyDifference;
              var additionalDailyDifference = scope.form.additionalDailyDifference;
              var selectedDate = moment(date);

              today.milliseconds(0);
              today.second(0);
              today.minute(0);
              today.hours(0);

              if (maxMonthlyDifference && additionalMonthlyDifference) {

                if (alwaysAddMonlthlyDifferent
                    || (selectedDate.toDate().getTime() < moment(today).add(minMonthlyDifference, 'Month').toDate().getTime())
                    || (selectedDate.toDate().getTime() > moment(today).add(maxMonthlyDifference, 'Month').toDate().getTime())) {
                  selectedDate = today.add(additionalMonthlyDifference, 'Month').add(additionalDailyDifference, 'Day');
                }
              }

              return selectedDate;
            };

            scope.setDateWatcher = function () {
              if (scope.form.modelKey) {
                var value = function () {
                  return scope.$eval(lookupForKey(scope.form.dateKey));
                };
                scope.$watch(value, function (newDate) {
                  if (newDate) {
                    var model = $parse(lookupForKey(scope.form.modelKey));
                    var selectedDate = updateInfoDate(newDate);
                    model.assign(scope, selectedDate.format('YYYY-MM-DD'));
                  }
                });
              }
            };

            scope.getInfoDate = function () {
              var date = scope.$eval(lookupForKey(scope.form.dateKey));
              var selectedDate;

              if (date) {
                selectedDate = updateInfoDate(date);
              } else if (scope.form.hasDefaultDateValue) {

                selectedDate = updateInfoDate(null, true);
                var model = $parse(lookupForKey(scope.form.modelKey));
                model.assign(scope, selectedDate.format('YYYY-MM-DD'));

              }

              moment.locale(scope.form.encoding);
              return moment(selectedDate).format(scope.form.format);

            };

            scope.conditionalValidationSuccess = function () {
              var expressionString = scope.form.validationExpression;

              if (angular.isUndefined(expressionString)) {
                return true;
              }
              return evalExpression(expressionString);
            };

            /**
             * Evaluate an expression, i.e. scope.$eval
             * but do it in sfSchemas parent scope sf-schema directive is used
             * @param {string} expression
             * @param {Object} locals (optional)
             * @return {Any} the result of the expression
             */
            scope.evalExpr = function(expression, locals) {
              if (sfSchema) {
                //evaluating in scope outside of sfSchemas isolated scope
                return sfSchema.evalInParentScope(expression, locals);
              }

              return scope.$eval(expression, locals);
            };

            /**
             * Evaluate an expression, i.e. scope.$eval
             * in this decorators scope
             * @param {string} expression
             * @param {Object} locals (optional)
             * @return {Any} the result of the expression
             */
            scope.evalInScope = function(expression, locals) {
              if (expression) {
                return scope.$eval(expression, locals);
              }
            };

            /**
             * Error message handler
             * An error can either be a schema validation message or a angular js validtion
             * error (i.e. required)
             */
            scope.errorMessage = function(schemaError) {
              //User has supplied validation messages
              if (scope.form.validationMessage) {
                if (schemaError) {
                  if (angular.isString(scope.form.validationMessage)) {
                    return scope.form.validationMessage;
                  }

                  return scope.form.validationMessage[schemaError.code] ||
                         scope.form.validationMessage['default'];
                } else {
                  return scope.form.validationMessage.required ||
                         scope.form.validationMessage['default'] ||
                         scope.form.validationMessage;
                }
              }

              //No user supplied validation message.
              if (schemaError) {
                return schemaError.message; //use tv4.js validation message
              }

              //Otherwise we only use required so it must be it.
              return 'Required';

            };

            scope.initFileUploader = function () {
              var uploader = new FileUploader(scope.form.uploadURL);
              uploader.autoUpload = true;
              uploader.removeAfterUpload = true;
              uploader.onAfterAddingFile = function(item) {
                scope.form.onFileUploadStart(item);
              };
              uploader.onSuccessItem = function(item, response) {
                response.isUploaded = true;
                scope.form.onFileUploaded(item, response);
              };

              scope.uploader = uploader;

              scope.removeFile = function(item) {
                if (item.file) {
                  item.cancel();
                }
                scope.form.removeFile(item);
              }

              scope.getExtensionFromFileName = function (fileName) {
                var re = /(?:\.([^.]+))?$/;
                return re.exec(fileName)[1];
              };

            }

          }
        };
      }
    ]);
  };

  var createManualDirective = function(type, templateUrl, transclude) {
    transclude = angular.isDefined(transclude) ? transclude : false;
    $compileProvider.directive('sf' + angular.uppercase(type[0]) + type.substr(1), function() {
      return {
        restrict: 'EAC',
        scope: true,
        replace: true,
        transclude: transclude,
        template: '<sf-decorator form="form"></sf-decorator>',
        link: function(scope, element, attrs) {
          var watchThis = {
            'items': 'c',
            'titleMap': 'c',
            'schema': 'c'
          };
          var form = {type: type};
          var once = true;
          angular.forEach(attrs, function(value, name) {
            if (name[0] !== '$' && name.indexOf('ng') !== 0 && name !== 'sfField') {

              var updateForm = function(val) {
                if (angular.isDefined(val) && val !== form[name]) {
                  form[name] = val;

                  //when we have type, and if specified key we apply it on scope.
                  if (once && form.type && (form.key || angular.isUndefined(attrs.key))) {
                    scope.form = form;
                    once = false;
                  }
                }
              };

              if (name === 'model') {
                //"model" is bound to scope under the name "model" since this is what the decorators
                //know and love.
                scope.$watch(value, function(val) {
                  if (val && scope.model !== val) {
                    scope.model = val;
                  }
                });
              } else if (watchThis[name] === 'c') {
                //watch collection
                scope.$watchCollection(value, updateForm);
              } else {
                //$observe
                attrs.$observe(name, updateForm);
              }
            }
          });
        }
      };
    });
  };

  /**
   * Create a decorator directive and its sibling "manual" use directives.
   * The directive can be used to create form fields or other form entities.
   * It can be used in conjunction with <schema-form> directive in which case the decorator is
   * given it's configuration via a the "form" attribute.
   *
   * ex. Basic usage
   *   <sf-decorator form="myform"></sf-decorator>
   **
   * @param {string} name directive name (CamelCased)
   * @param {Object} mappings, an object that maps "type" => "templateUrl"
   * @param {Array}  rules (optional) a list of functions, function(form) {}, that are each tried in
   *                 turn,
   *                 if they return a string then that is used as the templateUrl. Rules come before
   *                 mappings.
   */
  this.createDecorator = function(name, mappings, rules) {
    directives[name] = {
      mappings: mappings || {},
      rules:    rules    || []
    };

    if (!directives[defaultDecorator]) {
      defaultDecorator = name;
    }
    createDirective(name);
  };

  /**
   * Creates a directive of a decorator
   * Usable when you want to use the decorators without using <schema-form> directive.
   * Specifically when you need to reuse styling.
   *
   * ex. createDirective('text','...')
   *  <sf-text title="foobar" model="person" key="name" schema="schema"></sf-text>
   *
   * @param {string}  type The type of the directive, resulting directive will have sf- prefixed
   * @param {string}  templateUrl
   * @param {boolean} transclude (optional) sets transclude option of directive, defaults to false.
   */
  this.createDirective = createManualDirective;

  /**
   * Same as createDirective, but takes an object where key is 'type' and value is 'templateUrl'
   * Useful for batching.
   * @param {Object} mappings
   */
  this.createDirectives = function(mappings) {
    angular.forEach(mappings, function(url, type) {
      createManualDirective(type, url);
    });
  };

  /**
   * Getter for directive mappings
   * Can be used to override a mapping or add a rule
   * @param {string} name (optional) defaults to defaultDecorator
   * @return {Object} rules and mappings { rules: [],mappings: {}}
   */
  this.directive = function(name) {
    name = name || defaultDecorator;
    return directives[name];
  };

  /**
   * Adds a mapping to an existing decorator.
   * @param {String} name Decorator name
   * @param {String} type Form type for the mapping
   * @param {String} url  The template url
   */
  this.addMapping = function(name, type, url) {
    if (directives[name]) {
      directives[name].mappings[type] = url;
    }
  };

  //Service is just a getter for directive mappings and rules
  this.$get = function() {
    return {
      directive: function(name) {
        return directives[name];
      },
      defaultDecorator: defaultDecorator
    };
  };

  //Create a default directive
  createDirective('sfDecorator');

}]);

angular.module('schemaForm').factory('formFormatters', [function () {
  var formatters = {
    'carNumber': function (input) {
      if (/^[a-zA-Z]{2}\s?\d{5}$/.test(input)) {
        input = input.replace(/^([a-zA-Z]{2})\s?(\d{5})$/, function (text, letters, numbers) {
          return letters.toUpperCase() + numbers;
        });
      }

      return input;
    },
    'number': function (input) {
      var parsed = parseInt(input, 10);
      if (isNaN(parsed)) {
        return undefined;
      } else {
        return parsed;
      }
    }
  };

  return {
    getFormatter: function (type) {
      return formatters[type];
    }
  };

}]);

/**
 * Schema form service.
 * This service is not that useful outside of schema form directive
 * but makes the code more testable.
 */
angular.module('schemaForm').provider('schemaForm',
['sfPathProvider', function(sfPathProvider) {

  //Creates an default titleMap list from an enum, i.e. a list of strings.
  var enumToTitleMap = function(enm) {
    var titleMap = []; //canonical titleMap format is a list.
    enm.forEach(function(name) {
      titleMap.push({name: name, value: name, id: 'id_' + (Math.random() * 100)});
    });
    return titleMap;
  };

  // Takes a titleMap in either object or list format and returns one in
  // in the list format.
  var canonicalTitleMap = function(titleMap) {
    if (!angular.isArray(titleMap)) {
      var canonical = [];
      angular.forEach(titleMap, function(name, value) {
        canonical.push({name: name, value: value, id: 'id_' + (Math.random() * 100)});
      });
      return canonical;
    } else {
      angular.forEach(titleMap, function(obj, index) {
        if (!obj.id) {
          obj.id = 'id_' + (Math.random() * 100);
        }
      });
      return titleMap;
    }
  };

  var defaultFormDefinition = function(name, schema, options) {
    var rules = defaults[schema.type];
    if (rules) {
      var def;
      for (var i = 0; i < rules.length; i++) {
        def = rules[i](name, schema, options);
        //first handler in list that actually returns something is our handler!
        if (def) {
          return def;
        }
      }
    }
  };

  //Creates a form object with all common properties
  var stdFormObj = function(name, schema, options) {
    options = options || {};
    var f = options.global && options.global.formDefaults ?
            angular.copy(options.global.formDefaults) : {};
    if (options.global && options.global.supressPropertyTitles === true) {
      f.title = schema.title;
    } else {
      f.title = schema.title || name;
    }

    if (schema.description) { f.description = schema.description; }
    if (options.required === true || schema.required === true) { f.required = true; }
    if (schema.maxLength) { f.maxlength = schema.maxLength; }
    if (schema.minLength) { f.minlength = schema.minLength; }
    if (schema.readOnly || schema.readonly) { f.readonly  = true; }
    if (schema.minimum) { f.minimum = schema.minimum + (schema.exclusiveMinimum ? 1 : 0); }
    if (schema.maximum) { f.maximum = schema.maximum - (schema.exclusiveMaximum ? 1 : 0); }

    //Non standard attributes
    if (schema.validationMessage) { f.validationMessage = schema.validationMessage; }
    if (schema.enumNames) { f.titleMap = canonicalTitleMap(schema.enumNames); }
    f.schema = schema;

    // Ng model options doesn't play nice with undefined, might be defined
    // globally though
    f.ngModelOptions = f.ngModelOptions || {};
    return f;
  };

  var text = function(name, schema, options) {
    if (schema.type === 'string' && !schema.enum) {
      var f = stdFormObj(name, schema, options);
      f.key  = options.path;
      f.type = 'text';
      options.lookup[sfPathProvider.stringify(options.path)] = f;
      return f;
    }
  };

  //default in json form for number and integer is a text field
  //input type="number" would be more suitable don't ya think?
  var number = function(name, schema, options) {
    if (schema.type === 'number') {
      var f = stdFormObj(name, schema, options);
      f.key  = options.path;
      f.type = 'number';
      options.lookup[sfPathProvider.stringify(options.path)] = f;
      return f;
    }
  };

  var integer = function(name, schema, options) {
    if (schema.type === 'integer') {
      var f = stdFormObj(name, schema, options);
      f.key  = options.path;
      f.type = 'number';
      options.lookup[sfPathProvider.stringify(options.path)] = f;
      return f;
    }
  };

  var checkbox = function(name, schema, options) {
    if (schema.type === 'boolean') {
      var f = stdFormObj(name, schema, options);
      f.key  = options.path;
      f.type = 'checkbox';
      options.lookup[sfPathProvider.stringify(options.path)] = f;
      return f;
    }
  };

  var select = function(name, schema, options) {
    if (schema.type === 'string' && schema.enum) {
      var f = stdFormObj(name, schema, options);
      f.key  = options.path;
      f.type = 'select';
      if (!f.titleMap) {
        f.titleMap = enumToTitleMap(schema.enum);
      }
      options.lookup[sfPathProvider.stringify(options.path)] = f;
      return f;
    }
  };

  var checkboxes = function(name, schema, options) {
    if (schema.type === 'array' && schema.items && schema.items.enum) {
      var f = stdFormObj(name, schema, options);
      f.key  = options.path;
      f.type = 'checkboxes';
      if (!f.titleMap) {
        f.titleMap = enumToTitleMap(schema.items.enum);
      }
      options.lookup[sfPathProvider.stringify(options.path)] = f;
      return f;
    }
  };

  var fieldset = function(name, schema, options) {

    if (schema.type === 'object') {
      var f   = stdFormObj(name, schema, options);
      f.type  = 'fieldset';
      f.items = [];
      options.lookup[sfPathProvider.stringify(options.path)] = f;

      //recurse down into properties
      angular.forEach(schema.properties, function(v, k) {
        var path = options.path.slice();
        path.push(k);
        if (options.ignore[sfPathProvider.stringify(path)] !== true) {
          var required = schema.required && schema.required.indexOf(k) !== -1;

          var def = defaultFormDefinition(k, v, {
            path: path,
            required: required || false,
            lookup: options.lookup,
            ignore: options.ignore
          });
          if (def) {
            f.items.push(def);
          }
        }
      });

      return f;
    }

  };

  var array = function(name, schema, options) {

    if (schema.type === 'array') {
      var f   = stdFormObj(name, schema, options);
      f.type  = 'array';
      f.key   = options.path;
      options.lookup[sfPathProvider.stringify(options.path)] = f;

      var required = schema.required;
      // The default is to always just create one child. This works since if the
      // schemas items declaration is of type: "object" then we get a fieldset.
      // We also follow json form notatation, adding empty brackets "[]" to
      // signify arrays.

      var arrPath = options.path.slice();
      arrPath.push('');

      f.items = [defaultFormDefinition(name, schema.items, {
        path: arrPath,
        required: required || false,
        lookup: options.lookup,
        ignore: options.ignore
      })];

      return f;
    }

  };

  //First sorted by schema type then a list.
  //Order has importance. First handler returning an form snippet will be used.
  var defaults = {
    string:  [select, text],
    object:  [fieldset],
    number:  [number],
    integer: [integer],
    boolean: [checkbox],
    array:   [checkboxes, array]
  };

  var postProcessFn = function(form) { return form; };

  /**
   * Provider API
   */
  this.defaults    = defaults;
  this.stdFormObj  = stdFormObj;

  /**
   * Register a post process function.
   * This function is called with the fully merged
   * form definition (i.e. after merging with schema)
   * and whatever it returns is used as form.
   */
  this.postProcess = function(fn) {
    postProcessFn = fn;
  };

  /**
   * Append default form rule
   * @param {string}   type json schema type
   * @param {Function} rule a function(propertyName,propertySchema,options) that returns a form
   *                        definition or undefined
   */
  this.appendRule = function(type, rule) {
    if (!defaults[type]) {
      defaults[type] = [];
    }
    defaults[type].push(rule);
  };

  /**
   * Prepend default form rule
   * @param {string}   type json schema type
   * @param {Function} rule a function(propertyName,propertySchema,options) that returns a form
   *                        definition or undefined
   */
  this.prependRule = function(type, rule) {
    if (!defaults[type]) {
      defaults[type] = [];
    }
    defaults[type].unshift(rule);
  };

  /**
   * Utility function to create a standard form object.
   * This does *not* set the type of the form but rather all shared attributes.
   * You probably want to start your rule with creating the form with this method
   * then setting type and any other values you need.
   * @param {Object} schema
   * @param {Object} options
   * @return {Object} a form field defintion
   */
  this.createStandardForm = stdFormObj;
  /* End Provider API */

  this.$get = function() {

    var service = {};

    service.merge = function(schema, form, ignore, options) {
      form  = form || ['*'];
      options = options || {};

      var stdForm = service.defaults(schema, ignore, options);

      //simple case, we have a "*", just put the stdForm there
      var idx = form.indexOf('*');
      if (idx !== -1) {
        form  = form.slice(0, idx)
                    .concat(stdForm.form)
                    .concat(form.slice(idx + 1));
        return form;
      }

      //ok let's merge!
      //We look at the supplied form and extend it with schema standards
      var lookup = stdForm.lookup;
      return postProcessFn(form.map(function(obj) {

        //handle the shortcut with just a name
        if (typeof obj === 'string') {
          obj = {key: obj};
        }

        //If it has a titleMap make sure it's a list
        if (obj.titleMap) {
          obj.titleMap = canonicalTitleMap(obj.titleMap);
        }

        //if it's a type with items, merge 'em!
        if (obj.items) {
          obj.items = service.merge(schema, obj.items, ignore);
        }

        //if its has tabs, merge them also!
        if (obj.tabs) {
          angular.forEach(obj.tabs, function(tab) {
            tab.items = service.merge(schema, tab.items, ignore);
          });
        }

        //if its has steps, merge them also!
        if (obj.steps) {
          angular.forEach(obj.steps, function(step) {
            step.items = service.merge(schema, step.items, ignore);
          });
        }

        //extend with std form from schema.
        if (obj.key) {
          if (typeof obj.key === 'string') {
            obj.key = sfPathProvider.parse(obj.key);
          }

          var str = sfPathProvider.stringify(obj.key);
          if (lookup[str]) {
            obj = angular.extend(lookup[str], obj);
          }
        }

        // Special case: checkbox
        // Since have to ternary state we need a default

        //TODO why is it here?
        //if (obj.type === 'checkbox' && angular.isUndefined(obj.schema['default'])) {
        //  obj.schema['default'] = undefined;
        //}

        return obj;
      }));
    };

    /**
     * Create form defaults from schema
     */
    service.defaults = function(schema, ignore, globalOptions) {
      var form   = [];
      var lookup = {}; //Map path => form obj for fast lookup in merging
      ignore = ignore || {};
      globalOptions = globalOptions || {};

      if (schema.type === 'object') {
        angular.forEach(schema.properties, function(v, k) {
          if (ignore[k] !== true) {
            var required = schema.required && schema.required.indexOf(k[k.length - 1]) !== -1;
            var def = defaultFormDefinition(k, v, {
              path: [k],         // Path to this property in bracket notation.
              lookup: lookup,    // Extra map to register with. Optimization for merger.
              ignore: ignore,    // The ignore list of paths (sans root level name)
              required: required, // Is it required? (v4 json schema style)
              global: globalOptions // Global options, including form defaults
            });
            if (def) {
              form.push(def);
            }
          }
        });

      } else {
        throw new Error('Not implemented. Only type "object" allowed at root level of schema.');
      }
      return {form: form, lookup: lookup};
    };

    //Utility functions
    /**
     * Traverse a schema, applying a function(schema,path) on every sub schema
     * i.e. every property of an object.
     */
    service.traverseSchema = function(schema, fn, path, ignoreArrays) {
      ignoreArrays = angular.isDefined(ignoreArrays) ? ignoreArrays : true;

      path = path || [];

      var traverse = function(schema, fn, path) {
        fn(schema, path);
        angular.forEach(schema.properties, function(prop, name) {
          var currentPath = path.slice();
          currentPath.push(name);
          traverse(prop, fn, currentPath);
        });

        //Only support type "array" which have a schema as "items".
        if (!ignoreArrays && schema.items) {
          var arrPath = path.slice(); arrPath.push('');
          traverse(schema.items, fn, arrPath);
        }
      };

      traverse(schema, fn, path || []);
    };

    service.traverseForm = function(form, fn) {
      fn(form);
      angular.forEach(form.items, function(f) {
        service.traverseForm(f, fn);
      });

      if (form.tabs) {
        angular.forEach(form.tabs, function(tab) {
          angular.forEach(tab.items, function(f) {
            service.traverseForm(f, fn);
          });
        });
      }

      if (form.steps) {
        angular.forEach(form.steps, function(step) {
          angular.forEach(step.items, function(f) {
            service.traverseForm(f, fn);
          });
        });
      }
    };

    return service;
  };

}]);

/**
 * @ngdoc service
 * @name focusOnError
 * @kind object
 *
 */
angular.module('schemaForm').factory('scrollingTop', ['$timeout', function ($timeout) {

  var scrollToTheFirstError = function (element, index) {
    $timeout(function () {
      jQuery('html, body').animate({
        scrollTop: jQuery(element[0]).find('[index=' + index + '] .has-error:first').offset().top
      }, 1000);
    }, 0);
  };

  var scrollTop = function () {
    $timeout(function () {
      jQuery('html, body').animate({
        scrollTop: 0
      }, 1000);
    }, 0);
  };

  return {
    scrollToTheFirstError: scrollToTheFirstError,
    scrollTop: scrollTop
  };

}]);

/*  Common code for validating a value against its form and schema definition */
/* global tv4 */
angular.module('schemaForm').factory('sfValidator', [function() {

  var validator = {};


  tv4.addFormat({
    'ssn': function (data, schema) {
      var pn;
      var v1 = [3,7,6,1,8,9,4,5,2,1,0];
      var v2 = [5,4,3,2,7,6,5,4,3,2,1];
      var sum1=0;
      var sum2=0;
      var i=0;

      if (typeof data === 'string') {
        pn = data.split('');
      } else {
        return 'ssn should be a string!';
      }

      for(; i<v1.length; i+=1) {
        sum1 += pn[i]*v1[i];
        sum2 += pn[i]*v2[i];
      }
      if (sum1%11==0 && sum2%11==0 ) {
        return null;
      } else {
        return "incorrect ssn";
      }
    },
    'email': function(data, schema) {
      if (typeof data === 'string') {
       if (/^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$/i.test(data)) {
         return null;
       } else {
         return 'invalid email';
       }
      } else {
        return 'email should be a string!';
      }
    },

    'date-format': function(data, schema) {
      if (typeof data === 'string') {
        if (Date.parse(data)) {
          return null;
        } else {
          return 'invalid date';
        }
      } else {
        return 'date should be ISO string!';
      }
    }

  });

  /**
   * Validate a value against its form definition and schema.
   * The value should either be of proper type or a string, some type
   * coercion is applied.
   *
   * @param {Object} form A merged form definition, i.e. one with a schema.
   * @param {Any} value the value to validate.
   * @return a tv4js result object.
   */

  validator.validate = function(form, value) {

    var schema = form.schema;

    if (!schema) {
      //Nothings to Validate
      return value;
    }

    //Type cast and validate against schema.
    //Basic types of json schema sans array and object
    if (schema.type === 'integer') {
      value = parseInt(value, 10);
    } else if (schema.type === 'number') {
      value = parseFloat(value, 10);
    } else if (schema.type === 'boolean' && typeof value === 'string') {
      if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      }
    }

    // Version 4 of JSON Schema has the required property not on the
    // property itself but on the wrapping object. Since we like to test
    // only this property we wrap it in a fake object.
    var wrap = {type: 'object', 'properties': {}};
    var propName = form.key[form.key.length - 1];
    wrap.properties[propName] = schema;

    if (schema.required) {
      wrap.required = [propName];
    }
    var valueWrap = {};
    if (angular.isDefined(value)) {
      valueWrap[propName] = value;
    }

    return tv4.validateResult(valueWrap, wrap);

  };

  return validator;
}]);

/**
 * Directive that handles the model arrays
 */
angular.module('schemaForm').directive('sfArray', ['sfSelect', 'schemaForm', 'sfValidator',
  function(sfSelect, schemaForm, sfValidator) {

    var setIndex = function(index) {
      return function(form) {
        if (form.key) {
          form.key[form.key.indexOf('')] = index;
        }
      };
    };

    return {
      restrict: 'A',
      scope: true,
      require: '?ngModel',
      link: function(scope, element, attrs, ngModel) {
        var formDefCache = {};

        // Watch for the form definition and then rewrite it.
        // It's the (first) array part of the key, '[]' that needs a number
        // corresponding to an index of the form.
        var once = scope.$watch(attrs.sfArray, function(form) {

          // An array model always needs a key so we know what part of the model
          // to look at. This makes us a bit incompatible with JSON Form, on the
          // other hand it enables two way binding.
          var list = sfSelect(form.key, scope.model);

          // Since ng-model happily creates objects in a deep path when setting a
          // a value but not arrays we need to create the array.
          if (angular.isUndefined(list)) {
            list = [];
            sfSelect(form.key, scope.model, list);
          }
          scope.modelArray = list;

          // Arrays with titleMaps, i.e. checkboxes doesn't have items.
          if (form.items) {

            // To be more compatible with JSON Form we support an array of items
            // in the form definition of "array" (the schema just a value).
            // for the subforms code to work this means we wrap everything in a
            // section. Unless there is just one.
            var subForm = form.items[0];
            if (form.items.length > 1) {
              subForm = {type: 'section', items: form.items};
            }
          }

          // We ceate copies of the form on demand, caching them for
          // later requests
          scope.copyWithIndex = function(index) {
            if (!formDefCache[index]) {
              if (subForm) {
                var copy = angular.copy(subForm);
                copy.arrayIndex = index;
                schemaForm.traverseForm(copy, setIndex(index));
                formDefCache[index] = copy;
              }
            }
            return formDefCache[index];
          };

          scope.appendToArray = function() {
            var len = list.length;
            var copy = scope.copyWithIndex(len);
            schemaForm.traverseForm(copy, function(part) {
              if (part.key && angular.isDefined(part.default)) {
                sfSelect(part.key, scope.model, part.default);
              }
            });

            // If there are no defaults nothing is added so we need to initialize
            // the array. undefined for basic values, {} or [] for the others.
            if (len === list.length) {
              var type = sfSelect('schema.items.type', form);
              var dflt;
              if (type === 'object') {
                dflt = {};
              } else if (type === 'array') {
                dflt = [];
              }
              list.push(dflt);
            }

            // Trigger validation.
            if (scope.validateArray) {
              scope.validateArray();
            }
            return list;
          };

          scope.deleteFromArray = function(index) {
            list.splice(index, 1);

            // Trigger validation.
            if (scope.validateArray) {
              scope.validateArray();
            }
          };

          // Always start with one empty form unless configured otherwise.
          // Special case: don't do it if form has a titleMap
          if (!form.titleMap && form.startEmpty !== true && list.length === 0) {
            scope.appendToArray();
          }

          // Title Map handling
          // If form has a titleMap configured we'd like to enable looping over
          // titleMap instead of modelArray, this is used for intance in
          // checkboxes. So instead of variable number of things we like to create
          // a array value from a subset of values in the titleMap.
          // The problem here is that ng-model on a checkbox doesn't really map to
          // a list of values. This is here to fix that.
          if (form.titleMap && form.titleMap.length > 0) {
            scope.titleMapValues = [];

            // We watch the model for changes and the titleMapValues to reflect
            // the modelArray
            var updateTitleMapValues = function(arr) {
              scope.titleMapValues = [];
              arr = arr || [];

              form.titleMap.forEach(function(item) {
                scope.titleMapValues.push(arr.indexOf(item.value) !== -1);
              });

            };
            //Catch default values
            updateTitleMapValues(scope.modelArray);
            scope.$watchCollection('modelArray', updateTitleMapValues);

            //To get two way binding we also watch our titleMapValues
            scope.$watchCollection('titleMapValues', function(vals) {
              if (vals) {
                var arr = scope.modelArray;

                // Apparently the fastest way to clear an array, readable too.
                // http://jsperf.com/array-destroy/32
                while (arr.length > 0) {
                  arr.shift();
                }

                form.titleMap.forEach(function(item, index) {
                  if (vals[index]) {
                    arr.push(item.value);
                  }
                });

              }
            });
          }

          // If there is a ngModel present we need to validate when asked.
          if (ngModel) {
            var error;

            scope.validateArray = function() {
              // The actual content of the array is validated by each field
              // so we settle for checking validations specific to arrays

              // Since we prefill with empty arrays we can get the funny situation
              // where the array is required but empty in the gui but still validates.
              // Thats why we check the length.
              var result = sfValidator.validate(
                form,
                scope.modelArray.length > 0 ? scope.modelArray : undefined
              );
              if (result.valid === false &&
                  result.error &&
                  (result.error.dataPath === '' ||
                  result.error.dataPath === '/' + form.key[form.key.length - 1])) {

                // Set viewValue to trigger $dirty on field. If someone knows a
                // a better way to do it please tell.
                ngModel.$setViewValue(scope.modelArray);
                error = result.error;
                ngModel.$setValidity('schema', false);

              } else {
                ngModel.$setValidity('schema', true);
              }
            };

            scope.$on('schemaFormValidate', scope.validateArray);

            scope.hasSuccess = function() {
              return ngModel.$valid && !ngModel.$pristine;
            };

            scope.hasError = function() {
              return ngModel.$invalid;
            };

            scope.schemaError = function() {
              return error;
            };

          }

          once();
        });
      }
    };
  }
]);

/**
 * A version of ng-changed that only listens if
 * there is actually a onChange defined on the form
 *
 * Takes the form definition as argument.
 * If the form definition has a "onChange" defined as either a function or
 */
angular.module('schemaForm').directive('sfChanged', function() {
  return {
    require: 'ngModel',
    restrict: 'AC',
    scope: false,
    link: function(scope, element, attrs, ctrl) {
      var form = scope.$eval(attrs.sfChanged);
      //"form" is really guaranteed to be here since the decorator directive
      //waits for it. But best be sure.
      if (form && form.onChange) {
        ctrl.$viewChangeListeners.push(function() {
          if (angular.isFunction(form.onChange)) {
            form.onChange(ctrl.$modelValue, form);
          } else {
            scope.evalExpr(form.onChange, {'modelValue': ctrl.$modelValue, form: form});
          }
        });
      }
    }
  };
});


angular.module('schemaForm')
    .directive('infoHelpMessage', [function () {

        return {
            restrict: "AE",
            templateUrl: 'directives/decorators/stb-webmanual/info-message.html',
            scope: {
                infoMessage: '='
            },
            link: function (scope, element, attrs) {
            }
        }
    }]);

// override the default input to update on blur
angular.module('schemaForm').directive('ngModelOnblur', ['formFormatters', '$parse', function(formFormatters, $parse) {
  return {
    restrict: 'A',
    require: 'ngModel',
    priority: 1, // needed for angular 1.2.x
    link: function(scope, elm, attr, ngModelCtrl) {
      if (attr.type === 'radio' || attr.type === 'checkbox') return;

      var formatter = formFormatters.getFormatter(scope.$eval(attr.formatterName)) || function (input) {
          return input;
      };

      elm.unbind('input').unbind('keydown').unbind('change');
      elm.bind('blur', function() {
        scope.$apply(function() {
          if (!/[^\s]/.test(elm.val()) && ngModelCtrl.$pristine) {
          } else {
            ngModelCtrl.$setViewValue(formatter(elm.val()));
            ngModelCtrl.$render();
          }
        });
      });

      var maxLength = scope.$eval(attr.modelMaxLength);


      if (angular.isDefined(maxLength)) {

        elm.bind('keydown', function (e) {
          var charCode = e.which;
          var nonPrintableAllowed =
              charCode < 32
              || (charCode > 34 && charCode < 41) // home, end, arrows
              || charCode === 46; // delete

          if (nonPrintableAllowed) {
            return true;
          }

          if (elm.val().length >= maxLength) {
            e.preventDefault();
          }
        });

      }
    }
  };
}]);
/*
FIXME: real documentation
<form sf-form="form"  sf-schema="schema" sf-decorator="foobar"></form>
*/

angular.module('schemaForm')
       .directive('sfSchema',
['$compile', 'schemaForm', 'schemaFormDecorators', 'sfSelect',
  function($compile,  schemaForm,  schemaFormDecorators, sfSelect) {

    var SNAKE_CASE_REGEXP = /[A-Z]/g;
    var snakeCase = function(name, separator) {
      separator = separator || '_';
      return name.replace(SNAKE_CASE_REGEXP, function(letter, pos) {
        return (pos ? separator : '') + letter.toLowerCase();
      });
    };

    return {
      scope: {
        schema: '=sfSchema',
        initialForm: '=sfForm',
        model: '=sfModel'
      },
      controller: ['$scope', function($scope) {
        this.evalInParentScope = function(expr, locals) {
          return $scope.$parent.$eval(expr, locals);
        };

        this.evalInMainScope = function(expr, locals) {
          return $scope.$eval(expr, locals);
        };

      }],
      replace: false,
      restrict: 'A',
      transclude: true,
      require: '?form',
      link: function(scope, element, attrs, formCtrl, transclude) {

        //expose form controller on scope so that we don't force authors to use name on form
        scope.formCtrl = formCtrl;

        scope.defaultGlobals = scope.$eval(attrs.defaultGlobals) || {visibility: '', category: ''};

        //We'd like to handle existing markup,
        //besides using it in our template we also
        //check for ng-model and add that to an ignore list
        //i.e. even if form has a definition for it or form is ["*"]
        //we don't generate it.
        var ignore = {};
        transclude(scope, function(clone) {
          clone.addClass('schema-form-ignore');
          element.prepend(clone);

          if (element[0].querySelectorAll) {
            var models = element[0].querySelectorAll('[ng-model]');
            if (models) {
              for (var i = 0; i < models.length; i++) {
                var key = models[i].getAttribute('ng-model');
                //skip first part before .
                ignore[key.substring(key.indexOf('.') + 1)] = true;
              }
            }
          }
        });
        //Since we are dependant on up to three
        //attributes we'll do a common watch
        var lastDigest = {};

        scope.$watch(function() {

          var schema = scope.schema;
          var form   = scope.initialForm || ['*'];

          //The check for schema.type is to ensure that schema is not {}
          if (form && schema && schema.type &&
              (lastDigest.form !== form || lastDigest.schema !== schema) &&
              Object.keys(schema.properties).length > 0) {
            lastDigest.schema = schema;
            lastDigest.form = form;

            // Check for options
            var options = scope.$eval(attrs.sfOptions);

            var merged = schemaForm.merge(schema, form, ignore, options);
            var frag = document.createDocumentFragment();

            //make the form available to decorators
            scope.schemaForm  = {form:  merged, schema: schema};

            //Create directives from the form definition
            angular.forEach(merged, function(obj, i) {
              var n = document.createElement(attrs.sfDecoratorName ||
                      snakeCase(schemaFormDecorators.defaultDecorator, '-'));
              n.setAttribute('form', 'schemaForm.form[' + i + ']');
              n.setAttribute('default-globals', 'defaultGlobals');
              frag.appendChild(n);
            });

            //clean all but pre existing html.
            element.children(':not(.schema-form-ignore)').remove();

            element[0].appendChild(frag);

            //compile only children
            $compile(element.children())(scope);

            //ok, now that that is done let's set any defaults
            schemaForm.traverseSchema(schema, function(prop, path) {
              if (angular.isDefined(prop['default'])) {
                var val = sfSelect(path, scope.model);
                if (angular.isUndefined(val)) {
                  sfSelect(path, scope.model, prop['default']);
                }
              }
            });
          }
        });
      }
    };
  }
]);

angular.module('schemaForm').directive('schemaValidate', ['sfValidator', function(sfValidator) {
  return {
    restrict: 'A',
    scope: false,
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {

      var error = null;

      if (attrs.type === 'radio') {
        scope = scope.$parent;
      }
      //Since we have scope false this is the same scope
      //as the decorator
      if (!scope.ngModelHolder) {
        scope.ngModelHolder = ngModel;
      }

      var form   = scope.$eval(attrs.schemaValidate);
      // Validate against the schema.
      var validate = function(viewValue) {
        if (!form) {
          form = scope.$eval(attrs.schemaValidate);
        }

        //Still might be undefined
        if (!form) {
          return viewValue;
        }

        // Is required is handled by ng-required?
        if (angular.isDefined(attrs.ngRequired) && angular.isUndefined(viewValue)) {
          return undefined;
        }

        // An empty field gives us the an empty string, which JSON schema
        // happily accepts as a proper defined string, but an empty field
        // for the user should trigger "required". So we set it to undefined.
        if (viewValue === '') {
          viewValue = undefined;
        }

        var result = sfValidator.validate(form, viewValue);

          if (result.valid) {
            // it is valid
            scope.ngModelHolder.$setValidity('schema', true);
            return viewValue;
          } else {
            // it is invalid, return undefined (no model update)
            scope.ngModelHolder.$setValidity('schema', false);
            error = result.error;
            return undefined;
          }
        };

      // Unshift onto parsers of the ng-model.
      ngModel.$parsers.unshift(validate);


      // Listen to an event so we can validate the input on request
      scope.$on('schemaFormValidate', function() {

        if (scope.ngModelHolder.$commitViewValue) {
          scope.ngModelHolder.$commitViewValue(true);
        } else {
          scope.ngModelHolder.$setViewValue(scope.ngModelHolder.$viewValue);
        }
      });

      //This works since we now we're inside a decorator and that this is the decorators scope.
      //If empty don't show success (even if it's valid)
      scope.hasSuccess = function() {
        return scope.ngModelHolder.$valid && !scope.ngModelHolder.$isEmpty(scope.ngModelHolder.$modelValue);
      };

      scope.hasError = function() {
        return scope.ngModelHolder.$invalid && !scope.ngModelHolder.$pristine;
      };

      scope.schemaError = function() {
        return error;
      };

    }
  };
}]);
