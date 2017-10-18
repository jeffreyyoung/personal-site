'use strict';

angular.module('common').config(function (embed) {
	embed.preventConfig('segment-builder');
});

angular.module('virtual-report-suite-builder', ['common', 'segment-builder']).run(function (embed, $rootScope, DragProxy, appCache) {

	appCache.import('default-definitions');

	appCache.config('segments', {
		support: 'oberon',
		expansion: 'tags',
		includeType: 'all' });

	// Multiple item dragging stacking effect
	DragProxy.itemCountClass('drag-proxy-item-count').itemLayerClass('drag-proxy-item-layer');
});
'use strict';

angular.module('virtual-report-suite-builder').directive('virtualReportSuiteActionBar', function ($timeout, CUI) {
	return {
		templateUrl: 'directives/virtual-report-suite-action-bar.tpl.html'
	};
});
'use strict';

angular.module('virtual-report-suite-builder').directive('virtualReportSuiteBuilder', function (analyticsConfig, $q, $document, $location, $log, Tag, eventBus, $filter, DragManager, definitionParser, metricCallbackExecutor, $timeout, callbackRegistryService, spinnerService, tagRepository, util, $http, segmentRepository, scUrl, trackService, segmentDefinitionService, serverTime, inAppEditors, usageService, $window, moment, ComponentListService, VirtualReportSuite, virtualReportSuiteRepository, reportSuiteRepository, userGroupRepository, timezoneRepository, appModel) {
	var Dialog = analyticsui['ui-core'].Dialog;
	var Segment = analyticsui['model'].Segment;


	return {
		templateUrl: 'directives/virtual-report-suite-builder.tpl.html',
		restrict: 'E',
		replace: true,
		scope: {
			embedded: '@',
			editId: '=',
			state: '=' // state that was previously stored when calling saveState
		},
		controller: function controller($scope, $element, $attrs, _, cls) {

			$scope.initData = function () {
				spinnerService.show('vrsSpinner');
				loadVirtualReportSuite();
				$scope.initializing = false;
			};

			function loadVirtualReportSuite() {
				trackService.trackAction(null, 'Virtual Report Suite Builder Load', {
					type: pageLoadType()
				});

				$scope.selectedItem = {};
				var originalGroups = [];

				$q.all([getVirtualReportSuite(), tagRepository.query(), reportSuiteRepository.getAvailableReportSuites({ expansion: 'reportSuiteName', types: 'base' }), userGroupRepository.query({ expansion: 'rsid' }), timezoneRepository.query()]).then(function (results) {
					spinnerService.hide('vrsSpinner');
					$scope.virtualReportSuite = $scope.editId ? results[0] : VirtualReportSuite.fromJSON({});
					var tags = results[1];
					$scope.parentRsidList = results[2];
					_.forEach($scope.parentRsidList, function (parentRsid) {
						parentRsid.name = parentRsid.reportSuiteName;
						parentRsid.label = parentRsid.reportSuiteName;
						parentRsid.value = parentRsid.rsid;
					});
					var groups = results[3];
					$scope.timezoneList = results[4];

					appModel.repo.getWithIds(Segment, $scope.virtualReportSuite.segmentList).then(function (segments) {
						_updateDropzoneSegments(segments);
						$scope.$evalAsync();
					});

					// Remove the All group
					groups = _.filter(groups, function (group) {
						return group.groupId !== 1;
					});

					// Set selected items for fields to virtual report suite's existing attributes
					var selectedTagIds = _.pluck(_.get($scope, 'virtualReportSuite.tags', []), 'id');
					var selectedGroupIds = _.pluck(_.get($scope, 'virtualReportSuite.groups', []), 'groupId');
					var parentRsidIndex = _.indexOf(_.pluck($scope.parentRsidList, 'rsid'), $scope.virtualReportSuite.parentRsid);
					var timezoneIndex = _.indexOf(_.pluck($scope.timezoneList, 'id'), $scope.virtualReportSuite.timezone);

					$timeout(function () {
						if (selectedTagIds.length) {
							tags.forEach(function (tag) {
								if (selectedTagIds.indexOf(tag.id) != -1) {
									tag.selected = true;
								}
							});
						}
						$scope.tags = tags;
						if (selectedGroupIds.length) {
							groups.forEach(function (group) {
								if (selectedGroupIds.indexOf(group.groupId) != -1) {
									group.selected = true;
								}
							});
						}
						$scope.groups = groups;
						originalGroups = _.filter($scope.groups, { 'selected': true });
						if (parentRsidIndex > -1) {
							$scope.selectedItem.parentRsid = $scope.parentRsidList[parentRsidIndex];
						}
						if (timezoneIndex > -1) {
							$scope.selectedItem.timezone = $scope.timezoneList[timezoneIndex];
						}
					});
				});
			}

			function getVirtualReportSuite() {
				if ($scope.editId) {
					return virtualReportSuiteRepository.getModel({ id: $scope.editId });
				}
			}

			//------------------------------------------------------------------------------------------------------
			// Component Dropzone options
			//------------------------------------------------------------------------------------------------------

			$scope.componentOptions = {
				components: [],
				onChange: function onChange(e) {
					$scope.$evalAsync(function () {
						$scope.virtualReportSuite.segmentList = _.pluck(e.value, 'id');
						_updateDropzoneSegments(e.value);
					});
				},
				segmentInternal: false
			};

			function _updateDropzoneSegments(segments) {
				$scope.componentOptions = _.extend({}, $scope.componentOptions, {
					components: segments
				});
			}

			//------------------------------------------------------------------------------------------------------
			// End Component Dropzone options
			//------------------------------------------------------------------------------------------------------

			//------------------------------------------------------------------------------------------------------
			// Tags/Groups/Timezones
			//------------------------------------------------------------------------------------------------------

			$scope.onParentRsidChange = function (item) {
				if (item) {
					$scope.virtualReportSuite.parentRsid = item.rsid;
					$scope.virtualReportSuite.parentRsidName = item.reportSuiteName;
				}
			};

			$scope.onTimezoneChange = function (item) {
				if (item) {
					$scope.virtualReportSuite.timezone = item.id;
				}
			};

			//------------------------------------------------------------------------------------------------------
			// End Tags/Groups/Timezones
			//------------------------------------------------------------------------------------------------------

			//------------------------------------------------------------------------------------------------------
			// Saving Virtual Report Suite
			//------------------------------------------------------------------------------------------------------

			$scope.cancel = function () {
				$window.location.href = scUrl.spas('component-manager', { 'componentType': 'virtualReportSuites' });
			};

			$scope.deleteVirtualReportSuite = function () {
				Dialog.confirm($filter('l10n')(['areYouSureYouWantToDeleteVRSWarningText', 'Are you sure you want to delete this Virtual Report Suite? Doing so will remove access to this Virtual Report Suite for all users. Scheduled reports/projects, bookmarks, and dashboards based on this Virtual Report Suite will continue to be based on the deleted Virtual Report Suite until edited.'])).then(function () {
					spinnerService.show('vrsSpinner');
					virtualReportSuiteRepository.delete({ id: $scope.virtualReportSuite.id });
					$window.location.href = scUrl.spas('component-manager', { 'componentType': 'virtualReportSuites' });
				});
			};

			function getSelectedTags() {
				return $scope.tags.filter(function (tag) {
					return tag.selected;
				}).map(function (tag) {
					return new Tag({ name: tag.name });
				});
			}

			function getSelectedGroups() {
				return $scope.groups.filter(function (group) {
					return group.selected;
				});
			}

			$scope.saveVirtualReportSuite = function (saveAs) {
				if ($scope.vrsIsValid()) {
					spinnerService.show('vrsSpinner');

					var originalGroups = [];
					var selectedGroups = [];

					if (saveAs) {
						$scope.virtualReportSuite.id = '';
						originalGroups = [];
						selectedGroups = getSelectedGroups();
					} else {
						originalGroups = $scope.virtualReportSuite.groups;
						selectedGroups = _.map(getSelectedGroups(), function (group) {
							return _.omit(group, ['id', 'type', 'selected']);
						});
					}

					$scope.virtualReportSuite.owner = null;
					$scope.virtualReportSuite.tags = getSelectedTags();

					trackService.trackAction(null, 'Save Virtual Report Suite', {
						saveType: $scope.virtualReportSuite.id ? 'save' : 'save-as',
						hasDescription: $scope.virtualReportSuite.description && $scope.virtualReportSuite.description.length > 0,
						hasTags: getSelectedTags().length > 0,
						groupCount: getSelectedGroups().length,
						segmentCount: $scope.virtualReportSuite.segmentList.length
					});

					virtualReportSuiteRepository.saveModel($scope.virtualReportSuite, originalGroups, selectedGroups).then(function () {
						$window.location.href = scUrl.spas('component-manager', { 'componentType': 'virtualReportSuites' });
						spinnerService.hide('vrsSpinner');
					});
				}
			};

			$scope.vrsIsValid = function () {
				if ($scope.virtualReportSuite) {
					if (!$scope.virtualReportSuite.name || !$scope.virtualReportSuite.parentRsid || $scope.virtualReportSuite.segmentList.length < 1) {
						return false;
					} else {
						return true;
					}
				}
				return false;
			};

			//------------------------------------------------------------------------------------------------------
			// End Saving Virtual Report Suite
			//------------------------------------------------------------------------------------------------------

			$scope.alerts = [];
			$scope.initializing = true;
			$scope.dragManager = DragManager;
			$scope.dragging = DragManager.dragging;

			$scope.callbackKey = 'virtual-report-suite-builder';
			callbackRegistryService.fetchCallbackParams($scope.callbackKey);

			$scope.removeAlert = function (index) {
				$scope.alerts.splice(index, 1);
			};

			//------------------------------------------------------------------------------------------------------
			// Tracking helper functions
			//------------------------------------------------------------------------------------------------------

			function pageLoadType() {
				if ($scope.editId) {
					return 'edit';
				} else {
					return 'new';
				}
			}
		}
	};
});
'use strict';

