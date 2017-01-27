angular.module('schemaForm').provider('schemaFormDecorators',
['$compileProvider', 'sfPathProvider', function($compileProvider, sfPathProvider) {
  'use strict';

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
                expression = expression.replace(new RegExp(key, 'g'), lookupForKey(key));
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

                var events = scope.form.events || {};
                if ( events.change ) {
                  events.change(!checked);
                }
              }, 0);
            };

            scope.radiosChange = function(item){
              var events = scope.form.events || {};
              if ( events.change ) {
                events.change(item);
              }
            }

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
              var validationMessage = scope.form.validationMessage;
              //User has supplied validation messages
              if (validationMessage) {
                if (schemaError) {
                  if (angular.isString(validationMessage)) {
                    return validationMessage;
                  }

                  return validationMessage[schemaError.code] ||
                    validationMessage['default'];
                } else {
                  return validationMessage.required ||
                         validationMessage['default'] ||
                         validationMessage;
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
              var modelExpression = $parse(scope.keyModelName);
              var getModel = function() {
                if (!modelExpression(scope)) {
                  modelExpression.assign(scope, []);
                }
                return modelExpression(scope);
              };

              var uploader = new FileUploader(scope.form.uploadConfig);
              uploader.autoUpload = true;
              uploader.removeAfterUpload = true;
              uploader.onAfterAddingFile = function(item) {
                scope.fileUploadError = null;
                var modelItem = {
                  fileName: item.file.name,
                  uploaderFileItem: item
                };
                getModel().push(modelItem);
                modelExpression.assign(scope, getModel());
              };
              uploader.onSuccessItem = function(item, response) {
                if (angular.isString(response)) {
                  if ((/^<pre>/).test(response)) {
                    response = response.replace(/<\/?pre>/ig, '');
                  }
                  response = angular.fromJson(response);
                }

                getModel().some(function(modelItem) {
                  if (modelItem.uploaderFileItem === item) {
                    $.extend(modelItem, response);
                    modelExpression.assign(scope, getModel());
                    return true;
                  }
                  return false;
                });
              };
              uploader.onErrorItem = function(item, response, status) {
                getModel().some(function(modelItem) {
                  if (modelItem.uploaderFileItem === item) {
                    scope.fileUploadError = scope.fileUploadError || {};
                    if (status === 422 && response && response.error === 'VIRUS_DETECTED') {
                      scope.fileUploadError.title = 'Filen inneholder skadelig kode, vennligst prøv på nytt med en annen fil.';
                    } else if (status === 410) {
                      scope.fileUploadError.title = 'Grunnet inaktivitet må fylle ut skjemaet på nytt.';
                    } else {
                      scope.fileUploadError.title = 'Beklager, noe gikk galt, vennligst prøv igjen.';
                    }
                    modelExpression.assign(scope, getModel());
                    return true;
                  }
                  return false;
                });
              };
              uploader.onWhenAddingFileFailed = function(item, error) {
                scope.fileUploadError = scope.fileUploadError || {};
                scope.fileUploadError.title = error.title;
              };

              scope.uploader = uploader;

              scope.removeFile = function(modelItem) {
                var itemIndex;
                getModel().some(function(item, index) {
                  if (modelItem === item) {
                    itemIndex = index;
                    return true;
                  }
                  return false;
                });

                if (itemIndex >= 0) {
                  getModel().splice(itemIndex, 1);
                  modelExpression.assign(scope, getModel());
                }

                var idKey = scope.form.deleteConfig.url.match(/\{(.+)\}/)[1];
                if ((!modelItem.uploaderFileItem || (modelItem.uploaderFileItem.isUploaded && !modelItem.uploaderFileItem.isError)) && idKey && modelItem[idKey]) {
                  var deleteConfig = {
                    url: scope.form.deleteConfig.url.replace(/\{.+\}/, modelItem[idKey]),
                    method: scope.form.deleteConfig.method || 'DELETE',
                    headers: scope.form.deleteConfig.headers
                  };
                  $http(deleteConfig);
                } else if (modelItem.uploaderFileItem && modelItem.uploaderFileItem.isUploading) {
                  modelItem.uploaderFileItem.cancel();
                }
              };

              scope.getExtensionFromFileName = function (fileName) {
                var re = /(?:\.([^.]+))?$/;
                return re.exec(fileName)[1];
              };

              scope.confirmOnFileRemove = function(item){
                if (scope.form.confirmDelete && !(item.uploaderFileItem || {}).isError){
                  scope.confirmDlgParams.visible = true;
                  scope.confirmDlgParams.submit = angular.bind({}, scope.removeFile, item);
                } else {
                  scope.removeFile(item);
                }
              };
            };

            scope.confirmOnClick = function(index){
              var form = scope.form;
              var action = this.action;

              var modelData = []; /* who cares if cb doesn't need it */

              if ( action.type === 'delete' && scope.form.confirmDelete ) {
                scope.confirmDlgParams = {
                  visible : true,
                  texts   : form.confirmDelete.texts,
                  submit  : angular.bind({}, form.confirmDelete.events.submit, modelData, index),
                  cancel  : angular.bind({}, form.confirmDelete.events.cancel, modelData, index)
                };

              } else if ( action.type === 'edit' && form.confirmEdit && form.confirmEdit.events.confirm() ){
                scope.confirmDlgParams = {
                  visible : true,
                  texts   : form.confirmEdit.texts,
                  submit  : angular.bind({}, form.confirmEdit.events.submit, modelData, index),
                  cancel  : angular.bind({}, form.confirmEdit.events.cancel, modelData, index)
                };

              } else {
                action.action(modelData, index);
              }
            };

            scope.$on('schemaFormValidationClean', function () {
              scope.fileUploadError = null;
            });
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
