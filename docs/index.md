Documentation
=============

1. [Basic Usage](#basic-usage)
1. [Handling Submit](#handling-submit)
1. [Global Options](#global-options)
1. [Form types](#form-types)
1. [Default form types](#default-form-types)
1. [Form definitions](#form-definitions)
1. [Overriding field types and order](#overriding-field-types-and-order)
1. [Standard Options](#standard-options)
    1. [onChange](#onchange)
    1. [Validation Messages](#validation-messages)
    1. [Inline feedback icons](#inline-feedback-icons)
    1. [ngModelOptions](#ngmodeloptions)
    1. [dependencies and expression](#dependencies-and-expression)
    1. [disabledExpression](#disabledExpression)
    1. [validationExpression](#validationExpression)
    1. [conditional values](#conditional-values)
1. [Specific options and types](#specific-options-and-types)
    1. [fieldset and section](#fieldset-and-section)
    1. [conditional](#conditional)
    1. [select,dropdown and checkboxes](#select,dropdown-and-checkboxes)
    1. [actions](#actions)
    1. [button](#button)
    1. [radios and radiobuttons](#radios-and-radiobuttons)
    1. [help](#help)
    1. [customer](#customer)
    1. [date-info](#dateinfo)
    1. [datepicker](#datepicker)
    1. [errorbox,infobox and successbox](#errorbox,infobox-and-successbox)
    1. [white-box](#whitebox)
    1. [hidden](#hidden)
1. [Post process function](#post-process-function)

Basic Usage
-----------

First, expose your schema, form, and model to the $scope.

```javascript
function FormController($scope) {
  $scope.schema = {
    type: "object",
    properties: {
      name: { type: "string", minLength: 2, title: "Name", description: "Name or alias" },
      title: {
        type: "string",
        enum: ['dr','jr','sir','mrs','mr','NaN','dj']
      }
    }
  };

  $scope.form = [
    "*",
    {
      type: "submit",
      title: "Save"
    }
  ];

  $scope.model = {};
}
```

Then load them into Schema Form using the `sfSchema`, `sfForm`, and `sfModel` directives.
Also we're using custom stb-decorators, that's why we should use additional `sfDecoratorName` directive.

```html
<div ng-controller="FormController">
    <form sf-schema="schema" sf-form="form" sf-model="model"
    sf-decorator-name="stb-webmanual-decorator"></form>
</div>
```

The `sfSchema` directive doesn't need to be on a form tag, in fact it can be quite useful
to set it on a div or some such inside the form instead. Especially if you like to prefix or suffix the
form with buttons or fields that are hard coded.

Example with custom submit buttons:
```html
<div ng-controller="FormController">
  <form>
    <p>bla bla bla</p>
    <div sf-schema="schema" sf-form="form" sf-model="model"></div>
    <input type="submit" value="Submit">
    <button type="button" ng-click="goBack()">Cancel</button>
  </form>
</div>
```

Handling Submit
---------------
Schema Form does not care what you do with your data, to handle form submit
the recomended way is to use the `ng-submit` directive. It's also recomended
to use a `name` attribute on your form so you can access the
[FormController](https://code.angularjs.org/1.3.0-beta.15/docs/api/ng/type/form.FormController)
and check if the form is valid or not.

You can force a validation by broadcasting the event `schemaFormValidate`, ex
`$scope.$broadcast('schemaFormValidate')`, this will immediately validate the
entire form and show any errors.

Example submit:
```javascript
function FormController($scope) {
  $scope.schema = {
    type: "object",
    properties: {
      name: { type: "string", minLength: 2, title: "Name", description: "Name or alias" },
      title: {
        type: "string",
        enum: ['dr','jr','sir','mrs','mr','NaN','dj']
      }
    }
  };

  $scope.form = [
    "*",
    {
      type: "submit",
      title: "Save"
    }
  ];

  $scope.model = {};

  $scope.onSubmit = function(form) {
    // First we broadcast an event so all fields validate themselves
    $scope.$broadcast('schemaFormValidate');

    // Then we check if the form is valid
    if (form.$valid) {
      // ... do whatever you need to do with your data.
    }
  }
}

```

And the HTML would be something like this:
```html
<div ng-controller="FormController">
    <form name="myForm"
          sf-schema="schema"
          sf-form="form"
          sf-model="model"
          ng-submit="onSubmit(myForm)"></form>
</div>
```


Global Options
--------------
Schema Form also have three options you can set globally via the `sf-options`
attribute which should be placed along side `sf-schema` and `default-globals`.

`sf-options` takes an object with the following possible attributes.


| Attribute     |                         |
|:--------------|:------------------------|
| supressPropertyTitles | by default schema form uses the property name in the schema as a title if none is specified, set this to true to disable that behavior |
| formDefaults | an object that will be used as a default for all form definitions |

*formDefaults* is mostly useful for setting global [ngModelOptions](#ngmodeloptions)
i.e. changing the entire form to validate on blur. But can also be used to set
[Validation Messages](#validation-messages) for all fields if you like a bit more
friendlier messages.

`default-globals` takes an object with the following possible attributes.

| Attribute     |                         |
|:--------------|:------------------------|
| visibility | by default schema form uses no visibility for keys in models, if not provided in schema then is taken from global options |
| category | sub dividing under visibility, by default is undefined, is taken from schema definition or from global options |
| prefix | can be used for common prefixing both category and visibility options in schema definition |

Ex.
```html
<div ng-controller="FormController">
    <form sf-schema="schema"
          sf-form="form"
          sf-model="model"
          sf-options="{ formDefaults: { ngModelOptions: { updateOn: 'blur' } }}"
          default-globals="{'visibility': 'open', 'category': '', 'prefix': 'group_'}"></form>
</div>
```



Form types
----------
Schema Form currently supports the following form field types out of the box:

| Form Type     |  Becomes                |
|:--------------|:------------------------|
| fieldset      |  a fieldset with legend |
| section       |  just a div             |
| actions       |  horizontal button list, can only submit and buttons as items |
| text          |  input with type text   |
| textarea      |  a textarea             |
| number        |  input type number      |
| checkbox      |  a checkbox             |
| checkboxes    |  list of checkboxes     |
| select        |  a select (single value)|
| dropdown      |  a select with ability to search |
| submit        |  a submit button        |
| button        |  a button               |
| radios        |  radio buttons          |
| radios-inline |  radio buttons in one line |
| radiobuttons  |  radio buttons with bootstrap buttons |
| help          |  insert arbitrary html |
| tab           |  tabs with content     |
| array         |  a list you can add, remove and reorder |
| tabarray      |  a tabbed version of array |
| customer      | common element for storebrand customer with validation by ssn, name and surname |
| date-info     | element which represent corrected provided date value with text and able to set value to the model |
| datepicker    | element for choosing date with interactive calendar |
| errorbox      | one of the infoboxes which is only for error message representing |
| hidden        |  errorbox with preventing model from correct validation |
| infobox       |  almost the same as errorbox but with different styles  |
| successbox    |  almost the same as errorbox but with different styles  |
| white-box     |  wrapper for questions with white-background  |




Default form types
------------------
Schema Form defaults to certain types of form fields depending on the schema for
a property.


| Schema             |   Form type  |
|:-------------------|:------------:|
| "type": "string"   |   text       |
| "type": "number"   |   number     |
| "type": "integer"  |   number     |
| "type": "boolean"  |   checkbox   |
| "type": "object"   |   fieldset   |
| "type": "string" and a "enum" | select |
| "type": "array" and a "enum" in array type | checkboxes |
| "type": "array" | array |



Form definitions
----------------
If you don't supply a form definition, it will default to rendering the after the defaults taken
from the schema.

A form definition is a list where the items can be
  * A star, ```"*"```
  * A string with the dot notated name/path to a property, ```"name"```
  * An object with that defines the options for a form field., ```{ key: "name" }```

The star, ```"*"``` means "use the default for the entire schema" and is useful when you want the
defaults plus an additional button.

ex.
```javascript
[
  "*",
  { type: 'submit', title: 'Save' }
]
```

The string notation, ```"name"```,  is just a shortcut for the object notation ```{ key: "name" }```
where key denotes what part of the schema we're creating a form field for.


Overriding field types and order
--------------------------------
The order of the fields is technically undefined since the order of attributes on an javascript
object (which the schema ends up being) is undefined. In practice it kind of works though.
If you need to override the order of the forms, or just want to be sure, specify a form definition.

ex.
```javascript
var schema = {
  "type": "object",
  "properties": {
    "surname":     { "type": "string" },
    "firstname":   { "type": "string" },
  }
}

[
  "firstname",
  "surname"
]
```

You can also override fields to force the type and supply other options:
ex.

```javascript
var schema = {
  "type": "object",
  "properties": {
    "surname":     { "type": "string" },
    "firstname":   { "type": "string" },
  }
}

[
  "firstname",
  {
    key: "surname",
    type: "select",
    titleMap: [
      { value: "Andersson", name: "Andersson" },
      { value: "Johansson", name: "Johansson" },
      { value: "other", name: "Something else..."}
    ]
  }
]
```

Standard Options
----------------

General options most field types can handle:
```javascript
{
  key: "address.street",      // The dot notatin to the attribute on the model
  type: "text",               // Type of field
  title: "Street",            // Title of field, taken from schema if available
  notitle: false,             // Set to true to hide title
  description: "Street name", // A description, taken from schema if available, can be HTML
  validationMessage: "Oh noes, please write a proper address",  // A custom validation error message
  onChange: "valueChanged(form.key,modelValue)", // onChange event handler, expression or function
  feedback: false,             // Inline feedback icons
  ngModelOptions: { ... }      // Passed along to ng-model-options
}
```


### dependencies and expression

Each form element can contain dependencies array and expression string such as:
```javascript
        "dependencies": ["intendsToMigrateInsurance", "_issueDay"],
        "expression": "intendsToMigrateInsurance === false && _issueDay !== undefined"
```
That means that field depends on two other fields "intendsToMigrateInsurance" and "_issueDay" and appears on the page only if expression string is evaluated as truthy. We need such dependencies array to be able to replace values in expression string with actual ones. That will also take care of `visibility` and `category` provided in schema definition or in the global options. When expression is falsy then element is hidden and won't be validated.



### disabledExpression

Almost the same as in expression definition above we should use dependencies array and disableExpression string. If evaluation of this string is truthy then elemend will be disabled, in no - enabled.


### validationExpression
Take a look above to undestand how expressions work. `validationExpression` is used for conditional validation. That only reflects on visual representation (if true then you will see validation icons, if false then no), but if the value invalid and validationExpression is set to true then you won't be able to procceed the form but still won't see validation errors.

### conditional values
Take a look above to undestand how expressions work.

```javascript
"conditionalValues": [
            {"expression": "hasAutoIdentificationNumber === true", "value": false},
            {"expression": "hasAutoIdentificationNumber === true && importAndCustomsCleared === true", "value": null}
          ]
          ```
That means that if on of the expressions in conditionalValues array is truthy then model value will be set to value of relative expression.

### onChange
The ```onChange``` option can be used with most fields and its value should be
either an angular expression, as a string, or a function. If its an expression
it will be evaluated in the parent scope of the ```sf-schema``` directive with
the special locals ```modelValue``` and ```form```. If its a function that will
be called with  ```modelValue``` and ```form``` as first and second arguments.

ex.
```javascript
$scope.form = [
  {
    key: "name",
    onChange: "updated(modelValue,form)"
  },
  {
    key: "password",
    onChange: function(modelValue,form) {
      console.log("Password is",modelValue);
    }
  }
];
```

### Validation Messages

Per default all error messages comes from the schema validator
[tv4](https://github.com/geraintluff/tv4), this might or might not work for you.
If you supply a `validationMessage` property in the form definition, and if its value is a
string that will be used instead on any validation error.

If you need more fine grained control you can supply an object instead with keys matching the error
codes of [tv4](https://github.com/geraintluff/tv4). See `tv4.errorCodes`

Ex.
```javascript
{
  key: "address.street",
  validationMessage: {
    tv4.errorCodes.STRING_LENGTH_SHORT: "Address is too short, man.",
    "default": "Just write a proper address, will you?"   //Special catch all error message
  }
}
```

You can also set a global `validationMessage` in *formDefaults* see
[Global Options](#global-options).


### Inline feedback icons
*input* and *textarea* based fields get inline status icons by default. A check
when everything is valid and a cross when there are validation errors.

This can be turned off or configured to other icons. To turn off just
set ```feedback``` to false. If set to a string that string is evaluated by
a ```ngClass``` in the decorators scope. If not set att all the default value
is ```{ 'glyphicon': true, 'glyphicon-ok': hasSuccess(), 'glyphicon-remove': hasError() }```

ex. displaying an asterisk on required fields
```javascript
  $sope.form = [
    {
      key: "name",
      feedback: "{ 'glyphicon': true, 'glyphicon-asterisk': form.requires && !hasSuccess && !hassError() ,'glyphicon-ok': hasSuccess(), 'glyphicon-remove': hasError() }"
    }
```

Useful things in the decorators scope are

| Name           | Description|
|:---------------|:----------:|
| hasSuccess()   | *true* if field is valid and not pristine |
| hasError()     | *true* if field is invalid and not pristine |
| ngModel        | The controller of the ngModel directive, ex. ngModel.$valid |
| form           | The form definition for this field |


See [Global Options](#global-options) for an example how you set entire form
to validate on blur.


Specific options and types
--------------------------

### fieldset and section

*fieldset* and *section* doesn't need a key. You can create generic groups with them.
They do need a list of ```items``` to have as children.
```javascript
{
  type: "fieldset",
  items: [
    "name",
    { key: "surname", notitle: true }
  ]
}
```

### select,dropdown and checkboxes

*select* and *checkboxes* can take an attribute, `titleMap`, wich defines a name
and a value. The value is bound to the model while the name is used for display.
In the case of *checkboxes* the names of the titleMap can be HTML.

A `titleMap` can be specified as either an object (same as in JSON Form), where
the propery is the value and the value of that property is the name, or as
a list of name-value objects. The latter is used internally and is the recomended
format to use. Note that when defining a `titleMap` as an object the value is
restricted to strings since property names of objects always is a string.

As a list:
```javascript
{
  type: "select",
  titleMap: [
    { value: "yes", name: "Yes I do" },
    { value: "no", name: "Hell no" }
  ]
}
```

As an object:
```javascript
{
  type: "select",
  titleMap: {
    "yes": "Yes I do",
    "no": "Hell no"
  }
}
```

### actions

*actions* behaves the same as fieldset, but can only handle buttons as chidren.
```javascript
{
  type: "actions",
  items: [
    { type: 'submit', title: 'Ok' }
    { type: 'button', title: 'Cancel', onClick: "cancel()" }
  ]
}
```

The submit button has btn-primary as default. The button has btn-default as default.
We can change this with ```style``` attribute:
```javascript
{
  type: "actions",
  items: [
    { type: 'submit', style: 'btn-success', title: 'Ok' }
    { type: 'button', style: 'btn-info', title: 'Cancel', onClick: "cancel()" }
  ]
}
```

### button

*button* can have a ```onClick``` attribute that either, as in JSON Form, is a function *or* a
string with an angular expression, as with ng-click. The expression is evaluated in the parent scope of
the ```sf-schema``` directive.

```javascript
[
  { type: 'button', title: 'Ok', onClick: function(){ ...  } }
  { type: 'button', title: 'Cancel', onClick: "cancel()" }
[
```

The submit button has btn-primary as default. The button has btn-default as default.
We can change this with ```style``` attribute:
```javascript
[
  { type: 'button', style: 'btn-warning', title: 'Ok', onClick: function(){ ...  } }
  { type: 'button', style: 'btn-danger', title: 'Cancel', onClick: "cancel()" }
[
```

### radios and radiobuttons
Both type *radios* and *radiobuttons* work the same way.
They take a `titleMap` and renders ordinary radio buttons or bootstrap 3 buttons
inline. It's a cosmetic choice.

The `titleMap` is either a list or an object, see [select and checkboxes](#select-and-checkboxes)
for details. The "name" part in the `titleMap` can be HTML.

Ex.
```javascript
function FormCtrl($scope) {
  $scope.schema = {
    type: "object",
    properties: {
      choice: {
        type: "string",
        enum: ["one","two"]
      }
    }
  };

  $scope.form = [
    {
      key: "choice",
      type: "radiobuttons",
      titleMap: [
        { value: "one", name: "One" },
        { value, "two", name: "More..." }
      ]
    }
  ];
}
```

The actual schema property it binds doesn't need to be a string with an enum.
Here is an example creating a yes no radio buttons that binds to a boolean.

Ex.
```javascript
function FormCtrl($scope) {
  $scope.schema = {
    type: "object",
    properties: {
      confirm: {
        type: "boolean",
        default: false
      }
    }
  };

  $scope.form = [
    {
      key: "choice",
      type: "radios",
      titleMap: [
        { value: false, name: "No I don't understand these cryptic terms" },
        { value: true, , name: "Yes this makes perfect sense to me" }
      ]
    }
  ];
}
```


With *radiobuttons*, both selected and unselected buttons have btn-primary as default.
We can change this with ```style``` attribute:
```javascript
function FormCtrl($scope) {
  $scope.schema = {
    type: "object",
    properties: {
      choice: {
        type: "string",
        enum: ["one","two"]
      }
    }
  };

  $scope.form = [
    {
      key: "choice",
      type: "radiobuttons",
      style: {
		selected: "btn-success",
		unselected: "btn-default"
	  },
	  titleMap: [
     { value: "one", name: "One" },
     { value, "two", name: "More..." }
   ]
  ];
}
```

### help
Help fields is not really a field, but instead let's you insert arbitrary HTML
into a form, suitable for help texts with links etc.

The get a help field you need to specify the type ```help``` and have a html
snippet as a string in the option ```helpvalue```

Ex.
```javascript
function FormCtrl($scope) {
  $scope.schema = {
    type: "object",
    properties: {
      name: {
        title: "Name",
        type: "string"
      }
    }
  };

  $scope.form = [
    {
      type: "help",
      helpvalue: "<h1>Yo Ninja!</h1>"
    },
    "name"
  ];
}
```
### customer

That is three fields to be honest but connected into one to provide easier way to validate user through events

basic usage:

```javascript
  {
    "type": "customer",
    "items": [
      {
        "key": "providedPersonInfo.nin",
        "itemType": "personNumber",
        "title": "Fødselsnummer",
        "infoMessage": "Fødselsnummeret ble oppgitt når du sjekket pris på produktet",
        "placeholder": "Fødselsnummer",
        "id": "someExample",
        "schemaOverride": {
          "type": "string",
          "required": true,
          "minLength": 11,
          "maxLength": 11
        }
      },
      {
        "key": "providedPersonInfo.name.firstName",
        "itemType": "firstName",
        "title": "Fornavn",
        "validationMessage": "Vennligst fyll inn ditt fornavn",
        "infoMessage": "Alle fornavn må fylles inn korrekt. Mellomnavn må ikke fylles inn",
        "placeholder": "Fornavn",
        "id": "another",
        "schemaOverride": {
          "type": "string",
          "required": true
        }
      },
      {
        "key": "providedPersonInfo.name.lastName",
        "itemType": "lastName",
        "title": "Etternavn",
        "validationMessage": "Vennligst fyll inn ditt etternavn",
        "infoMessage": "Etternavnet ditt må fylles inn korrekt. Mellomnavn må ikke fylles inn",
        "placeholder": "Etternavn",
        "schemaOverride": {
          "type": "string",
          "required": true
        }
      },
      {
        "key": "_userInvalidMessage",
        "itemType": "userError",
        "validationMessage": "Navn og fødselsnummer stemmer ikke overens. Husk å fylle inn akkurat slik det er registrert i folkeregisteret. Mellomnavn må ikke inkluderes",
        "type": "hidden",
        "schemaOverride": {
          "type": "string",
          "required": true
        }
      }
    ]
  }
```
This element emits `customer:validate` event when all three fields are set with such data `{
                    ssn: personNumber,
                    firstName: firstName,
                    lastName: lastName
                  })`
Also it listens to the `customer:isValid` event for validation and error message showing and waits for such info
`{isValid: boolean, firstName: 'corrected name', lastName: 'corrected last name'}`
Corrected names can be same as sent ones but probably customer-master service will correct your spelling



### dateinfo

Date-info box is used for showing corrected date from datepicker for example.

It has complex logic and probably can be used only for insurances (old skade logic is under the hood)

Basic usage:

```javascript
{
              "type": "infodate",
              "modelKey": "issueDate",
              "dateKey": "_expirationDateDay",
              "maxMonthlyDifference": 2,
              "minMonthlyDifference": 0,
              "additionalMonthlyDifference": 1,
              "additionalDailyDifference": 1,
              "hasDefaultDateValue": true,
              "encoding": "nn",
              "format": "Do MMMM YYYY",
              "staticMessage": "Forsikringen vil gjelde fra",
              "dependencies": ["intendsToMigrateInsurance", "expirationDateKnown", "_expirationDateDay"],
              "expression": "intendsToMigrateInsurance === true && expirationDateKnown === true &&  _expirationDateDay !== undefined"
            }
```
Here `modelKey` - name of property which wll be persisted in the model, `dateKey` - key of source date in the model,
`maxMonthlyDifference` - how many month for current can be set as the current insurance buying date,  `minMonthlyDifference` - oposite of `maxMonthlyDifference`, `additionalMonthlyDifference` - if source date is more than `maxMonthlyDifference` from the current date then `current date + additionalMonthlyDifference + additionalDailyDifference` will be set as modelValue.

### datepicker

Basic usage: all the same as in other types but only `"format": "date"` should be set in schema definition for this field.

### errorbox,infobox and successbox

Usage of all this element is basically the same.
```javascript
{
              "type": "infobox || errorbox || successbox",
              "infoMessage": "Det er ikke mulig å flytte forsikringen fra et annet selskap hvis bilen ikke har reg.nr, vennligst ta kontakt med kundeservice"
            },
```
### whitebox

It's only a wrapper with white background and 100% width. Also it inverts all white blocks into sand color blocks

```javascript
{
          "type": "whitebox",
          "items": [...]
          }
          ```
          
### hidden

This type is using when we should interrupt form processing with some error

```javascript
            {
              "key": "_isNotAllowedToBuy",
              "validationMessage": "Denne bilen kan dessverre ikke tegnes på nett, vennligst ta kontakt med kundeservice",
              "type": "hidden",
              "dependencies": ["importAndCustomsCleared"],
              "expression": "importAndCustomsCleared === true"
            }
            ```
It also should be required in the schema definition to interrupt processing

Post process function
---------------------

If you like to use `["*"]` as a form, or aren't in control of the form definitions
but really need to change or add something you can register a *post process*
function with the `schemaForm` service provider. The post process function
gets one argument, the final form merged with the defaults from the schema just
before it's rendered, and should return a form.

Ex. Reverse all forms
```javascript
angular.module('myModule', ['schemaForm']).config(function(schemaFormProvider){

  schemaFormProvider.postProcess(function(form){
    form.reverse();
    return form;
  })

});
```