angular.module('virtual-report-suite-builder').controller('virtualReportSuiteMainCtrl', function ($scope, util) {

	util.extendController($scope, 'stateManagerCtrl');
});
angular.module("virtual-report-suite-builder").run(["$templateCache", function($templateCache) {$templateCache.put("directives/virtual-report-suite-action-bar.tpl.html","<nav ad-action-bar-observer class=\"shell-Panel-header shell-ActionBar virtual-report-suite-action-bar\" >\n	<div class=\"shell-ActionBar-left\">\n		<h1 class=\"coral-Heading coral-Heading--1\" ng-if=\"!editId\">{{ [\'newVirtualReportSuite\', \'New Virtual Report Suite\'] | l10n }}</h1>\n		<h1 class=\"coral-Heading coral-Heading--1\" ng-if=\"editId\">{{ [\'editVirtualReportSuite\', \'Edit Virtual Report Suite\'] | l10n }}</h1>\n	</div>\n	<div class=\"shell-ActionBar-right\">\n		<a class=\"coral-Link\" ng-click=\"cancel()\">{{ [\'cancelButtonLabel\', \'Cancel\'] | l10n }}</a>\n		<button class=\"coral-Button coral-Button--primary\" ng-disabled=\"!vrsIsValid()\" ng-click=\"saveVirtualReportSuite()\">{{ [\'saveButtonLabel\', \'Save\'] | l10n }}</button>\n		<button ng-if=\"editId\" class=\"coral-Button coral-Button--primary\" ng-disabled=\"!vrsIsValid()\" ng-click=\"saveVirtualReportSuite(true)\">{{ [\'saveAsButtonLabel\', \'Save As\'] | l10n }}</button>\n		<button ng-if=\"editId\" class=\"coral-Button coral-Button--warning\" ng-click=\"deleteVirtualReportSuite()\">{{ [\'deleteButtonLabel\', \'Delete\'] | l10n }}</button>\n	</div>\n</nav>\n");
$templateCache.put("directives/virtual-report-suite-builder.tpl.html","<div class=\"virtual-report-suite-builder\">\n\n	<div ng-init=\"initData()\">\n		<div class=\"vrs-main-content u-coral-padding\">\n			<div ng-show=\"!initializing\">\n				<ad-alerts-box></ad-alerts-box>\n\n				<!-- Form fields -->\n				<div class=\"vrs-builder-container\">\n					<div class=\"vrs-heading-fields\">\n\n						<label class=\"coral-Form-fieldlabel\">{{ [\'vrsNameHeading\', \'Name\'] | l10n }}</label>\n						<div><input type=\"text\" class=\"titleField coral-Textfield\" ng-model=\"virtualReportSuite.name\"></div>\n						<label class=\"coral-Form-fieldlabel\">{{ [\'vrsDescriptionHeading\', \'Description\'] | l10n }}</label>\n						<textarea class=\"coral-Textfield coral-Textfield--multiline descriptionField\" ng-model=\"virtualReportSuite.description\"></textarea>\n\n						<label class=\"coral-Form-fieldlabel\">{{:: [\"tagsHeader\", \"Tags\"] | l10n }}</label>\n						<div>\n							<ad-quick-add\n								items=\"tags\"\n								placeholder-text-key=\"{{ [\'addTagsLabel\', \'Add Tags\'] | l10n }}\"\n								icon-class-name=\"tag\"\n								allow-create=\"true\">\n							</ad-quick-add>\n						</div>\n\n						<label class=\"coral-Form-fieldlabel\">{{:: [\"groupsHeader\", \"Groups\"] | l10n }}</label>\n						<div>\n							<ad-quick-add\n		   						items=\"groups\"\n	    						placeholder-text-key=\"{{ [\'addGroups\', \'Add Groups\'] | l10n }}\"\n	     						icon-class-name=\"users\">\n	    					</ad-quick-add>\n						</div>\n\n						<!-- Parent report suite selector -->\n						<label class=\"coral-Form-fieldlabel\">{{:: [\"parentReportSuite\", \"Parent Report Suite\"] | l10n }}</label>\n						<div>\n							<ad-autocomplete\n								size=\"block\"\n								search-key=\"reportSuiteName\"\n								data-provider=\"parentRsidList\"\n								ad-placeholder-text=\"{{ [\'chooseParent\', \'Choose Parent\'] | l10n }}\"\n								selected-item=\"selectedItem.parentRsid\"\n								icon-class-name=\"data\"\n								item-changed-handler=\"onParentRsidChange(item)\"\n								multi=\"false\">\n							</ad-autocomplete>\n						</div>\n\n						<!-- Timezone selector -->\n						<label class=\"coral-Form-fieldlabel\">{{:: [\"timezone\", \"Timezone\"] | l10n }}</label>\n						<div>\n							<ad-autocomplete\n								size=\"block\"\n								search-key=\"name\"\n								data-provider=\"timezoneList\"\n								ad-placeholder-text=\"{{ [\'chooseTimezone\', \'Choose Timezone\'] | l10n }}\"\n								selected-item=\"selectedItem.timezone\"\n								icon-class-name=\"globe\"\n								item-changed-handler=\"onTimezoneChange(item)\"\n								multi=\"false\">\n							</ad-autocomplete>\n						</div>\n\n						<!-- Segment drop zone -->\n						<label class=\"coral-Form-fieldlabel\">{{:: [\"segmentsHeader\", \"Segments\"] | l10n }}</label>\n\n						<ad-react-component type=\"ComponentPillGroup.Segment\" props=\"componentOptions\" deep-watch=\"false\"></ad-react-component>\n					</div>\n				</div>\n			</div>\n		</div>\n	</div>\n	<an-spinner id=\"vrsSpinner\" large=\"true\" center=\"true\"></an-spinner>\n	<an-segment-preview in-app-editor=\"true\"></an-segment-preview>\n</div>\n");
$templateCache.put("views/main.tpl.html","<virtual-report-suite-builder edit-id=\"editId\"></virtual-report-suite-builder>\n");}]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBhZ2VzL3ZpcnR1YWwtcmVwb3J0LXN1aXRlLWJ1aWxkZXIvYXBwLmpzIiwicGFnZXMvdmlydHVhbC1yZXBvcnQtc3VpdGUtYnVpbGRlci9kaXJlY3RpdmVzL3ZpcnR1YWwtcmVwb3J0LXN1aXRlLWFjdGlvbi1iYXIuanMiLCJwYWdlcy92aXJ0dWFsLXJlcG9ydC1zdWl0ZS1idWlsZGVyL2RpcmVjdGl2ZXMvdmlydHVhbC1yZXBvcnQtc3VpdGUtYnVpbGRlci5qcyIsInBhZ2VzL3ZpcnR1YWwtcmVwb3J0LXN1aXRlLWJ1aWxkZXIvdmlld3MvbWFpbi1jdHJsLmpzIiwicGFnZXMvdmlydHVhbC1yZXBvcnQtc3VpdGUtYnVpbGRlci9kaXJlY3RpdmVzL3ZpcnR1YWwtcmVwb3J0LXN1aXRlLWFjdGlvbi1iYXIudHBsLmh0bWwiLCJwYWdlcy92aXJ0dWFsLXJlcG9ydC1zdWl0ZS1idWlsZGVyL2RpcmVjdGl2ZXMvdmlydHVhbC1yZXBvcnQtc3VpdGUtYnVpbGRlci50cGwuaHRtbCIsInBhZ2VzL3ZpcnR1YWwtcmVwb3J0LXN1aXRlLWJ1aWxkZXIvdmlld3MvbWFpbi50cGwuaHRtbCJdLCJuYW1lcyI6WyJhbmd1bGFyIiwibW9kdWxlIiwiY29uZmlnIiwiZW1iZWQiLCJwcmV2ZW50Q29uZmlnIiwicnVuIiwiJHJvb3RTY29wZSIsIkRyYWdQcm94eSIsImFwcENhY2hlIiwiaW1wb3J0Iiwic3VwcG9ydCIsImV4cGFuc2lvbiIsImluY2x1ZGVUeXBlIiwiaXRlbUNvdW50Q2xhc3MiLCJpdGVtTGF5ZXJDbGFzcyIsImRpcmVjdGl2ZSIsIiR0aW1lb3V0IiwiQ1VJIiwidGVtcGxhdGVVcmwiLCJhbmFseXRpY3NDb25maWciLCIkcSIsIiRkb2N1bWVudCIsIiRsb2NhdGlvbiIsIiRsb2ciLCJUYWciLCJldmVudEJ1cyIsIiRmaWx0ZXIiLCJEcmFnTWFuYWdlciIsImRlZmluaXRpb25QYXJzZXIiLCJtZXRyaWNDYWxsYmFja0V4ZWN1dG9yIiwiY2FsbGJhY2tSZWdpc3RyeVNlcnZpY2UiLCJzcGlubmVyU2VydmljZSIsInRhZ1JlcG9zaXRvcnkiLCJ1dGlsIiwiJGh0dHAiLCJzZWdtZW50UmVwb3NpdG9yeSIsInNjVXJsIiwidHJhY2tTZXJ2aWNlIiwic2VnbWVudERlZmluaXRpb25TZXJ2aWNlIiwic2VydmVyVGltZSIsImluQXBwRWRpdG9ycyIsInVzYWdlU2VydmljZSIsIiR3aW5kb3ciLCJtb21lbnQiLCJDb21wb25lbnRMaXN0U2VydmljZSIsIlZpcnR1YWxSZXBvcnRTdWl0ZSIsInZpcnR1YWxSZXBvcnRTdWl0ZVJlcG9zaXRvcnkiLCJyZXBvcnRTdWl0ZVJlcG9zaXRvcnkiLCJ1c2VyR3JvdXBSZXBvc2l0b3J5IiwidGltZXpvbmVSZXBvc2l0b3J5IiwiYXBwTW9kZWwiLCJEaWFsb2ciLCJhbmFseXRpY3N1aSIsIlNlZ21lbnQiLCJyZXN0cmljdCIsInJlcGxhY2UiLCJzY29wZSIsImVtYmVkZGVkIiwiZWRpdElkIiwic3RhdGUiLCJjb250cm9sbGVyIiwiJHNjb3BlIiwiJGVsZW1lbnQiLCIkYXR0cnMiLCJfIiwiY2xzIiwiaW5pdERhdGEiLCJzaG93IiwibG9hZFZpcnR1YWxSZXBvcnRTdWl0ZSIsImluaXRpYWxpemluZyIsInRyYWNrQWN0aW9uIiwidHlwZSIsInBhZ2VMb2FkVHlwZSIsInNlbGVjdGVkSXRlbSIsIm9yaWdpbmFsR3JvdXBzIiwiYWxsIiwiZ2V0VmlydHVhbFJlcG9ydFN1aXRlIiwicXVlcnkiLCJnZXRBdmFpbGFibGVSZXBvcnRTdWl0ZXMiLCJ0eXBlcyIsInRoZW4iLCJyZXN1bHRzIiwiaGlkZSIsInZpcnR1YWxSZXBvcnRTdWl0ZSIsImZyb21KU09OIiwidGFncyIsInBhcmVudFJzaWRMaXN0IiwiZm9yRWFjaCIsInBhcmVudFJzaWQiLCJuYW1lIiwicmVwb3J0U3VpdGVOYW1lIiwibGFiZWwiLCJ2YWx1ZSIsInJzaWQiLCJncm91cHMiLCJ0aW1lem9uZUxpc3QiLCJyZXBvIiwiZ2V0V2l0aElkcyIsInNlZ21lbnRMaXN0IiwiX3VwZGF0ZURyb3B6b25lU2VnbWVudHMiLCJzZWdtZW50cyIsIiRldmFsQXN5bmMiLCJmaWx0ZXIiLCJncm91cCIsImdyb3VwSWQiLCJzZWxlY3RlZFRhZ0lkcyIsInBsdWNrIiwiZ2V0Iiwic2VsZWN0ZWRHcm91cElkcyIsInBhcmVudFJzaWRJbmRleCIsImluZGV4T2YiLCJ0aW1lem9uZUluZGV4IiwidGltZXpvbmUiLCJsZW5ndGgiLCJ0YWciLCJpZCIsInNlbGVjdGVkIiwiZ2V0TW9kZWwiLCJjb21wb25lbnRPcHRpb25zIiwiY29tcG9uZW50cyIsIm9uQ2hhbmdlIiwiZSIsInNlZ21lbnRJbnRlcm5hbCIsImV4dGVuZCIsIm9uUGFyZW50UnNpZENoYW5nZSIsIml0ZW0iLCJwYXJlbnRSc2lkTmFtZSIsIm9uVGltZXpvbmVDaGFuZ2UiLCJjYW5jZWwiLCJsb2NhdGlvbiIsImhyZWYiLCJzcGFzIiwiZGVsZXRlVmlydHVhbFJlcG9ydFN1aXRlIiwiY29uZmlybSIsImRlbGV0ZSIsImdldFNlbGVjdGVkVGFncyIsIm1hcCIsImdldFNlbGVjdGVkR3JvdXBzIiwic2F2ZVZpcnR1YWxSZXBvcnRTdWl0ZSIsInNhdmVBcyIsInZyc0lzVmFsaWQiLCJzZWxlY3RlZEdyb3VwcyIsIm9taXQiLCJvd25lciIsInNhdmVUeXBlIiwiaGFzRGVzY3JpcHRpb24iLCJkZXNjcmlwdGlvbiIsImhhc1RhZ3MiLCJncm91cENvdW50Iiwic2VnbWVudENvdW50Iiwic2F2ZU1vZGVsIiwiYWxlcnRzIiwiZHJhZ01hbmFnZXIiLCJkcmFnZ2luZyIsImNhbGxiYWNrS2V5IiwiZmV0Y2hDYWxsYmFja1BhcmFtcyIsInJlbW92ZUFsZXJ0IiwiaW5kZXgiLCJzcGxpY2UiLCJleHRlbmRDb250cm9sbGVyIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFFQUEsUUFBQUMsTUFBQSxDQUFBLFFBQUEsRUFBQUMsTUFBQSxDQUFBLFVBQUFDLEtBQUEsRUFBQTtBQUNBQSxPQUFBQyxhQUFBLENBQUEsaUJBQUE7QUFDQSxDQUZBOztBQUlBSixRQUNBQyxN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QUFBLGtCQUFBO0FBRUEsQ0FOQTtnR0NEQTtBQ0FBO0FDQUEiLCJmaWxlIjoidmlydHVhbC1yZXBvcnQtc3VpdGUtYnVpbGRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2NvbW1vbicpLmNvbmZpZyhmdW5jdGlvbihlbWJlZCkge1xuXHRlbWJlZC5wcmV2ZW50Q29uZmlnKCdzZWdtZW50LWJ1aWxkZXInKTtcbn0pO1xuXG5hbmd1bGFyXG5cdC5tb2R1bGUoJ3ZpcnR1YWwtcmVwb3J0LXN1aXRlLWJ1aWxkZXInLCBbJ2NvbW1vbicsICdzZWdtZW50LWJ1aWxkZXInXSlcblx0LnJ1bihmdW5jdGlvbihlbWJlZCwgJHJvb3RTY29wZSwgRHJhZ1Byb3h5LCBhcHBDYWNoZSkge1xuXG5cdFx0YXBwQ2FjaGUuaW1wb3J0KCdkZWZhdWx0LWRlZmluaXRpb25zJyk7XG5cblx0XHRhcHBDYWNoZS5jb25maWcoJ3NlZ21lbnRzJywge1xuXHRcdFx0c3VwcG9ydDonb2Jlcm9uJyxcblx0XHRcdGV4cGFuc2lvbjogJ3RhZ3MnLFxuXHRcdFx0aW5jbHVkZVR5cGU6ICdhbGwnfVxuXHRcdCk7XG5cblx0XHQvLyBNdWx0aXBsZSBpdGVtIGRyYWdnaW5nIHN0YWNraW5nIGVmZmVjdFxuXHRcdERyYWdQcm94eVxuXHRcdFx0Lml0ZW1Db3VudENsYXNzKCdkcmFnLXByb3h5LWl0ZW0tY291bnQnKVxuXHRcdFx0Lml0ZW1MYXllckNsYXNzKCdkcmFnLXByb3h5LWl0ZW0tbGF5ZXInKTtcblx0fSk7XG4iLCJcbmFuZ3VsYXIubW9kdWxlKCd2aXJ0dWFsLXJlcG9ydC1zdWl0ZS1idWlsZGVyJylcblx0LmRpcmVjdGl2ZSgndmlydHVhbFJlcG9ydFN1aXRlQWN0aW9uQmFyJywgZnVuY3Rpb24gKCR0aW1lb3V0LCBDVUkpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdkaXJlY3RpdmVzL3ZpcnR1YWwtcmVwb3J0LXN1aXRlLWFjdGlvbi1iYXIudHBsLmh0bWwnLFxuXHRcdH07XG5cdH0pO1xuIiwiaW1wb3J0IHsgU2VnbWVudCB9IGZyb20gJ21vZGVsJ1xuaW1wb3J0IHsgRGlhbG9nIH0gZnJvbSAndWktY29yZSdcblxuYW5ndWxhci5tb2R1bGUoJ3ZpcnR1YWwtcmVwb3J0LXN1aXRlLWJ1aWxkZXInKS5kaXJlY3RpdmUoJ3ZpcnR1YWxSZXBvcnRTdWl0ZUJ1aWxkZXInLCBcblxuXHRmdW5jdGlvbiAoYW5hbHl0aWNzQ29uZmlnLCAkcSwgJGRvY3VtZW50LCAkbG9jYXRpb24sICRsb2csIFRhZyxcblx0XHRcdCAgZXZlbnRCdXMsICRmaWx0ZXIsIERyYWdNYW5hZ2VyLCBkZWZpbml0aW9uUGFyc2VyLCBtZXRyaWNDYWxsYmFja0V4ZWN1dG9yLFxuXHRcdFx0ICAkdGltZW91dCwgY2FsbGJhY2tSZWdpc3RyeVNlcnZpY2UsIHNwaW5uZXJTZXJ2aWNlLCB0YWdSZXBvc2l0b3J5LCB1dGlsLCAkaHR0cCwgc2VnbWVudFJlcG9zaXRvcnksXG5cdFx0XHQgIHNjVXJsLCB0cmFja1NlcnZpY2UsIHNlZ21lbnREZWZpbml0aW9uU2VydmljZSwgc2VydmVyVGltZSwgaW5BcHBFZGl0b3JzLFxuXHRcdFx0ICB1c2FnZVNlcnZpY2UsICR3aW5kb3csIG1vbWVudCwgQ29tcG9uZW50TGlzdFNlcnZpY2UsIFZpcnR1YWxSZXBvcnRTdWl0ZSxcblx0XHRcdCAgdmlydHVhbFJlcG9ydFN1aXRlUmVwb3NpdG9yeSwgcmVwb3J0U3VpdGVSZXBvc2l0b3J5LCB1c2VyR3JvdXBSZXBvc2l0b3J5LCB0aW1lem9uZVJlcG9zaXRvcnksIGFwcE1vZGVsKSB7XG5cdFxuXHRcdHJldHVybiB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZXMvdmlydHVhbC1yZXBvcnQtc3VpdGUtYnVpbGRlci50cGwuaHRtbCcsXG5cdFx0XHRyZXN0cmljdDogJ0UnLFxuXHRcdFx0cmVwbGFjZTogdHJ1ZSxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdGVtYmVkZGVkOiAnQCcsXG5cdFx0XHRcdGVkaXRJZDogJz0nLFxuXHRcdFx0XHRzdGF0ZTogJz0nIC8vIHN0YXRlIHRoYXQgd2FzIHByZXZpb3VzbHkgc3RvcmVkIHdoZW4gY2FsbGluZyBzYXZlU3RhdGVcblx0XHRcdH0sXG5cdFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzLCBfLCBjbHMpIHtcblxuXHRcdFx0XHQkc2NvcGUuaW5pdERhdGEgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdHNwaW5uZXJTZXJ2aWNlLnNob3coJ3Zyc1NwaW5uZXInKTtcblx0XHRcdFx0XHRsb2FkVmlydHVhbFJlcG9ydFN1aXRlKCk7XG5cdFx0XHRcdFx0JHNjb3BlLmluaXRpYWxpemluZyA9IGZhbHNlO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGZ1bmN0aW9uIGxvYWRWaXJ0dWFsUmVwb3J0U3VpdGUoKSB7XG5cdFx0XHRcdFx0dHJhY2tTZXJ2aWNlLnRyYWNrQWN0aW9uKG51bGwsICdWaXJ0dWFsIFJlcG9ydCBTdWl0ZSBCdWlsZGVyIExvYWQnLCB7XG5cdFx0XHRcdFx0XHR0eXBlOiBwYWdlTG9hZFR5cGUoKVxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0JHNjb3BlLnNlbGVjdGVkSXRlbSA9IHt9O1xuXHRcdFx0XHRcdHZhciBvcmlnaW5hbEdyb3VwcyA9IFtdO1xuXG5cdFx0XHRcdFx0JHEuYWxsKFtnZXRWaXJ0dWFsUmVwb3J0U3VpdGUoKSxcblx0XHRcdFx0XHRcdHRhZ1JlcG9zaXRvcnkucXVlcnkoKSxcblx0XHRcdFx0XHRcdHJlcG9ydFN1aXRlUmVwb3NpdG9yeS5nZXRBdmFpbGFibGVSZXBvcnRTdWl0ZXMoe2V4cGFuc2lvbjogJ3JlcG9ydFN1aXRlTmFtZScsIHR5cGVzOiAnYmFzZSd9KSxcblx0XHRcdFx0XHRcdHVzZXJHcm91cFJlcG9zaXRvcnkucXVlcnkoe2V4cGFuc2lvbjogJ3JzaWQnfSksXG5cdFx0XHRcdFx0XHR0aW1lem9uZVJlcG9zaXRvcnkucXVlcnkoKV0pXG5cdFx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVzdWx0cykge1xuXHRcdFx0XHRcdFx0c3Bpbm5lclNlcnZpY2UuaGlkZSgndnJzU3Bpbm5lcicpO1xuXHRcdFx0XHRcdFx0JHNjb3BlLnZpcnR1YWxSZXBvcnRTdWl0ZSA9ICRzY29wZS5lZGl0SWQgPyByZXN1bHRzWzBdIDogVmlydHVhbFJlcG9ydFN1aXRlLmZyb21KU09OKHt9KTtcblx0XHRcdFx0XHRcdHZhciB0YWdzID0gcmVzdWx0c1sxXTtcblx0XHRcdFx0XHRcdCRzY29wZS5wYXJlbnRSc2lkTGlzdCA9IHJlc3VsdHNbMl07XG5cdFx0XHRcdFx0XHRfLmZvckVhY2goJHNjb3BlLnBhcmVudFJzaWRMaXN0LCBmdW5jdGlvbihwYXJlbnRSc2lkKSB7XG5cdFx0XHRcdFx0XHRcdHBhcmVudFJzaWQubmFtZSA9IHBhcmVudFJzaWQucmVwb3J0U3VpdGVOYW1lO1xuXHRcdFx0XHRcdFx0XHRwYXJlbnRSc2lkLmxhYmVsID0gcGFyZW50UnNpZC5yZXBvcnRTdWl0ZU5hbWU7XG5cdFx0XHRcdFx0XHRcdHBhcmVudFJzaWQudmFsdWUgPSBwYXJlbnRSc2lkLnJzaWQ7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHZhciBncm91cHMgPSByZXN1bHRzWzNdO1xuXHRcdFx0XHRcdFx0JHNjb3BlLnRpbWV6b25lTGlzdCA9IHJlc3VsdHNbNF07XG5cblx0XHRcdFx0XHRcdGFwcE1vZGVsLnJlcG8uZ2V0V2l0aElkcyhTZWdtZW50LCAkc2NvcGUudmlydHVhbFJlcG9ydFN1aXRlLnNlZ21lbnRMaXN0KS50aGVuKHNlZ21lbnRzID0+IHtcblx0XHRcdFx0XHRcdFx0X3VwZGF0ZURyb3B6b25lU2VnbWVudHMoc2VnbWVudHMpO1xuXHRcdFx0XHRcdFx0XHQkc2NvcGUuJGV2YWxBc3luYygpO1xuXHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdC8vIFJlbW92ZSB0aGUgQWxsIGdyb3VwXG5cdFx0XHRcdFx0XHRncm91cHMgPSBfLmZpbHRlcihncm91cHMsIGZ1bmN0aW9uKGdyb3VwKXsgcmV0dXJuIGdyb3VwLmdyb3VwSWQgIT09IDE7IH0pO1xuXG5cdFx0XHRcdFx0XHQvLyBTZXQgc2VsZWN0ZWQgaXRlbXMgZm9yIGZpZWxkcyB0byB2aXJ0dWFsIHJlcG9ydCBzdWl0ZSdzIGV4aXN0aW5nIGF0dHJpYnV0ZXNcblx0XHRcdFx0XHRcdHZhciBzZWxlY3RlZFRhZ0lkcyA9IF8ucGx1Y2soXy5nZXQoJHNjb3BlLCAndmlydHVhbFJlcG9ydFN1aXRlLnRhZ3MnLCBbXSksICdpZCcpO1xuXHRcdFx0XHRcdFx0dmFyIHNlbGVjdGVkR3JvdXBJZHMgPSBfLnBsdWNrKF8uZ2V0KCRzY29wZSwgJ3ZpcnR1YWxSZXBvcnRTdWl0ZS5ncm91cHMnLCBbXSksICdncm91cElkJyk7XG5cdFx0XHRcdFx0XHR2YXIgcGFyZW50UnNpZEluZGV4ID0gXy5pbmRleE9mKF8ucGx1Y2soJHNjb3BlLnBhcmVudFJzaWRMaXN0LCAncnNpZCcpLCAkc2NvcGUudmlydHVhbFJlcG9ydFN1aXRlLnBhcmVudFJzaWQpO1xuXHRcdFx0XHRcdFx0dmFyIHRpbWV6b25lSW5kZXggPSBfLmluZGV4T2YoXy5wbHVjaygkc2NvcGUudGltZXpvbmVMaXN0LCAnaWQnKSwgJHNjb3BlLnZpcnR1YWxSZXBvcnRTdWl0ZS50aW1lem9uZSk7XG5cblx0XHRcdFx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdGlmIChzZWxlY3RlZFRhZ0lkcy5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdFx0XHR0YWdzLmZvckVhY2goZnVuY3Rpb24odGFnKXtcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChzZWxlY3RlZFRhZ0lkcy5pbmRleE9mKHRhZy5pZCkgIT0gLTEpIHsgdGFnLnNlbGVjdGVkID0gdHJ1ZTsgfVxuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdCRzY29wZS50YWdzID0gdGFncztcblx0XHRcdFx0XHRcdFx0aWYgKHNlbGVjdGVkR3JvdXBJZHMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRcdFx0Z3JvdXBzLmZvckVhY2goZnVuY3Rpb24oZ3JvdXApe1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHNlbGVjdGVkR3JvdXBJZHMuaW5kZXhPZihncm91cC5ncm91cElkKSAhPSAtMSkgeyBncm91cC5zZWxlY3RlZCA9IHRydWU7IH1cblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHQkc2NvcGUuZ3JvdXBzID0gZ3JvdXBzO1xuXHRcdFx0XHRcdFx0XHRvcmlnaW5hbEdyb3VwcyA9IF8uZmlsdGVyKCRzY29wZS5ncm91cHMsIHsnc2VsZWN0ZWQnOnRydWV9KTtcblx0XHRcdFx0XHRcdFx0aWYgKHBhcmVudFJzaWRJbmRleCA+IC0xKSB7XG5cdFx0XHRcdFx0XHRcdFx0JHNjb3BlLnNlbGVjdGVkSXRlbS5wYXJlbnRSc2lkID0gJHNjb3BlLnBhcmVudFJzaWRMaXN0W3BhcmVudFJzaWRJbmRleF07XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0aWYgKHRpbWV6b25lSW5kZXggPiAtMSkge1xuXHRcdFx0XHRcdFx0XHRcdCRzY29wZS5zZWxlY3RlZEl0ZW0udGltZXpvbmUgPSAkc2NvcGUudGltZXpvbmVMaXN0W3RpbWV6b25lSW5kZXhdO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIGdldFZpcnR1YWxSZXBvcnRTdWl0ZSgpIHtcblx0XHRcdFx0XHRpZiAoJHNjb3BlLmVkaXRJZCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHZpcnR1YWxSZXBvcnRTdWl0ZVJlcG9zaXRvcnkuZ2V0TW9kZWwoe2lkOiAkc2NvcGUuZWRpdElkfSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHRcdFx0Ly8gQ29tcG9uZW50IERyb3B6b25lIG9wdGlvbnNcblx0XHRcdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHRcdFx0XHQkc2NvcGUuY29tcG9uZW50T3B0aW9ucyA9IHtcblx0XHRcdFx0XHRjb21wb25lbnRzOiBbXSxcblx0XHRcdFx0XHRvbkNoYW5nZTogZSA9PiB7XG5cdFx0XHRcdFx0XHQkc2NvcGUuJGV2YWxBc3luYygoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdCRzY29wZS52aXJ0dWFsUmVwb3J0U3VpdGUuc2VnbWVudExpc3QgPSBfLnBsdWNrKGUudmFsdWUsICdpZCcpO1xuXHRcdFx0XHRcdFx0XHRfdXBkYXRlRHJvcHpvbmVTZWdtZW50cyhlLnZhbHVlKTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0c2VnbWVudEludGVybmFsOiBmYWxzZVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGZ1bmN0aW9uIF91cGRhdGVEcm9wem9uZVNlZ21lbnRzKHNlZ21lbnRzKSB7XG5cdFx0XHRcdFx0JHNjb3BlLmNvbXBvbmVudE9wdGlvbnMgPSBfLmV4dGVuZCh7fSwgJHNjb3BlLmNvbXBvbmVudE9wdGlvbnMsIHtcblx0XHRcdFx0XHRcdGNvbXBvbmVudHM6IHNlZ21lbnRzXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdFx0XHQvLyBFbmQgQ29tcG9uZW50IERyb3B6b25lIG9wdGlvbnNcblx0XHRcdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHRcdFx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXHRcdFx0XHQvLyBUYWdzL0dyb3Vwcy9UaW1lem9uZXNcblx0XHRcdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHRcdFx0XHQkc2NvcGUub25QYXJlbnRSc2lkQ2hhbmdlID0gZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0XHRcdGlmIChpdGVtKSB7XG5cdFx0XHRcdFx0XHQkc2NvcGUudmlydHVhbFJlcG9ydFN1aXRlLnBhcmVudFJzaWQgPSBpdGVtLnJzaWQ7XG5cdFx0XHRcdFx0XHQkc2NvcGUudmlydHVhbFJlcG9ydFN1aXRlLnBhcmVudFJzaWROYW1lID0gaXRlbS5yZXBvcnRTdWl0ZU5hbWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRzY29wZS5vblRpbWV6b25lQ2hhbmdlID0gZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0XHRcdGlmIChpdGVtKSB7XG5cdFx0XHRcdFx0XHQkc2NvcGUudmlydHVhbFJlcG9ydFN1aXRlLnRpbWV6b25lID0gaXRlbS5pZDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHRcdFx0Ly8gRW5kIFRhZ3MvR3JvdXBzL1RpbWV6b25lc1xuXHRcdFx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdFx0XHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdFx0XHRcdC8vIFNhdmluZyBWaXJ0dWFsIFJlcG9ydCBTdWl0ZVxuXHRcdFx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdFx0XHRcdCRzY29wZS5jYW5jZWwgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQkd2luZG93LmxvY2F0aW9uLmhyZWYgPSBzY1VybC5zcGFzKCdjb21wb25lbnQtbWFuYWdlcicsIHsnY29tcG9uZW50VHlwZSc6J3ZpcnR1YWxSZXBvcnRTdWl0ZXMnfSk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JHNjb3BlLmRlbGV0ZVZpcnR1YWxSZXBvcnRTdWl0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdERpYWxvZy5jb25maXJtKCRmaWx0ZXIoJ2wxMG4nKShbJ2FyZVlvdVN1cmVZb3VXYW50VG9EZWxldGVWUlNXYXJuaW5nVGV4dCcsICdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoaXMgVmlydHVhbCBSZXBvcnQgU3VpdGU/IERvaW5nIHNvIHdpbGwgcmVtb3ZlIGFjY2VzcyB0byB0aGlzIFZpcnR1YWwgUmVwb3J0IFN1aXRlIGZvciBhbGwgdXNlcnMuIFNjaGVkdWxlZCByZXBvcnRzL3Byb2plY3RzLCBib29rbWFya3MsIGFuZCBkYXNoYm9hcmRzIGJhc2VkIG9uIHRoaXMgVmlydHVhbCBSZXBvcnQgU3VpdGUgd2lsbCBjb250aW51ZSB0byBiZSBiYXNlZCBvbiB0aGUgZGVsZXRlZCBWaXJ0dWFsIFJlcG9ydCBTdWl0ZSB1bnRpbCBlZGl0ZWQuJ10pKS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdHNwaW5uZXJTZXJ2aWNlLnNob3coJ3Zyc1NwaW5uZXInKTtcblx0XHRcdFx0XHRcdHZpcnR1YWxSZXBvcnRTdWl0ZVJlcG9zaXRvcnkuZGVsZXRlKHtpZDogJHNjb3BlLnZpcnR1YWxSZXBvcnRTdWl0ZS5pZH0pO1xuXHRcdFx0XHRcdFx0JHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gc2NVcmwuc3BhcygnY29tcG9uZW50LW1hbmFnZXInLCB7J2NvbXBvbmVudFR5cGUnOid2aXJ0dWFsUmVwb3J0U3VpdGVzJ30pO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGZ1bmN0aW9uIGdldFNlbGVjdGVkVGFncygpIHtcblx0XHRcdFx0XHRyZXR1cm4gJHNjb3BlLnRhZ3MuZmlsdGVyKGZ1bmN0aW9uKHRhZykge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRhZy5zZWxlY3RlZDtcblx0XHRcdFx0XHR9KS5tYXAoZnVuY3Rpb24odGFnKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbmV3IFRhZyh7bmFtZTogdGFnLm5hbWV9KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIGdldFNlbGVjdGVkR3JvdXBzKCkge1xuXHRcdFx0XHRcdHJldHVybiAkc2NvcGUuZ3JvdXBzLmZpbHRlcihmdW5jdGlvbihncm91cCkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGdyb3VwLnNlbGVjdGVkO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JHNjb3BlLnNhdmVWaXJ0dWFsUmVwb3J0U3VpdGUgPSBmdW5jdGlvbihzYXZlQXMpIHtcblx0XHRcdFx0XHRpZiAoJHNjb3BlLnZyc0lzVmFsaWQoKSkge1xuXHRcdFx0XHRcdFx0c3Bpbm5lclNlcnZpY2Uuc2hvdygndnJzU3Bpbm5lcicpO1xuXG5cdFx0XHRcdFx0XHRsZXQgb3JpZ2luYWxHcm91cHMgPSBbXTtcblx0XHRcdFx0XHRcdGxldCBzZWxlY3RlZEdyb3VwcyA9IFtdO1xuXG5cdFx0XHRcdFx0XHRpZiAoc2F2ZUFzKSB7XG5cdFx0XHRcdFx0XHRcdCRzY29wZS52aXJ0dWFsUmVwb3J0U3VpdGUuaWQgPSAnJztcblx0XHRcdFx0XHRcdFx0b3JpZ2luYWxHcm91cHMgPSBbXTtcblx0XHRcdFx0XHRcdFx0c2VsZWN0ZWRHcm91cHMgPSBnZXRTZWxlY3RlZEdyb3VwcygpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0b3JpZ2luYWxHcm91cHMgPSAkc2NvcGUudmlydHVhbFJlcG9ydFN1aXRlLmdyb3Vwcztcblx0XHRcdFx0XHRcdFx0c2VsZWN0ZWRHcm91cHMgPSBfLm1hcChnZXRTZWxlY3RlZEdyb3VwcygpLCBncm91cCA9PiBfLm9taXQoZ3JvdXAsIFsnaWQnLCAndHlwZScsICdzZWxlY3RlZCddKSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdCRzY29wZS52aXJ0dWFsUmVwb3J0U3VpdGUub3duZXIgPSBudWxsO1xuXHRcdFx0XHRcdFx0JHNjb3BlLnZpcnR1YWxSZXBvcnRTdWl0ZS50YWdzID0gZ2V0U2VsZWN0ZWRUYWdzKCk7XG5cblx0XHRcdFx0XHRcdHRyYWNrU2VydmljZS50cmFja0FjdGlvbihudWxsLCAnU2F2ZSBWaXJ0dWFsIFJlcG9ydCBTdWl0ZScsIHtcblx0XHRcdFx0XHRcdFx0c2F2ZVR5cGU6ICRzY29wZS52aXJ0dWFsUmVwb3J0U3VpdGUuaWQgPyAnc2F2ZScgOiAnc2F2ZS1hcycsXG5cdFx0XHRcdFx0XHRcdGhhc0Rlc2NyaXB0aW9uOiAkc2NvcGUudmlydHVhbFJlcG9ydFN1aXRlLmRlc2NyaXB0aW9uICYmICRzY29wZS52aXJ0dWFsUmVwb3J0U3VpdGUuZGVzY3JpcHRpb24ubGVuZ3RoID4gMCxcblx0XHRcdFx0XHRcdFx0aGFzVGFnczogZ2V0U2VsZWN0ZWRUYWdzKCkubGVuZ3RoID4gMCxcblx0XHRcdFx0XHRcdFx0Z3JvdXBDb3VudDogZ2V0U2VsZWN0ZWRHcm91cHMoKS5sZW5ndGgsXG5cdFx0XHRcdFx0XHRcdHNlZ21lbnRDb3VudDogJHNjb3BlLnZpcnR1YWxSZXBvcnRTdWl0ZS5zZWdtZW50TGlzdC5sZW5ndGhcblx0XHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0XHR2aXJ0dWFsUmVwb3J0U3VpdGVSZXBvc2l0b3J5LnNhdmVNb2RlbCgkc2NvcGUudmlydHVhbFJlcG9ydFN1aXRlLCBvcmlnaW5hbEdyb3Vwcywgc2VsZWN0ZWRHcm91cHMpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdCR3aW5kb3cubG9jYXRpb24uaHJlZiA9IHNjVXJsLnNwYXMoJ2NvbXBvbmVudC1tYW5hZ2VyJywgeydjb21wb25lbnRUeXBlJzondmlydHVhbFJlcG9ydFN1aXRlcyd9KTtcblx0XHRcdFx0XHRcdFx0c3Bpbm5lclNlcnZpY2UuaGlkZSgndnJzU3Bpbm5lcicpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRzY29wZS52cnNJc1ZhbGlkID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKCRzY29wZS52aXJ0dWFsUmVwb3J0U3VpdGUpIHtcblx0XHRcdFx0XHRcdGlmICghJHNjb3BlLnZpcnR1YWxSZXBvcnRTdWl0ZS5uYW1lIHx8ICEkc2NvcGUudmlydHVhbFJlcG9ydFN1aXRlLnBhcmVudFJzaWQgfHwgJHNjb3BlLnZpcnR1YWxSZXBvcnRTdWl0ZS5zZWdtZW50TGlzdC5sZW5ndGggPCAxKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblx0XHRcdFx0Ly8gRW5kIFNhdmluZyBWaXJ0dWFsIFJlcG9ydCBTdWl0ZVxuXHRcdFx0XHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cdFx0XHRcdCRzY29wZS5hbGVydHMgPSBbXTtcblx0XHRcdFx0JHNjb3BlLmluaXRpYWxpemluZyA9IHRydWU7XG5cdFx0XHRcdCRzY29wZS5kcmFnTWFuYWdlciA9IERyYWdNYW5hZ2VyO1xuXHRcdFx0XHQkc2NvcGUuZHJhZ2dpbmcgPSBEcmFnTWFuYWdlci5kcmFnZ2luZztcblxuXHRcdFx0XHQkc2NvcGUuY2FsbGJhY2tLZXkgPSAndmlydHVhbC1yZXBvcnQtc3VpdGUtYnVpbGRlcic7XG5cdFx0XHRcdGNhbGxiYWNrUmVnaXN0cnlTZXJ2aWNlLmZldGNoQ2FsbGJhY2tQYXJhbXMoJHNjb3BlLmNhbGxiYWNrS2V5KTtcblxuXHRcdFx0XHQkc2NvcGUucmVtb3ZlQWxlcnQgPSBmdW5jdGlvbihpbmRleCl7XG5cdFx0XHRcdFx0JHNjb3BlLmFsZXJ0cy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cdFx0XHRcdC8vIFRyYWNraW5nIGhlbHBlciBmdW5jdGlvbnNcblx0XHRcdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXHRcdFx0XHRmdW5jdGlvbiBwYWdlTG9hZFR5cGUoKSB7XG5cdFx0XHRcdFx0aWYgKCRzY29wZS5lZGl0SWQpIHtcblx0XHRcdFx0XHRcdHJldHVybiAnZWRpdCc7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHJldHVybiAnbmV3Jztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcbiIsIlxuYW5ndWxhci5tb2R1bGUoJ3ZpcnR1YWwtcmVwb3J0LXN1aXRlLWJ1aWxkZXInKS5jb250cm9sbGVyKCd2aXJ0dWFsUmVwb3J0U3VpdGVNYWluQ3RybCcsXG5cblx0ZnVuY3Rpb24gKCRzY29wZSwgdXRpbCkge1xuXG5cdFx0dXRpbC5leHRlbmRDb250cm9sbGVyKCRzY29wZSwgJ3N0YXRlTWFuYWdlckN0cmwnKTtcblx0XHRcblx0fVxuKTtcbiIsIjxuYXYgYWQtYWN0aW9uLWJhci1vYnNlcnZlciBjbGFzcz1cInNoZWxsLVBhbmVsLWhlYWRlciBzaGVsbC1BY3Rpb25CYXIgdmlydHVhbC1yZXBvcnQtc3VpdGUtYWN0aW9uLWJhclwiID5cblx0PGRpdiBjbGFzcz1cInNoZWxsLUFjdGlvbkJhci1sZWZ0XCI+XG5cdFx0PGgxIGNsYXNzPVwiY29yYWwtSGVhZGluZyBjb3JhbC1IZWFkaW5nLS0xXCIgbmctaWY9XCIhZWRpdElkXCI+e3sgWyduZXdWaXJ0dWFsUmVwb3J0U3VpdGUnLCAnTmV3IFZpcnR1YWwgUmVwb3J0IFN1aXRlJ10gfCBsMTBuIH19PC9oMT5cblx0XHQ8aDEgY2xhc3M9XCJjb3JhbC1IZWFkaW5nIGNvcmFsLUhlYWRpbmctLTFcIiBuZy1pZj1cImVkaXRJZFwiPnt7IFsnZWRpdFZpcnR1YWxSZXBvcnRTdWl0ZScsICdFZGl0IFZpcnR1YWwgUmVwb3J0IFN1aXRlJ10gfCBsMTBuIH19PC9oMT5cblx0PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJzaGVsbC1BY3Rpb25CYXItcmlnaHRcIj5cblx0XHQ8YSBjbGFzcz1cImNvcmFsLUxpbmtcIiBuZy1jbGljaz1cImNhbmNlbCgpXCI+e3sgWydjYW5jZWxCdXR0b25MYWJlbCcsICdDYW5jZWwnXSB8IGwxMG4gfX08L2E+XG5cdFx0PGJ1dHRvbiBjbGFzcz1cImNvcmFsLUJ1dHRvbiBjb3JhbC1CdXR0b24tLXByaW1hcnlcIiBuZy1kaXNhYmxlZD1cIiF2cnNJc1ZhbGlkKClcIiBuZy1jbGljaz1cInNhdmVWaXJ0dWFsUmVwb3J0U3VpdGUoKVwiPnt7IFsnc2F2ZUJ1dHRvbkxhYmVsJywgJ1NhdmUnXSB8IGwxMG4gfX08L2J1dHRvbj5cblx0XHQ8YnV0dG9uIG5nLWlmPVwiZWRpdElkXCIgY2xhc3M9XCJjb3JhbC1CdXR0b24gY29yYWwtQnV0dG9uLS1wcmltYXJ5XCIgbmctZGlzYWJsZWQ9XCIhdnJzSXNWYWxpZCgpXCIgbmctY2xpY2s9XCJzYXZlVmlydHVhbFJlcG9ydFN1aXRlKHRydWUpXCI+e3sgWydzYXZlQXNCdXR0b25MYWJlbCcsICdTYXZlIEFzJ10gfCBsMTBuIH19PC9idXR0b24+XG5cdFx0PGJ1dHRvbiBuZy1pZj1cImVkaXRJZFwiIGNsYXNzPVwiY29yYWwtQnV0dG9uIGNvcmFsLUJ1dHRvbi0td2FybmluZ1wiIG5nLWNsaWNrPVwiZGVsZXRlVmlydHVhbFJlcG9ydFN1aXRlKClcIj57eyBbJ2RlbGV0ZUJ1dHRvbkxhYmVsJywgJ0RlbGV0ZSddIHwgbDEwbiB9fTwvYnV0dG9uPlxuXHQ8L2Rpdj5cbjwvbmF2PlxuIiwiPGRpdiBjbGFzcz1cInZpcnR1YWwtcmVwb3J0LXN1aXRlLWJ1aWxkZXJcIj5cblxuXHQ8ZGl2IG5nLWluaXQ9XCJpbml0RGF0YSgpXCI+XG5cdFx0PGRpdiBjbGFzcz1cInZycy1tYWluLWNvbnRlbnQgdS1jb3JhbC1wYWRkaW5nXCI+XG5cdFx0XHQ8ZGl2IG5nLXNob3c9XCIhaW5pdGlhbGl6aW5nXCI+XG5cdFx0XHRcdDxhZC1hbGVydHMtYm94PjwvYWQtYWxlcnRzLWJveD5cblxuXHRcdFx0XHQ8IS0tIEZvcm0gZmllbGRzIC0tPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwidnJzLWJ1aWxkZXItY29udGFpbmVyXCI+XG5cdFx0XHRcdFx0PGRpdiBjbGFzcz1cInZycy1oZWFkaW5nLWZpZWxkc1wiPlxuXG5cdFx0XHRcdFx0XHQ8bGFiZWwgY2xhc3M9XCJjb3JhbC1Gb3JtLWZpZWxkbGFiZWxcIj57eyBbJ3Zyc05hbWVIZWFkaW5nJywgJ05hbWUnXSB8IGwxMG4gfX08L2xhYmVsPlxuXHRcdFx0XHRcdFx0PGRpdj48aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cInRpdGxlRmllbGQgY29yYWwtVGV4dGZpZWxkXCIgbmctbW9kZWw9XCJ2aXJ0dWFsUmVwb3J0U3VpdGUubmFtZVwiPjwvZGl2PlxuXHRcdFx0XHRcdFx0PGxhYmVsIGNsYXNzPVwiY29yYWwtRm9ybS1maWVsZGxhYmVsXCI+e3sgWyd2cnNEZXNjcmlwdGlvbkhlYWRpbmcnLCAnRGVzY3JpcHRpb24nXSB8IGwxMG4gfX08L2xhYmVsPlxuXHRcdFx0XHRcdFx0PHRleHRhcmVhIGNsYXNzPVwiY29yYWwtVGV4dGZpZWxkIGNvcmFsLVRleHRmaWVsZC0tbXVsdGlsaW5lIGRlc2NyaXB0aW9uRmllbGRcIiBuZy1tb2RlbD1cInZpcnR1YWxSZXBvcnRTdWl0ZS5kZXNjcmlwdGlvblwiPjwvdGV4dGFyZWE+XG5cblx0XHRcdFx0XHRcdDxsYWJlbCBjbGFzcz1cImNvcmFsLUZvcm0tZmllbGRsYWJlbFwiPnt7OjogW1widGFnc0hlYWRlclwiLCBcIlRhZ3NcIl0gfCBsMTBuIH19PC9sYWJlbD5cblx0XHRcdFx0XHRcdDxkaXY+XG5cdFx0XHRcdFx0XHRcdDxhZC1xdWljay1hZGRcblx0XHRcdFx0XHRcdFx0XHRpdGVtcz1cInRhZ3NcIlxuXHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyLXRleHQta2V5PVwie3sgWydhZGRUYWdzTGFiZWwnLCAnQWRkIFRhZ3MnXSB8IGwxMG4gfX1cIlxuXHRcdFx0XHRcdFx0XHRcdGljb24tY2xhc3MtbmFtZT1cInRhZ1wiXG5cdFx0XHRcdFx0XHRcdFx0YWxsb3ctY3JlYXRlPVwidHJ1ZVwiPlxuXHRcdFx0XHRcdFx0XHQ8L2FkLXF1aWNrLWFkZD5cblx0XHRcdFx0XHRcdDwvZGl2PlxuXG5cdFx0XHRcdFx0XHQ8bGFiZWwgY2xhc3M9XCJjb3JhbC1Gb3JtLWZpZWxkbGFiZWxcIj57ezo6IFtcImdyb3Vwc0hlYWRlclwiLCBcIkdyb3Vwc1wiXSB8IGwxMG4gfX08L2xhYmVsPlxuXHRcdFx0XHRcdFx0PGRpdj5cblx0XHRcdFx0XHRcdFx0PGFkLXF1aWNrLWFkZFxuXHRcdCAgIFx0XHRcdFx0XHRcdGl0ZW1zPVwiZ3JvdXBzXCJcblx0ICAgIFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyLXRleHQta2V5PVwie3sgWydhZGRHcm91cHMnLCAnQWRkIEdyb3VwcyddIHwgbDEwbiB9fVwiXG5cdCAgICAgXHRcdFx0XHRcdFx0aWNvbi1jbGFzcy1uYW1lPVwidXNlcnNcIj5cblx0ICAgIFx0XHRcdFx0XHQ8L2FkLXF1aWNrLWFkZD5cblx0XHRcdFx0XHRcdDwvZGl2PlxuXG5cdFx0XHRcdFx0XHQ8IS0tIFBhcmVudCByZXBvcnQgc3VpdGUgc2VsZWN0b3IgLS0+XG5cdFx0XHRcdFx0XHQ8bGFiZWwgY2xhc3M9XCJjb3JhbC1Gb3JtLWZpZWxkbGFiZWxcIj57ezo6IFtcInBhcmVudFJlcG9ydFN1aXRlXCIsIFwiUGFyZW50IFJlcG9ydCBTdWl0ZVwiXSB8IGwxMG4gfX08L2xhYmVsPlxuXHRcdFx0XHRcdFx0PGRpdj5cblx0XHRcdFx0XHRcdFx0PGFkLWF1dG9jb21wbGV0ZVxuXHRcdFx0XHRcdFx0XHRcdHNpemU9XCJibG9ja1wiXG5cdFx0XHRcdFx0XHRcdFx0c2VhcmNoLWtleT1cInJlcG9ydFN1aXRlTmFtZVwiXG5cdFx0XHRcdFx0XHRcdFx0ZGF0YS1wcm92aWRlcj1cInBhcmVudFJzaWRMaXN0XCJcblx0XHRcdFx0XHRcdFx0XHRhZC1wbGFjZWhvbGRlci10ZXh0PVwie3sgWydjaG9vc2VQYXJlbnQnLCAnQ2hvb3NlIFBhcmVudCddIHwgbDEwbiB9fVwiXG5cdFx0XHRcdFx0XHRcdFx0c2VsZWN0ZWQtaXRlbT1cInNlbGVjdGVkSXRlbS5wYXJlbnRSc2lkXCJcblx0XHRcdFx0XHRcdFx0XHRpY29uLWNsYXNzLW5hbWU9XCJkYXRhXCJcblx0XHRcdFx0XHRcdFx0XHRpdGVtLWNoYW5nZWQtaGFuZGxlcj1cIm9uUGFyZW50UnNpZENoYW5nZShpdGVtKVwiXG5cdFx0XHRcdFx0XHRcdFx0bXVsdGk9XCJmYWxzZVwiPlxuXHRcdFx0XHRcdFx0XHQ8L2FkLWF1dG9jb21wbGV0ZT5cblx0XHRcdFx0XHRcdDwvZGl2PlxuXG5cdFx0XHRcdFx0XHQ8IS0tIFRpbWV6b25lIHNlbGVjdG9yIC0tPlxuXHRcdFx0XHRcdFx0PGxhYmVsIGNsYXNzPVwiY29yYWwtRm9ybS1maWVsZGxhYmVsXCI+e3s6OiBbXCJ0aW1lem9uZVwiLCBcIlRpbWV6b25lXCJdIHwgbDEwbiB9fTwvbGFiZWw+XG5cdFx0XHRcdFx0XHQ8ZGl2PlxuXHRcdFx0XHRcdFx0XHQ8YWQtYXV0b2NvbXBsZXRlXG5cdFx0XHRcdFx0XHRcdFx0c2l6ZT1cImJsb2NrXCJcblx0XHRcdFx0XHRcdFx0XHRzZWFyY2gta2V5PVwibmFtZVwiXG5cdFx0XHRcdFx0XHRcdFx0ZGF0YS1wcm92aWRlcj1cInRpbWV6b25lTGlzdFwiXG5cdFx0XHRcdFx0XHRcdFx0YWQtcGxhY2Vob2xkZXItdGV4dD1cInt7IFsnY2hvb3NlVGltZXpvbmUnLCAnQ2hvb3NlIFRpbWV6b25lJ10gfCBsMTBuIH19XCJcblx0XHRcdFx0XHRcdFx0XHRzZWxlY3RlZC1pdGVtPVwic2VsZWN0ZWRJdGVtLnRpbWV6b25lXCJcblx0XHRcdFx0XHRcdFx0XHRpY29uLWNsYXNzLW5hbWU9XCJnbG9iZVwiXG5cdFx0XHRcdFx0XHRcdFx0aXRlbS1jaGFuZ2VkLWhhbmRsZXI9XCJvblRpbWV6b25lQ2hhbmdlKGl0ZW0pXCJcblx0XHRcdFx0XHRcdFx0XHRtdWx0aT1cImZhbHNlXCI+XG5cdFx0XHRcdFx0XHRcdDwvYWQtYXV0b2NvbXBsZXRlPlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cblx0XHRcdFx0XHRcdDwhLS0gU2VnbWVudCBkcm9wIHpvbmUgLS0+XG5cdFx0XHRcdFx0XHQ8bGFiZWwgY2xhc3M9XCJjb3JhbC1Gb3JtLWZpZWxkbGFiZWxcIj57ezo6IFtcInNlZ21lbnRzSGVhZGVyXCIsIFwiU2VnbWVudHNcIl0gfCBsMTBuIH19PC9sYWJlbD5cblxuXHRcdFx0XHRcdFx0PGFkLXJlYWN0LWNvbXBvbmVudCB0eXBlPVwiQ29tcG9uZW50UGlsbEdyb3VwLlNlZ21lbnRcIiBwcm9wcz1cImNvbXBvbmVudE9wdGlvbnNcIiBkZWVwLXdhdGNoPVwiZmFsc2VcIj48L2FkLXJlYWN0LWNvbXBvbmVudD5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+XG5cdDxhbi1zcGlubmVyIGlkPVwidnJzU3Bpbm5lclwiIGxhcmdlPVwidHJ1ZVwiIGNlbnRlcj1cInRydWVcIj48L2FuLXNwaW5uZXI+XG5cdDxhbi1zZWdtZW50LXByZXZpZXcgaW4tYXBwLWVkaXRvcj1cInRydWVcIj48L2FuLXNlZ21lbnQtcHJldmlldz5cbjwvZGl2PlxuIiwiPHZpcnR1YWwtcmVwb3J0LXN1aXRlLWJ1aWxkZXIgZWRpdC1pZD1cImVkaXRJZFwiPjwvdmlydHVhbC1yZXBvcnQtc3VpdGUtYnVpbGRlcj5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==