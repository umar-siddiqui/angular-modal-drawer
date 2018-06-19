(function() {
  "use strict";

  angular.module('ngModalDrawer', [])

  angular.module('ngModalDrawer')
    .service('modalDrawer', [
      '$q',
      '$templateCache',
      '$http',
      '$injector',
      '$rootScope',
      '$document',
      '$compile',
      '$controller',
      '$timeout',
      function($q,
               $templateCache,
               $http,
               $injector,
               $rootScope,
               $document,
               $compile,
               $controller,
               $timeout) {

        // add open panel class
        function open() {
          var element = document.getElementById("modalDrawerPopup")
          element.classList.add("in");
          element.classList.remove("out");
        }

        // add close panel clas
        function close(modalResultDeferred, options) {
          var element = document.getElementById("modalDrawerPopup")
          element.classList.add("out");
          element.classList.remove("in");

          if(options.resolve){
            modalResultDeferred.resolve(true);
          } else {
            modalResultDeferred.reject(false);
          }

        }

        // add dismiss
        function dismiss(modalResultDeferred) {
          close(modalResultDeferred, {resolve: false});
        }

        // get template as a promise
        function getTemplatePromise(options) {
          return options.template ? $q.when(options.template) :
            $http.get(angular.isFunction(options.templateUrl) ? (options.templateUrl)() : options.templateUrl, // what is this ?
              {cache: $templateCache}).then(function (result) {
                return result.data;
            });
        }

        function getResolvePromises(resolves) {
          var promisesArr = [];
          angular.forEach(resolves, function (value) {
            if (angular.isFunction(value) || angular.isArray(value)) {
              promisesArr.push($q.when($injector.invoke(value)));
            }
          });
          return promisesArr;
        }

        this.open = function(modalOptions) {

          var modalResultDeferred = $q.defer();
          var modalOpenedDeferred = $q.defer();

          //prepare an instance of a modal to be injected into controllers and returned to a caller
          var modalInstance = {
            result: modalResultDeferred.promise,
            opened: modalOpenedDeferred.promise,
            close: function(result) {
              close(modalResultDeferred, {resolve: true})
            },
            dismiss: function(){
              dismiss(modalResultDeferred)
            }
          };

          //merge and clean up options
          // modalOptions = angular.extend({}, $modalProvider.options, modalOptions);
          modalOptions.resolve = modalOptions.resolve || {};

          //verify options
          if (!modalOptions.template && !modalOptions.templateUrl) {
            throw new Error('One of template or templateUrl options is required.');
          }

          var templateAndResolvePromise =
            $q.all([getTemplatePromise(modalOptions)].concat(getResolvePromises(modalOptions.resolve)));


          templateAndResolvePromise.then(function resolveSuccess(tplAndVars) {
            var modalScope = (modalOptions.scope || $rootScope).$new();
            modalScope.$close = modalInstance.close;
            modalScope.$dismiss = modalInstance.dismiss;

            var ctrlInstance, ctrlLocals = {};
            var resolveIter = 1;

            //controllers
            if (modalOptions.controller) {
              ctrlLocals.$scope = modalScope;
              ctrlLocals.$modalInstance = modalInstance;
              angular.forEach(modalOptions.resolve, function(value, key) {
                ctrlLocals[key] = tplAndVars[resolveIter++];
              });

              ctrlInstance = $controller(modalOptions.controller, ctrlLocals);
              if (modalOptions.controllerAs) {
                modalScope[modalOptions.controllerAs] = ctrlInstance;
              }
            }

            createModalDOM(modalInstance, {
              scope: modalScope,
              deferred: modalResultDeferred,
              content: tplAndVars[0],
            });

          }, function resolveError(reason) {
            modalResultDeferred.reject(reason);
          });

          templateAndResolvePromise.then(function() {
            modalOpenedDeferred.resolve(true);
          }, function() {
            modalOpenedDeferred.reject(false);
          });

          return modalInstance;
        };


        function createModalDOM(modalInstance, modal) {
          var body = $document.find('body').eq(0)

          // check if element already exists
          var element = document.getElementById('modalDrawerPopup');

          // use existing modalDrawerPopup if it exists
          if(element){
            var angularDomEl = angular.element(element);
          }
          // create a new element otherwise
          else {
            angularDomEl = angular.element('<div id="modalDrawerPopup" class="sidenav"></div>');
          }

          angularDomEl.html(modal.content);
          var modalDomEl = $compile(angularDomEl)(modal.scope);

          // append newly created element
          if(!element){
            body.append(modalDomEl);
          }

          // this is for making in transition work on first click
          $timeout(open, 0);
        }

      }
    ])


  // angular.module('ngModalDrawer')
  //   .directive('popDrawer', [
  //     'modalDrawer',
  //     function() {
  //       return {
  //         restrict: 'EA',
  //         link: function() {

  //         }
  //       }
  //     }
  //   ])


})();