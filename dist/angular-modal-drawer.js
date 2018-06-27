(function() {
  "use strict";

  angular.module('ngModalDrawer', [])

  angular.module('ngModalDrawer')
    .service('$modalDrawer', [
      '$q',
      '$templateCache',
      '$http',
      '$injector',
      '$rootScope',
      '$document',
      '$compile',
      '$controller',
      '$timeout',
      '$document',
      function($q,
               $templateCache,
               $http,
               $injector,
               $rootScope,
               $document,
               $compile,
               $controller,
               $timeout) {
        
        var modalScope; 
        var initOptions = {};
        var clickHandler;
        
        // add open panel class
        function open() {
          var element = document.getElementById("modalDrawerPopup");
          var content = document.getElementById("modalDrawerPopupContent");
          element.classList.remove("out");
          element.classList.add("in");
          content.classList.add("fadeIn");
          content.classList.remove("fadeOut");

          if(initOptions.backdrop){
            var backdropElem = document.getElementById('angularModalDrawerBackdrop');
            backdropElem.classList.add('modalBackdrop');
            if(initOptions.backdropClass){
              backdropElem.classList.add(initOptions.backdropClass);
            }
          }          
        }

        // add close panel class
        function close(modalResultDeferred, options, result) {
          var element = document.getElementById("modalDrawerPopup");
          var content = document.getElementById("modalDrawerPopupContent");
          element.classList.add("out");
          content.classList.add("fadeOut");
          element.classList.remove("in");
          content.classList.remove("fadeIn");

          if(options.resolve){
            modalResultDeferred.resolve(result);
          } else {
            modalResultDeferred.reject(result);
          }

          if(initOptions.backdrop){
            var backdropElem = document.getElementById('angularModalDrawerBackdrop');
            backdropElem.classList.remove('modalBackdrop');
            if(initOptions.backdropClass){
              backdropElem.classList.remove(initOptions.backdropClass);
            }
          }

          if(initOptions.closeOnClickOutside){
            $document.unbind('click', clickHandler);
          }  
          modalScope.$destroy(); 
        }

        // add dismiss
        function dismiss(modalResultDeferred, reason) {
          close(modalResultDeferred, {resolve: false}, reason);
        }

        // get template as a promise
        function getTemplatePromise(options) {
          if(options.template) return $q.when(options.template);

          var templateUrl = options.templateUrl;
          if(templateUrl && angular.isFunction(templateUrl)){
            templateUrl = (templateUrl)();
          }

          var getHtml = $templateCache.get(templateUrl);
          if(!getHtml){
            getHtml = $http.get(templateUrl);

            return $q.when(getHtml).then(function(result){
              return result.data;
            });
          }

          return $q.when(getHtml).then(function(result){
            return result;
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
          initOptions = modalOptions;
          var modalResultDeferred = $q.defer();
          var modalOpenedDeferred = $q.defer();

          //prepare an instance of a modal to be injected into controllers and returned to a caller
          var modalInstance = {
            result: modalResultDeferred.promise,
            opened: modalOpenedDeferred.promise,
            close: function(result) {
              close(modalResultDeferred, {resolve: true}, result)
            },
            dismiss: function(reason){
              dismiss(modalResultDeferred, reason)
            }
          };

          //merge and clean up options
          modalOptions.resolve = modalOptions.resolve || {};

          //verify options
          if (!modalOptions.template && !modalOptions.templateUrl) {
            throw new Error('One of template or templateUrl options is required.');
          }

          var templateAndResolvePromise =
            $q.all([getTemplatePromise(modalOptions)].concat(getResolvePromises(modalOptions.resolve)));

          templateAndResolvePromise.then(function resolveSuccess(tplAndVars) {
            modalScope = (modalOptions.scope || $rootScope).$new();
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

            clickHandler = function(event) {
              var modalDrawerPopupElem = angular.element(document.getElementById('modalDrawerPopup'));
              var isClickedElementChildOfPopup = modalDrawerPopupElem
                                                 .find(event.target)
                                                 .length > 0;

              if(modalDrawerPopupElem.width() != 0 && !isClickedElementChildOfPopup) {
                if(!modalScope.$onClickOutsidePanel){
                  console.error(new Error('$onClickOutsidePanel not defined')); 
                }
                modalScope.$onClickOutsidePanel();
              }
            }

            // close panel when clicked outside
            if(modalOptions.closeOnClickOutside){
              $document.bind('click', clickHandler)
            }          

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
          var body = $document.find('body').eq(0);
          // check if element already exists
          var element = document.getElementById('modalDrawerPopup');
          var backdropElem = document.getElementById('modalBackdrop');

          // use existing modalDrawerPopup if it exists
          if(element){
            var angularDomEl = angular.element(element);
            var angularBackdropElem = angular.element(backdropElem);
          }
          // create a new element otherwise
          else {
            var angularBackdropElem = angular.element('<div id="angularModalDrawerBackdrop"></div>');
            var angularDomEl = angular.element('<div id="modalDrawerPopup" class="sidenav out"></div>');
            angularDomEl.html('<div id="modalDrawerPopupContent" class="fadeOut"></div>');

          }

          angularDomEl.children().first().html(modal.content);
          var modalDomEl = $compile(angularDomEl)(modal.scope);

          // append newly created element
          if(!element){
            body.append(modalDomEl);
          }

          if(!backdropElem){
            body.append(angularBackdropElem);
          }

          open();
        }

      }
    ])

})();