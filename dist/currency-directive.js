angular.module("schemaForm").directive("stbCurrency",function(){"use strict";return{restrict:"A",require:"ngModel",priority:0,link:function(r,e,n,u){e.unbind("input").unbind("keydown").unbind("change");var c={};u.$modelValue='{sum: 1001, currency: "UAH"}';try{c=JSON.parse(u.$modelValue)}catch(o){console.log("Error parsing JSON",o)}r.sum=c.sum,r.currency=c.currency,console.log("value",c)}}});