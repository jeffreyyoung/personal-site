'use strict';

angular.module('segment-builder', ['common', 'ngRoute']).config(function (embed, $routeProvider) {}).run(function (embed, $rootScope, DragProxy, appCache) {

	if (embed.shouldConfig('segment-builder')) {
		appCache.import('default-definitions');

		appCache.config('dimensions', { segmentable: true });
		appCache.config('metrics', { segmentable: true, includeType: 'builderOnly' });

		appCache.config('segments', {
			includeType: 'shared,templates' /* only get segments that you own or have been shared with you, and templates */
		});

		//Set the left rail open by default.
		$rootScope.showLeftRail = true;

		DragProxy.itemCountClass('drag-proxy-item-count').itemLayerClass('drag-proxy-item-layer');
	}
});
'use strict';

angular.module('segment-builder').directive('sbActionBar', function ($timeout) {
	return {
		restrict: 'EA',
		replace: true,
		templateUrl: 'directives/sb-action-bar.tpl.html',
		link: function link(scope, element, attrs) {}
	};
});
'use strict';

angular.module('segment-builder').directive('sbContextPopover', function (contextList, eventBus, $window) {
	var Popover = analyticsui['ui-core'].Popover;

	return {
		templateUrl: 'directives/sb-context-popover.tpl.html',
		restrict: 'EA',
		replace: true,
		link: function link(scope, element, attrs) {
			scope.onContextItemClick = function (option) {
				scope.dataModel.context = option.value;
				Popover.close(element.get(0));
				eventBus.publish('updateValidationArea');
			};

			//Account for changing the context externally.
			scope.$watch('dataModel.context', function (context) {
				scope.currentContextItem = contextList.getById(context);
			});
		}
	};
});
'use strict';

(function ($) {
	angular.module('segment-builder').directive('sbDefinitionContainer', function ($filter, $timeout, definitionParser, DragManager, comparisonTypes, _, $compile) {
		return {
			templateUrl: 'directives/sb-definition-container.tpl.html',
			restrict: 'EA',
			replace: true,
			scope: {
				dataModel: '=model'
			},
			link: function link(scope, element, attrs) {
				scope.gearPopoverId = _.uniqueId('gearPopoverId_');
				scope.contextPopoverId = _.uniqueId('contextPopoverId_');
				scope.prefixSuffixPopoverId = _.uniqueId('prefixSuffixPopoverId_');

				scope.collapsed = false;
				scope.selectedItems = [];
				scope.renaming = false;

				element.adDraggable({
					draggableModel: function draggableModel() {
						return scope.dataModel;
					},
					dragStartThreshold: 5,
					dragProxyOpacity: 0.85,
					customDragProxy: $(['<div class=\'sb-definition-container drag-proxy\' style=\'height:20px;\'>', '	<a class="withLabel collapsible-button icon-accordiondown" ></a>', '	<a class="icon-gear right" ></a>', '</div>'].join('')),
					draggableArea: '.draggable-header'
				});

				element.addClass(getClassLevel());

				scope.createSubGroup = function () {
					scope.dataModel.items.push(definitionParser.emptyContainerModel(scope.dataModel));
				};

				scope.createSubGroupFromSelection = function () {
					var newContainer = definitionParser.emptyContainerModel(),
					    newContainerIdx = scope.dataModel.items.length;

					newContainer.context = scope.dataModel.context;
					newContainer.logicalOperator = scope.dataModel.logicalOperator;

					scope.selectedItems.forEach(function (item) {
						var itemIdx = $.inArray(item, scope.dataModel.items);
						if (itemIdx !== -1) {
							newContainerIdx = Math.min(newContainerIdx, itemIdx);

							//remove the item from the current array.
							scope.dataModel.items.splice(itemIdx, 1);

							//remove the selected state
							item.selected = false;

							//Add the item to the new array.
							newContainer.items.push(item);
						}
					});

					//Now add the new container with the items to the items array at the appropriate index.
					scope.dataModel.items.splice(newContainerIdx, 0, newContainer);

					//Update the filtered items.
					scope.selectedItems = DragManager.selectedDraggables = $filter('filter')(scope.dataModel.items, { selected: true });
				};

				scope.deleteContainer = function () {
					element.trigger('removeCollapsibleContainer', [scope.dataModel]);
				};

				scope.nameContainer = function () {
					scope.renaming = true;
					$timeout(function () {
						element.find('.name-input').focus();
					});
				};

				scope.getName = function () {
					if (scope.dataModel.name !== '') {
						return scope.dataModel.name;
					} else {
						return scope.getDerrivedName();
					}
				};

				scope.hasOperator = function () {
					return scope.dataModel && scope.dataModel.items.length > 1;
				};

				var valuelessComparisonTypes = new Set(['event-exists', 'not-event-exists', 'not-exists', 'exists']);
				function isValuelessComparisonType(comparisonType) {
					return valuelessComparisonTypes.has(comparisonType);
				}

				scope.getDerrivedName = function () {
					var derrivedName = '',
					    logicalOperator = scope.dataModel.logicalOperator;

					if (logicalOperator == 'sequence') {
						logicalOperator = 'then';
					}

					scope.dataModel.items.forEach(function (item) {
						if (item.purpose == 'rule') {
							if (derrivedName !== '') {
								derrivedName += ' ' + logicalOperator + ' ';
							}
							derrivedName += '(' + item.name + ' ' + comparisonTypes.getKeyValue(item.comparisonType);
							if (!isValuelessComparisonType(item.comparisonType) && !valueisNan(item.value)) {
								derrivedName += ' ' + item.value;
							}
							derrivedName += ')';
						}
					});
					return derrivedName;
				};

				function valueisNan(v) {
					return v !== v;
				}

				function getClassLevel() {
					var numCollapsibleParents = element.parents('.definition-container').length;
					if (numCollapsibleParents == 1) {
						return 'level-two';
					} else if (numCollapsibleParents == 2) {
						return 'level-three';
					} else if (numCollapsibleParents == 3) {
						return 'level-four';
					} else if (numCollapsibleParents >= 4) {
						return 'level-five';
					}
					return '';
				}
			}
		};
	});
})(jQuery);
'use strict';

angular.module('segment-builder').directive('sbDraggableRuleDatePicker', function (appModel, $compile, calendarLocaleConfig, $timeout, eventBus, $filter, moment) {
	return {
		template: '<div class="rule-date-picker" ng-init="init()"></div>',
		restrict: 'EA',
		scope: {
			dateString: '=',
			dateChange: '&',
			rangeType: '@'
		},
		compile: function compile() {
			return {
				pre: function pre(scope, element, attrs) {
					scope.init = function () {

						if (scope.rangeType == 'day' || scope.rangeType == 'hour' || scope.rangeType == 'minute') {
							scope.dateStr = scope.dateString ? scope.dateString : moment().minutes(0).toISOString();
							scope.dateType = scope.rangeType == 'day' ? 'date' : 'datetime';
							scope.disableMinutes = scope.rangeType !== 'minute';
							element.append($compile('' + '<an-datepicker ' + 'ng-click="$event.preventDefault()" ' + 'date="dateStr" ' + 'date-change="onDateChange(dateString)" ' + 'blur-hide-callback="onDateBlurHide()" ' + 'disable-minutes="disableMinutes" ' + 'date-type="dateType"> ' + '</an-datepicker>')(scope));
						} else {
							var minBound = appModel.reportSuite.axleConfig.axleStart; // TODO: This needs to be updated when a rsid is changed on the page.
							if (minBound === '0000-00-00') {
								minBound = moment().subtract('year', 2).toISOString();
							}
							scope.dateStr = scope.dateString ? scope.dateString : moment().startOf(scope.rangeType).toISOString() + ' - ' + moment().endOf(scope.rangeType).toISOString();

							element.append($compile('' + '<an-date-range-picker ' + 'range-type="' + scope.rangeType + '" ' + 'min-bound="' + minBound + '" ' + 'range-change="onRangeChange(newValue)" ' + 'date-range-string="dateStr">' + '</an-date-range-picker>')(scope));
						}
					};
				},

				post: function post(scope, element, attrs) {
					element.on('mousedown touchstart', function (event) {
						//Prevent a mousedown or touch start from causing an item to drag.
						event.stopPropagation();
					});

					scope.$on('focusValueSelector', function () {
						$timeout(function () {
							//simulate a click event in order to display the calendar.
							element.find('input').focus();
						}, 10);
					});

					scope.onDateChange = function (newDateString) {
						scope.dateStr = newDateString;
						scope.dateChange({ newDateString: scope.dateStr });
					};

					scope.onDateBlurHide = function () {
						scope.dateChange({ newDateString: scope.dateStr });
					};

					scope.onRangeChange = function (newDateRangeString) {
						scope.dateStr = newDateRangeString;
						scope.dateChange({ newDateString: scope.dateStr });
					};
				}
			};
		}
	};
});
'use strict';

angular.module('segment-builder').directive('sbDraggableRuleDropdown', function (topItemsService, eventBus, $timeout, $filter) {
	return {
		templateUrl: 'directives/sb-draggable-rule-dropdown.tpl.html',
		restrict: 'EA',
		replace: true,
		controller: function controller($scope, $element) {
			$scope.elements = null;
			$scope.loadingElements = false;
			$scope.selectedElement = null;
			$scope.searchText = $scope.dataModel.value;
			var clickToUseLabelText = $filter('l10n')(['sbClickToUseValueLabel', 'Click to use value \'%s\'']);
			$scope.addNewItemTextKey = $scope.dataModel.type == 'enum' ? '' : clickToUseLabelText;

			$scope.loadElements = function () {
				$timeout(function () {
					return $scope.loadingElements = true;
				});
				topItemsService.getTopItems({
					dimension: $scope.dataModel.id,
					limit: 100,
					search: $scope.elements ? $scope.searchText : ''
				}).then(function (response) {
					$scope.elements = response.rows;
					if (!$scope.selectedElement && $scope.dataModel.value !== '' && $scope.elements) {
						$scope.elements.forEach(function (elm) {
							if (elm.name === $scope.dataModel.value) {
								//Set the selected element in the next frame so that it will be picked up by data binding.
								$timeout(function () {
									$scope.selectedElement = elm;
								});
							} else if (elm.id === $scope.dataModel.value) {
								//Enum's are weird because we are displaying one thing and storing something completely different.
								$scope.dataModel.value = elm.name;
								$timeout(function () {
									$scope.selectedElement = elm;
								});
							}
						});
					}
					$scope.loadingElements = false;
				}, function (error) {
					$scope.elements = [];
					$scope.loadingElements = false;
				});
			};
		},
		link: function link(scope, element, attrs) {

			element.on('mousedown touchstart', function (event) {
				// Prevent a mousedown or touch start from causing an item to drag.
				// If you stop propagation here, it will prevent the dropdown from opening.
				if (event.target.tagName !== 'INPUT') {
					event.preventDefault();
				}
			});

			scope.showAutoCompleteDropdown = true;
			scope.expandDropdownList = false;

			var excludedDropdownStringValues = ['contains', 'not-contains', 'starts-with', 'ends-with', 'not-starts-with', 'not-ends-with', 'contains-any-of', 'contains-all-of', 'not-contains-any-of', 'not-contains-all-of', 'matches', 'not-matches'];

			scope.$on('focusValueSelector', function () {
				$timeout(function () {
					if (scope.showAutoCompleteDropdown) {
						//Let the ad-dropdown-list set it's own focus.
						scope.$broadcast('setFocus');
						element.find('.ad-select').get(0).dispatchEvent(new CustomEvent('Select:focus'));
					} else {
						$timeout(function () {
							element.find('.coral-DecoratedTextfield-input').focus();
						});
					}
				});
			});

			scope.onInputBlur = function () {
				if (scope.dataModel.value !== '') {
					if (!scope.expandDropdownList) {
						scope.expandDropdownList = true;
					} else {
						scope.editing = false;
						scope.expandDropdownList = false;
					}
				}

				element.find('.coral-DecoratedTextfield-input').off('blur', scope.onInputBlur);
			};

			scope.onDropdownTextChange = function (text) {
				//If there are no elements yet then ignore the dropdown event. This should only be for a first
				//time load.
				if (scope.elements) {
					scope.searchText = text;
					scope.loadElements();
				}
			};

			scope.onSelectedElementChange = function (selectedElement, text) {
				if (!selectedElement) {
					return;
				}
				//If the elements haven't been loaded yet then ignore the change event.
				if (scope.elements && selectedElement) {
					if (selectedElement && (scope.dataModel.type == 'enum' || scope.dataModel.type == 'ordered-enum')) {
						scope.dataModel.value = selectedElement.name;
						scope.dataModel.enumValue = selectedElement.id;
					} else if (selectedElement) {
						scope.dataModel.value = selectedElement.name;
					} else {
						scope.dataModel.value = '';
					}
					scope.editing = false;
					scope.selectedElement = selectedElement;
				} else if (scope.elements) {
					//Handle a null element. We still want to allow users to type text without an element being present.
					scope.dataModel.value = text;
					//Handle enums.
					if (scope.dataModel.type == 'enum' || scope.dataModel.type == 'ordered-enum') {
						scope.dataModel.enumValue = text;
					}
					scope.editing = false;
					scope.selectedElement = selectedElement;
				}
				eventBus.publish('updateValidationArea');
			};

			scope.onTextInputClick = function (event) {
				event.preventDefault();
				scope.editing = true;
				$(event.target).focus();
			};

			scope.commitTextInput = function () {
				if (scope.dataModel.value !== '') {
					scope.editing = false;
					eventBus.publish('updateValidationArea');
				}
			};

			scope.$watch('dataModel.comparisonType', function (comparisonType) {
				scope.showAutoCompleteDropdown = excludedDropdownStringValues.indexOf(comparisonType) == -1;
			});
		}
	};
});
'use strict';

angular.module('segment-builder').directive('sbDraggableRuleNumberPicker', function (eventBus, $timeout) {
	return {
		templateUrl: 'directives/sb-draggable-rule-number-picker.tpl.html',
		restrict: 'EA',
		link: function link(scope, element, attrs) {
			var inputElm = null;

			getInputElement().on('mousedown touchstart', function (event) {
				//Prevent a mousedown or touch start from causing an item to drag.
				event.stopPropagation();
			});

			scope.$on('focusValueSelector', function () {
				$timeout(function () {
					getInputElement().focus();
					scope.editing = true;
				});
			});

			scope.onElementClick = function (event) {
				event.preventDefault();
				if ($(event.target).hasClass('coral-InputGroup-input')) {
					getInputElement().focus();
					scope.editing = true;
				}
			};

			scope.$watch('dataModel.value', function () {
				eventBus.publish('updateValidationArea');
			});

			scope.commitNumberInput = function () {
				if (scope.dataModel.value !== '') {
					scope.editing = false;
					eventBus.publish('updateValidationArea');
				}
			};

			function getInputElement() {
				if (!inputElm || inputElm.length === 0) {
					inputElm = element.find('.coral-InputGroup-input');
				}
				return inputElm;
			}
		}
	};
});
'use strict';

angular.module('segment-builder').directive('sbDraggableRule', function (comparisonTypes, $timeout, eventBus, $compile, $filter, dimensionService) {
	var Preview = analyticsui['ui'].Preview;
	var DateRange = analyticsui['model'].DateRange;

	return {
		templateUrl: 'directives/sb-draggable-rule.tpl.html',
		restrict: 'EA',
		replace: true,
		scope: {
			'dataModel': '=model',
			'removeItem': '&',
			'toggleItemSelection': '&'
		},
		compile: function compile() {
			return {
				pre: function pre(scope, element, attrs) {
					scope.disableRule = false;
					scope.init = function () {
						scope.editing = false;
						scope.comparisonTypesList = comparisonTypes.getComparisonArrayForDataModel(scope.dataModel);
						scope.rangeType = dimensionService.getRangeTypeFromDimensionId(scope.dataModel.id);

						var draggableOptions = element.find('.draggable-options');
						switch (scope.dataModel.type) {
							case 'string':
							case 'ordered-enum':
							case 'enum':
								draggableOptions.append($compile('' + '<sb-draggable-rule-dropdown ' + 'ng-show="displayValueSelector()">' + '</sb-draggable-rule-dropdown>')(scope));

								break;
							case 'int':
							case 'decimal':
							case 'currency':
							case 'percent':
								draggableOptions.append($compile('' + '<sb-draggable-rule-number-picker ' + 'ng-show="displayValueSelector()">' + '</sb-draggable-rule-number-picker>')(scope));

								break;
							case 'time':
								draggableOptions.append($compile('' + '<sb-draggable-rule-date-picker ' + 'ng-show="displayValueSelector()" ' + 'date-string="dataModel.value" ' + 'date-change="onDateChange(newDateString)" ' + 'range-type="' + scope.rangeType + '">' + '</sb-draggable-rule-date-picker>')(scope));

								break;
						}
					};
				},
				post: function post(scope, element, attrs) {
					if (scope.dataModel.deprecated) {
						eventBus.publish('displayAlert', {
							type: 'notice',
							text: $filter('l10n')(['deprecatedRulesWarning', 'There are one or more un-supported rules within your segment. You must delete those rules in order to save any changes.'])
						});
					}

					if (scope.dataModel.value === '') {
						scope.editing = true;
					}

					scope.remove = function () {
						scope.removeItem({ item: scope.dataModel });
					};

					scope.onItemClick = function (event) {
						// Don't do anything if they clicked on the select. 
						var select = element.find('.ad-select');
						if (select.find(event.target).length) {
							return;
						}
						scope.toggleItemSelection({ '$event': event, 'item': scope.dataModel });
					};

					scope.onValueLabelClick = function (event) {
						event.preventDefault();
						if (scope.dataModel.deprecated) {
							eventBus.publish('displayAlert', {
								type: 'notice',
								text: $filter('l10n')(['deprecatedRule', 'This rule has been disabled because it is contains un-supported behaviors. You must delete the rule in order to save any changes.'])
							});
						} else if (!scope.disableRule) {
							scope.editing = true;
							scope.$broadcast('focusValueSelector');
						} else {
							eventBus.publish('displayAlert', {
								type: 'notice',
								text: $filter('l10n')(['unableToEditRule', 'This rule was built using another report suite and is unsupported in the currently selected report suite.'])
							});
						}
					};

					scope.clickOutsideDraggableRule = function () {
						if (scope.expandDropdownList) {
							scope.editing = false;
							scope.expandDropdownList = false;
						}
					};

					var hideUISelector = ['exists', 'not-exists', 'event-exists', 'not-event-exists'];

					scope.displayValueLabel = function () {
						if (scope.dataModel.deprecated) {
							return true;
						}
						var nullOptionSelected = hideUISelector.indexOf(scope.dataModel.comparisonType) !== -1;
						return !scope.editing && scope.dataModel.value !== '' && !nullOptionSelected;
					};

					scope.displayValueSelector = function () {
						if (scope.dataModel.deprecated) {
							return false;
						}
						var nullOptionSelected = hideUISelector.indexOf(scope.dataModel.comparisonType) !== -1;
						return (scope.dataModel.value === '' || scope.editing) && !nullOptionSelected;
					};

					scope.onComparisonTypeChange = function (newValue) {
						eventBus.publish('updateValidationArea');
					};

					scope.onDateChange = function (newDateString) {
						scope.editing = false;
						scope.dataModel.value = newDateString;
						eventBus.publish('updateValidationArea');
					};

					scope.getComparisonType = function () {
						return comparisonTypes.getKeyValue(scope.dataModel.comparisonType);
					};

					scope.showDateRangePreview = function (e) {
						e.stopPropagation();
						Preview.show(new DateRange({
							id: scope.dataModel.id,
							name: scope.dataModel.name
						}), e);
					};
				}
			};
		}
	};
});
'use strict';

angular.module('segment-builder').directive('sbDropZone', function (eventBus, $filter, $timeout, DragManager, segmentDefinitionService, LOGICAL_OPERATOR_SEQUENCE, CONTEXT_VISITORS, CONTEXT_LOGIC_GROUP, contextList, spinnerService, virtualDropTargetService, trackService) {
	var DateRange = analyticsui['model'].DateRange;

	return {
		templateUrl: 'directives/sb-drop-zone.tpl.html',
		restrict: 'EA',
		replace: true,
		link: function link(scope, element, attrs) {
			var currentDropIndicatorModel = null;
			scope.showDragProxy = false;

			scope.onDragEnter = function (event, localPt, draggableModel) {
				//Prevent drag drop of an object within it's own container.
				if (draggableModel === scope.dataModel) {
					event.preventDragDrop();
				}
			};

			scope.onDragOver = function (event, localPt, draggableModel) {
				if (!event.isDragDropPrevented()) {
					updateDropIndicator(localPt, draggableModel);

					if (event.ctrlKey || event.metaKey) {
						event.setDragCursor('copy');
					} else {
						event.setDragCursor('move');
					}
				}
			};

			scope.onDragDrop = function (event, draggableModel) {
				if (event.ctrlKey || event.metaKey) {
					if ($.isArray(draggableModel)) {
						copyDraggableArray(draggableModel);
					} else {
						copyDraggable(draggableModel);
					}
				} else if ($.isArray(draggableModel)) {
					moveDraggableArray(draggableModel);
				} else if (!draggableModel.purpose) {

					trackDragDrop(draggableModel);

					if (draggableModel.itemType == 'segment') {
						//Create and cache a consumableDefinition if one doesn't exist yet.
						spinnerService.show('sbSpinner');
						var dropIdx = getDropIndex();
						segmentDefinitionService.loadConsumableDefinition(draggableModel).then(function () {
							spinnerService.hide('sbSpinner');

							var segmentDef = angular.copy(draggableModel.consumableDefinition);
							segmentDef.name = draggableModel.name;
							addItemAt(segmentDef, dropIdx);
							eventBus.publish('updateValidationArea');
						}, function (errors) {
							eventBus.publish('displayAlert', {
								type: 'error',
								text: $filter('l10n')(['unableToLoadSegmentDefinition', 'Unable to load the segment definition. You may have lost your session. Please refresh the page and try again.'])
							});
						});
					} else {
						addItemAt({
							purpose: 'rule',
							displayDropIndicatorTop: false,
							displayDropIndicatorBottom: false,
							sequenceContainerType: 'sequence',
							type: draggableModel.type,
							itemType: draggableModel.itemType,
							name: draggableModel.name,
							id: draggableModel.id,
							model: draggableModel,
							comparisonType: getDefaultComparisonType(draggableModel),
							value: ''
						}, getDropIndex());
						eventBus.publish('updateValidationArea');
					}
				} else {
					moveDraggable(draggableModel);
				}

				//Unselect all of the draggables.
				DragManager.selectedDraggables.forEach(function (draggableItem) {
					draggableItem.selected = false;
				});
				updateSelectedItems();
				hideDropIndicator();
			};

			scope.onDragLeave = function () {
				hideDropIndicator();
			};

			scope.onDragDropOutside = function (event, draggableModel) {
				// The ctrlKey (windows users) and the metaKey (mac users) both represent a copy interaction which
				// means that nothing should be removed from the array.
				if (event.ctrlKey || event.metaKey) {
					return;
				}

				//If an item or array of items was dropped into a different container then remove them from
				//the current container because they will be added elseware.
				if ($.isArray(draggableModel)) {
					draggableModel.forEach(function (dm) {
						removeItem(dm);
					});
				} else {
					removeItem(draggableModel);
				}
				updateSelectedItems();
			};

			function moveDraggable(draggableModel) {
				var currentIdx = getCurrentIndex(draggableModel),
				    dropIdx = getDropIndex();

				if (dropIdx != -1 && currentIdx == dropIdx) {
					return;
				}

				if (currentIdx !== -1 && currentIdx < dropIdx) {
					//Since this item already exists within the list we have to subtract one so that it doesn't count
					//itself in the list.
					dropIdx--;
				}

				removeItem(draggableModel);
				addItemAt(draggableModel, dropIdx);

				//Unset the selected state
				draggableModel.selected = false;

				eventBus.publish('updateValidationArea');
			}

			function copyDraggable(draggableModel) {
				//Remove the selected state from the draggable.
				draggableModel.selected = false;
				addItemAt(removeDropIndicator(angular.copy(draggableModel)), getDropIndex());

				eventBus.publish('updateValidationArea');
			}

			function copyDraggableArray(draggableArray) {
				var dropIdx = getDropIndex();
				draggableArray.forEach(function (draggableModel) {
					//Remove the selected state from the draggable.
					draggableModel.selected = false;
					addItemAt(removeDropIndicator(angular.copy(draggableModel)), dropIdx);
					//Increment the drop index so that the items won't be added in reverse order.
					dropIdx++;
				});

				eventBus.publish('updateValidationArea');
			}

			function moveDraggableArray(draggableArray) {
				var dropIdx = getDropIndex();
				if (dropIdx !== -1) {
					//Splice each of the items from their current location.
					for (var i = draggableArray.length - 1; i >= 0; i--) {
						var currentIdx = getCurrentIndex(draggableArray[i]);

						if (currentIdx !== -1 && currentIdx < dropIdx) {
							dropIdx--;
						}

						removeItemAtIndex(currentIdx);
					}

					//Now add the items back to the array in order.
					draggableArray.forEach(function (draggableModel) {
						draggableModel.selected = false;
						addItemAt(draggableModel, dropIdx);
						dropIdx++;
					});
				} else {
					draggableArray.forEach(function (draggableModel) {
						draggableModel.selected = false;
						addItemAt(draggableModel);
					});
				}

				eventBus.publish('updateValidationArea');
			}

			scope.removeDraggableRule = function (draggableModel) {
				removeItem(draggableModel);
				eventBus.publish('updateValidationArea');
			};

			//This has to be done through good old fashion event bubbling because of a dropZone typically
			//exists within a container which can't remove itself. Therefore an event is dispatched that
			//is caught here and then removed.
			element.on('removeCollapsibleContainer', function (event, draggableModel) {
				event.stopPropagation();
				removeItem(draggableModel);
				eventBus.publish('updateValidationArea');
			});

			function updateDropIndicator(localPt, draggableModel) {
				var dropIndicators = element.children('.segment-item'),
				    yPos = 0;

				for (var i = 0; i < scope.dataModel.items.length; i++) {
					var dropIndicator = $(dropIndicators.get(i)),
					    dropIndicatorModel = scope.dataModel.items[i],
					    nextDropIndicatorModel = i + 1 < scope.dataModel.items.length ? scope.dataModel.items[i + 1] : null,
					    dropIndicatorRect = {
						x: 0,
						y: yPos,
						width: element.width(),
						height: dropIndicator.height() + 2 //Add two pixels so there will be overlap between the containers.
					};

					if (virtualDropTargetService.isPointInRect(localPt, dropIndicatorRect)) {
						currentDropIndicatorModel = dropIndicatorModel;

						if (localPt.y <= dropIndicatorRect.y + dropIndicatorRect.height / 2) {
							addDropIndicatorTop(currentDropIndicatorModel);
						} else if (nextDropIndicatorModel) {
							currentDropIndicatorModel = nextDropIndicatorModel;

							removeDropIndicator(dropIndicatorModel);
							addDropIndicatorTop(currentDropIndicatorModel);
						} else {
							addDropIndicatorBottom(currentDropIndicatorModel);
						}
					} else if (dropIndicatorModel != currentDropIndicatorModel) {
						removeDropIndicator(dropIndicatorModel);
					}

					yPos += dropIndicatorRect.height;
				}

				scope.showDragProxy = scope.dataModel.items.length > 0 || true;
			}

			function hideDropIndicator() {
				if (currentDropIndicatorModel) {
					removeDropIndicator(currentDropIndicatorModel);
					currentDropIndicatorModel = null;
				}

				scope.showDragProxy = false;
			}

			//When any of the logical operators change make sure to update all of them so that they stay in sync.
			scope.onLogicalOperatorChange = function (newValue) {
				//If the operator changes to or from sequence then update the list of available contexts for the
				//containers in the list and make sure to force the container into an appropriate context. There is
				//no visitors context for sequence and there is no logicgroup context for and/or.

				scope.dataModel.items.forEach(function (item) {
					if (item.purpose == 'container') {
						// Set the contextList based off the new value.
						item.contextList = newValue == LOGICAL_OPERATOR_SEQUENCE ? contextList.thenData : contextList.data;

						// If it is changing to a sequence and visitors was selected, change it to be a logic group.
						// else, if it is not a sequence, make sure that logic group gets swapped back to visitor.
						if (newValue == LOGICAL_OPERATOR_SEQUENCE && item.context == CONTEXT_VISITORS) {
							item.context = CONTEXT_LOGIC_GROUP;
						} else if (newValue != LOGICAL_OPERATOR_SEQUENCE && item.context == CONTEXT_LOGIC_GROUP) {
							item.context = CONTEXT_VISITORS;
						}
					}
				});

				//Update the dataModel.
				scope.dataModel.logicalOperator = newValue;

				//Update the validation area.
				eventBus.publish('updateValidationArea');
			};

			scope.toggleItemSelection = function (event, item) {
				//If the default button behavior was prevented then
				if (event.originalEvent && !event.originalEvent.defaultPrevented) {
					// Unselect all other items in any other array or items within the same array as long as
					//the ctrl and the meta key were not pressed.
					DragManager.selectedDraggables.forEach(function (selectedItem) {
						if ($.inArray(selectedItem, scope.dataModel.items) === -1 || !event.ctrlKey && !event.metaKey && selectedItem !== item) {
							selectedItem.selected = false;
						}
					});

					item.selected = !item.selected;
					updateSelectedItems();
				}
			};

			function updateSelectedItems() {
				scope.selectedItems = DragManager.selectedDraggables = $filter('filter')(scope.dataModel.items, { selected: true });
			}

			function getCurrentIndex(item) {
				return $.inArray(item, scope.dataModel.items);
			}

			function getDropIndex() {
				var dropIdx = $.inArray(currentDropIndicatorModel, scope.dataModel.items);
				//Increment the drop index if the indicator is displayed on the bottom.
				if (dropIdx !== -1 && currentDropIndicatorModel.displayDropIndicatorBottom) {
					dropIdx += 1;
				}

				return dropIdx;
			}

			function addItemAt(item, idx) {
				idx = $.isNumeric(idx) ? idx : -1;
				if (idx !== -1) {
					scope.dataModel.items.splice(idx, 0, item);
				} else {
					scope.dataModel.items.push(item);
				}
			}

			function removeItem(item, deleteCount) {
				deleteCount = $.isNumeric(deleteCount) ? deleteCount : 1;
				var currentIdx = getCurrentIndex(item);
				if (currentIdx !== -1) {
					scope.dataModel.items.splice(currentIdx, deleteCount);
				}
			}

			function removeItemAtIndex(idx, deleteCount) {
				deleteCount = $.isNumeric(deleteCount) ? deleteCount : 1;
				if (idx !== -1) {
					scope.dataModel.items.splice(idx, deleteCount);
				}
			}

			function addDropIndicatorTop(draggableModel) {
				draggableModel.displayDropIndicatorTop = true;
				draggableModel.displayDropIndicatorBottom = false;
			}

			function addDropIndicatorBottom(draggableModel) {
				draggableModel.displayDropIndicatorTop = false;
				draggableModel.displayDropIndicatorBottom = true;
			}

			function removeDropIndicator(draggableModel) {
				draggableModel.displayDropIndicatorTop = false;
				draggableModel.displayDropIndicatorBottom = false;
				return draggableModel;
			}

			function getDefaultComparisonType(draggableModel) {
				if (draggableModel instanceof DateRange) {
					return 'datetime-within';
				} else if (draggableModel.type == 'int' || draggableModel.type == 'decimal') {
					return 'eq';
				} else if (draggableModel.type == 'string' || draggableModel.type == 'date' || draggableModel == 'enum') {
					return 'streq';
				} else {
					return 'eq';
				}
			}

			function trackDragDrop(draggableModel) {
				trackService.trackAction(null, 'Drag Drop', {
					itemType: draggableModel.itemType,
					itemName: draggableModel.name,
					itemId: draggableModel.id
				});
			}
		}
	};
});
'use strict';

angular.module('segment-builder').directive('sbGearPopover', function (gearOptions, $timeout, eventBus, GEAR_NEW_SUB_GROUP, GEAR_DELETE, GEAR_NAME, GEAR_INCLUDE, GEAR_NEW_SUB_GROUP_FROM_SELECTION, GEAR_SET_TIME_FRAME, GEAR_EXCLUDE, $window, Keys) {
	var Popover = analyticsui['ui-core'].Popover;

	return {
		templateUrl: 'directives/sb-gear-popover.tpl.html',
		restrict: 'EA',
		replace: true,
		link: function link(scope, element, attrs) {
			scope.options = gearOptions.data;

			scope.onItemClick = function (event, option) {
				switch (option.value) {
					case GEAR_NEW_SUB_GROUP:
						scope.createSubGroup();
						break;
					case GEAR_NEW_SUB_GROUP_FROM_SELECTION:
						scope.createSubGroupFromSelection();
						break;
					case GEAR_EXCLUDE:
						scope.dataModel.exclude = true;
						scope.optionFilter.exclude = true;
						eventBus.publish('updateValidationArea');
						break;
					case GEAR_INCLUDE:
						scope.dataModel.exclude = false;
						scope.optionFilter.exclude = false;
						eventBus.publish('updateValidationArea');
						break;
					case GEAR_NAME:
						scope.nameContainer();
						break;
					case GEAR_DELETE:
						scope.deleteContainer();
						break;
				}

				Popover.close(element.get(0));
			};

			var unwatch = scope.$watch('dataModel', function (dataModel) {
				if (dataModel) {
					scope.optionFilter = scope.optionFilter || {
						selectedItemLength: scope.selectedItems ? scope.selectedItems.length : 0,
						model: scope.dataModel,
						exclude: scope.dataModel.exclude
					};

					unwatch();
				}
			});

			scope.$watchCollection('selectedItems', function (selectedItems) {
				if (scope.optionFilter) {
					scope.optionFilter.selectedItemLength = selectedItems ? selectedItems.length : 0;
				}
			});
		}
	};
});
'use strict';

angular.module('segment-builder').directive('sbPrefixSuffixPopover', function (contextList, eventBus, $window) {
	var sequenceContainerTypes = analyticsui['model'].sequenceContainerTypes;
	var Popover = analyticsui['ui-core'].Popover;

	return {
		templateUrl: 'directives/sb-prefix-suffix-popover.tpl.html',
		restrict: 'EA',
		replace: true,
		link: function link(scope, element, attrs) {
			scope.prefixSuffixList = sequenceContainerTypes.list;

			scope.onPrefixSuffixItemClick = function (option) {
				scope.dataModel.sequenceContainerType = option.value;
				Popover.close(element.get(0));
				eventBus.publish('updateValidationArea');
			};

			//Account for changing the context externally.
			scope.$watch('dataModel.sequenceContainerType', function (type, oldType) {
				scope.currentPrefixSuffixItem = sequenceContainerTypes.getById(type);
			});
		}
	};
});
'use strict';

angular.module('segment-builder').directive('sbSegmentDefinition', function ($filter, contextList, definitionParser, DragManager, eventBus, _) {
	return {
		templateUrl: 'directives/sb-segment-definition.tpl.html',
		restrict: 'EA',
		replace: true,
		scope: {
			dataModel: '=model'
		},
		link: function link(scope, element, attrs) {
			scope.contextList = contextList.data;
			scope.selectedItems = [];

			scope.gearPopoverId = _.uniqueId('sbSegmentDefintionOptions_');
			scope.prefixSuffixPopoverId = _.uniqueId('prefixSuffixPopoverId_');

			scope.createSubGroup = function () {
				scope.dataModel.items.push(definitionParser.emptyContainerModel(scope.dataModel));
			};

			scope.createSubGroupFromSelection = function () {
				var newContainer = definitionParser.emptyContainerModel(scope.dataModel),
				    newContainerIdx = scope.dataModel.items.length;

				newContainer.context = scope.dataModel.context;
				newContainer.logicalOperator = scope.dataModel.logicalOperator;

				scope.selectedItems.forEach(function (item) {
					var itemIdx = $.inArray(item, scope.dataModel.items);
					if (itemIdx !== -1) {
						newContainerIdx = Math.min(newContainerIdx, itemIdx);

						//remove the item from the current array.
						scope.dataModel.items.splice(itemIdx, 1);

						//remove the selected state
						item.selected = false;

						//Add the item to the new array.
						newContainer.items.push(item);
					}
				});

				//Now add the new container with the items to the items array at the appropriate index.
				scope.dataModel.items.splice(newContainerIdx, 0, newContainer);

				//Update the filtered items.
				scope.selectedItems = DragManager.selectedDraggables = $filter('filter')(scope.dataModel.items, { selected: true });
			};

			scope.onTopLevelContainerChange = function () {
				eventBus.publish('updateValidationArea');
			};

			scope.hasOperator = function () {
				return scope.dataModel && scope.dataModel.items.length > 1;
			};

			var unwatchDataModel = scope.$watch('dataModel', function (dataModel) {
				if (dataModel) {
					scope.optionFilter = scope.optionFilter || {
						selectedItemLength: scope.selectedItems ? scope.selectedItems.length : 0,
						model: scope.dataModel,
						exclude: scope.dataModel.exclude
					};

					scope.optionFilter.excludeName = true;
					scope.optionFilter.excludeDelete = true;
					unwatchDataModel();
				}
			});
		}
	};
});
'use strict';

angular.module('segment-builder').directive('sbSegmentItem', function ($compile, logicalOperators) {
	return {
		templateUrl: 'directives/sb-segment-item.tpl.html',
		restrict: 'EA',
		replace: true,
		compile: function compile() {
			return {
				pre: function pre(scope, element, attrs) {
					element.find('.dynamic-content').append(function () {
						if (scope.item.purpose == 'rule') {
							return $compile('' + '<sb-draggable-rule ' + 'data-model="item" ' + 'remove-item="removeDraggableRule(item)" ' + 'toggle-item-selection="toggleItemSelection($event, item)">' + '</sb-draggable-rule>')(scope);
						} else if (scope.item.purpose == 'container') {
							return $compile('<sb-definition-container data-model="item"></sb-definition-container>')(scope);
						}
						return '';
					});
				},
				post: function post(scope, element, attrs) {
					scope.logicalOperatorList = logicalOperators.data;
				}
			};
		}
	};
});
'use strict';

angular.module('segment-builder').directive('sbSequencePillBox', function (_, $window) {
	var Popover = analyticsui['ui-core'].Popover;

	return {
		templateUrl: 'directives/sb-sequence-pill-box.tpl.html',
		restrict: 'EA',
		replace: true,
		link: function link(scope, element, attrs) {
			scope.sequenceSelectorPopoverId = _.uniqueId('sequencePillBox_');
			scope.setActiveState = false;

			element.on('show', '.coral-Popover', function () {
				scope.setActiveState = true;
			});

			scope.hideAfterWithinPopover = function (event) {
				if (!event || !event.defaultPrevented) {
					Popover.close($('#' + scope.sequenceSelectorPopoverId).get(0));
					scope.setActiveState = false;
				}
			};

			scope.afterClickHandler = function () {
				if (!scope.item.afterTimeRestriction) {
					scope.item.afterTimeRestriction = {
						count: '1',
						unit: 'week'
					};
				}
				scope.hideAfterWithinPopover();
			};

			scope.withinClickHandler = function () {
				if (!scope.item.withinTimeRestriction) {
					scope.item.withinTimeRestriction = {
						count: '1',
						unit: 'week'
					};
				}
				scope.hideAfterWithinPopover();
			};

			scope.removeAfterPill = function () {
				scope.item.afterTimeRestriction = null;
			};

			scope.removeWithinPill = function () {
				scope.item.withinTimeRestriction = null;
			};

			scope.displaySequencePulldown = function () {
				return !scope.item.withinTimeRestriction || !scope.item.afterTimeRestriction;
			};
		}
	};
});
'use strict';

angular.module('segment-builder').directive('sbSequencePill', function (timeRestrictionsOperators, $timeout, eventBus, _, $window) {
	var l10nConfig = analyticsui['core'].l10nConfig;
	var Popover = analyticsui['ui-core'].Popover;

	return {
		templateUrl: 'directives/sb-sequence-pill.tpl.html',
		restrict: 'EA',
		replace: true,
		scope: {
			label: '@',
			dataModel: '=model',
			removeItem: '&'
		},
		link: function link(scope, element, attrs) {
			scope.countButtonActive = false;
			scope.sequenceNumberInputPopoverId = _.uniqueId('sequencePill_');

			// If Japanese display: '{number} {unit} AFTER/WITHIN' instead of 'AFTER/WITHIN {number} {unit}'
			scope.isJapanese = l10nConfig.currentLocale === 'jp_JP' ? true : false;

			element.on('show', '.coral-Popover', function () {
				scope.countButtonActive = true;
				$timeout(function () {
					element.find('.coral-Textfield').focus();
				}, 50);
			});

			scope.onTimeUnitChange = function (unit) {
				scope.dataModel.unit = unit;
				eventBus.publish('updateValidationArea');
			};

			element.on('hide', '.coral-Popover', function () {
				var popover = element.find('.coral-Popover'),
				    numberinput = element.find('.coral-Textfield');

				popover.hide();
				numberinput.blur();

				//Make sure that a valid numeric string was saved then the dialog is hidden
				var cnt = parseInt(scope.dataModel.count, 10);
				if (isNaN(cnt)) {
					scope.dataModel.count = '1';
				} else if (cnt < 1) {
					scope.dataModel.count = -cnt + '';
				} else {
					scope.dataModel.count = cnt + '';
				}

				//Get rid of the active state for the button.
				scope.countButtonActive = false;

				// Update validation chart.
				eventBus.publish('updateValidationArea');
			});

			scope.hideCountPopover = function () {
				Popover.close(element.find('.coral-Popover').get(0));
			};
		}
	};
});
'use strict';

angular.module('segment-builder').directive('segmentBuilder', function (analyticsConfig, $q, $document, $location, eventBus, $filter, segmentDefinitionService, user, appModel, aamService, DragManager, definitionParser, $timeout, callbackRegistryService, spinnerService, tagRepository, util, segmentSummaryViewState, appDefaults, customCallbackExecutor, scUrl, trackService, appCache, $window, moment, _) {
	var VrsComponentSaveUtil = analyticsui['ui'].VrsComponentSaveUtil;
	var Tag = analyticsui['model'].Tag;
	var _analyticsui$uiCore = analyticsui['ui-core'],
	    Dialog = _analyticsui$uiCore.Dialog,
	    OmegaTrack = _analyticsui$uiCore.OmegaTrack;


	return {
		templateUrl: 'directives/segment-builder.tpl.html',
		restrict: 'E',
		replace: false,
		scope: {
			embedded: '@',
			definition: '=',
			editId: '=',
			dateRange: '=?',
			pasteId: '=',
			state: '=' // state that was previously stored when calling saveState
		},
		controller: function controller($scope, $element, $attrs, _) {

			$scope.sbSpinnerId = _.uniqueId('sbSpinner');
			// When this directive is embedded (e.g. shown inline in workspace)
			// we need to communicate with the parent when the metric is valid and
			// and can be saved. We also listen for a save event so the parent can
			// call save when the save button is clicked

			if ($scope.embedded) {

				$scope.controlObject = {};

				$scope.$watch('controlObject.isValid', function (canSave) {
					$element.trigger('can-save', canSave);
				});

				$scope.$watch('controlObject.isValid', function (canSaveAs) {
					$element.trigger('can-save-as', canSaveAs);
				});
			}

			$scope.segmentSummaryViewState = segmentSummaryViewState;
			$scope.alerts = [];
			$scope.initializing = true;
			$scope.dragManager = DragManager;
			$scope.dragging = DragManager.dragging;
			$scope.segmentService = segmentDefinitionService;
			$scope.currentReportSuiteName = appModel.reportSuite.name;
			$scope.tags = null;
			$scope.clickToAddNewItemLabel = $filter('l10n')(['sbclickToAddNewItemLabel', 'Click to add tag \'%s\'']);
			$scope.RSIDFilter = {
				segments: true
			};
			$scope.currentReportSuiteName = appModel.reportSuite.name;

			if (!$scope.embedded) {
				$scope.callbackKey = 'segment-builder';
				callbackRegistryService.fetchCallbackParams($scope.callbackKey);
			}

			$scope.initData = function () {
				spinnerService.show($scope.sbSpinnerId);
				trackService.trackAction(null, 'Segment Builder Load', {
					type: pageLoadType()
				});

				if (!$scope.editId) {
					//Change the title for
					analyticsConfig.headerConfig.title = $filter('l10n')(['newSegmentTitle', 'Create New Segment']);
				}

				segmentDefinitionService.loadSegment($scope.editId, $scope.definition || $scope.pasteId).then(function (segment) {
					$scope.initSegment($scope.state || segment);
					spinnerService.hide($scope.sbSpinnerId);
					$scope.initializing = false;
				}).catch(function (e) {
					spinnerService.hide($scope.sbSpinnerId);
					$scope.initializing = false;
				});
			};

			$scope.initSegment = function (segment) {
				// default to false - validation chart (segmentSummary service) will update validity
				_.set($scope, 'controlObject.isValid', false);

				_.extend(segment, $scope.definition);
				$scope.segment = segment;
				// overwrite the existing rsid with the current rsid (on save we want to save the current rsid)
				$scope.segment.rsid = appModel.reportSuite.rsid;

				if ($scope.segment.dwInUse) {
					appModel.addAlert({
						variant: 'info',
						autoHide: false,
						closable: true,
						contents: $filter('l10n')(['dataWarehouseInUseWarningText', 'This segment is currently in use by Data Warehouse.'])
					});
				}

				if ($scope.segment.asiInUse) {
					appModel.addAlert({
						variant: 'info',
						autoHide: false,
						closable: true,
						contents: $filter('l10n')(['asiInUseWarningText', 'This segment is currently in use by ASI.'])
					});
				}

				setupAamUiElements(); // publish to marketing cloud
				$scope.initiallyIsInternal = segment.internal;
			};

			function setupAamUiElements() {
				// load exiting lookback value, or set it to the default
				$scope.lookbackValue = $scope.segment.aamStatus.info[appModel.reportSuite.rsid] ? $scope.segment.aamStatus.info[appModel.reportSuite.rsid].lookbackValue : appDefaults.audiencePresetWindow; // default value for aam window presets

				$scope.presets = [{ label: $filter('l10n')(['audienceWindowPresetLabel', 'Last %s days'], '15'), value: '15' }, { label: $filter('l10n')(['audienceWindowPresetLabel', 'Last %s days'], '30'), value: '30' }, { label: $filter('l10n')(['audienceWindowPresetLabel', 'Last %s days'], '60'), value: '60' }, { label: $filter('l10n')(['audienceWindowPresetLabel', 'Last %s days'], '90'), value: '90' }, { label: $filter('l10n')(['audienceWindowPresetLabel', 'Last %s days'], '120'), value: '120' }];

				// in-use by aam for any report suite?
				if ($scope.segment.aamStatus.inUse.length > 0) {
					var textSingular = $filter('l10n')(['segmentInUseByMarketingCloudWarningSingular', 'This published segment is currently in use in the Marketing Cloud for report suite %s. If you make changes to the segment, it may affect marketing efforts within your organization. Please also note, active Marketing Cloud segments cannot be deleted or unpublished.'], $scope.segment.aamStatus.inUse.join(', '));
					var textPlural = $filter('l10n')(['segmentInUseByMarketingCloudWarning', 'This published segment is currently in use in the Marketing Cloud for report suites %s. If you make changes to the segment, it may affect marketing efforts within your organization. Please also note, active Marketing Cloud segments cannot be deleted or unpublished.'], $scope.segment.aamStatus.inUse.join(', '));
					appModel.addAlert({
						variant: 'notice',
						autoHide: false,
						closable: true,
						contents: $scope.segment.aamStatus.inUse.length == 1 ? textSingular : textPlural
					});
				}

				// aam status for the current report suite
				if ($scope.segment.aamStatus.published.indexOf(appModel.reportSuite.rsid) != -1) {
					$scope.canShareToMC = true;
					$scope.sharedToMC = true;

					// if it's in the "inUse" list, it will also be in the "published" list
					if ($scope.segment.aamStatus.inUse.indexOf(appModel.reportSuite.rsid) != -1) {
						$scope.segment.aamStatusForCurrentRsid = 'inUse';
					} else {
						$scope.segment.aamStatusForCurrentRsid = 'published';
					}
				} else {
					// figure out if aam is configured for this report suite
					aamService.aamConfigured(appModel.reportSuite.rsid, function (result) {
						$scope.canShareToMC = result.aamConfigured;
						$scope.sharedToMC = false;
					});
				}
			}

			$scope.hasPermissionForRsid = appModel.reportSuite.permissions.segmentCreation;
			if (!$scope.hasPermissionForRsid) {
				appModel.addAlert({
					variant: 'error',
					autoHide: false,
					closable: true,
					contents: $filter('l10n')(['doesNotHavePermission', 'You do not have permission to create components for this report suite.'])
				});
			}

			$scope.canSaveSegment = function () {
				return !$scope.segment || !$scope.segment.id || user.isAdmin || $scope.segment.owner.id == user.id;
			};

			$scope.canDeleteSegment = function () {
				return $scope.segment && $scope.segment.id && (user.isAdmin || $scope.segment.owner.id == user.id);
			};

			$scope.showSavePrompt = function () {
				if ($scope.segment.virtualReportSuites && $scope.segment.virtualReportSuites.length) {
					var confirmLabel = $filter('l10n')(['areYouSureYouWantToSaveWarningTextVRS', 'You are about to edit a segment that is used in a Virtual Report Suite definition. Are you sure you want to save your changes?']);

					Dialog.confirm(confirmLabel).then(function () {
						return saveSegment();
					});
				} else {
					saveSegment();
				}
			};

			var saveSegment = VrsComponentSaveUtil.enhanceSaveFunction(appModel, function (options) {
				options = options || {};

				if (segmentSummaryViewState.loadingSegmentSummary) {
					// don't let user save segment if compatibility hasn't finished loading
					spinnerService.show($scope.sbSpinnerId);
					var promise = new Promise(function (resolve, reject) {
						var unbindWatch = $scope.$watch('segmentSummaryViewState.loadingSegmentSummary', function () {
							if (!segmentSummaryViewState.loadingSegmentSummary) {
								spinnerService.hide($scope.sbSpinnerId);
								unbindWatch();
								// Bug AN-140951: When used as an inline editor, it expects saveSegment to return a promise.
								// If the summary is still loading, it would just return (not a promise), causing a js error.
								resolve($scope.saveSegment(options));
							}
						});
					});
					return promise;
				}
				if ($scope.segment.name === '') {
					appModel.addAlert({
						variant: 'error',
						autoHide: false,
						closable: true,
						contents: $filter('l10n')(['titleRequiredWarning', 'Title is required to save a segment.'])
					});
					$('.titleField').focus();
					return Promise.reject();
				}
				if ($scope.sharedToMC && !$scope.controlObject.axleSupported) {
					appModel.addAlert({
						variant: 'error',
						contents: $filter('l10n')(['marketingCompatibilityWarning', 'Segment must be compatible with Reports & Analytics and Ad Hoc Analysis to share to Marketing Cloud.']),
						autoHide: false,
						closable: true
					});
					return Promise.reject();
				}
				if ($scope.sharedToMC && $scope.segment.description === '') {
					appModel.addAlert({
						variant: 'error',
						closable: true,
						contents: $filter('l10n')(['titleDescriptionRequiredWarning', 'Title and Description are required to share to the Marketing Cloud.']),
						autoHide: false
					});
					$('.descriptionField').focus();
					return Promise.reject();
				}

				if (!$scope.controlObject.isValid) {
					appModel.addAlert({
						variant: 'error',
						closable: true,
						contents: $filter('l10n')(['titleRequiredWarningCannotSave', 'Incomplete segment, cannot save segment.']),
						autoHide: false
					});
					$('.descriptionField').focus();
					return Promise.reject();
				}

				// copy the segment (locally in memory) so that the UI doesn't automatically update when data is returned from the server (ie, angular resource)
				var copiedSegment = $scope.segment.copy(),
				    selectedTagObjects = $scope.tags.filter(function (tag) {
					return tag.selected;
				}),
				    selectedTags = util.pluckMap(selectedTagObjects, { 'name': 'name', 'id': 'id' });

				//Translate the usable data format back to a format that the server is expecting.
				copiedSegment.definition = definitionParser.dataModelToDefinition(copiedSegment.consumableDefinition);
				copiedSegment.aamStatusForCurrentRsid = $scope.segment.aamStatusForCurrentRsid;
				copiedSegment.tags = selectedTags.map(function (tag) {
					return Tag.fromJSON(tag);
				});

				updateAamStatus(copiedSegment); // only if applicable

				spinnerService.show($scope.sbSpinnerId);

				trackService.trackAction(null, 'Save Segment', {
					saveType: options.saveAs ? 'save-as' : 'save',
					hasDescription: $scope.segment.description && $scope.segment.description.length > 0,
					hasTags: selectedTags.length > 0,
					sharedToMarketingCloud: $scope.sharedToMC,
					itemCount: definitionItemCount(copiedSegment.consumableDefinition)
				});

				// Send project omega tracking hit
				var element = options.saveAs ? 'save-as button' : 'save button';
				OmegaTrack.trackEvent({
					element: element,
					action: 'click',
					type: 'button',
					widget: {
						name: 'segment-builder',
						type: 'editor'
					},
					attributes: {
						sharedToMarketingCloud: $scope.sharedToMC ? 'true' : 'false'
					},
					feature: 'segment-builder'
				});

				return appModel.repo.save(copiedSegment).then(function (segment) {
					if ($scope.embedded) {
						notifySaved(segment);
					} else {
						returnToAppropriateLocation(copiedSegment.id ? 'save' : 'create', segment);
					}
					return segment;
				});
			});

			$scope.saveSegment = saveSegment;

			$scope.saveSegmentAs = function () {
				$scope.segment.id = undefined;
				$scope.segment.internal = false;
				return saveSegment({ saveAs: true });
			};

			function updateAamStatus(copiedSegment) {
				if (!copiedSegment.aamStatusForCurrentRsid) {
					var rsidLocation = copiedSegment.aamStatus.published.indexOf(appModel.reportSuite.rsid);
					if (rsidLocation != -1) {
						copiedSegment.aamStatus.published.splice(rsidLocation, 1);
					}
				} else if (copiedSegment.aamStatusForCurrentRsid == 'published') {

					if (copiedSegment.aamStatus.published.indexOf(appModel.reportSuite.rsid) == -1) {
						//clear out the array instead of appending to it (if appending, it will create a duplicate segment in the other report suite)
						copiedSegment.aamStatus.published = [appModel.reportSuite.rsid];
					}
					copiedSegment.aamStatus.info[copiedSegment.rsid] = {};
					copiedSegment.aamStatus.info[copiedSegment.rsid].lookbackValue = $scope.lookbackValue;
					copiedSegment.aamStatus.info[copiedSegment.rsid].lookbackGranularity = 'D'; // currently UI only supports day granularity
				}
			}

			function notifySaved(segment) {
				$scope.$emit('saved', { id: segment.id });
				appModel.updateOwnerAndCacheAndCollectionsAndRelevancy(segment);

				// Workspace does not use the old appCache. So we need to check if
				// segments exist in the appCache before we can proceed.
				if (appCache.has('segments')) {
					appCache.updateItem('segments', segment);
					if (_.get(appCache, 'data.componentsById')) {
						appCache.updateItem('components', segment);
					}
				}
			}

			$scope.deleteSegment = function () {
				var confirmMessage = $scope.segment.virtualReportSuites && $scope.segment.virtualReportSuites.length ? $filter('l10n')(['areYouSureYouWantToDeleteWarningTextVRS', 'You are about to delete a segment that is used in a Virtual Report Suite definition. Are you sure you want to delete this segment? This action cannot be undone. Any scheduled reports using this segment will continue to use this segment definition until you re-save the scheduled report.']) : $filter('l10n')(['areYouSureYouWantToDeleteWarningText', 'Are you sure you want to delete this segment? This action cannot be undone. Any scheduled reports using this segment will continue to use this segment definition until you re-save the scheduled report.']);

				Dialog.confirm(confirmMessage).then(function () {
					// copy the segment (locally in memory) so that the UI doesn't automatically update when data is returned from the server (ie, angular resource)
					spinnerService.show($scope.sbSpinnerId);
					appModel.repo.delete($scope.segment).then(function () {
						returnToAppropriateLocation('delete', $scope.segment);
					});
				});
			};

			$scope.cancel = function () {
				returnToAppropriateLocation('cancel', $scope.segment);
			};

			function returnToAppropriateLocation(actionType, segment) {
				// only pass through the segment id as part of the segment object
				if (segment) {
					segment = { 'id': segment.id };
				} else {
					segment = null;
				}

				var defaultCallbackUrl = scUrl.spas('component-manager', { 'componentType': 'segments' });
				callbackRegistryService.callbackParams.segment = segment;
				callbackRegistryService.callbackParams.actionType = actionType;
				callbackRegistryService.execute(defaultCallbackUrl, customCallbackExecutor);
			}

			$scope.removeAlert = function (index) {
				$scope.alerts.splice(index, 1);
			};

			$scope.$watch('dragManager.dragging', function (dragging) {
				$scope.dragging = dragging;
			});

			$scope.loadTags = function () {
				$scope.loadingTags = true;
				tagRepository.query({}).then(function (response) {
					var tags = response;
					$scope.loadingTags = false;
					// once the segment loads, loop through the segment's tags to set which ones are selected
					var unbindWatcher = $scope.$watch('segment', function (segment) {
						if (segment) {
							var selectedTagIds = segment.tags ? segment.tags.map(function (tag) {
								return tag.id;
							}) : [];
							if (selectedTagIds.length) {
								tags.forEach(function (tag) {
									if (selectedTagIds.indexOf(tag.id) != -1) {
										tag.selected = true;
									}
								});
							}
							$scope.tags = tags;
							unbindWatcher();
						}
					});
				});
			};

			$scope.toggleSegmentPreview = function (currentTarget, segment) {
				eventBus.publish('toggleSegmentPreviewVisibility', currentTarget, segment);
			};

			$scope.toggleMetricPreview = function (currentTarget, metric) {
				eventBus.publish('calculated-metric-preview:toggleVisibility', currentTarget, metric);
			};

			$scope.toggleDimensionPreview = function (currentTarget, dimension) {
				eventBus.publish('dimension-preview:toggleVisibility', currentTarget, dimension);
			};

			/* Tracking helper functions */

			function pageLoadType() {
				if (angular.isDefined($scope.editId)) {
					return 'edit';
				} else if (angular.isDefined($scope.pasteId)) {
					return 'pastebin';
				} else if (angular.isDefined($scope.definition)) {
					return 'definition';
				} else {
					return 'new';
				}
			}

			function definitionItemCount(definition) {

				function deepCount(item) {
					if (!item || !item.items) {
						return 0;
					}
					var count = item.items.length;
					for (var i = 0; i < item.items.length; i++) {
						count += deepCount(item.items[i]);
					}
					return count;
				}

				return deepCount(definition);
			}

			$window.adobe = $window.adobe || {};
			$window.adobe.tools = $window.adobe.tools || {};
			$window.adobe.tools.exportSegmentDefinition = function (toJSON) {
				var copiedSegment = angular.copy($scope.segment);
				var def = definitionParser.dataModelToDefinition(copiedSegment.consumableDefinition);
				return toJSON ? JSON.stringify(def, null, 2) : def;
			};

			/* End Tracking helper functions */
		}
	};
});
'use strict';

angular.module('segment-builder').filter('gearListFilter', function ($filter, GEAR_NAME, GEAR_NEW_SUB_GROUP_FROM_SELECTION, GEAR_EXCLUDE, GEAR_INCLUDE, GEAR_DELETE) {
	return function (list, gearFilter) {
		return list.filter(function (option) {
			if (gearFilter) {
				if (gearFilter.selectedItemLength === 0 && option.value == GEAR_NEW_SUB_GROUP_FROM_SELECTION) {
					return false;
				}

				if (option.value == GEAR_NAME && gearFilter.excludeName) {
					return false;
				} else if (option.value == GEAR_NAME) {
					var nameContainerString = gearFilter.model.name !== '' ? $filter('l10n')(['gearRenameContainer', 'Rename container']) : $filter('l10n')(['gearNameContainer', 'Name container']);

					option.label = nameContainerString;
				}

				if (option.value == GEAR_EXCLUDE && gearFilter.exclude) {
					return false;
				}

				if (option.value == GEAR_INCLUDE && !gearFilter.exclude) {
					return false;
				}

				if (option.value == GEAR_DELETE && gearFilter.excludeDelete) {
					return false;
				}
				return true;
			} else {
				return false;
			}
		});
	};
});
'use strict';

angular.module('segment-builder').controller('sbMainCtrl', function ($scope, $routeParams) {});
'use strict';

angular.module('segment-builder').factory('aamService', function ($http, appModel) {
	var l10nConfig = analyticsui['core'].l10nConfig;

	return {
		aamConfigured: function aamConfigured(rsid, cb) {
			$http({
				method: 'GET',
				url: appModel.appService.baseURL + '/segments/aamstatus',
				params: {
					rsid: rsid,
					locale: l10nConfig.currentLocale
				}
			}).success(cb);
		}
	};
});
'use strict';

angular.module('segment-builder').factory('appDefaults', function () {
	return {
		'dvAnimationDuration': 500,
		'audiencePresetWindow': '90'
	};
});
'use strict';

angular.module('segment-builder').factory('customCallbackExecutor', function (scUrl, util) {
	return {
		getDestinationUrl: function getDestinationUrl(params) {
			if (!params.segment) {
				return params.destinationUrl;
			}

			var newSegmentList = params.existingSegments || [],
			    destinationParams = util.getQueryParams(params.destinationUrl),
			    key;

			if (params.actionType != 'cancel') {
				// don't change any applied segments if they cancelled
				if (~newSegmentList.indexOf(params.segment.id)) {
					// check if segment is already applied to report
					newSegmentList.splice(newSegmentList.indexOf(params.segment.id), 1);
				}

				if (params.actionType != 'delete') {
					// apply the segment to the report unless they deleted it
					newSegmentList.push(params.segment.id);
				}
			}

			delete destinationParams.jpj; // scUrl updates jpj and ssSession automatically
			delete destinationParams.ssSession;

			switch (params.type) {
				case 'sc-report':

					destinationParams.rp = 'ob_segment_id|' + newSegmentList.join(','); // replace old rp with the new segment id to be applied (old rp state is wrapped into new jpj state)
					return scUrl.fs(destinationParams.a, destinationParams); // don't pass gateway url because we're rebuilding the params from scratch

				case 'dashboard':

					// need to go through and remove all ob_segment_id[] params because existing segments will be re-appended anyway
					for (key in destinationParams) {
						if (destinationParams.hasOwnProperty(key) && key.indexOf('ob_segment_id') != -1) {
							delete destinationParams[key];
						}
					}
					destinationParams['ob_segment_id'] = newSegmentList;
					return scUrl.fs(destinationParams.a, destinationParams); // don't pass gateway url because we're rebuilding the params from scratch

				case 'anomaly-detection':

					var destinationHashParams = util.getHashParams(params.destinationUrl),
					    destinationUrl = scUrl.fs(destinationParams.a, destinationParams); // don't pass gateway url because we're rebuilding the hash from scratch
					destinationHashParams.selectedSegmentIds = JSON.stringify(newSegmentList);
					destinationUrl = scUrl.appendFragment(destinationUrl, 'anomalies');
					return scUrl.appendHashParams(destinationUrl, destinationHashParams);

				default:
					return params.destinationUrl;
			}
		}
	};
});
'use strict';

angular.module('segment-builder').factory('gearOptions', function ($filter, GEAR_NEW_SUB_GROUP, GEAR_EXCLUDE, GEAR_INCLUDE, GEAR_DELETE, GEAR_NAME, GEAR_NEW_SUB_GROUP_FROM_SELECTION) {
	return {
		data: [{
			label: $filter('l10n')(['gearCreateNewSubGroupLabel', 'Add container']),
			value: GEAR_NEW_SUB_GROUP
		}, {
			label: $filter('l10n')(['gearCreateNewSubGroupFromSelectionLabel', 'Add container from selection']),
			value: GEAR_NEW_SUB_GROUP_FROM_SELECTION
		}, {
			label: $filter('l10n')(['gearExcludeLabel', 'Exclude']),
			value: GEAR_EXCLUDE
		}, {
			label: $filter('l10n')(['gearIncludeLabel', 'Include']),
			value: GEAR_INCLUDE
		}, {
			label: $filter('l10n')(['gearNameContainer', 'Name container']),
			value: GEAR_NAME
		}, {
			label: $filter('l10n')(['gearDeleteContainer', 'Delete container']),
			value: GEAR_DELETE
		}],

		getById: function getById(id) {
			var obj;
			this.data.forEach(function (item) {
				if (item.value == id) {
					obj = item;
				}
			});
			return obj;
		}
	};
});
angular.module("segment-builder").run(["$templateCache", function($templateCache) {$templateCache.put("directives/sb-action-bar.tpl.html","<nav ad-action-bar-observer ad-resize=\"onActionBarChanged()\" ad-content-changed=\"onActionBarChanged()\" class=\"shell-Panel-header shell-ActionBar\" >\n	<div class=\"shell-ActionBar-left\">\n		<h1 class=\"coral-Heading coral-Heading--1 shell-ActionBar-title\" ng-if=\"!editId\">{{ [\'newSegment\', \'New Segment\'] | l10n }}</h1>\n		<h1 class=\"coral-Heading coral-Heading--1 shell-ActionBar-title\" ng-if=\"editId\">{{ [\'editSegment\', \'Edit Segment\'] | l10n }}</h1>\n	</div>\n\n	<div class=\"shell-ActionBar-right\">\n		<!-- the callback attribute refers to a function name on the controller scope -->\n		<an-report-suite-selector params=\"{confirm: true}\"></an-report-suite-selector>\n	</div>\n</nav>\n");
$templateCache.put("directives/sb-context-popover.tpl.html","<div class=\"coral-Popover\" >\n	<ul class=\"coral3-SelectList is-visible\">\n		<li class=\"coral3-SelectList-item coral3-SelectList-item--option\"\n			ng-repeat=\"contextItem in dataModel.contextList\"\n			ng-click=\"onContextItemClick(contextItem)\">\n			<i class=\"coral-Icon coral3-SelectList-item-icon\" ng-class=\"contextItem.icon\"></i>\n			{{contextItem.label}}\n		</li>\n	</ul>\n</div>\n");
$templateCache.put("directives/sb-definition-container.tpl.html","<div class=\"sb-definition-container\" ng-class=\"{\'exclude\':dataModel.exclude}\" >\n	<div class=\"draggable-header\">\n		<a type=\"button\" class=\"coral-Button coral-Button--secondary coral-Button--quiet collapsible-button\"\n		   ng-click=\"collapsed = !collapsed\" >\n			<i class=\"coral-Icon coral-Icon--sizeXS\"\n			   ng-class=\"{\'coral-Icon--accordionRight\':collapsed, \'coral-Icon--accordionDown\':!collapsed}\"></i>\n			<span ng-hide=\"renaming\" >{{ getName() }}</span>\n		</a>\n		<input class=\"name-input\" type=\"text\" ng-model=\"dataModel.name\" ng-show=\"renaming\"\n			   ad-enter=\"renaming=false\" ng-blur=\"renaming=false\">\n\n		<div class=\"config-container\" >\n			<a type=\"button\" class=\"coral-Button coral-Button--secondary coral-Button--quiet\" \n				data-target=\"#{{prefixSuffixPopoverId}}\" ng-if=\"dataModel.logicalOperator == \'sequence\' && hasOperator()\"\n				data-toggle=\"popover\" closeOtherPopovers=\"true\" data-point-from=\"bottom\" data-align-from=\"right\">\n				<i class=\"coral-Icon coral-Icon--sizeS\" ng-class=\"currentPrefixSuffixItem.icon\"></i>\n			</a>\n			<a type=\"button\" class=\"coral-Button coral-Button--secondary coral-Button--quiet\" data-target=\"#{{contextPopoverId}}\"\n			   data-toggle=\"popover\" closeOtherPopovers=\"true\" data-point-from=\"bottom\" data-align-from=\"right\">\n				<i class=\"coral-Icon coral-Icon--sizeS\" ng-class=\"currentContextItem.icon\"></i>\n			</a>\n			<a type=\"button\" class=\"coral-Button coral-Button--secondary coral-Button--quiet\" data-target=\"#{{gearPopoverId}}\"\n			   data-toggle=\"popover\" closeOtherPopovers=\"true\" data-point-from=\"bottom\" data-align-from=\"right\">\n				<i class=\"coral-Icon coral-Icon--sizeS coral-Icon--gear\"></i>\n			</a>\n		</div>\n	</div>\n	<sb-drop-zone ng-hide=\"collapsed\"></sb-drop-zone>\n\n	<sb-prefix-suffix-popover id={{prefixSuffixPopoverId}}></sb-prefix-suffix-popover>\n	<sb-gear-popover id=\"{{gearPopoverId}}\"></sb-gear-popover>\n	<sb-context-popover id=\"{{contextPopoverId}}\"></sb-context-popover>\n</div>\n");
$templateCache.put("directives/sb-draggable-rule-dropdown.tpl.html","<div>\n	<ad-autocomplete\n		ng-init=\"loadElements()\"\n		ng-if=\"showAutoCompleteDropdown\"\n		data-provider=\"elements\"\n		ad-placeholder-text=\"{{ [\'enterValuePlaceholder\', \'Enter Value\'] | l10n }}\"\n		selected-item=\"selectedElement\"\n		loading-data=\"loadingElements\"\n		clearable=\"true\"\n		size=\"block\"\n		add-new-item-text-key=\"{{ addNewItemTextKey }}\"\n		sort-by-name=\"false\"\n		item-changed-handler=\"onSelectedElementChange(item, text)\"\n		text-changed-handler=\"onDropdownTextChange(text)\"\n		allow-create=\"true\"\n		trim-value-on-create=\"true\"\n		multi=\"false\">\n	</ad-autocomplete>\n	<input\n		ng-click=\"onTextInputClick($event)\"\n		ng-model=\"dataModel.value\"\n		class=\"text-input-box\"\n		placeholder=\"{{ [\'enterValuePlaceholder\', \'Enter Value\'] | l10n }}\"\n		ng-if=\"!showAutoCompleteDropdown\"\n		ad-blur=\"commitTextInput()\"\n		ad-enter=\"commitTextInput()\">\n</div>\n");
$templateCache.put("directives/sb-draggable-rule-number-picker.tpl.html","<ad-numberinput\n	ng-click=\"onElementClick($event)\"\n	data-value=\"dataModel.value\"\n	on-blur=\"commitNumberInput()\"\n	on-enter=\"commitNumberInput()\">\n</ad-numberinput>\n");
$templateCache.put("directives/sb-draggable-rule.tpl.html","<div class=\"draggable-item draggable-rule\" ad-draggable=\"{draggableModel: dataModel, dragStartThreshold: 5, dragProxyOpacity: .85}\"\n	 ng-class=\"{selected:dataModel.selected, deprecated:dataModel.deprecated}\" ng-click=\"onItemClick($event)\" ng-init=\"init()\">\n	<div ng-class=\"{dimension:dataModel.itemType == \'dimension\', metric:dataModel.itemType == \'metric\', segment:(dataModel.itemType == \'segment\'), \'date-range\':dataModel.itemType == \'dateRange\'}\"\n		 class=\"item-type-indicator\" ></div>\n	<div class=\"drag-handle\"></div>\n	<button type=\"button\" class=\"coral-MinimalButton coral-CloseButton\" ng-click=\"remove()\">\n		<i class=\"coral-MinimalButton-icon coral-Icon coral-Icon--sizeXS coral-Icon--close\"></i>\n	</button>\n	<div class=\"draggable-label\">\n		{{ dataModel.name }}\n		<i ng-if=\"dataModel.itemType == \'dateRange\'\" class=\"coral-MinimalButton-icon coral-Icon coral-Icon--sizeXS coral-Icon--infoCircle\" ng-click=\"showDateRangePreview($event)\"></i>\n	</div>\n	<div class=\"draggable-select-list\">\n		<ad-select\n			quiet=\"true\"\n			selection=\"dataModel.comparisonType\"\n			options=\"comparisonTypesList\"\n			selection-change=\"onComparisonTypeChange(newValue)\"\n			ng-hide=\"dataModel.deprecated || dataModel.itemType == \'dateRange\'\">\n		</ad-select>\n		<label class=\"coral-Label\" ng-if=\"dataModel.deprecated\">{{ getComparisonType() }}</label>\n	</div>\n	<div class=\"draggable-options\" ad-click-outside=\"clickOutsideDraggableRule()\">\n		<label class=\"coral-Label\" ng-if=\"displayValueLabel()\" ng-click=\"onValueLabelClick($event)\">{{ (dataModel.value | ruleValueFilter:dataModel.type:rangeType) || ([\"paren-empty-value-paren\", \"(Empty value)\"] | l10n ) }}</label>\n	</div>\n</div>\n");
$templateCache.put("directives/sb-drop-zone.tpl.html","<div class=\"drop-zone\"\n	 ad-drag-enter=\"onDragEnter($event, $localPt, $draggableModel)\"\n	 ad-drag-over=\"onDragOver($event, $localPt, $draggableModel)\"\n	 ad-drag-leave=\"onDragLeave()\"\n	 ad-drag-drop=\"onDragDrop($event, $draggableModel)\"\n	 ad-drag-drop-outside=\"onDragDropOutside($event, $draggableModel)\">\n	<div class=\"empty-drop-container\" ng-show=\"dataModel.items.length == 0\" ng-class=\"{\'drag-over\':showDragProxy}\">\n		{{ [\'emptyDragDropContainerLabel-001\', \'Drag & drop Metric(s), Segment(s), and/or Dimensions here.\'] | l10n }}\n	</div>\n	<sb-segment-item ng-repeat=\"item in dataModel.items\" ></sb-segment-item>\n</div>");
$templateCache.put("directives/sb-gear-popover.tpl.html","<div class=\"coral-Popover\" >\n	<ul class=\"coral3-SelectList is-visible\">\n		<li class=\"coral3-SelectList-item coral3-SelectList-item--option\"\n			ng-repeat=\"option in options | gearListFilter:optionFilter\"\n			ng-click=\"onItemClick($event, option)\">\n			{{option.label}}\n		</li>\n	</ul>\n</div>");
$templateCache.put("directives/sb-prefix-suffix-popover.tpl.html","<div class=\"coral-Popover\" >\n	<ul class=\"coral3-SelectList is-visible\">\n		<li class=\"coral3-SelectList-item coral3-SelectList-item--option\"\n			ng-repeat=\"contextItem in prefixSuffixList\"\n			ng-click=\"onPrefixSuffixItemClick(contextItem)\">\n			<i class=\"coral-Icon coral3-SelectList-item-icon\" ng-class=\"contextItem.icon\"></i>\n			{{contextItem.label}}\n		</li>\n	</ul>\n</div>\n");
$templateCache.put("directives/sb-segment-definition.tpl.html","<div class=\"sb-segment-definition\" ng-class=\"{\'exclude\':dataModel.exclude}\" is-dragging-class=\"is-dragging\">\n	<div class=\"coral-Well\">\n		<div class=\"segment-ctrl-buttons\">\n			<a type=\"button\" class=\"coral-Button coral-Button--quiet sb-prefix-soffix-button\" data-target=\"#{{prefixSuffixPopoverId}}\" ng-if=\"dataModel.logicalOperator == \'sequence\' && hasOperator()\"\n			   data-toggle=\"popover\" closeOtherPopovers=\"true\" data-point-from=\"bottom\" data-align-from=\"right\" data-point-at=\"#top-level-sequence-options-icon\">\n				<i class=\"coral-Icon coral-Icon--sizeS\" ng-class=\"currentPrefixSuffixItem.icon\" id=\"top-level-sequence-options-icon\"></i>\n				<span class=\"endor-ActionButton-label\">{{ currentPrefixSuffixItem.label }}</span>\n			</a>\n			<a type=\"button\" class=\"coral-Button coral-Button--quiet\" data-target=\"#{{gearPopoverId}}\"\n			   data-toggle=\"popover\" closeOtherPopovers=\"true\" data-point-from=\"bottom\" data-align-from=\"right\" data-point-at=\"#top-level-segment-options-icon\">\n				<i class=\"coral-Icon coral-Icon--gear coral-Icon--sizeS\" id=\"top-level-segment-options-icon\"></i>\n				<span class=\"endor-ActionButton-label\">{{ [\'segmentOptions\', \'Options\'] | l10n }}</span>\n			</a>\n		</div>\n		<span class=\"show-label\">{{ [\'showLabel\', \'Show\'] | l10n }}</span>\n		<ad-select class=\"definition-context-select\" selection=\"dataModel.context\" options=\"contextList\" selection-change=\"onTopLevelContainerChange()\"></ad-select>\n		<sb-drop-zone></sb-drop-zone>\n	</div>\n\n	<sb-prefix-suffix-popover id={{prefixSuffixPopoverId}}></sb-prefix-suffix-popover>\n	<sb-gear-popover id=\"{{gearPopoverId}}\"></sb-gear-popover>\n</div>\n");
$templateCache.put("directives/sb-segment-item.tpl.html","<div class=\"segment-item\">\n	<div class=\"sb-drag-drop-indicator\" ng-class=\"{active:item.displayDropIndicatorTop}\"></div>\n	<!-- This item will be populated with either a rule or a collapsible container within the compile function -->\n	<div class=\"dynamic-content\"></div>\n	<div class=\"sb-drag-drop-indicator\" ng-class=\"{active:item.displayDropIndicatorBottom}\"></div>\n	<div class=\"segment-join-functions\" ng-if=\"dataModel.items.length > 0 && $index != dataModel.items.length-1\">\n		<ad-select\n			quiet=\"true\"\n			selection=\"dataModel.logicalOperator\"\n			options=\"logicalOperatorList\"\n			selection-change=\"onLogicalOperatorChange(newValue)\">\n		</ad-select>\n		<sb-sequence-pill-box ng-if=\"dataModel.logicalOperator == \'sequence\'\"></sb-sequence-pill-box>\n	</div>\n</div>\n");
$templateCache.put("directives/sb-sequence-pill-box.tpl.html","<div class=\"sequence-pill-box\">\n	<sb-sequence-pill\n		label=\"{{ [\'sequenceAfter\', \'After\'] | l10n }}\"\n		remove-item=\"removeAfterPill()\"\n		data-model=\"item.afterTimeRestriction\"\n		ng-if=\"item.afterTimeRestriction\">\n	</sb-sequence-pill>\n	<span ng-if=\"item.afterTimeRestriction && item.withinTimeRestriction\">{{ [\'sequenceBut\', \'but\'] | l10n }}</span>\n	<sb-sequence-pill\n		label=\"{{ [\'sequenceWithin\', \'Within\'] | l10n }}\"\n		remove-item=\"removeWithinPill()\"\n		data-model=\"item.withinTimeRestriction\"\n		ng-if=\"item.withinTimeRestriction\">\n	</sb-sequence-pill>\n\n\n	<a class=\"coral-Button coral-Button--secondary coral-Button--quiet sequence-selector-popup-button\" ng-class=\"{active:setActiveState}\" ng-click=\"showAfterWithinPopover($event)\"\n	   ng-if=\"displaySequencePulldown()\" data-target=\"#{{sequenceSelectorPopoverId}}\" data-toggle=\"popover\" data-point-from=\"bottom\"\n	   data-align-from=\"right\">\n		<i class=\"coral-Icon coral-Icon--clock\"></i>\n	</a>\n\n	<div class=\"coral-Popover\" id=\"{{sequenceSelectorPopoverId}}\">\n		<ul class=\"coral3-SelectList is-visible\">\n			<li class=\"coral3-SelectList-item coral3-SelectList-item--option\" ng-click=\"afterClickHandler()\">\n				<i class=\"coral-Icon coral3-SelectList-item-icon coral-Icon--check u-coral-pullRight\" ng-if=\"item.afterTimeRestriction\"></i>\n				<span class=\"sequence-option-label\" >{{ [\'sequenceAfter\', \'After\'] | l10n }}</span>\n			</li>\n			<li class=\"coral3-SelectList-item coral3-SelectList-item--option\" ng-click=\"withinClickHandler()\">\n				<i class=\"coral-Icon coral3-SelectList-item-icon coral-Icon--check u-coral-pullRight\" ng-if=\"item.withinTimeRestriction\"></i>\n				<span class=\"sequence-option-label\" >{{ [\'sequenceWithin\', \'Within\'] | l10n }}</span>\n			</li>\n		</ul>\n	</div>\n</div>\n");
$templateCache.put("directives/sb-sequence-pill.tpl.html","<div class=\"sequence-pill\">\n	<button class=\"coral-MinimalButton coral-CloseButton\" ng-click=\"removeItem(dataModel)\">\n		<i class=\"coral-MinimalButton-icon coral-Icon coral-Icon--sizeXS coral-Icon--close\"></i>\n	</button>\n	<span class=\"coral-Label\" ng-hide=\"isJapanese\">{{ label }}</span>\n	<span class=\"coral-Select ng-isolate-scope quiet\">\n		<button class=\"coral-Select-button coral-MinimalButton\" type=\"button\" data-toggle=\"popover\" data-point-from=\"bottom\"\n				data-align-from=\"right\" data-target=\"#{{sequenceNumberInputPopoverId}}\" ng-class=\"{active:countButtonActive}\">\n			<span class=\"coral-Select-button-text\">{{ dataModel.count }}</span>\n		</button>\n	</span>\n\n	<ad-react-component type=\"TimeUnitSelector\" props=\"{unit: dataModel.unit, onChange: onTimeUnitChange}\"></ad-react-component>\n\n	<span class=\"coral-Label\" ng-show=\"isJapanese\">{{ label }}</span>\n\n	<div class=\"coral-Popover\" id=\"{{sequenceNumberInputPopoverId}}\" >\n		<ad-numberinput\n			lower-limit=\"1\"\n			data-value=\"dataModel.count\"\n			on-enter=\"hideCountPopover()\">\n		</ad-numberinput>\n	</div>\n</div>\n");
$templateCache.put("directives/segment-builder.tpl.html","<div class=\"endor-Page-content endor-Panel\" >\n	<div ng-init=\"initData()\">\n		<div >\n			<div class=\"endor-Panel-contentMain u-coral-padding sb-main-content\" ng-class=\"{isDragging:dragging}\">\n				<div ng-show=\"!initializing\">\n					<div class=\"sb-segment-container\">\n						<div class=\"sb-top-section-container\">\n							<an-segment-summary segment=\"segment\" control-object=\"controlObject\" date-range=\"dateRange\"></an-segment-summary>\n							<div class=\"sb-heading-fields\">\n								<label class=\"sb-heading\">{{ [\'segmentTitleHeading\', \'Title\'] | l10n }}</label>\n								<div><input type=\"text\" class=\"titleField coral-Textfield\" ng-model=\"segment.name\"></div>\n								<label class=\"sb-heading\">{{ [\'segmentDescriptionHeading\', \'Description\'] | l10n }}</label>\n								<textarea class=\"coral-Textfield coral-Textfield--multiline descriptionField\" ng-model=\"segment.description\"></textarea>\n							</div>\n						</div>\n						<label class=\"sb-heading\">{{ [\'tagsHeader\', \'Tags\'] | l10n }}</label>\n						<div class=\"coral-Well sb-tag-well\">\n							<ad-quick-add\n								items=\"tags\"\n								load-items=\"loadTags\"\n								loading-items=\"loadingTags\"\n								placeholder-text-key=\"{{ [\'addTagsLabel\', \'Add Tags\'] | l10n }}\"\n								icon-class-name=\"tag\"\n								allow-create=\"true\"\n								add-new-item-text-key=\"{{clickToAddNewItemLabel}}\">\n							</ad-quick-add>\n						</div>\n						<label class=\"sb-heading\">{{ [\'segmentDefinitionsHeading\', \'Definitions\'] | l10n }}</label>\n						<sb-segment-definition data-model=\"segment.consumableDefinition\"></sb-segment-definition>\n						<div class=\"shareToMC\" ng-show=\"canShareToMC\">\n							<label class=\"coral-Checkbox\" ng-class=\"{disabledOption:segment.aamStatusForCurrentRsid == \'inUse\'}\">\n								<input class=\"coral-Checkbox-input\"\n									   type=\"checkbox\"\n									   ng-model=\"sharedToMC\"\n									   ng-change=\"segment.aamStatusForCurrentRsid = (sharedToMC ? \'published\' : \'\')\"\n									   ng-checked=\"segment.aamStatusForCurrentRsid == \'published\' || segment.aamStatusForCurrentRsid == \'inUse\'\"\n									   ng-disabled=\"segment.aamStatusForCurrentRsid == \'inUse\'\">\n								<span class=\"coral-Checkbox-checkmark\"></span>\n								<span class=\"coral-Checkbox-description\">{{ [\'makeMarketingCloudAudience\', \'Make this a Marketing Cloud audience (for %s)\'] | l10n | sprintf:currentReportSuiteName }}</span>\n							</label>\n							<ad-tooltip class=\"sb-icon\" link=\"/mcloud/t_publish_audience_segment.html\" position=\"above\">\n								{{ [\'checkingMarketingCloudBtn\', \'Checking this box will make the audience derived from this segment available in the Audience Library where it can be used for marketing activities in Target and other Marketing Cloud solutions.\'] | l10n }}\n							</ad-tooltip>\n							<div class=\"audience-window\" ng-show=\"segment.aamStatusForCurrentRsid\">\n								<span class=\"audience-window-label\" ng-class=\"{\'disabledOption\':segment.aamStatusForCurrentRsid==\'inUse\'}\">\n									{{ [\'selectAudienceWindowLabel\', \'Select the window for audience creation:\'] | l10n }}\n								</span>\n								<ad-select\n									class=\"segment-audience-creation-dropdown\"\n									selection=\"lookbackValue\"\n									options=\"presets\"\n									disable-dropdown=\"segment.aamStatusForCurrentRsid == \'inUse\'\">\n								</ad-select>\n							</div>\n						</div>\n						<div class=\"sb-make-segment-public\" ng-if=\"initiallyIsInternal\">\n							<label class=\"coral-Checkbox\">\n								<input class=\"coral-Checkbox-input\"\n									   type=\"checkbox\"\n									   ng-model=\"segment.internal\"\n									   ng-true-value=\"false\" \n									   ng-false-value=\"true\"\n									   ng-checked=\"!segment.internal\">\n								<span class=\"coral-Checkbox-checkmark\"></span>\n								<span class=\"coral-Checkbox-description\">{{ [\'makeThisSegmentPublic\', \'Make this segment public\'] | l10n }}</span>\n							</label>\n							<ad-tooltip class=\"sb-icon\" position=\"above\">\n								{{ [\'makeSegmentPublicDescription\', \'This segment is only visible in the project where it was created. Checking this box will make this segment visible everywhere.\'] | l10n }}\n							</ad-tooltip>\n						</div>\n					</div>\n					<div class=\"sb-button-container\" ng-if=\":: !embedded\">\n						\n						<button class=\"coral-Button coral-Button--primary\" ng-click=\"showSavePrompt()\" ng-show=\"canSaveSegment()\" ng-disabled=\"!controlObject.isValid\">{{ [\'saveButtonLabel\', \'Save\'] | l10n }}</button>\n\n						<button class=\"coral-Button coral-Button--primary\" ng-click=\"saveSegmentAs()\" ng-show=\"segment.id\" ng-disabled=\"!controlObject.isValid\">{{ [\'saveAsButtonLabel\', \'Save As\'] | l10n }}</button>\n\n						<button class=\"coral-Button coral-Button--warning\" ng-show=\"canDeleteSegment()\" ng-click=\"deleteSegment()\" ng-disabled=\"segment.inUseByAamForAtLeastOneRsid || !hasPermissionForRsid\">{{ [\'deleteButtonLabel\', \'Delete\'] | l10n }}</button>\n\n						<a class=\"coral-Link\" ng-click=\"cancel()\">\n							{{ [\'cancelButtonLabel\', \'Cancel\'] | l10n }}\n						</a>\n\n					</div>\n				</div>\n				<an-spinner id=\"{{sbSpinnerId}}\" large=\"true\" center=\"true\"></an-spinner>\n			</div>\n		</div>\n	</div>\n</div>\n");
$templateCache.put("views/main.tpl.html","<div>\n	<segment-builder edit-id=\"editId\" paste-id=\"pasteId\"></segment-builder>\n</div>\n");}]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBhZ2VzL3NlZ21lbnQtYnVpbGRlci9hcHAuanMiLCJwYWdlcy9zZWdtZW50LWJ1aWxkZXIvZGlyZWN0aXZlcy9zYi1hY3Rpb24tYmFyLmpzIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL2RpcmVjdGl2ZXMvc2ItY29udGV4dC1wb3BvdmVyLmpzIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL2RpcmVjdGl2ZXMvc2ItZGVmaW5pdGlvbi1jb250YWluZXIuanMiLCJwYWdlcy9zZWdtZW50LWJ1aWxkZXIvZGlyZWN0aXZlcy9zYi1kcmFnZ2FibGUtcnVsZS1kYXRlLXBpY2tlci5qcyIsInBhZ2VzL3NlZ21lbnQtYnVpbGRlci9kaXJlY3RpdmVzL3NiLWRyYWdnYWJsZS1ydWxlLWRyb3Bkb3duLmpzIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL2RpcmVjdGl2ZXMvc2ItZHJhZ2dhYmxlLXJ1bGUtbnVtYmVyLXBpY2tlci5qcyIsInBhZ2VzL3NlZ21lbnQtYnVpbGRlci9kaXJlY3RpdmVzL3NiLWRyYWdnYWJsZS1ydWxlLmpzIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL2RpcmVjdGl2ZXMvc2ItZHJvcC16b25lLmpzIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL2RpcmVjdGl2ZXMvc2ItZ2Vhci1wb3BvdmVyLmpzIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL2RpcmVjdGl2ZXMvc2ItcHJlZml4LXN1ZmZpeC1wb3BvdmVyLmpzIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL2RpcmVjdGl2ZXMvc2Itc2VnbWVudC1kZWZpbml0aW9uLmpzIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL2RpcmVjdGl2ZXMvc2Itc2VnbWVudC1pdGVtLmpzIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL2RpcmVjdGl2ZXMvc2Itc2VxdWVuY2UtcGlsbC1ib3guanMiLCJwYWdlcy9zZWdtZW50LWJ1aWxkZXIvZGlyZWN0aXZlcy9zYi1zZXF1ZW5jZS1waWxsLmpzIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL2RpcmVjdGl2ZXMvc2VnbWVudC1idWlsZGVyLmpzIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL2ZpbHRlcnMvZ2Vhci1saXN0LWZpbHRlci5qcyIsInBhZ2VzL3NlZ21lbnQtYnVpbGRlci92aWV3cy9tYWluLWN0cmwuanMiLCJwYWdlcy9zZWdtZW50LWJ1aWxkZXIvc2VydmljZXMvYWFtLXNlcnZpY2UuanMiLCJwYWdlcy9zZWdtZW50LWJ1aWxkZXIvc2VydmljZXMvYXBwLWRlZmF1bHRzLmpzIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL3NlcnZpY2VzL2N1c3RvbS1jYWxsYmFjay1leGVjdXRvci5qcyIsInBhZ2VzL3NlZ21lbnQtYnVpbGRlci9zZXJ2aWNlcy9nZWFyLW9wdGlvbnMuanMiLCJwYWdlcy9zZWdtZW50LWJ1aWxkZXIvZGlyZWN0aXZlcy9zYi1hY3Rpb24tYmFyLnRwbC5odG1sIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL2RpcmVjdGl2ZXMvc2ItY29udGV4dC1wb3BvdmVyLnRwbC5odG1sIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL2RpcmVjdGl2ZXMvc2ItZGVmaW5pdGlvbi1jb250YWluZXIudHBsLmh0bWwiLCJwYWdlcy9zZWdtZW50LWJ1aWxkZXIvZGlyZWN0aXZlcy9zYi1kcmFnZ2FibGUtcnVsZS1kcm9wZG93bi50cGwuaHRtbCIsInBhZ2VzL3NlZ21lbnQtYnVpbGRlci9kaXJlY3RpdmVzL3NiLWRyYWdnYWJsZS1ydWxlLW51bWJlci1waWNrZXIudHBsLmh0bWwiLCJwYWdlcy9zZWdtZW50LWJ1aWxkZXIvZGlyZWN0aXZlcy9zYi1kcmFnZ2FibGUtcnVsZS50cGwuaHRtbCIsInBhZ2VzL3NlZ21lbnQtYnVpbGRlci9kaXJlY3RpdmVzL3NiLWRyb3Atem9uZS50cGwuaHRtbCIsInBhZ2VzL3NlZ21lbnQtYnVpbGRlci9kaXJlY3RpdmVzL3NiLWdlYXItcG9wb3Zlci50cGwuaHRtbCIsInBhZ2VzL3NlZ21lbnQtYnVpbGRlci9kaXJlY3RpdmVzL3NiLXByZWZpeC1zdWZmaXgtcG9wb3Zlci50cGwuaHRtbCIsInBhZ2VzL3NlZ21lbnQtYnVpbGRlci9kaXJlY3RpdmVzL3NiLXNlZ21lbnQtZGVmaW5pdGlvbi50cGwuaHRtbCIsInBhZ2VzL3NlZ21lbnQtYnVpbGRlci9kaXJlY3RpdmVzL3NiLXNlZ21lbnQtaXRlbS50cGwuaHRtbCIsInBhZ2VzL3NlZ21lbnQtYnVpbGRlci9kaXJlY3RpdmVzL3NiLXNlcXVlbmNlLXBpbGwtYm94LnRwbC5odG1sIiwicGFnZXMvc2VnbWVudC1idWlsZGVyL2RpcmVjdGl2ZXMvc2Itc2VxdWVuY2UtcGlsbC50cGwuaHRtbCIsInBhZ2VzL3NlZ21lbnQtYnVpbGRlci9kaXJlY3RpdmVzL3NlZ21lbnQtYnVpbGRlci50cGwuaHRtbCIsInBhZ2VzL3NlZ21lbnQtYnVpbGRlci92aWV3cy9tYWluLnRwbC5odG1sIl0sIm5hbWVzIjpbImFuZ3VsYXIiLCJtb2R1bGUiLCJjb25maWciLCJlbWJlZCIsIiRyb3V0ZVByb3ZpZGVyIiwicnVuIiwiJHJvb3RTY29wZSIsIkRyYWdQcm94eSIsImFwcENhY2hlIiwic2hvdWxkQ29uZmlnIiwiaW1wb3J0Iiwic2VnbWVudGFibGUiLCJpbmNsdWRlVHlwZSIsInNob3dMZWZ0UmFpbCIsIml0ZW1Db3VudENsYXNzIiwiaXRlbUxheWVyQ2xhc3MiLCJkaXJlY3RpdmUiLCIkdGltZW91dCIsInJlc3RyaWN0IiwicmVwbGFjZSIsInRlbXBsYXRlVXJsIiwibGluayIsInNjb3BlIiwiZWxlbWVudCIsImF0dHJzIiwiY29udGV4dExpc3QiLCJldmVudEJ1cyIsIiR3aW5kb3ciLCJQb3BvdmVyIiwiYW5hbHl0aWNzdWkiLCJvbkNvbnRleHRJdGVtQ2xpY2siLCJvcHRpb24iLCJkYXRhTW9kZWwiLCJjb250ZXh0IiwidmFsdWUiLCJjbG9zZSIsImdldCIsInB1Ymxpc2giLCIkd2F0Y2giLCJjdXJyZW50Q29udGV4dEl0ZW0iLCJnZXRCeUlkIiwiJCIsIiRmaWx0ZXIiLCJkZWZpbml0aW9uUGFyc2VyIiwiRHJhZ01hbmFnZXIiLCJjb21wYXJpc29uVHlwZXMiLCJfIiwiJGNvbXBpbGUiLCJnZWFyUG9wb3ZlcklkIiwidW5pcXVlSWQiLCJjb250ZXh0UG9wb3ZlcklkIiwicHJlZml4U3VmZml4UG9wb3ZlcklkIiwiY29sbGFwc2VkIiwic2VsZWN0ZWRJdGVtcyIsInJlbmFtaW5nIiwiYWREcmFnZ2FibGUiLCJkcmFnZ2FibGVNb2RlbCIsImRyYWdTdGFydFRocmVzaG9sZCIsImRyYWdQcm94eU9wYWNpdHkiLCJjdXN0b21EcmFnUHJveHkiLCJqb2luIiwiZHJhZ2dhYmxlQXJlYSIsImFkZENsYXNzIiwiZ2V0Q2xhc3NMZXZlbCIsImNyZWF0ZVN1Ykdyb3VwIiwiaXRlbXMiLCJwdXNoIiwiZW1wdHlDb250YWluZXJNb2RlbCIsImNyZWF0ZVN1Ykdyb3VwRnJvbVNlbGVjdGlvbiIsIm5ld0NvbnRhaW5lciIsIm5ld0NvbnRhaW5lcklkeCIsImxlbmd0aCIsImxvZ2ljYWxPcGVyYXRvciIsImZvckVhY2giLCJpdGVtIiwiaXRlbUlkeCIsImluQXJyYXkiLCJNYXRoIiwibWluIiwic3BsaWNlIiwic2VsZWN0ZWQiLCJzZWxlY3RlZERyYWdnYWJsZXMiLCJkZWxldGVDb250YWluZXIiLCJ0cmlnZ2VyIiwibmFtZUNvbnRhaW5lciIsImZpbmQiLCJmb2N1cyIsImdldE5hbWUiLCJuYW1lIiwiZ2V0RGVycml2ZWROYW1lIiwiaGFzT3BlcmF0b3IiLCJ2YWx1ZWxlc3NDb21wYXJpc29uVHlwZXMiLCJTZXQiLCJpc1ZhbHVlbGVzc0NvbXBhcmlzb25UeXBlIiwiY29tcGFyaXNvblR5cGUiLCJoYXMiLCJkZXJyaXZlZE5hbWUiLCJwdXJwb3NlIiwiZ2V0S2V5VmFsdWUiLCJ2YWx1ZWlzTmFuIiwidiIsIm51bUNvbGxhcHNpYmxlUGFyZW50cyIsInBhcmVudHMiLCJqUXVlcnkiLCJhcHBNb2RlbCIsImNhbGVuZGFyTG9jYWxlQ29uZmlnIiwibW9tZW50IiwidGVtcGxhdGUiLCJkYXRlU3RyaW5nIiwiZGF0ZUNoYW5nZSIsInJhbmdlVHlwZSIsImNvbXBpbGUiLCJwcmUiLCJpbml0IiwiZGF0ZVN0ciIsIm1pbnV0ZXMiLCJ0b0lTT1N0cmluZyIsImRhdGVUeXBlIiwiZGlzYWJsZU1pbnV0ZXMiLCJhcHBlbmQiLCJtaW5Cb3VuZCIsInJlcG9ydFN1aXRlIiwiYXhsZUNvbmZpZyIsImF4bGVTdGFydCIsInN1YnRyYWN0Iiwic3RhcnRPZiIsImVuZE9mIiwicG9zdCIsIm9uIiwiZXZlbnQiLCJzdG9wUHJvcGFnYXRpb24iLCIkb24iLCJvbkRhdGVDaGFuZ2UiLCJuZXdEYXRlU3RyaW5nIiwib25EYXRlQmx1ckhpZGUiLCJvblJhbmdlQ2hhbmdlIiwibmV3RGF0ZVJhbmdlU3RyaW5nIiwidG9wSXRlbXNTZXJ2aWNlIiwiY29udHJvbGxlciIsIiRzY29wZSIsIiRlbGVtZW50IiwiZWxlbWVudHMiLCJsb2FkaW5nRWxlbWVudHMiLCJzZWxlY3RlZEVsZW1lbnQiLCJzZWFyY2hUZXh0IiwiY2xpY2tUb1VzZUxhYmVsVGV4dCIsImFkZE5ld0l0ZW1UZXh0S2V5IiwidHlwZSIsImxvYWRFbGVtZW50cyIsImdldFRvcEl0ZW1zIiwiZGltZW5zaW9uIiwiaWQiLCJsaW1pdCIsInNlYXJjaCIsInRoZW4iLCJyZXNwb25zZSIsInJvd3MiLCJlbG0iLCJlcnJvciIsInRhcmdldCIsInRhZ05hbWUiLCJwcmV2ZW50RGVmYXVsdCIsInNob3dBdXRvQ29tcGxldGVEcm9wZG93biIsImV4cGFuZERyb3Bkb3duTGlzdCIsImV4Y2x1ZGVkRHJvcGRvd25TdHJpbmdWYWx1ZXMiLCIkYnJvYWRjYXN0IiwiZGlzcGF0Y2hFdmVudCIsIkN1c3RvbUV2ZW50Iiwib25JbnB1dEJsdXIiLCJlZGl0aW5nIiwib2ZmIiwib25Ecm9wZG93blRleHRDaGFuZ2UiLCJ0ZXh0Iiwib25TZWxlY3RlZEVsZW1lbnRDaGFuZ2UiLCJlbnVtVmFsdWUiLCJvblRleHRJbnB1dENsaWNrIiwiY29tbWl0VGV4dElucHV0IiwiaW5kZXhPZiIsImlucHV0RWxtIiwiZ2V0SW5wdXRFbGVtZW50Iiwib25FbGVtZW50Q2xpY2siLCJoYXNDbGFzcyIsImNvbW1pdE51bWJlcklucHV0IiwiZGltZW5zaW9uU2VydmljZSIsIlByZXZpZXciLCJEYXRlUmFuZ2UiLCJkaXNhYmxlUnVsZSIsImNvbXBhcmlzb25UeXBlc0xpc3QiLCJnZXRDb21wYXJpc29uQXJyYXlGb3JEYXRhTW9kZWwiLCJnZXRSYW5nZVR5cGVGcm9tRGltZW5zaW9uSWQiLCJkcmFnZ2FibGVPcHRpb25zIiwiZGVwcmVjYXRlZCIsInJlbW92ZSIsInJlbW92ZUl0ZW0iLCJvbkl0ZW1DbGljayIsInNlbGVjdCIsInRvZ2dsZUl0ZW1TZWxlY3Rpb24iLCJvblZhbHVlTGFiZWxDbGljayIsImNsaWNrT3V0c2lkZURyYWdnYWJsZVJ1bGUiLCJoaWRlVUlTZWxlY3RvciIsImRpc3BsYXlWYWx1ZUxhYmVsIiwibnVsbE9wdGlvblNlbGVjdGVkIiwiZGlzcGxheVZhbHVlU2VsZWN0b3IiLCJvbkNvbXBhcmlzb25UeXBlQ2hhbmdlIiwibmV3VmFsdWUiLCJnZXRDb21wYXJpc29uVHlwZSIsInNob3dEYXRlUmFuZ2VQcmV2aWV3IiwiZSIsInNob3ciLCJzZWdtZW50RGVmaW5pdGlvblNlcnZpY2UiLCJMT0dJQ0FMX09QRVJBVE9SX1NFUVVFTkNFIiwiQ09OVEVYVF9WSVNJVE9SUyIsIkNPTlRFWFRfTE9HSUNfR1JPVVAiLCJzcGlubmVyU2VydmljZSIsInZpcnR1YWxEcm9wVGFyZ2V0U2VydmljZSIsInRyYWNrU2VydmljZSIsImN1cnJlbnREcm9wSW5kaWNhdG9yTW9kZWwiLCJzaG93RHJhZ1Byb3h5Iiwib25EcmFnRW50ZXIiLCJsb2NhbFB0IiwicHJldmVudERyYWdEcm9wIiwib25EcmFnT3ZlciIsImlzRHJhZ0Ryb3BQcmV2ZW50ZWQiLCJ1cGRhdGVEcm9wSW5kaWNhdG9yIiwiY3RybEtleSIsIm1ldGFLZXkiLCJzZXREcmFnQ3Vyc29yIiwib25EcmFnRHJvcCIsImlzQXJyYXkiLCJjb3B5RHJhZ2dhYmxlQXJyYXkiLCJjb3B5RHJhZ2dhYmxlIiwibW92ZURyYWdnYWJsZUFycmF5IiwidHJhY2tEcmFnRHJvcCIsIml0ZW1UeXBlIiwiZHJvcElkeCIsImdldERyb3BJbmRleCIsImxvYWRDb25zdW1hYmxlRGVmaW5pdGlvbiIsImhpZGUiLCJzZWdtZW50RGVmIiwiY29weSIsImNvbnN1bWFibGVEZWZpbml0aW9uIiwiYWRkSXRlbUF0IiwiZXJyb3JzIiwiZGlzcGxheURyb3BJbmRpY2F0b3JUb3AiLCJkaXNwbGF5RHJvcEluZGljYXRvckJvdHRvbSIsInNlcXVlbmNlQ29udGFpbmVyVHlwZSIsIm1vZGVsIiwiZ2V0RGVmYXVsdENvbXBhcmlzb25UeXBlIiwibW92ZURyYWdnYWJsZSIsImRyYWdnYWJsZUl0ZW0iLCJ1cGRhdGVTZWxlY3RlZEl0ZW1zIiwiaGlkZURyb3BJbmRpY2F0b3IiLCJvbkRyYWdMZWF2ZSIsIm9uRHJhZ0Ryb3BPdXRzaWRlIiwiZG0iLCJjdXJyZW50SWR4IiwiZ2V0Q3VycmVudEluZGV4IiwicmVtb3ZlRHJvcEluZGljYXRvciIsImRyYWdnYWJsZUFycmF5IiwiaSIsInJlbW92ZUl0ZW1BdEluZGV4IiwicmVtb3ZlRHJhZ2dhYmxlUnVsZSIsImRyb3BJbmRpY2F0b3JzIiwiY2hpbGRyZW4iLCJ5UG9zIiwiZHJvcEluZGljYXRvciIsImRyb3BJbmRpY2F0b3JNb2RlbCIsIm5leHREcm9wSW5kaWNhdG9yTW9kZWwiLCJkcm9wSW5kaWNhdG9yUmVjdCIsIngiLCJ5Iiwid2lkdGgiLCJoZWlnaHQiLCJpc1BvaW50SW5SZWN0IiwiYWRkRHJvcEluZGljYXRvclRvcCIsImFkZERyb3BJbmRpY2F0b3JCb3R0b20iLCJvbkxvZ2ljYWxPcGVyYXRvckNoYW5nZSIsInRoZW5EYXRhIiwiZGF0YSIsIm9yaWdpbmFsRXZlbnQiLCJkZWZhdWx0UHJldmVudGVkIiwic2VsZWN0ZWRJdGVtIiwiaWR4IiwiaXNOdW1lcmljIiwiZGVsZXRlQ291bnQiLCJ0cmFja0FjdGlvbiIsIml0ZW1OYW1lIiwiaXRlbUlkIiwiZ2Vhck9wdGlvbnMiLCJHRUFSX05FV19TVUJfR1JPVVAiLCJHRUFSX0RFTEVURSIsIkdFQVJfTkFNRSIsIkdFQVJfSU5DTFVERSIsIkdFQVJfTkVXX1NVQl9HUk9VUF9GUk9NX1NFTEVDVElPTiIsIkdFQVJfU0VUX1RJTUVfRlJBTUUiLCJHRUFSX0VYQ0xVREUiLCJLZXlzIiwib3B0aW9ucyIsImV4Y2x1ZGUiLCJvcHRpb25GaWx0ZXIiLCJ1bndhdGNoIiwic2VsZWN0ZWRJdGVtTGVuZ3RoIiwiJHdhdGNoQ29sbGVjdGlvbiIsInNlcXVlbmNlQ29udGFpbmVyVHlwZXMiLCJwcmVmaXhTdWZmaXhMaXN0IiwibGlzdCIsIm9uUHJlZml4U3VmZml4SXRlbUNsaWNrIiwib2xkVHlwZSIsImN1cnJlbnRQcmVmaXhTdWZmaXhJdGVtIiwib25Ub3BMZXZlbENvbnRhaW5lckNoYW5nZSIsInVud2F0Y2hEYXRhTW9kZWwiLCJleGNsdWRlTmFtZSIsImV4Y2x1ZGVEZWxldGUiLCJsb2dpY2FsT3BlcmF0b3JzIiwibG9naWNhbE9wZXJhdG9yTGlzdCIsInNlcXVlbmNlU2VsZWN0b3JQb3BvdmVySWQiLCJzZXRBY3RpdmVTdGF0ZSIsImhpZGVBZnRlcldpdGhpblBvcG92ZXIiLCJhZnRlckNsaWNrSGFuZGxlciIsImFmdGVyVGltZVJlc3RyaWN0aW9uIiwiY291bnQiLCJ1bml0Iiwid2l0aGluQ2xpY2tIYW5kbGVyIiwid2l0aGluVGltZVJlc3RyaWN0aW9uIiwicmVtb3ZlQWZ0ZXJQaWxsIiwicmVtb3ZlV2l0aGluUGlsbCIsImRpc3BsYXlTZXF1ZW5jZVB1bGxkb3duIiwidGltZVJlc3RyaWN0aW9uc09wZXJhdG9ycyIsImwxMG5Db25maWciLCJsYWJlbCIsImNvdW50QnV0dG9uQWN0aXZlIiwic2VxdWVuY2VOdW1iZXJJbnB1dFBvcG92ZXJJZCIsImlzSmFwYW5lc2UiLCJjdXJyZW50TG9jYWxlIiwib25UaW1lVW5pdENoYW5nZSIsInBvcG92ZXIiLCJudW1iZXJpbnB1dCIsImJsdXIiLCJjbnQiLCJwYXJzZUludCIsImlzTmFOIiwiaGlkZUNvdW50UG9wb3ZlciIsImFuYWx5dGljc0NvbmZpZyIsIiRxIiwiJGRvY3VtZW50IiwiJGxvY2F0aW9uIiwidXNlciIsImFhbVNlcnZpY2UiLCJjYWxsYmFja1JlZ2lzdHJ5U2VydmljZSIsInRhZ1JlcG9zaXRvcnkiLCJ1dGlsIiwic2VnbWVudFN1bW1hcnlWaWV3U3RhdGUiLCJhcHBEZWZhdWx0cyIsImN1c3RvbUNhbGxiYWNrRXhlY3V0b3IiLCJzY1VybCIsIlZyc0NvbXBvbmVudFNhdmVVdGlsIiwiVGFnIiwiRGlhbG9nIiwiT21lZ2FUcmFjayIsImVtYmVkZGVkIiwiZGVmaW5pdGlvbiIsImVkaXRJZCIsImRhdGVSYW5nZSIsInBhc3RlSWQiLCJzdGF0ZSIsIiRhdHRycyIsInNiU3Bpbm5lcklkIiwiY29udHJvbE9iamVjdCIsImNhblNhdmUiLCJjYW5TYXZlQXMiLCJhbGVydHMiLCJpbml0aWFsaXppbmciLCJkcmFnTWFuYWdlciIsImRyYWdnaW5nIiwic2VnbWVudFNlcnZpY2UiLCJjdXJyZW50UmVwb3J0U3VpdGVOYW1lIiwidGFncyIsImNsaWNrVG9BZGROZXdJdGVtTGFiZWwiLCJSU0lERmlsdGVyIiwic2VnbWVudHMiLCJjYWxsYmFja0tleSIsImZldGNoQ2FsbGJhY2tQYXJhbXMiLCJpbml0RGF0YSIsInBhZ2VMb2FkVHlwZSIsImhlYWRlckNvbmZpZyIsInRpdGxlIiwibG9hZFNlZ21lbnQiLCJzZWdtZW50IiwiaW5pdFNlZ21lbnQiLCJjYXRjaCIsInNldCIsImV4dGVuZCIsInJzaWQiLCJkd0luVXNlIiwiYWRkQWxlcnQiLCJ2YXJpYW50IiwiYXV0b0hpZGUiLCJjbG9zYWJsZSIsImNvbnRlbnRzIiwiYXNpSW5Vc2UiLCJzZXR1cEFhbVVpRWxlbWVudHMiLCJpbml0aWFsbHlJc0ludGVybmFsIiwiaW50ZXJuYWwiLCJsb29rYmFja1ZhbHVlIiwiYWFtU3RhdHVzIiwiaW5mbyIsImF1ZGllbmNlUHJlc2V0V2luZG93IiwicHJlc2V0cyIsImluVXNlIiwidGV4dFNpbmd1bGFyIiwidGV4dFBsdXJhbCIsInB1Ymxpc2hlZCIsImNhblNoYXJlVG9NQyIsInNoYXJlZFRvTUMiLCJhYW1TdGF0dXNGb3JDdXJyZW50UnNpZCIsImFhbUNvbmZpZ3VyZWQiLCJyZXN1bHQiLCJoYXNQZXJtaXNzaW9uRm9yUnNpZCIsInBlcm1pc3Npb25zIiwic2VnbWVudENyZWF0aW9uIiwiY2FuU2F2ZVNlZ21lbnQiLCJpc0FkbWluIiwib3duZXIiLCJjYW5EZWxldGVTZWdtZW50Iiwic2hvd1NhdmVQcm9tcHQiLCJ2aXJ0dWFsUmVwb3J0U3VpdGVzIiwiY29uZmlybUxhYmVsIiwiY29uZmlybSIsInNhdmVTZWdtZW50IiwiZW5oYW5jZVNhdmVGdW5jdGlvbiIsImxvYWRpbmdTZWdtZW50U3VtbWFyeSIsInByb21pc2UiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInVuYmluZFdhdGNoIiwiYXhsZVN1cHBvcnRlZCIsImRlc2NyaXB0aW9uIiwiaXNWYWxpZCIsImNvcGllZFNlZ21lbnQiLCJzZWxlY3RlZFRhZ09iamVjdHMiLCJmaWx0ZXIiLCJ0YWciLCJzZWxlY3RlZFRhZ3MiLCJwbHVja01hcCIsImRhdGFNb2RlbFRvRGVmaW5pdGlvbiIsIm1hcCIsImZyb21KU09OIiwidXBkYXRlQWFtU3RhdHVzIiwic2F2ZVR5cGUiLCJzYXZlQXMiLCJoYXNEZXNjcmlwdGlvbiIsImhhc1RhZ3MiLCJzaGFyZWRUb01hcmtldGluZ0Nsb3VkIiwiaXRlbUNvdW50IiwiZGVmaW5pdGlvbkl0ZW1Db3VudCIsInRyYWNrRXZlbnQiLCJhY3Rpb24iLCJ3aWRnZXQiLCJhdHRyaWJ1dGVzIiwiZmVhdHVyZSIsInJlcG8iLCJzYXZlIiwibm90aWZ5U2F2ZWQiLCJyZXR1cm5Ub0FwcHJvcHJpYXRlTG9jYXRpb24iLCJzYXZlU2VnbWVudEFzIiwidW5kZWZpbmVkIiwicnNpZExvY2F0aW9uIiwibG9va2JhY2tHcmFudWxhcml0eSIsIiRlbWl0IiwidXBkYXRlT3duZXJBbmRDYWNoZUFuZENvbGxlY3Rpb25zQW5kUmVsZXZhbmN5IiwidXBkYXRlSXRlbSIsImRlbGV0ZVNlZ21lbnQiLCJjb25maXJtTWVzc2FnZSIsImRlbGV0ZSIsImNhbmNlbCIsImFjdGlvblR5cGUiLCJkZWZhdWx0Q2FsbGJhY2tVcmwiLCJzcGFzIiwiY2FsbGJhY2tQYXJhbXMiLCJleGVjdXRlIiwicmVtb3ZlQWxlcnQiLCJpbmRleCIsImxvYWRUYWdzIiwibG9hZGluZ1RhZ3MiLCJxdWVyeSIsInVuYmluZFdhdGNoZXIiLCJzZWxlY3RlZFRhZ0lkcyIsInRvZ2dsZVNlZ21lbnRQcmV2aWV3IiwiY3VycmVudFRhcmdldCIsInRvZ2dsZU1ldHJpY1ByZXZpZXciLCJtZXRyaWMiLCJ0b2dnbGVEaW1lbnNpb25QcmV2aWV3IiwiaXNEZWZpbmVkIiwiZGVlcENvdW50IiwiYWRvYmUiLCJ0b29scyIsImV4cG9ydFNlZ21lbnREZWZpbml0aW9uIiwidG9KU09OIiwiZGVmIiwiSlNPTiIsInN0cmluZ2lmeSIsImdlYXJGaWx0ZXIiLCJuYW1lQ29udGFpbmVyU3RyaW5nIiwiJHJvdXRlUGFyYW1zIiwiZmFjdG9yeSIsIiRodHRwIiwiY2IiLCJtZXRob2QiLCJ1cmwiLCJhcHBTZXJ2aWNlIiwiYmFzZVVSTCIsInBhcmFtcyIsImxvY2FsZSIsInN1Y2Nlc3MiLCJnZXREZXN0aW5hdGlvblVybCIsImRlc3RpbmF0aW9uVXJsIiwibmV3U2VnbWVudExpc3QiLCJleGlzdGluZ1NlZ21lbnRzIiwiZGVzdGluYXRpb25QYXJhbXMiLCJnZXRRdWVyeVBhcmFtcyIsImtleSIsImpwaiIsInNzU2Vzc2lvbiIsInJwIiwiZnMiLCJhIiwiaGFzT3duUHJvcGVydHkiLCJkZXN0aW5hdGlvbkhhc2hQYXJhbXMiLCJnZXRIYXNoUGFyYW1zIiwic2VsZWN0ZWRTZWdtZW50SWRzIiwiYXBwZW5kRnJhZ21lbnQiLCJhcHBlbmRIYXNoUGFyYW1zIiwib2JqIl0sIm1hcHBpbmdzIjoiQUFBQTs7QUFDQUEsUUFBQUMsTUFBQSxDQUFBLGlCQUFBLEVBQUEsQ0FBQSxRQUFBLEVBQUEsU0FBQSxDQUFBLEVB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QURBO0FBRUFSLFVBQUFtUTtBQUZBLEdBTEEsRUFTQTtBQUNBb0MsVUFBQS9SLFFBQUEsTUFBQSxFQUFBLENBQUEsa0JBQUEsRUFBQSxTQUFBLENBQUEsQ0FEQTtBQUVBUixVQUFBcVE7QUFGQSxHQVRBLEVBYUE7QUFDQWtDLFVBQUEvUixRQUFBLE1BQUEsRUFBQSxDQUFBLGtCQUFBLEVBQUEsU0FBQSxDQUFBLENBREE7QUFFQVIsVUFBQWtRO0FBRkEsR0FiQSxFQWlCQTtBQUNBcUMsVUFBQS9SLFFBQUEsTUFBQSxFQUFBLENBQUEsbUJBQUEsRUFBQSxnQkFBQSxDQUFBLENBREE7QUFFQVIsVUFBQWlRO0FBRkEsR0FqQkEsRUFxQkE7QUFDQXNDLFVBQUEvUixRQUFBLE1BQUEsRUFBQSxDQUFBLHFCQUFBLEVBQUEsa0JBQUEsQ0FBQSxDQURBO0FBRUFSLFVBQUFnUTtBQUZBLEdBckJBLENBREE7O0FBNEJBMVAsV0FBQSxpQkFBQStHLEVBQUEsRUFBQTtBQUNBLE9BQUE4WCxHQUFBO0FBQ0EsUUFBQS9QLElBQUEsQ0FBQTdNLE9BQUEsQ0FBQSxVQUFBQyxJQUFBLEVBQUE7QUFDQSxRQUFBQSxLQUFBeEMsS0FBQSxJQUFBcUgsRUFBQSxFQUFBO0FBQ0E4WCxXQUFBM2MsSUFBQTtBQUNBO0FBQ0EsSUFKQTtBQUtBLFVBQUEyYyxHQUFBO0FBQ0E7QUFwQ0EsRUFBQTtBQXNDQSxDQXpDQTttRkNEQTtBQ0FBO0FDQUE7QUNBQTtBQ0FBO0FDQUE7QUNBQTtBQ0FBO0FDQUE7QUNBQTtBQ0FBO0FDQUE7QUNBQTtBQ0FBO0FDQUEiLCJmaWxlIjoic2VnbWVudC1idWlsZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuYW5ndWxhci5tb2R1bGUoJ3NlZ21lbnQtYnVpbGRlcicsIFsnY29tbW9uJywgJ25nUm91dGUnXSlcblx0LmNvbmZpZyhmdW5jdGlvbihlbWJlZCwgJHJvdXRlUHJvdmlkZXIpe1xuXG5cblx0fSlcblx0LnJ1bihmdW5jdGlvbihlbWJlZCwgJHJvb3RTY29wZSwgRHJhZ1Byb3h5LCBhcHBDYWNoZSl7XG5cblx0XHRpZiAoZW1iZWQuc2hvdWxkQ29uZmlnKCdzZWdtZW50LWJ1aWxkZXInKSkge1xuXHRcdFx0YXBwQ2FjaGUuaW1wb3J0KCdkZWZhdWx0LWRlZmluaXRpb25zJyk7XG5cblx0XHRcdGFwcENhY2hlLmNvbmZpZygnZGltZW5zaW9ucycsIHtzZWdtZW50YWJsZTogdHJ1ZX0pO1xuXHRcdFx0YXBwQ2FjaGUuY29uZmlnKCdtZXRyaWNzJywge3NlZ21lbnRhYmxlOiB0cnVlLCBpbmNsdWRlVHlwZTogJ2J1aWxkZXJPbmx5J30pO1xuXG5cdFx0XHRhcHBDYWNoZS5jb25maWcoJ3NlZ21lbnRzJywge1xuXHRcdFx0XHRpbmNsdWRlVHlwZTogJ3NoYXJlZCx0ZW1wbGF0ZXMnXHQvKiBvbmx5IGdldCBzZWdtZW50cyB0aGF0IHlvdSBvd24gb3IgaGF2ZSBiZWVuIHNoYXJlZCB3aXRoIHlvdSwgYW5kIHRlbXBsYXRlcyAqL1xuXHRcdFx0fSk7XG5cblx0XHRcdC8vU2V0IHRoZSBsZWZ0IHJhaWwgb3BlbiBieSBkZWZhdWx0LlxuXHRcdFx0JHJvb3RTY29wZS5zaG93TGVmdFJhaWwgPSB0cnVlO1xuXG5cdFx0XHREcmFnUHJveHlcblx0XHRcdFx0Lml0ZW1Db3VudENsYXNzKCdkcmFnLXByb3h5LWl0ZW0tY291bnQnKVxuXHRcdFx0XHQuaXRlbUxheWVyQ2xhc3MoJ2RyYWctcHJveHktaXRlbS1sYXllcicpO1xuXHRcdH1cblxuXHR9KTtcbiIsIlxuYW5ndWxhci5tb2R1bGUoJ3NlZ21lbnQtYnVpbGRlcicpXG5cdC5kaXJlY3RpdmUoJ3NiQWN0aW9uQmFyJywgZnVuY3Rpb24gKCR0aW1lb3V0KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0cmVwbGFjZTogdHJ1ZSxcblx0XHRcdHRlbXBsYXRlVXJsOiAnZGlyZWN0aXZlcy9zYi1hY3Rpb24tYmFyLnRwbC5odG1sJyxcblx0XHRcdGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcblx0XHRcdFx0XG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7XG4iLCJpbXBvcnQge1xuXHRQb3BvdmVyXG59IGZyb20gJ3VpLWNvcmUnXG5cbmFuZ3VsYXIubW9kdWxlKCdzZWdtZW50LWJ1aWxkZXInKVxuXHQuZGlyZWN0aXZlKCdzYkNvbnRleHRQb3BvdmVyJywgZnVuY3Rpb24gKGNvbnRleHRMaXN0LCBldmVudEJ1cywgJHdpbmRvdykge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZXMvc2ItY29udGV4dC1wb3BvdmVyLnRwbC5odG1sJyxcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0cmVwbGFjZTogdHJ1ZSxcblx0XHRcdGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcblx0XHRcdFx0c2NvcGUub25Db250ZXh0SXRlbUNsaWNrID0gZnVuY3Rpb24ob3B0aW9uKXtcblx0XHRcdFx0XHRzY29wZS5kYXRhTW9kZWwuY29udGV4dCA9IG9wdGlvbi52YWx1ZTtcblx0XHRcdFx0XHRQb3BvdmVyLmNsb3NlKGVsZW1lbnQuZ2V0KDApKTtcblx0XHRcdFx0XHRldmVudEJ1cy5wdWJsaXNoKCd1cGRhdGVWYWxpZGF0aW9uQXJlYScpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdC8vQWNjb3VudCBmb3IgY2hhbmdpbmcgdGhlIGNvbnRleHQgZXh0ZXJuYWxseS5cblx0XHRcdFx0c2NvcGUuJHdhdGNoKCdkYXRhTW9kZWwuY29udGV4dCcsIGZ1bmN0aW9uKGNvbnRleHQpe1xuXHRcdFx0XHRcdHNjb3BlLmN1cnJlbnRDb250ZXh0SXRlbSA9IGNvbnRleHRMaXN0LmdldEJ5SWQoY29udGV4dCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH07XG5cdH0pO1xuIiwiKGZ1bmN0aW9uKCQpe1xuYW5ndWxhci5tb2R1bGUoJ3NlZ21lbnQtYnVpbGRlcicpXG5cdC5kaXJlY3RpdmUoJ3NiRGVmaW5pdGlvbkNvbnRhaW5lcicsIGZ1bmN0aW9uICgkZmlsdGVyLCAkdGltZW91dCwgZGVmaW5pdGlvblBhcnNlciwgRHJhZ01hbmFnZXIsIGNvbXBhcmlzb25UeXBlcywgXywgJGNvbXBpbGUpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdkaXJlY3RpdmVzL3NiLWRlZmluaXRpb24tY29udGFpbmVyLnRwbC5odG1sJyxcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0cmVwbGFjZTogdHJ1ZSxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdGRhdGFNb2RlbDogJz1tb2RlbCdcblx0XHRcdH0sXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG5cdFx0XHRcdHNjb3BlLmdlYXJQb3BvdmVySWQgPSBfLnVuaXF1ZUlkKCdnZWFyUG9wb3ZlcklkXycpO1xuXHRcdFx0XHRzY29wZS5jb250ZXh0UG9wb3ZlcklkID0gXy51bmlxdWVJZCgnY29udGV4dFBvcG92ZXJJZF8nKTtcblx0XHRcdFx0c2NvcGUucHJlZml4U3VmZml4UG9wb3ZlcklkID0gXy51bmlxdWVJZCgncHJlZml4U3VmZml4UG9wb3ZlcklkXycpO1xuXG5cdFx0XHRcdHNjb3BlLmNvbGxhcHNlZCA9IGZhbHNlO1xuXHRcdFx0XHRzY29wZS5zZWxlY3RlZEl0ZW1zID0gW107XG5cdFx0XHRcdHNjb3BlLnJlbmFtaW5nID0gZmFsc2U7XG5cblx0XHRcdFx0ZWxlbWVudC5hZERyYWdnYWJsZSh7XG5cdFx0XHRcdFx0ZHJhZ2dhYmxlTW9kZWw6IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuZGF0YU1vZGVsO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZHJhZ1N0YXJ0VGhyZXNob2xkOiA1LFxuXHRcdFx0XHRcdGRyYWdQcm94eU9wYWNpdHk6IDAuODUsXG5cdFx0XHRcdFx0Y3VzdG9tRHJhZ1Byb3h5OiAkKFtcblx0XHRcdFx0XHRcdCc8ZGl2IGNsYXNzPVxcJ3NiLWRlZmluaXRpb24tY29udGFpbmVyIGRyYWctcHJveHlcXCcgc3R5bGU9XFwnaGVpZ2h0OjIwcHg7XFwnPicsXG5cdFx0XHRcdFx0XHQnXHQ8YSBjbGFzcz1cIndpdGhMYWJlbCBjb2xsYXBzaWJsZS1idXR0b24gaWNvbi1hY2NvcmRpb25kb3duXCIgPjwvYT4nLFxuXHRcdFx0XHRcdFx0J1x0PGEgY2xhc3M9XCJpY29uLWdlYXIgcmlnaHRcIiA+PC9hPicsXG5cdFx0XHRcdFx0XHQnPC9kaXY+J1xuXHRcdFx0XHRcdF0uam9pbignJykpLFxuXHRcdFx0XHRcdGRyYWdnYWJsZUFyZWE6ICcuZHJhZ2dhYmxlLWhlYWRlcidcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0ZWxlbWVudC5hZGRDbGFzcyhnZXRDbGFzc0xldmVsKCkpO1xuXG5cdFx0XHRcdHNjb3BlLmNyZWF0ZVN1Ykdyb3VwID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRzY29wZS5kYXRhTW9kZWwuaXRlbXMucHVzaChkZWZpbml0aW9uUGFyc2VyLmVtcHR5Q29udGFpbmVyTW9kZWwoc2NvcGUuZGF0YU1vZGVsKSk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0c2NvcGUuY3JlYXRlU3ViR3JvdXBGcm9tU2VsZWN0aW9uID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHR2YXIgbmV3Q29udGFpbmVyID0gZGVmaW5pdGlvblBhcnNlci5lbXB0eUNvbnRhaW5lck1vZGVsKCksXG5cdFx0XHRcdFx0XHRuZXdDb250YWluZXJJZHggPSBzY29wZS5kYXRhTW9kZWwuaXRlbXMubGVuZ3RoO1xuXG5cdFx0XHRcdFx0bmV3Q29udGFpbmVyLmNvbnRleHQgPSBzY29wZS5kYXRhTW9kZWwuY29udGV4dDtcblx0XHRcdFx0XHRuZXdDb250YWluZXIubG9naWNhbE9wZXJhdG9yID0gc2NvcGUuZGF0YU1vZGVsLmxvZ2ljYWxPcGVyYXRvcjtcblxuXHRcdFx0XHRcdHNjb3BlLnNlbGVjdGVkSXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKXtcblx0XHRcdFx0XHRcdHZhciBpdGVtSWR4ID0gJC5pbkFycmF5KGl0ZW0sIHNjb3BlLmRhdGFNb2RlbC5pdGVtcyk7XG5cdFx0XHRcdFx0XHRpZiAoaXRlbUlkeCAhPT0gLTEpe1xuXHRcdFx0XHRcdFx0XHRuZXdDb250YWluZXJJZHggPSBNYXRoLm1pbihuZXdDb250YWluZXJJZHgsIGl0ZW1JZHgpO1xuXG5cdFx0XHRcdFx0XHRcdC8vcmVtb3ZlIHRoZSBpdGVtIGZyb20gdGhlIGN1cnJlbnQgYXJyYXkuXG5cdFx0XHRcdFx0XHRcdHNjb3BlLmRhdGFNb2RlbC5pdGVtcy5zcGxpY2UoaXRlbUlkeCwgMSk7XG5cblx0XHRcdFx0XHRcdFx0Ly9yZW1vdmUgdGhlIHNlbGVjdGVkIHN0YXRlXG5cdFx0XHRcdFx0XHRcdGl0ZW0uc2VsZWN0ZWQgPSBmYWxzZTtcblxuXHRcdFx0XHRcdFx0XHQvL0FkZCB0aGUgaXRlbSB0byB0aGUgbmV3IGFycmF5LlxuXHRcdFx0XHRcdFx0XHRuZXdDb250YWluZXIuaXRlbXMucHVzaChpdGVtKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdC8vTm93IGFkZCB0aGUgbmV3IGNvbnRhaW5lciB3aXRoIHRoZSBpdGVtcyB0byB0aGUgaXRlbXMgYXJyYXkgYXQgdGhlIGFwcHJvcHJpYXRlIGluZGV4LlxuXHRcdFx0XHRcdHNjb3BlLmRhdGFNb2RlbC5pdGVtcy5zcGxpY2UobmV3Q29udGFpbmVySWR4LCAwLCBuZXdDb250YWluZXIpO1xuXG5cdFx0XHRcdFx0Ly9VcGRhdGUgdGhlIGZpbHRlcmVkIGl0ZW1zLlxuXHRcdFx0XHRcdHNjb3BlLnNlbGVjdGVkSXRlbXMgPSBEcmFnTWFuYWdlci5zZWxlY3RlZERyYWdnYWJsZXMgPSAkZmlsdGVyKCdmaWx0ZXInKShzY29wZS5kYXRhTW9kZWwuaXRlbXMsIHtzZWxlY3RlZDp0cnVlfSk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0c2NvcGUuZGVsZXRlQ29udGFpbmVyID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRlbGVtZW50LnRyaWdnZXIoJ3JlbW92ZUNvbGxhcHNpYmxlQ29udGFpbmVyJywgW3Njb3BlLmRhdGFNb2RlbF0pO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHNjb3BlLm5hbWVDb250YWluZXIgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdHNjb3BlLnJlbmFtaW5nID0gdHJ1ZTtcblx0XHRcdFx0XHQkdGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0ZWxlbWVudC5maW5kKCcubmFtZS1pbnB1dCcpLmZvY3VzKCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0c2NvcGUuZ2V0TmFtZSA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0aWYgKHNjb3BlLmRhdGFNb2RlbC5uYW1lICE9PSAnJyl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NvcGUuZGF0YU1vZGVsLm5hbWU7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHJldHVybiBzY29wZS5nZXREZXJyaXZlZE5hbWUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHRcdFxuXHRcdFx0XHRzY29wZS5oYXNPcGVyYXRvciA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0cmV0dXJuIHNjb3BlLmRhdGFNb2RlbCAmJiBzY29wZS5kYXRhTW9kZWwuaXRlbXMubGVuZ3RoID4gMTtcblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdGxldCB2YWx1ZWxlc3NDb21wYXJpc29uVHlwZXMgPSBuZXcgU2V0KFsnZXZlbnQtZXhpc3RzJywgJ25vdC1ldmVudC1leGlzdHMnLCAnbm90LWV4aXN0cycsICdleGlzdHMnXSk7XG5cdFx0XHRcdGZ1bmN0aW9uIGlzVmFsdWVsZXNzQ29tcGFyaXNvblR5cGUoY29tcGFyaXNvblR5cGUpIHtcblx0XHRcdFx0XHRyZXR1cm4gdmFsdWVsZXNzQ29tcGFyaXNvblR5cGVzLmhhcyhjb21wYXJpc29uVHlwZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdHNjb3BlLmdldERlcnJpdmVkTmFtZSA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0dmFyIGRlcnJpdmVkTmFtZSA9ICcnLFxuXHRcdFx0XHRcdFx0bG9naWNhbE9wZXJhdG9yID0gc2NvcGUuZGF0YU1vZGVsLmxvZ2ljYWxPcGVyYXRvcjtcblxuXHRcdFx0XHRcdGlmIChsb2dpY2FsT3BlcmF0b3IgPT0gJ3NlcXVlbmNlJyl7XG5cdFx0XHRcdFx0XHRsb2dpY2FsT3BlcmF0b3IgPSAndGhlbic7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c2NvcGUuZGF0YU1vZGVsLml0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXRlbSl7XG5cdFx0XHRcdFx0XHRpZiAoaXRlbS5wdXJwb3NlID09ICdydWxlJyl7XG5cdFx0XHRcdFx0XHRcdGlmIChkZXJyaXZlZE5hbWUgIT09ICcnKXtcblx0XHRcdFx0XHRcdFx0XHRkZXJyaXZlZE5hbWUgKz0gJyAnICsgbG9naWNhbE9wZXJhdG9yICsgJyAnO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGRlcnJpdmVkTmFtZSArPSAnKCcgKyBpdGVtLm5hbWUgKyAnICcgKyBjb21wYXJpc29uVHlwZXMuZ2V0S2V5VmFsdWUoaXRlbS5jb21wYXJpc29uVHlwZSk7XG5cdFx0XHRcdFx0XHRcdGlmICghaXNWYWx1ZWxlc3NDb21wYXJpc29uVHlwZShpdGVtLmNvbXBhcmlzb25UeXBlKSAmJiAhdmFsdWVpc05hbihpdGVtLnZhbHVlKSApIHtcblx0XHRcdFx0XHRcdFx0XHRkZXJyaXZlZE5hbWUgKz0gJyAnICsgaXRlbS52YWx1ZTtcblx0XHRcdFx0XHRcdFx0fSBcblx0XHRcdFx0XHRcdFx0ZGVycml2ZWROYW1lICs9ICcpJztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRyZXR1cm4gZGVycml2ZWROYW1lO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdGZ1bmN0aW9uIHZhbHVlaXNOYW4odikgeyByZXR1cm4gdiAhPT0gdjsgfVxuXG5cdFx0XHRcdGZ1bmN0aW9uIGdldENsYXNzTGV2ZWwoKXtcblx0XHRcdFx0XHR2YXIgbnVtQ29sbGFwc2libGVQYXJlbnRzID0gZWxlbWVudC5wYXJlbnRzKCcuZGVmaW5pdGlvbi1jb250YWluZXInKS5sZW5ndGg7XG5cdFx0XHRcdFx0aWYgKG51bUNvbGxhcHNpYmxlUGFyZW50cyA9PSAxKXtcblx0XHRcdFx0XHRcdHJldHVybiAnbGV2ZWwtdHdvJztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKG51bUNvbGxhcHNpYmxlUGFyZW50cyA9PSAyKXtcblx0XHRcdFx0XHRcdHJldHVybiAnbGV2ZWwtdGhyZWUnO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAobnVtQ29sbGFwc2libGVQYXJlbnRzID09IDMpe1xuXHRcdFx0XHRcdFx0cmV0dXJuICdsZXZlbC1mb3VyJztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKG51bUNvbGxhcHNpYmxlUGFyZW50cyA+PSA0KXtcblx0XHRcdFx0XHRcdHJldHVybiAnbGV2ZWwtZml2ZSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiAnJztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cdH0pO1xufSkoalF1ZXJ5KTtcbiIsIlxuYW5ndWxhci5tb2R1bGUoJ3NlZ21lbnQtYnVpbGRlcicpXG5cdC5kaXJlY3RpdmUoJ3NiRHJhZ2dhYmxlUnVsZURhdGVQaWNrZXInLCBmdW5jdGlvbiAoYXBwTW9kZWwsICRjb21waWxlLCBjYWxlbmRhckxvY2FsZUNvbmZpZyxcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0JHRpbWVvdXQsIGV2ZW50QnVzLCAkZmlsdGVyLCBtb21lbnQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dGVtcGxhdGU6ICc8ZGl2IGNsYXNzPVwicnVsZS1kYXRlLXBpY2tlclwiIG5nLWluaXQ9XCJpbml0KClcIj48L2Rpdj4nLFxuXHRcdFx0cmVzdHJpY3Q6ICdFQScsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRkYXRlU3RyaW5nOiAnPScsXG5cdFx0XHRcdGRhdGVDaGFuZ2U6ICcmJyxcblx0XHRcdFx0cmFuZ2VUeXBlOiAnQCdcblx0XHRcdH0sXG5cdFx0XHRjb21waWxlOiBmdW5jdGlvbigpe1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdHByZTogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycyl7XG5cdFx0XHRcdFx0XHRzY29wZS5pbml0ID0gZnVuY3Rpb24oKXtcblxuXHRcdFx0XHRcdFx0XHRpZiAoc2NvcGUucmFuZ2VUeXBlID09ICdkYXknIHx8IHNjb3BlLnJhbmdlVHlwZSA9PSAnaG91cicgfHwgc2NvcGUucmFuZ2VUeXBlID09J21pbnV0ZScpe1xuXHRcdFx0XHRcdFx0XHRcdHNjb3BlLmRhdGVTdHIgPSBzY29wZS5kYXRlU3RyaW5nID8gc2NvcGUuZGF0ZVN0cmluZyA6IG1vbWVudCgpLm1pbnV0ZXMoMCkudG9JU09TdHJpbmcoKTtcblx0XHRcdFx0XHRcdFx0XHRzY29wZS5kYXRlVHlwZSA9IChzY29wZS5yYW5nZVR5cGUgPT0gJ2RheScgPyAnZGF0ZScgOiAnZGF0ZXRpbWUnKTtcblx0XHRcdFx0XHRcdFx0XHRzY29wZS5kaXNhYmxlTWludXRlcyA9IHNjb3BlLnJhbmdlVHlwZSAhPT0gJ21pbnV0ZSc7XG5cdFx0XHRcdFx0XHRcdFx0ZWxlbWVudC5hcHBlbmQoXG5cdFx0XHRcdFx0XHRcdFx0XHQkY29tcGlsZSgnJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCc8YW4tZGF0ZXBpY2tlciAnICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnbmctY2xpY2s9XCIkZXZlbnQucHJldmVudERlZmF1bHQoKVwiICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCdkYXRlPVwiZGF0ZVN0clwiICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCdkYXRlLWNoYW5nZT1cIm9uRGF0ZUNoYW5nZShkYXRlU3RyaW5nKVwiICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCdibHVyLWhpZGUtY2FsbGJhY2s9XCJvbkRhdGVCbHVySGlkZSgpXCIgJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0J2Rpc2FibGUtbWludXRlcz1cImRpc2FibGVNaW51dGVzXCIgJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0J2RhdGUtdHlwZT1cImRhdGVUeXBlXCI+ICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQnPC9hbi1kYXRlcGlja2VyPidcblx0XHRcdFx0XHRcdFx0XHRcdCkoc2NvcGUpXG5cdFx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgbWluQm91bmQgPSBhcHBNb2RlbC5yZXBvcnRTdWl0ZS5heGxlQ29uZmlnLmF4bGVTdGFydDsgLy8gVE9ETzogVGhpcyBuZWVkcyB0byBiZSB1cGRhdGVkIHdoZW4gYSByc2lkIGlzIGNoYW5nZWQgb24gdGhlIHBhZ2UuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKG1pbkJvdW5kID09PSAnMDAwMC0wMC0wMCcpe1xuXHRcdFx0XHRcdFx0XHRcdFx0bWluQm91bmQgPSBtb21lbnQoKS5zdWJ0cmFjdCgneWVhcicsIDIpLnRvSVNPU3RyaW5nKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdHNjb3BlLmRhdGVTdHIgPSBzY29wZS5kYXRlU3RyaW5nID8gc2NvcGUuZGF0ZVN0cmluZyA6XG5cdFx0XHRcdFx0XHRcdFx0XHRtb21lbnQoKS5zdGFydE9mKHNjb3BlLnJhbmdlVHlwZSkudG9JU09TdHJpbmcoKSArICcgLSAnICsgbW9tZW50KCkuZW5kT2Yoc2NvcGUucmFuZ2VUeXBlKS50b0lTT1N0cmluZygpO1xuXG5cdFx0XHRcdFx0XHRcdFx0ZWxlbWVudC5hcHBlbmQoXG5cdFx0XHRcdFx0XHRcdFx0XHQkY29tcGlsZSgnJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCc8YW4tZGF0ZS1yYW5nZS1waWNrZXIgJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0J3JhbmdlLXR5cGU9XCInICsgc2NvcGUucmFuZ2VUeXBlICsgJ1wiICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdCdtaW4tYm91bmQ9XCInICsgbWluQm91bmQgKyAnXCIgJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0J3JhbmdlLWNoYW5nZT1cIm9uUmFuZ2VDaGFuZ2UobmV3VmFsdWUpXCIgJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0J2RhdGUtcmFuZ2Utc3RyaW5nPVwiZGF0ZVN0clwiPicgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQnPC9hbi1kYXRlLXJhbmdlLXBpY2tlcj4nXG5cdFx0XHRcdFx0XHRcdFx0XHQpKHNjb3BlKVxuXHRcdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0cG9zdDogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKXtcblx0XHRcdFx0XHRcdGVsZW1lbnQub24oJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgZnVuY3Rpb24oZXZlbnQpe1xuXHRcdFx0XHRcdFx0XHQvL1ByZXZlbnQgYSBtb3VzZWRvd24gb3IgdG91Y2ggc3RhcnQgZnJvbSBjYXVzaW5nIGFuIGl0ZW0gdG8gZHJhZy5cblx0XHRcdFx0XHRcdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0c2NvcGUuJG9uKCdmb2N1c1ZhbHVlU2VsZWN0b3InLCBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHQkdGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdC8vc2ltdWxhdGUgYSBjbGljayBldmVudCBpbiBvcmRlciB0byBkaXNwbGF5IHRoZSBjYWxlbmRhci5cblx0XHRcdFx0XHRcdFx0XHRlbGVtZW50LmZpbmQoJ2lucHV0JykuZm9jdXMoKTtcblx0XHRcdFx0XHRcdFx0fSwxMCk7XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0c2NvcGUub25EYXRlQ2hhbmdlID0gZnVuY3Rpb24obmV3RGF0ZVN0cmluZyl7XG5cdFx0XHRcdFx0XHRcdHNjb3BlLmRhdGVTdHIgPSBuZXdEYXRlU3RyaW5nO1xuXHRcdFx0XHRcdFx0XHRzY29wZS5kYXRlQ2hhbmdlKHtuZXdEYXRlU3RyaW5nOnNjb3BlLmRhdGVTdHJ9KTtcblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdHNjb3BlLm9uRGF0ZUJsdXJIaWRlID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0c2NvcGUuZGF0ZUNoYW5nZSh7bmV3RGF0ZVN0cmluZzpzY29wZS5kYXRlU3RyfSk7XG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHRzY29wZS5vblJhbmdlQ2hhbmdlID0gZnVuY3Rpb24obmV3RGF0ZVJhbmdlU3RyaW5nKXtcblx0XHRcdFx0XHRcdFx0c2NvcGUuZGF0ZVN0ciA9IG5ld0RhdGVSYW5nZVN0cmluZztcblx0XHRcdFx0XHRcdFx0c2NvcGUuZGF0ZUNoYW5nZSh7bmV3RGF0ZVN0cmluZzpzY29wZS5kYXRlU3RyfSk7XG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdzZWdtZW50LWJ1aWxkZXInKVxuXHQuZGlyZWN0aXZlKCdzYkRyYWdnYWJsZVJ1bGVEcm9wZG93bicsIGZ1bmN0aW9uICh0b3BJdGVtc1NlcnZpY2UsIGV2ZW50QnVzLCAkdGltZW91dCwgJGZpbHRlcikge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZXMvc2ItZHJhZ2dhYmxlLXJ1bGUtZHJvcGRvd24udHBsLmh0bWwnLFxuXHRcdFx0cmVzdHJpY3Q6ICdFQScsXG5cdFx0XHRyZXBsYWNlOiB0cnVlLFxuXHRcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCAkZWxlbWVudCl7XG5cdFx0XHRcdCRzY29wZS5lbGVtZW50cyA9IG51bGw7XG5cdFx0XHRcdCRzY29wZS5sb2FkaW5nRWxlbWVudHMgPSBmYWxzZTtcblx0XHRcdFx0JHNjb3BlLnNlbGVjdGVkRWxlbWVudCA9IG51bGw7XG5cdFx0XHRcdCRzY29wZS5zZWFyY2hUZXh0ID0gJHNjb3BlLmRhdGFNb2RlbC52YWx1ZTtcblx0XHRcdFx0dmFyIGNsaWNrVG9Vc2VMYWJlbFRleHQgPSAkZmlsdGVyKCdsMTBuJykoWydzYkNsaWNrVG9Vc2VWYWx1ZUxhYmVsJywgJ0NsaWNrIHRvIHVzZSB2YWx1ZSBcXCclc1xcJyddKTtcblx0XHRcdFx0JHNjb3BlLmFkZE5ld0l0ZW1UZXh0S2V5ID0gJHNjb3BlLmRhdGFNb2RlbC50eXBlID09ICdlbnVtJyA/ICcnIDogY2xpY2tUb1VzZUxhYmVsVGV4dDtcblx0XHRcdFx0XG5cdFx0XHRcdCRzY29wZS5sb2FkRWxlbWVudHMgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdCR0aW1lb3V0KCgpID0+ICRzY29wZS5sb2FkaW5nRWxlbWVudHMgPSB0cnVlKTtcblx0XHRcdFx0XHR0b3BJdGVtc1NlcnZpY2UuZ2V0VG9wSXRlbXMoe1xuXHRcdFx0XHRcdFx0ZGltZW5zaW9uOiAkc2NvcGUuZGF0YU1vZGVsLmlkLFxuXHRcdFx0XHRcdFx0bGltaXQ6IDEwMCxcblx0XHRcdFx0XHRcdHNlYXJjaDogJHNjb3BlLmVsZW1lbnRzID8gJHNjb3BlLnNlYXJjaFRleHQgOiAnJ1xuXHRcdFx0XHRcdH0pLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRcdFx0JHNjb3BlLmVsZW1lbnRzID0gcmVzcG9uc2Uucm93cztcblx0XHRcdFx0XHRcdGlmICghJHNjb3BlLnNlbGVjdGVkRWxlbWVudCAmJiAkc2NvcGUuZGF0YU1vZGVsLnZhbHVlICE9PSAnJyAmJiAkc2NvcGUuZWxlbWVudHMpe1xuXHRcdFx0XHRcdFx0XHQkc2NvcGUuZWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbihlbG0pe1xuXHRcdFx0XHRcdFx0XHRcdGlmIChlbG0ubmFtZSA9PT0gJHNjb3BlLmRhdGFNb2RlbC52YWx1ZSl7XG5cdFx0XHRcdFx0XHRcdFx0XHQvL1NldCB0aGUgc2VsZWN0ZWQgZWxlbWVudCBpbiB0aGUgbmV4dCBmcmFtZSBzbyB0aGF0IGl0IHdpbGwgYmUgcGlja2VkIHVwIGJ5IGRhdGEgYmluZGluZy5cblx0XHRcdFx0XHRcdFx0XHRcdCR0aW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCRzY29wZS5zZWxlY3RlZEVsZW1lbnQgPSBlbG07XG5cdFx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGVsbS5pZCA9PT0gJHNjb3BlLmRhdGFNb2RlbC52YWx1ZSl7XG5cdFx0XHRcdFx0XHRcdFx0XHQvL0VudW0ncyBhcmUgd2VpcmQgYmVjYXVzZSB3ZSBhcmUgZGlzcGxheWluZyBvbmUgdGhpbmcgYW5kIHN0b3Jpbmcgc29tZXRoaW5nIGNvbXBsZXRlbHkgZGlmZmVyZW50LlxuXHRcdFx0XHRcdFx0XHRcdFx0JHNjb3BlLmRhdGFNb2RlbC52YWx1ZSA9IGVsbS5uYW1lO1xuXHRcdFx0XHRcdFx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JHNjb3BlLnNlbGVjdGVkRWxlbWVudCA9IGVsbTtcblx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkc2NvcGUubG9hZGluZ0VsZW1lbnRzID0gZmFsc2U7XG5cdFx0XHRcdFx0fSwgZnVuY3Rpb24oZXJyb3Ipe1xuXHRcdFx0XHRcdFx0JHNjb3BlLmVsZW1lbnRzID0gW107XG5cdFx0XHRcdFx0XHQkc2NvcGUubG9hZGluZ0VsZW1lbnRzID0gZmFsc2U7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH07XG5cdFx0XHR9LFxuXHRcdFx0bGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKXtcblxuXHRcdFx0XHRlbGVtZW50Lm9uKCdtb3VzZWRvd24gdG91Y2hzdGFydCcsIGZ1bmN0aW9uKGV2ZW50KXtcblx0XHRcdFx0XHQvLyBQcmV2ZW50IGEgbW91c2Vkb3duIG9yIHRvdWNoIHN0YXJ0IGZyb20gY2F1c2luZyBhbiBpdGVtIHRvIGRyYWcuXG5cdFx0XHRcdFx0Ly8gSWYgeW91IHN0b3AgcHJvcGFnYXRpb24gaGVyZSwgaXQgd2lsbCBwcmV2ZW50IHRoZSBkcm9wZG93biBmcm9tIG9wZW5pbmcuXG5cdFx0XHRcdFx0aWYoZXZlbnQudGFyZ2V0LnRhZ05hbWUgIT09ICdJTlBVVCcpe1xuXHRcdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHNjb3BlLnNob3dBdXRvQ29tcGxldGVEcm9wZG93biA9IHRydWU7XG5cdFx0XHRcdHNjb3BlLmV4cGFuZERyb3Bkb3duTGlzdCA9IGZhbHNlO1xuXG5cdFx0XHRcdHZhciBleGNsdWRlZERyb3Bkb3duU3RyaW5nVmFsdWVzID0gW1xuXHRcdFx0XHRcdCdjb250YWlucycsXG5cdFx0XHRcdFx0J25vdC1jb250YWlucycsXG5cdFx0XHRcdFx0J3N0YXJ0cy13aXRoJyxcblx0XHRcdFx0XHQnZW5kcy13aXRoJyxcblx0XHRcdFx0XHQnbm90LXN0YXJ0cy13aXRoJyxcblx0XHRcdFx0XHQnbm90LWVuZHMtd2l0aCcsXG5cdFx0XHRcdFx0J2NvbnRhaW5zLWFueS1vZicsXG5cdFx0XHRcdFx0J2NvbnRhaW5zLWFsbC1vZicsXG5cdFx0XHRcdFx0J25vdC1jb250YWlucy1hbnktb2YnLFxuXHRcdFx0XHRcdCdub3QtY29udGFpbnMtYWxsLW9mJyxcblx0XHRcdFx0XHQnbWF0Y2hlcycsXG5cdFx0XHRcdFx0J25vdC1tYXRjaGVzJ1xuXHRcdFx0XHRdO1xuXG5cdFx0XHRcdHNjb3BlLiRvbignZm9jdXNWYWx1ZVNlbGVjdG9yJywgZnVuY3Rpb24oKXtcblx0XHRcdFx0XHQkdGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0aWYgKHNjb3BlLnNob3dBdXRvQ29tcGxldGVEcm9wZG93bil7XG5cdFx0XHRcdFx0XHRcdC8vTGV0IHRoZSBhZC1kcm9wZG93bi1saXN0IHNldCBpdCdzIG93biBmb2N1cy5cblx0XHRcdFx0XHRcdFx0c2NvcGUuJGJyb2FkY2FzdCgnc2V0Rm9jdXMnKTtcblx0XHRcdFx0XHRcdFx0ZWxlbWVudC5maW5kKCcuYWQtc2VsZWN0JykuZ2V0KDApLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdTZWxlY3Q6Zm9jdXMnKSk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHQkdGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdGVsZW1lbnQuZmluZCgnLmNvcmFsLURlY29yYXRlZFRleHRmaWVsZC1pbnB1dCcpLmZvY3VzKCk7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRzY29wZS5vbklucHV0Qmx1ciA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0aWYgKHNjb3BlLmRhdGFNb2RlbC52YWx1ZSAhPT0gJycpe1xuXHRcdFx0XHRcdFx0aWYgKCFzY29wZS5leHBhbmREcm9wZG93bkxpc3QpIHtcblx0XHRcdFx0XHRcdFx0c2NvcGUuZXhwYW5kRHJvcGRvd25MaXN0ID0gdHJ1ZTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHNjb3BlLmVkaXRpbmcgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0c2NvcGUuZXhwYW5kRHJvcGRvd25MaXN0ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0ZWxlbWVudC5maW5kKCcuY29yYWwtRGVjb3JhdGVkVGV4dGZpZWxkLWlucHV0Jykub2ZmKCdibHVyJywgc2NvcGUub25JbnB1dEJsdXIpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHNjb3BlLm9uRHJvcGRvd25UZXh0Q2hhbmdlID0gZnVuY3Rpb24odGV4dCl7XG5cdFx0XHRcdFx0Ly9JZiB0aGVyZSBhcmUgbm8gZWxlbWVudHMgeWV0IHRoZW4gaWdub3JlIHRoZSBkcm9wZG93biBldmVudC4gVGhpcyBzaG91bGQgb25seSBiZSBmb3IgYSBmaXJzdFxuXHRcdFx0XHRcdC8vdGltZSBsb2FkLlxuXHRcdFx0XHRcdGlmIChzY29wZS5lbGVtZW50cyl7XG5cdFx0XHRcdFx0XHRzY29wZS5zZWFyY2hUZXh0ID0gdGV4dDtcblx0XHRcdFx0XHRcdHNjb3BlLmxvYWRFbGVtZW50cygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHRzY29wZS5vblNlbGVjdGVkRWxlbWVudENoYW5nZSA9IGZ1bmN0aW9uKHNlbGVjdGVkRWxlbWVudCwgdGV4dCl7XG5cdFx0XHRcdFx0aWYgKCFzZWxlY3RlZEVsZW1lbnQpIHsgcmV0dXJuOyB9XG5cdFx0XHRcdFx0Ly9JZiB0aGUgZWxlbWVudHMgaGF2ZW4ndCBiZWVuIGxvYWRlZCB5ZXQgdGhlbiBpZ25vcmUgdGhlIGNoYW5nZSBldmVudC5cblx0XHRcdFx0XHRpZiAoc2NvcGUuZWxlbWVudHMgJiYgc2VsZWN0ZWRFbGVtZW50KXtcblx0XHRcdFx0XHRcdGlmIChzZWxlY3RlZEVsZW1lbnQgJiYgKHNjb3BlLmRhdGFNb2RlbC50eXBlID09ICdlbnVtJyB8fCBzY29wZS5kYXRhTW9kZWwudHlwZSA9PSAnb3JkZXJlZC1lbnVtJykpe1xuXHRcdFx0XHRcdFx0XHRzY29wZS5kYXRhTW9kZWwudmFsdWUgPSBzZWxlY3RlZEVsZW1lbnQubmFtZTtcblx0XHRcdFx0XHRcdFx0c2NvcGUuZGF0YU1vZGVsLmVudW1WYWx1ZSA9IHNlbGVjdGVkRWxlbWVudC5pZDtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoc2VsZWN0ZWRFbGVtZW50KSB7XG5cdFx0XHRcdFx0XHRcdHNjb3BlLmRhdGFNb2RlbC52YWx1ZSA9IHNlbGVjdGVkRWxlbWVudC5uYW1lO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0c2NvcGUuZGF0YU1vZGVsLnZhbHVlID0gJyc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRzY29wZS5lZGl0aW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRzY29wZS5zZWxlY3RlZEVsZW1lbnQgPSBzZWxlY3RlZEVsZW1lbnQ7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChzY29wZS5lbGVtZW50cykgeyAvL0hhbmRsZSBhIG51bGwgZWxlbWVudC4gV2Ugc3RpbGwgd2FudCB0byBhbGxvdyB1c2VycyB0byB0eXBlIHRleHQgd2l0aG91dCBhbiBlbGVtZW50IGJlaW5nIHByZXNlbnQuXG5cdFx0XHRcdFx0XHRzY29wZS5kYXRhTW9kZWwudmFsdWUgPSB0ZXh0O1xuXHRcdFx0XHRcdFx0Ly9IYW5kbGUgZW51bXMuXG5cdFx0XHRcdFx0XHRpZiAoc2NvcGUuZGF0YU1vZGVsLnR5cGUgPT0gJ2VudW0nIHx8IHNjb3BlLmRhdGFNb2RlbC50eXBlID09ICdvcmRlcmVkLWVudW0nKXtcblx0XHRcdFx0XHRcdFx0c2NvcGUuZGF0YU1vZGVsLmVudW1WYWx1ZSA9IHRleHQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRzY29wZS5lZGl0aW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRzY29wZS5zZWxlY3RlZEVsZW1lbnQgPSBzZWxlY3RlZEVsZW1lbnQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ3VwZGF0ZVZhbGlkYXRpb25BcmVhJyk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0c2NvcGUub25UZXh0SW5wdXRDbGljayA9IGZ1bmN0aW9uKGV2ZW50KXtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdHNjb3BlLmVkaXRpbmcgPSB0cnVlO1xuXHRcdFx0XHRcdCQoZXZlbnQudGFyZ2V0KS5mb2N1cygpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHNjb3BlLmNvbW1pdFRleHRJbnB1dCA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0aWYgKHNjb3BlLmRhdGFNb2RlbC52YWx1ZSAhPT0gJycpe1xuXHRcdFx0XHRcdFx0c2NvcGUuZWRpdGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0ZXZlbnRCdXMucHVibGlzaCgndXBkYXRlVmFsaWRhdGlvbkFyZWEnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHRcdFxuXHRcdFx0XHRzY29wZS4kd2F0Y2goJ2RhdGFNb2RlbC5jb21wYXJpc29uVHlwZScsIGZ1bmN0aW9uKGNvbXBhcmlzb25UeXBlKXtcblx0XHRcdFx0XHRzY29wZS5zaG93QXV0b0NvbXBsZXRlRHJvcGRvd24gPSBleGNsdWRlZERyb3Bkb3duU3RyaW5nVmFsdWVzLmluZGV4T2YoY29tcGFyaXNvblR5cGUpID09IC0xO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcbiIsIlxuYW5ndWxhci5tb2R1bGUoJ3NlZ21lbnQtYnVpbGRlcicpXG5cdC5kaXJlY3RpdmUoJ3NiRHJhZ2dhYmxlUnVsZU51bWJlclBpY2tlcicsIGZ1bmN0aW9uIChldmVudEJ1cywgJHRpbWVvdXQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdkaXJlY3RpdmVzL3NiLWRyYWdnYWJsZS1ydWxlLW51bWJlci1waWNrZXIudHBsLmh0bWwnLFxuXHRcdFx0cmVzdHJpY3Q6ICdFQScsXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG5cdFx0XHRcdHZhciBpbnB1dEVsbSA9IG51bGw7XG5cblx0XHRcdFx0Z2V0SW5wdXRFbGVtZW50KCkub24oJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgZnVuY3Rpb24oZXZlbnQpe1xuXHRcdFx0XHRcdC8vUHJldmVudCBhIG1vdXNlZG93biBvciB0b3VjaCBzdGFydCBmcm9tIGNhdXNpbmcgYW4gaXRlbSB0byBkcmFnLlxuXHRcdFx0XHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRzY29wZS4kb24oJ2ZvY3VzVmFsdWVTZWxlY3RvcicsIGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0JHRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdGdldElucHV0RWxlbWVudCgpLmZvY3VzKCk7XG5cdFx0XHRcdFx0XHRzY29wZS5lZGl0aW5nID0gdHJ1ZTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0c2NvcGUub25FbGVtZW50Q2xpY2sgPSBmdW5jdGlvbihldmVudCl7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHRpZiAoJChldmVudC50YXJnZXQpLmhhc0NsYXNzKCdjb3JhbC1JbnB1dEdyb3VwLWlucHV0Jykpe1xuXHRcdFx0XHRcdFx0Z2V0SW5wdXRFbGVtZW50KCkuZm9jdXMoKTtcblx0XHRcdFx0XHRcdHNjb3BlLmVkaXRpbmcgPSB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHRzY29wZS4kd2F0Y2goJ2RhdGFNb2RlbC52YWx1ZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ3VwZGF0ZVZhbGlkYXRpb25BcmVhJyk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHNjb3BlLmNvbW1pdE51bWJlcklucHV0ID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRpZiAoc2NvcGUuZGF0YU1vZGVsLnZhbHVlICE9PSAnJyl7XG5cdFx0XHRcdFx0XHRzY29wZS5lZGl0aW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRldmVudEJ1cy5wdWJsaXNoKCd1cGRhdGVWYWxpZGF0aW9uQXJlYScpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHRmdW5jdGlvbiBnZXRJbnB1dEVsZW1lbnQoKXtcblx0XHRcdFx0XHRpZiAoIWlucHV0RWxtIHx8IGlucHV0RWxtLmxlbmd0aCA9PT0gMCl7XG5cdFx0XHRcdFx0XHRpbnB1dEVsbSA9IGVsZW1lbnQuZmluZCgnLmNvcmFsLUlucHV0R3JvdXAtaW5wdXQnKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIGlucHV0RWxtO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7IiwiaW1wb3J0IHtcblx0RGF0ZVJhbmdlXG59IGZyb20gJ21vZGVsJ1xuXG5pbXBvcnQge1xuXHRQcmV2aWV3XG59IGZyb20gJ3VpJ1xuXG5hbmd1bGFyLm1vZHVsZSgnc2VnbWVudC1idWlsZGVyJylcblx0LmRpcmVjdGl2ZSgnc2JEcmFnZ2FibGVSdWxlJywgZnVuY3Rpb24gKGNvbXBhcmlzb25UeXBlcywgJHRpbWVvdXQsIGV2ZW50QnVzLCAkY29tcGlsZSwgJGZpbHRlciwgZGltZW5zaW9uU2VydmljZSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZXMvc2ItZHJhZ2dhYmxlLXJ1bGUudHBsLmh0bWwnLFxuXHRcdFx0cmVzdHJpY3Q6ICdFQScsXG5cdFx0XHRyZXBsYWNlOiB0cnVlLFxuXHRcdFx0c2NvcGU6IHtcblx0XHRcdFx0J2RhdGFNb2RlbCc6ICc9bW9kZWwnLFxuXHRcdFx0XHQncmVtb3ZlSXRlbSc6ICcmJyxcblx0XHRcdFx0J3RvZ2dsZUl0ZW1TZWxlY3Rpb24nOiAnJidcblx0XHRcdH0sXG5cdFx0XHRjb21waWxlOiBmdW5jdGlvbigpe1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdHByZTogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKXtcblx0XHRcdFx0XHRcdHNjb3BlLmRpc2FibGVSdWxlID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRzY29wZS5pbml0ID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0c2NvcGUuZWRpdGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRzY29wZS5jb21wYXJpc29uVHlwZXNMaXN0ID0gY29tcGFyaXNvblR5cGVzLmdldENvbXBhcmlzb25BcnJheUZvckRhdGFNb2RlbChzY29wZS5kYXRhTW9kZWwpO1xuXHRcdFx0XHRcdFx0XHRzY29wZS5yYW5nZVR5cGUgPSBkaW1lbnNpb25TZXJ2aWNlLmdldFJhbmdlVHlwZUZyb21EaW1lbnNpb25JZChzY29wZS5kYXRhTW9kZWwuaWQpO1xuXG5cdFx0XHRcdFx0XHRcdHZhciBkcmFnZ2FibGVPcHRpb25zID0gZWxlbWVudC5maW5kKCcuZHJhZ2dhYmxlLW9wdGlvbnMnKTtcblx0XHRcdFx0XHRcdFx0c3dpdGNoIChzY29wZS5kYXRhTW9kZWwudHlwZSl7XG5cdFx0XHRcdFx0XHRcdFx0Y2FzZSAnc3RyaW5nJyA6XG5cdFx0XHRcdFx0XHRcdFx0Y2FzZSAnb3JkZXJlZC1lbnVtJyA6XG5cdFx0XHRcdFx0XHRcdFx0Y2FzZSAnZW51bScgOlxuXHRcdFx0XHRcdFx0XHRcdFx0ZHJhZ2dhYmxlT3B0aW9ucy5hcHBlbmQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCRjb21waWxlKCcnICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnPHNiLWRyYWdnYWJsZS1ydWxlLWRyb3Bkb3duICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0J25nLXNob3c9XCJkaXNwbGF5VmFsdWVTZWxlY3RvcigpXCI+JyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Jzwvc2ItZHJhZ2dhYmxlLXJ1bGUtZHJvcGRvd24+J1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQpKHNjb3BlKVxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0Y2FzZSAnaW50JyA6XG5cdFx0XHRcdFx0XHRcdFx0Y2FzZSAnZGVjaW1hbCcgOlxuXHRcdFx0XHRcdFx0XHRcdGNhc2UgJ2N1cnJlbmN5JyA6XG5cdFx0XHRcdFx0XHRcdFx0Y2FzZSAncGVyY2VudCcgOlxuXHRcdFx0XHRcdFx0XHRcdFx0ZHJhZ2dhYmxlT3B0aW9ucy5hcHBlbmQoXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCRjb21waWxlKCcnICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnPHNiLWRyYWdnYWJsZS1ydWxlLW51bWJlci1waWNrZXIgJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnbmctc2hvdz1cImRpc3BsYXlWYWx1ZVNlbGVjdG9yKClcIj4nICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnPC9zYi1kcmFnZ2FibGUtcnVsZS1udW1iZXItcGlja2VyPidcblx0XHRcdFx0XHRcdFx0XHRcdFx0KShzY29wZSlcblx0XHRcdFx0XHRcdFx0XHRcdCk7XG5cblx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdGNhc2UgJ3RpbWUnIDpcblx0XHRcdFx0XHRcdFx0XHRcdGRyYWdnYWJsZU9wdGlvbnMuYXBwZW5kKFxuXHRcdFx0XHRcdFx0XHRcdFx0XHQkY29tcGlsZSgnJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0JzxzYi1kcmFnZ2FibGUtcnVsZS1kYXRlLXBpY2tlciAnICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCduZy1zaG93PVwiZGlzcGxheVZhbHVlU2VsZWN0b3IoKVwiICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0J2RhdGUtc3RyaW5nPVwiZGF0YU1vZGVsLnZhbHVlXCIgJyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnZGF0ZS1jaGFuZ2U9XCJvbkRhdGVDaGFuZ2UobmV3RGF0ZVN0cmluZylcIiAnICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCdyYW5nZS10eXBlPVwiJyArIHNjb3BlLnJhbmdlVHlwZSArICdcIj4nICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQnPC9zYi1kcmFnZ2FibGUtcnVsZS1kYXRlLXBpY2tlcj4nXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCkoc2NvcGUpXG5cdFx0XHRcdFx0XHRcdFx0XHQpO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHBvc3Q6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycyl7XG5cdFx0XHRcdFx0XHRpZiAoc2NvcGUuZGF0YU1vZGVsLmRlcHJlY2F0ZWQpe1xuXHRcdFx0XHRcdFx0XHRldmVudEJ1cy5wdWJsaXNoKCdkaXNwbGF5QWxlcnQnLCB7XG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogJ25vdGljZScsXG5cdFx0XHRcdFx0XHRcdFx0dGV4dDogJGZpbHRlcignbDEwbicpKFsnZGVwcmVjYXRlZFJ1bGVzV2FybmluZycsICdUaGVyZSBhcmUgb25lIG9yIG1vcmUgdW4tc3VwcG9ydGVkIHJ1bGVzIHdpdGhpbiB5b3VyIHNlZ21lbnQuIFlvdSBtdXN0IGRlbGV0ZSB0aG9zZSBydWxlcyBpbiBvcmRlciB0byBzYXZlIGFueSBjaGFuZ2VzLiddKVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKHNjb3BlLmRhdGFNb2RlbC52YWx1ZSA9PT0gJycpIHtcblx0XHRcdFx0XHRcdFx0c2NvcGUuZWRpdGluZyA9IHRydWU7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHNjb3BlLnJlbW92ZSA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdHNjb3BlLnJlbW92ZUl0ZW0oe2l0ZW06c2NvcGUuZGF0YU1vZGVsfSk7XG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHRzY29wZS5vbkl0ZW1DbGljayA9IGZ1bmN0aW9uKGV2ZW50KXtcblx0XHRcdFx0XHRcdFx0Ly8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgdGhleSBjbGlja2VkIG9uIHRoZSBzZWxlY3QuIFxuXHRcdFx0XHRcdFx0XHR2YXIgc2VsZWN0ID0gZWxlbWVudC5maW5kKCcuYWQtc2VsZWN0Jyk7XG5cdFx0XHRcdFx0XHRcdGlmIChzZWxlY3QuZmluZChldmVudC50YXJnZXQpLmxlbmd0aCkgeyByZXR1cm47IH1cblx0XHRcdFx0XHRcdFx0c2NvcGUudG9nZ2xlSXRlbVNlbGVjdGlvbih7JyRldmVudCc6IGV2ZW50LCAnaXRlbSc6IHNjb3BlLmRhdGFNb2RlbH0pO1xuXHRcdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdFx0c2NvcGUub25WYWx1ZUxhYmVsQ2xpY2sgPSBmdW5jdGlvbihldmVudCl7XG5cdFx0XHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdGlmIChzY29wZS5kYXRhTW9kZWwuZGVwcmVjYXRlZCkge1xuXHRcdFx0XHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ2Rpc3BsYXlBbGVydCcsIHtcblx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6ICdub3RpY2UnLFxuXHRcdFx0XHRcdFx0XHRcdFx0dGV4dDogJGZpbHRlcignbDEwbicpKFsnZGVwcmVjYXRlZFJ1bGUnLCAnVGhpcyBydWxlIGhhcyBiZWVuIGRpc2FibGVkIGJlY2F1c2UgaXQgaXMgY29udGFpbnMgdW4tc3VwcG9ydGVkIGJlaGF2aW9ycy4gWW91IG11c3QgZGVsZXRlIHRoZSBydWxlIGluIG9yZGVyIHRvIHNhdmUgYW55IGNoYW5nZXMuJ10pXG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIXNjb3BlLmRpc2FibGVSdWxlKXtcblx0XHRcdFx0XHRcdFx0XHRzY29wZS5lZGl0aW5nID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRzY29wZS4kYnJvYWRjYXN0KCdmb2N1c1ZhbHVlU2VsZWN0b3InKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRldmVudEJ1cy5wdWJsaXNoKCdkaXNwbGF5QWxlcnQnLCB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiAnbm90aWNlJyxcblx0XHRcdFx0XHRcdFx0XHRcdHRleHQ6ICRmaWx0ZXIoJ2wxMG4nKShbJ3VuYWJsZVRvRWRpdFJ1bGUnLCAnVGhpcyBydWxlIHdhcyBidWlsdCB1c2luZyBhbm90aGVyIHJlcG9ydCBzdWl0ZSBhbmQgaXMgdW5zdXBwb3J0ZWQgaW4gdGhlIGN1cnJlbnRseSBzZWxlY3RlZCByZXBvcnQgc3VpdGUuJ10pXG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdHNjb3BlLmNsaWNrT3V0c2lkZURyYWdnYWJsZVJ1bGUgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRpZiAoc2NvcGUuZXhwYW5kRHJvcGRvd25MaXN0KXtcblx0XHRcdFx0XHRcdFx0XHRzY29wZS5lZGl0aW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0c2NvcGUuZXhwYW5kRHJvcGRvd25MaXN0ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdHZhciBoaWRlVUlTZWxlY3RvciA9IFtcblx0XHRcdFx0XHRcdFx0J2V4aXN0cycsXG5cdFx0XHRcdFx0XHRcdCdub3QtZXhpc3RzJyxcblx0XHRcdFx0XHRcdFx0J2V2ZW50LWV4aXN0cycsXG5cdFx0XHRcdFx0XHRcdCdub3QtZXZlbnQtZXhpc3RzJ1xuXHRcdFx0XHRcdFx0XTtcblxuXHRcdFx0XHRcdFx0c2NvcGUuZGlzcGxheVZhbHVlTGFiZWwgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRpZiAoc2NvcGUuZGF0YU1vZGVsLmRlcHJlY2F0ZWQpIHsgcmV0dXJuIHRydWU7IH1cblx0XHRcdFx0XHRcdFx0dmFyIG51bGxPcHRpb25TZWxlY3RlZCA9IGhpZGVVSVNlbGVjdG9yLmluZGV4T2Yoc2NvcGUuZGF0YU1vZGVsLmNvbXBhcmlzb25UeXBlKSAhPT0gLTE7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAhc2NvcGUuZWRpdGluZyAmJiBzY29wZS5kYXRhTW9kZWwudmFsdWUgIT09ICcnICYmICFudWxsT3B0aW9uU2VsZWN0ZWQ7XG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHRzY29wZS5kaXNwbGF5VmFsdWVTZWxlY3RvciA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdGlmIChzY29wZS5kYXRhTW9kZWwuZGVwcmVjYXRlZCkgeyByZXR1cm4gZmFsc2U7IH1cblx0XHRcdFx0XHRcdFx0dmFyIG51bGxPcHRpb25TZWxlY3RlZCA9IGhpZGVVSVNlbGVjdG9yLmluZGV4T2Yoc2NvcGUuZGF0YU1vZGVsLmNvbXBhcmlzb25UeXBlKSAhPT0gLTE7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAoc2NvcGUuZGF0YU1vZGVsLnZhbHVlID09PSAnJyB8fCBzY29wZS5lZGl0aW5nKSAmJiAhbnVsbE9wdGlvblNlbGVjdGVkO1xuXHRcdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdFx0c2NvcGUub25Db21wYXJpc29uVHlwZUNoYW5nZSA9IGZ1bmN0aW9uKG5ld1ZhbHVlKXtcblx0XHRcdFx0XHRcdFx0ZXZlbnRCdXMucHVibGlzaCgndXBkYXRlVmFsaWRhdGlvbkFyZWEnKTtcblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdHNjb3BlLm9uRGF0ZUNoYW5nZSA9IGZ1bmN0aW9uKG5ld0RhdGVTdHJpbmcpe1xuXHRcdFx0XHRcdFx0XHRzY29wZS5lZGl0aW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdHNjb3BlLmRhdGFNb2RlbC52YWx1ZSA9IG5ld0RhdGVTdHJpbmc7XG5cdFx0XHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ3VwZGF0ZVZhbGlkYXRpb25BcmVhJyk7XG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHRzY29wZS5nZXRDb21wYXJpc29uVHlwZSA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBjb21wYXJpc29uVHlwZXMuZ2V0S2V5VmFsdWUoc2NvcGUuZGF0YU1vZGVsLmNvbXBhcmlzb25UeXBlKTtcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHNjb3BlLnNob3dEYXRlUmFuZ2VQcmV2aWV3ID0gZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdFx0XHRQcmV2aWV3LnNob3cobmV3IERhdGVSYW5nZSh7XG5cdFx0XHRcdFx0XHRcdFx0aWQ6IHNjb3BlLmRhdGFNb2RlbC5pZCxcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiBzY29wZS5kYXRhTW9kZWwubmFtZVxuXHRcdFx0XHRcdFx0XHR9KSwgZSk7XG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcbiIsImltcG9ydCB7XG5cdERhdGVSYW5nZVxufSBmcm9tICdtb2RlbCdcblxuYW5ndWxhci5tb2R1bGUoJ3NlZ21lbnQtYnVpbGRlcicpXG5cdC5kaXJlY3RpdmUoJ3NiRHJvcFpvbmUnLCBmdW5jdGlvbiAoZXZlbnRCdXMsICRmaWx0ZXIsICR0aW1lb3V0LCBEcmFnTWFuYWdlciwgc2VnbWVudERlZmluaXRpb25TZXJ2aWNlLCBMT0dJQ0FMX09QRVJBVE9SX1NFUVVFTkNFLFxuXHRcdFx0XHRcdFx0XHRcdFx0Q09OVEVYVF9WSVNJVE9SUywgQ09OVEVYVF9MT0dJQ19HUk9VUCwgY29udGV4dExpc3QsIHNwaW5uZXJTZXJ2aWNlLCB2aXJ0dWFsRHJvcFRhcmdldFNlcnZpY2UsXG5cdFx0XHRcdFx0XHRcdFx0XHR0cmFja1NlcnZpY2UpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdkaXJlY3RpdmVzL3NiLWRyb3Atem9uZS50cGwuaHRtbCcsXG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdHJlcGxhY2U6IHRydWUsXG5cdFx0XHRsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG5cdFx0XHRcdHZhciBjdXJyZW50RHJvcEluZGljYXRvck1vZGVsID0gbnVsbDtcblx0XHRcdFx0c2NvcGUuc2hvd0RyYWdQcm94eSA9IGZhbHNlO1xuXG5cdFx0XHRcdHNjb3BlLm9uRHJhZ0VudGVyID0gZnVuY3Rpb24oZXZlbnQsIGxvY2FsUHQsIGRyYWdnYWJsZU1vZGVsKXtcblx0XHRcdFx0XHQvL1ByZXZlbnQgZHJhZyBkcm9wIG9mIGFuIG9iamVjdCB3aXRoaW4gaXQncyBvd24gY29udGFpbmVyLlxuXHRcdFx0XHRcdGlmIChkcmFnZ2FibGVNb2RlbCA9PT0gc2NvcGUuZGF0YU1vZGVsKXtcblx0XHRcdFx0XHRcdGV2ZW50LnByZXZlbnREcmFnRHJvcCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHRzY29wZS5vbkRyYWdPdmVyID0gZnVuY3Rpb24oZXZlbnQsIGxvY2FsUHQsIGRyYWdnYWJsZU1vZGVsKXtcblx0XHRcdFx0XHRpZiAoIWV2ZW50LmlzRHJhZ0Ryb3BQcmV2ZW50ZWQoKSkge1xuXHRcdFx0XHRcdFx0dXBkYXRlRHJvcEluZGljYXRvcihsb2NhbFB0LCBkcmFnZ2FibGVNb2RlbCk7XG5cblx0XHRcdFx0XHRcdGlmIChldmVudC5jdHJsS2V5IHx8IGV2ZW50Lm1ldGFLZXkpe1xuXHRcdFx0XHRcdFx0XHRldmVudC5zZXREcmFnQ3Vyc29yKCdjb3B5Jyk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRldmVudC5zZXREcmFnQ3Vyc29yKCdtb3ZlJyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHNjb3BlLm9uRHJhZ0Ryb3AgPSBmdW5jdGlvbihldmVudCwgZHJhZ2dhYmxlTW9kZWwpe1xuXHRcdFx0XHRcdGlmIChldmVudC5jdHJsS2V5IHx8IGV2ZW50Lm1ldGFLZXkpe1xuXHRcdFx0XHRcdFx0aWYgKCQuaXNBcnJheShkcmFnZ2FibGVNb2RlbCkpe1xuXHRcdFx0XHRcdFx0XHRjb3B5RHJhZ2dhYmxlQXJyYXkoZHJhZ2dhYmxlTW9kZWwpO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0Y29weURyYWdnYWJsZShkcmFnZ2FibGVNb2RlbCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIGlmICgkLmlzQXJyYXkoZHJhZ2dhYmxlTW9kZWwpKXtcblx0XHRcdFx0XHRcdG1vdmVEcmFnZ2FibGVBcnJheShkcmFnZ2FibGVNb2RlbCk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICghZHJhZ2dhYmxlTW9kZWwucHVycG9zZSl7XG5cblx0XHRcdFx0XHRcdHRyYWNrRHJhZ0Ryb3AoZHJhZ2dhYmxlTW9kZWwpO1xuXG5cdFx0XHRcdFx0XHRpZiAoZHJhZ2dhYmxlTW9kZWwuaXRlbVR5cGUgPT0gJ3NlZ21lbnQnKXtcblx0XHRcdFx0XHRcdFx0Ly9DcmVhdGUgYW5kIGNhY2hlIGEgY29uc3VtYWJsZURlZmluaXRpb24gaWYgb25lIGRvZXNuJ3QgZXhpc3QgeWV0LlxuXHRcdFx0XHRcdFx0XHRzcGlubmVyU2VydmljZS5zaG93KCdzYlNwaW5uZXInKTtcblx0XHRcdFx0XHRcdFx0dmFyIGRyb3BJZHggPSBnZXREcm9wSW5kZXgoKTtcblx0XHRcdFx0XHRcdFx0c2VnbWVudERlZmluaXRpb25TZXJ2aWNlLmxvYWRDb25zdW1hYmxlRGVmaW5pdGlvbihkcmFnZ2FibGVNb2RlbCkudGhlbihmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0XHRcdHNwaW5uZXJTZXJ2aWNlLmhpZGUoJ3NiU3Bpbm5lcicpO1xuXG5cdFx0XHRcdFx0XHRcdFx0dmFyIHNlZ21lbnREZWYgPSBhbmd1bGFyLmNvcHkoZHJhZ2dhYmxlTW9kZWwuY29uc3VtYWJsZURlZmluaXRpb24pO1xuXHRcdFx0XHRcdFx0XHRcdHNlZ21lbnREZWYubmFtZSA9IGRyYWdnYWJsZU1vZGVsLm5hbWU7XG5cdFx0XHRcdFx0XHRcdFx0YWRkSXRlbUF0KHNlZ21lbnREZWYsIGRyb3BJZHgpO1xuXHRcdFx0XHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ3VwZGF0ZVZhbGlkYXRpb25BcmVhJyk7XG5cdFx0XHRcdFx0XHRcdH0sIGZ1bmN0aW9uKGVycm9ycykge1xuXHRcdFx0XHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ2Rpc3BsYXlBbGVydCcsIHtcblx0XHRcdFx0XHRcdFx0XHRcdHR5cGU6ICdlcnJvcicsXG5cdFx0XHRcdFx0XHRcdFx0XHR0ZXh0OiAkZmlsdGVyKCdsMTBuJykoWyd1bmFibGVUb0xvYWRTZWdtZW50RGVmaW5pdGlvbicsICdVbmFibGUgdG8gbG9hZCB0aGUgc2VnbWVudCBkZWZpbml0aW9uLiBZb3UgbWF5IGhhdmUgbG9zdCB5b3VyIHNlc3Npb24uIFBsZWFzZSByZWZyZXNoIHRoZSBwYWdlIGFuZCB0cnkgYWdhaW4uJ10pXG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0YWRkSXRlbUF0KHtcblx0XHRcdFx0XHRcdFx0XHRwdXJwb3NlOiAncnVsZScsXG5cdFx0XHRcdFx0XHRcdFx0ZGlzcGxheURyb3BJbmRpY2F0b3JUb3A6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRcdGRpc3BsYXlEcm9wSW5kaWNhdG9yQm90dG9tOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0XHRzZXF1ZW5jZUNvbnRhaW5lclR5cGU6ICdzZXF1ZW5jZScsXG5cdFx0XHRcdFx0XHRcdFx0dHlwZTogZHJhZ2dhYmxlTW9kZWwudHlwZSxcblx0XHRcdFx0XHRcdFx0XHRpdGVtVHlwZTogZHJhZ2dhYmxlTW9kZWwuaXRlbVR5cGUsXG5cdFx0XHRcdFx0XHRcdFx0bmFtZTogZHJhZ2dhYmxlTW9kZWwubmFtZSxcblx0XHRcdFx0XHRcdFx0XHRpZDogZHJhZ2dhYmxlTW9kZWwuaWQsXG5cdFx0XHRcdFx0XHRcdFx0bW9kZWw6IGRyYWdnYWJsZU1vZGVsLFxuXHRcdFx0XHRcdFx0XHRcdGNvbXBhcmlzb25UeXBlOiBnZXREZWZhdWx0Q29tcGFyaXNvblR5cGUoZHJhZ2dhYmxlTW9kZWwpLFxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlOiAnJ1xuXHRcdFx0XHRcdFx0XHR9LCBnZXREcm9wSW5kZXgoKSk7XG5cdFx0XHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ3VwZGF0ZVZhbGlkYXRpb25BcmVhJyk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdG1vdmVEcmFnZ2FibGUoZHJhZ2dhYmxlTW9kZWwpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vVW5zZWxlY3QgYWxsIG9mIHRoZSBkcmFnZ2FibGVzLlxuXHRcdFx0XHRcdERyYWdNYW5hZ2VyLnNlbGVjdGVkRHJhZ2dhYmxlcy5mb3JFYWNoKGZ1bmN0aW9uKGRyYWdnYWJsZUl0ZW0pe1xuXHRcdFx0XHRcdFx0ZHJhZ2dhYmxlSXRlbS5zZWxlY3RlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdHVwZGF0ZVNlbGVjdGVkSXRlbXMoKTtcblx0XHRcdFx0XHRoaWRlRHJvcEluZGljYXRvcigpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHNjb3BlLm9uRHJhZ0xlYXZlID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRoaWRlRHJvcEluZGljYXRvcigpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHNjb3BlLm9uRHJhZ0Ryb3BPdXRzaWRlID0gZnVuY3Rpb24oZXZlbnQsIGRyYWdnYWJsZU1vZGVsKXtcblx0XHRcdFx0XHQvLyBUaGUgY3RybEtleSAod2luZG93cyB1c2VycykgYW5kIHRoZSBtZXRhS2V5IChtYWMgdXNlcnMpIGJvdGggcmVwcmVzZW50IGEgY29weSBpbnRlcmFjdGlvbiB3aGljaFxuXHRcdFx0XHRcdC8vIG1lYW5zIHRoYXQgbm90aGluZyBzaG91bGQgYmUgcmVtb3ZlZCBmcm9tIHRoZSBhcnJheS5cblx0XHRcdFx0XHRpZiAoZXZlbnQuY3RybEtleSB8fCBldmVudC5tZXRhS2V5KXtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvL0lmIGFuIGl0ZW0gb3IgYXJyYXkgb2YgaXRlbXMgd2FzIGRyb3BwZWQgaW50byBhIGRpZmZlcmVudCBjb250YWluZXIgdGhlbiByZW1vdmUgdGhlbSBmcm9tXG5cdFx0XHRcdFx0Ly90aGUgY3VycmVudCBjb250YWluZXIgYmVjYXVzZSB0aGV5IHdpbGwgYmUgYWRkZWQgZWxzZXdhcmUuXG5cdFx0XHRcdFx0aWYgKCQuaXNBcnJheShkcmFnZ2FibGVNb2RlbCkpe1xuXHRcdFx0XHRcdFx0ZHJhZ2dhYmxlTW9kZWwuZm9yRWFjaChmdW5jdGlvbihkbSl7XG5cdFx0XHRcdFx0XHRcdHJlbW92ZUl0ZW0oZG0pO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHJlbW92ZUl0ZW0oZHJhZ2dhYmxlTW9kZWwpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR1cGRhdGVTZWxlY3RlZEl0ZW1zKCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0ZnVuY3Rpb24gbW92ZURyYWdnYWJsZShkcmFnZ2FibGVNb2RlbCl7XG5cdFx0XHRcdFx0dmFyIGN1cnJlbnRJZHggPSBnZXRDdXJyZW50SW5kZXgoZHJhZ2dhYmxlTW9kZWwpLFxuXHRcdFx0XHRcdFx0ZHJvcElkeCA9IGdldERyb3BJbmRleCgpO1xuXG5cdFx0XHRcdFx0aWYgKGRyb3BJZHggIT0gLTEgJiYgY3VycmVudElkeCA9PSBkcm9wSWR4KXtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoY3VycmVudElkeCAhPT0gLTEgJiYgY3VycmVudElkeCA8IGRyb3BJZHgpe1xuXHRcdFx0XHRcdFx0Ly9TaW5jZSB0aGlzIGl0ZW0gYWxyZWFkeSBleGlzdHMgd2l0aGluIHRoZSBsaXN0IHdlIGhhdmUgdG8gc3VidHJhY3Qgb25lIHNvIHRoYXQgaXQgZG9lc24ndCBjb3VudFxuXHRcdFx0XHRcdFx0Ly9pdHNlbGYgaW4gdGhlIGxpc3QuXG5cdFx0XHRcdFx0XHRkcm9wSWR4LS07XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmVtb3ZlSXRlbShkcmFnZ2FibGVNb2RlbCk7XG5cdFx0XHRcdFx0YWRkSXRlbUF0KGRyYWdnYWJsZU1vZGVsLCBkcm9wSWR4KTtcblxuXHRcdFx0XHRcdC8vVW5zZXQgdGhlIHNlbGVjdGVkIHN0YXRlXG5cdFx0XHRcdFx0ZHJhZ2dhYmxlTW9kZWwuc2VsZWN0ZWQgPSBmYWxzZTtcblxuXHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ3VwZGF0ZVZhbGlkYXRpb25BcmVhJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBjb3B5RHJhZ2dhYmxlKGRyYWdnYWJsZU1vZGVsKXtcblx0XHRcdFx0XHQvL1JlbW92ZSB0aGUgc2VsZWN0ZWQgc3RhdGUgZnJvbSB0aGUgZHJhZ2dhYmxlLlxuXHRcdFx0XHRcdGRyYWdnYWJsZU1vZGVsLnNlbGVjdGVkID0gZmFsc2U7XG5cdFx0XHRcdFx0YWRkSXRlbUF0KHJlbW92ZURyb3BJbmRpY2F0b3IoYW5ndWxhci5jb3B5KGRyYWdnYWJsZU1vZGVsKSksIGdldERyb3BJbmRleCgpKTtcblxuXHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ3VwZGF0ZVZhbGlkYXRpb25BcmVhJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBjb3B5RHJhZ2dhYmxlQXJyYXkoZHJhZ2dhYmxlQXJyYXkpe1xuXHRcdFx0XHRcdHZhciBkcm9wSWR4ID0gZ2V0RHJvcEluZGV4KCk7XG5cdFx0XHRcdFx0ZHJhZ2dhYmxlQXJyYXkuZm9yRWFjaChmdW5jdGlvbihkcmFnZ2FibGVNb2RlbCl7XG5cdFx0XHRcdFx0XHQvL1JlbW92ZSB0aGUgc2VsZWN0ZWQgc3RhdGUgZnJvbSB0aGUgZHJhZ2dhYmxlLlxuXHRcdFx0XHRcdFx0ZHJhZ2dhYmxlTW9kZWwuc2VsZWN0ZWQgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGFkZEl0ZW1BdChyZW1vdmVEcm9wSW5kaWNhdG9yKGFuZ3VsYXIuY29weShkcmFnZ2FibGVNb2RlbCkpLCBkcm9wSWR4KTtcblx0XHRcdFx0XHRcdC8vSW5jcmVtZW50IHRoZSBkcm9wIGluZGV4IHNvIHRoYXQgdGhlIGl0ZW1zIHdvbid0IGJlIGFkZGVkIGluIHJldmVyc2Ugb3JkZXIuXG5cdFx0XHRcdFx0XHRkcm9wSWR4Kys7XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRldmVudEJ1cy5wdWJsaXNoKCd1cGRhdGVWYWxpZGF0aW9uQXJlYScpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZnVuY3Rpb24gbW92ZURyYWdnYWJsZUFycmF5KGRyYWdnYWJsZUFycmF5KXtcblx0XHRcdFx0XHR2YXIgZHJvcElkeCA9IGdldERyb3BJbmRleCgpO1xuXHRcdFx0XHRcdGlmIChkcm9wSWR4ICE9PSAtMSl7XG5cdFx0XHRcdFx0XHQvL1NwbGljZSBlYWNoIG9mIHRoZSBpdGVtcyBmcm9tIHRoZWlyIGN1cnJlbnQgbG9jYXRpb24uXG5cdFx0XHRcdFx0XHRmb3IgKHZhciBpID0gZHJhZ2dhYmxlQXJyYXkubGVuZ3RoLTE7IGkgPj0gMDsgaS0tKXtcblx0XHRcdFx0XHRcdFx0dmFyIGN1cnJlbnRJZHggPSBnZXRDdXJyZW50SW5kZXgoZHJhZ2dhYmxlQXJyYXlbaV0pO1xuXG5cdFx0XHRcdFx0XHRcdGlmIChjdXJyZW50SWR4ICE9PSAtMSAmJiBjdXJyZW50SWR4IDwgZHJvcElkeCl7XG5cdFx0XHRcdFx0XHRcdFx0ZHJvcElkeC0tO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0cmVtb3ZlSXRlbUF0SW5kZXgoY3VycmVudElkeCk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdC8vTm93IGFkZCB0aGUgaXRlbXMgYmFjayB0byB0aGUgYXJyYXkgaW4gb3JkZXIuXG5cdFx0XHRcdFx0XHRkcmFnZ2FibGVBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGRyYWdnYWJsZU1vZGVsKXtcblx0XHRcdFx0XHRcdFx0ZHJhZ2dhYmxlTW9kZWwuc2VsZWN0ZWQgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0YWRkSXRlbUF0KGRyYWdnYWJsZU1vZGVsLCBkcm9wSWR4KTtcblx0XHRcdFx0XHRcdFx0ZHJvcElkeCsrO1xuXHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZHJhZ2dhYmxlQXJyYXkuZm9yRWFjaChmdW5jdGlvbihkcmFnZ2FibGVNb2RlbCl7XG5cdFx0XHRcdFx0XHRcdGRyYWdnYWJsZU1vZGVsLnNlbGVjdGVkID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdGFkZEl0ZW1BdChkcmFnZ2FibGVNb2RlbCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRldmVudEJ1cy5wdWJsaXNoKCd1cGRhdGVWYWxpZGF0aW9uQXJlYScpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2NvcGUucmVtb3ZlRHJhZ2dhYmxlUnVsZSA9IGZ1bmN0aW9uKGRyYWdnYWJsZU1vZGVsKXtcblx0XHRcdFx0XHRyZW1vdmVJdGVtKGRyYWdnYWJsZU1vZGVsKTtcblx0XHRcdFx0XHRldmVudEJ1cy5wdWJsaXNoKCd1cGRhdGVWYWxpZGF0aW9uQXJlYScpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdC8vVGhpcyBoYXMgdG8gYmUgZG9uZSB0aHJvdWdoIGdvb2Qgb2xkIGZhc2hpb24gZXZlbnQgYnViYmxpbmcgYmVjYXVzZSBvZiBhIGRyb3Bab25lIHR5cGljYWxseVxuXHRcdFx0XHQvL2V4aXN0cyB3aXRoaW4gYSBjb250YWluZXIgd2hpY2ggY2FuJ3QgcmVtb3ZlIGl0c2VsZi4gVGhlcmVmb3JlIGFuIGV2ZW50IGlzIGRpc3BhdGNoZWQgdGhhdFxuXHRcdFx0XHQvL2lzIGNhdWdodCBoZXJlIGFuZCB0aGVuIHJlbW92ZWQuXG5cdFx0XHRcdGVsZW1lbnQub24oJ3JlbW92ZUNvbGxhcHNpYmxlQ29udGFpbmVyJywgZnVuY3Rpb24oZXZlbnQsIGRyYWdnYWJsZU1vZGVsKXtcblx0XHRcdFx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHRyZW1vdmVJdGVtKGRyYWdnYWJsZU1vZGVsKTtcblx0XHRcdFx0XHRldmVudEJ1cy5wdWJsaXNoKCd1cGRhdGVWYWxpZGF0aW9uQXJlYScpO1xuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRmdW5jdGlvbiB1cGRhdGVEcm9wSW5kaWNhdG9yKGxvY2FsUHQsIGRyYWdnYWJsZU1vZGVsKXtcblx0XHRcdFx0XHR2YXIgZHJvcEluZGljYXRvcnMgPSBlbGVtZW50LmNoaWxkcmVuKCcuc2VnbWVudC1pdGVtJyksXG5cdFx0XHRcdFx0XHR5UG9zID0gMDtcblxuXHRcdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgc2NvcGUuZGF0YU1vZGVsLml0ZW1zLmxlbmd0aDsgaSsrKXtcblx0XHRcdFx0XHRcdHZhciBkcm9wSW5kaWNhdG9yID0gJChkcm9wSW5kaWNhdG9ycy5nZXQoaSkpLFxuXHRcdFx0XHRcdFx0XHRkcm9wSW5kaWNhdG9yTW9kZWwgPSBzY29wZS5kYXRhTW9kZWwuaXRlbXNbaV0sXG5cdFx0XHRcdFx0XHRcdG5leHREcm9wSW5kaWNhdG9yTW9kZWwgPSAoaSsxKSA8IHNjb3BlLmRhdGFNb2RlbC5pdGVtcy5sZW5ndGggPyBzY29wZS5kYXRhTW9kZWwuaXRlbXNbaSsxXSA6IG51bGwsXG5cdFx0XHRcdFx0XHRcdGRyb3BJbmRpY2F0b3JSZWN0ID0ge1xuXHRcdFx0XHRcdFx0XHRcdHg6IDAsXG5cdFx0XHRcdFx0XHRcdFx0eTogeVBvcyxcblx0XHRcdFx0XHRcdFx0XHR3aWR0aDogZWxlbWVudC53aWR0aCgpLFxuXHRcdFx0XHRcdFx0XHRcdGhlaWdodDogZHJvcEluZGljYXRvci5oZWlnaHQoKSArIDIgLy9BZGQgdHdvIHBpeGVscyBzbyB0aGVyZSB3aWxsIGJlIG92ZXJsYXAgYmV0d2VlbiB0aGUgY29udGFpbmVycy5cblx0XHRcdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdFx0aWYgKHZpcnR1YWxEcm9wVGFyZ2V0U2VydmljZS5pc1BvaW50SW5SZWN0KGxvY2FsUHQsIGRyb3BJbmRpY2F0b3JSZWN0KSl7XG5cdFx0XHRcdFx0XHRcdGN1cnJlbnREcm9wSW5kaWNhdG9yTW9kZWwgPSBkcm9wSW5kaWNhdG9yTW9kZWw7XG5cblx0XHRcdFx0XHRcdFx0aWYgKGxvY2FsUHQueSA8PSAoZHJvcEluZGljYXRvclJlY3QueSArIGRyb3BJbmRpY2F0b3JSZWN0LmhlaWdodC8yKSl7XG5cdFx0XHRcdFx0XHRcdFx0YWRkRHJvcEluZGljYXRvclRvcChjdXJyZW50RHJvcEluZGljYXRvck1vZGVsKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChuZXh0RHJvcEluZGljYXRvck1vZGVsKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y3VycmVudERyb3BJbmRpY2F0b3JNb2RlbCA9IG5leHREcm9wSW5kaWNhdG9yTW9kZWw7XG5cblx0XHRcdFx0XHRcdFx0XHRyZW1vdmVEcm9wSW5kaWNhdG9yKGRyb3BJbmRpY2F0b3JNb2RlbCk7XG5cdFx0XHRcdFx0XHRcdFx0YWRkRHJvcEluZGljYXRvclRvcChjdXJyZW50RHJvcEluZGljYXRvck1vZGVsKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRhZGREcm9wSW5kaWNhdG9yQm90dG9tKGN1cnJlbnREcm9wSW5kaWNhdG9yTW9kZWwpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGRyb3BJbmRpY2F0b3JNb2RlbCAhPSBjdXJyZW50RHJvcEluZGljYXRvck1vZGVsKSB7XG5cdFx0XHRcdFx0XHRcdHJlbW92ZURyb3BJbmRpY2F0b3IoZHJvcEluZGljYXRvck1vZGVsKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0eVBvcyArPSBkcm9wSW5kaWNhdG9yUmVjdC5oZWlnaHQ7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c2NvcGUuc2hvd0RyYWdQcm94eSA9IHNjb3BlLmRhdGFNb2RlbC5pdGVtcy5sZW5ndGggPiAwIHx8IHRydWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBoaWRlRHJvcEluZGljYXRvcigpe1xuXHRcdFx0XHRcdGlmIChjdXJyZW50RHJvcEluZGljYXRvck1vZGVsKXtcblx0XHRcdFx0XHRcdHJlbW92ZURyb3BJbmRpY2F0b3IoY3VycmVudERyb3BJbmRpY2F0b3JNb2RlbCk7XG5cdFx0XHRcdFx0XHRjdXJyZW50RHJvcEluZGljYXRvck1vZGVsID0gbnVsbDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRzY29wZS5zaG93RHJhZ1Byb3h5ID0gZmFsc2U7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvL1doZW4gYW55IG9mIHRoZSBsb2dpY2FsIG9wZXJhdG9ycyBjaGFuZ2UgbWFrZSBzdXJlIHRvIHVwZGF0ZSBhbGwgb2YgdGhlbSBzbyB0aGF0IHRoZXkgc3RheSBpbiBzeW5jLlxuXHRcdFx0XHRzY29wZS5vbkxvZ2ljYWxPcGVyYXRvckNoYW5nZSA9IGZ1bmN0aW9uKG5ld1ZhbHVlKXtcblx0XHRcdFx0XHQvL0lmIHRoZSBvcGVyYXRvciBjaGFuZ2VzIHRvIG9yIGZyb20gc2VxdWVuY2UgdGhlbiB1cGRhdGUgdGhlIGxpc3Qgb2YgYXZhaWxhYmxlIGNvbnRleHRzIGZvciB0aGVcblx0XHRcdFx0XHQvL2NvbnRhaW5lcnMgaW4gdGhlIGxpc3QgYW5kIG1ha2Ugc3VyZSB0byBmb3JjZSB0aGUgY29udGFpbmVyIGludG8gYW4gYXBwcm9wcmlhdGUgY29udGV4dC4gVGhlcmUgaXNcblx0XHRcdFx0XHQvL25vIHZpc2l0b3JzIGNvbnRleHQgZm9yIHNlcXVlbmNlIGFuZCB0aGVyZSBpcyBubyBsb2dpY2dyb3VwIGNvbnRleHQgZm9yIGFuZC9vci5cblxuXHRcdFx0XHRcdHNjb3BlLmRhdGFNb2RlbC5pdGVtcy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pe1xuXHRcdFx0XHRcdFx0aWYgKGl0ZW0ucHVycG9zZSA9PSAnY29udGFpbmVyJyl7XG5cdFx0XHRcdFx0XHRcdC8vIFNldCB0aGUgY29udGV4dExpc3QgYmFzZWQgb2ZmIHRoZSBuZXcgdmFsdWUuXG5cdFx0XHRcdFx0XHRcdGl0ZW0uY29udGV4dExpc3QgPSBuZXdWYWx1ZSA9PSBMT0dJQ0FMX09QRVJBVE9SX1NFUVVFTkNFID8gY29udGV4dExpc3QudGhlbkRhdGEgOiBjb250ZXh0TGlzdC5kYXRhO1xuXG5cdFx0XHRcdFx0XHRcdC8vIElmIGl0IGlzIGNoYW5naW5nIHRvIGEgc2VxdWVuY2UgYW5kIHZpc2l0b3JzIHdhcyBzZWxlY3RlZCwgY2hhbmdlIGl0IHRvIGJlIGEgbG9naWMgZ3JvdXAuXG5cdFx0XHRcdFx0XHRcdC8vIGVsc2UsIGlmIGl0IGlzIG5vdCBhIHNlcXVlbmNlLCBtYWtlIHN1cmUgdGhhdCBsb2dpYyBncm91cCBnZXRzIHN3YXBwZWQgYmFjayB0byB2aXNpdG9yLlxuXHRcdFx0XHRcdFx0XHRpZihuZXdWYWx1ZSA9PSBMT0dJQ0FMX09QRVJBVE9SX1NFUVVFTkNFICYmIGl0ZW0uY29udGV4dCA9PSBDT05URVhUX1ZJU0lUT1JTKXtcblx0XHRcdFx0XHRcdFx0XHRpdGVtLmNvbnRleHQgPSBDT05URVhUX0xPR0lDX0dST1VQO1xuXHRcdFx0XHRcdFx0XHR9ZWxzZSBpZiggbmV3VmFsdWUgIT0gTE9HSUNBTF9PUEVSQVRPUl9TRVFVRU5DRSAmJiBpdGVtLmNvbnRleHQgPT0gQ09OVEVYVF9MT0dJQ19HUk9VUCl7XG5cdFx0XHRcdFx0XHRcdFx0aXRlbS5jb250ZXh0ID0gQ09OVEVYVF9WSVNJVE9SUztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0Ly9VcGRhdGUgdGhlIGRhdGFNb2RlbC5cblx0XHRcdFx0XHRzY29wZS5kYXRhTW9kZWwubG9naWNhbE9wZXJhdG9yID0gbmV3VmFsdWU7XG5cblx0XHRcdFx0XHQvL1VwZGF0ZSB0aGUgdmFsaWRhdGlvbiBhcmVhLlxuXHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ3VwZGF0ZVZhbGlkYXRpb25BcmVhJyk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0c2NvcGUudG9nZ2xlSXRlbVNlbGVjdGlvbiA9IGZ1bmN0aW9uKGV2ZW50LCBpdGVtKXtcblx0XHRcdFx0XHQvL0lmIHRoZSBkZWZhdWx0IGJ1dHRvbiBiZWhhdmlvciB3YXMgcHJldmVudGVkIHRoZW5cblx0XHRcdFx0XHRpZiAoZXZlbnQub3JpZ2luYWxFdmVudCAmJiAhZXZlbnQub3JpZ2luYWxFdmVudC5kZWZhdWx0UHJldmVudGVkKXtcblx0XHRcdFx0XHRcdC8vIFVuc2VsZWN0IGFsbCBvdGhlciBpdGVtcyBpbiBhbnkgb3RoZXIgYXJyYXkgb3IgaXRlbXMgd2l0aGluIHRoZSBzYW1lIGFycmF5IGFzIGxvbmcgYXNcblx0XHRcdFx0XHRcdC8vdGhlIGN0cmwgYW5kIHRoZSBtZXRhIGtleSB3ZXJlIG5vdCBwcmVzc2VkLlxuXHRcdFx0XHRcdFx0RHJhZ01hbmFnZXIuc2VsZWN0ZWREcmFnZ2FibGVzLmZvckVhY2goZnVuY3Rpb24oc2VsZWN0ZWRJdGVtKXtcblx0XHRcdFx0XHRcdFx0aWYgKCQuaW5BcnJheShzZWxlY3RlZEl0ZW0sIHNjb3BlLmRhdGFNb2RlbC5pdGVtcykgPT09IC0xIHx8XG5cdFx0XHRcdFx0XHRcdFx0KCFldmVudC5jdHJsS2V5ICYmICFldmVudC5tZXRhS2V5ICYmIHNlbGVjdGVkSXRlbSAhPT0gaXRlbSkpe1xuXHRcdFx0XHRcdFx0XHRcdHNlbGVjdGVkSXRlbS5zZWxlY3RlZCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0aXRlbS5zZWxlY3RlZCA9ICFpdGVtLnNlbGVjdGVkO1xuXHRcdFx0XHRcdFx0dXBkYXRlU2VsZWN0ZWRJdGVtcygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblxuXHRcdFx0XHRmdW5jdGlvbiB1cGRhdGVTZWxlY3RlZEl0ZW1zKCl7XG5cdFx0XHRcdFx0c2NvcGUuc2VsZWN0ZWRJdGVtcyA9IERyYWdNYW5hZ2VyLnNlbGVjdGVkRHJhZ2dhYmxlcyA9ICRmaWx0ZXIoJ2ZpbHRlcicpKHNjb3BlLmRhdGFNb2RlbC5pdGVtcywge3NlbGVjdGVkOnRydWV9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIGdldEN1cnJlbnRJbmRleChpdGVtKXtcblx0XHRcdFx0XHRyZXR1cm4gJC5pbkFycmF5KGl0ZW0sIHNjb3BlLmRhdGFNb2RlbC5pdGVtcyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBnZXREcm9wSW5kZXgoKXtcblx0XHRcdFx0XHR2YXIgZHJvcElkeCA9ICQuaW5BcnJheShjdXJyZW50RHJvcEluZGljYXRvck1vZGVsLCBzY29wZS5kYXRhTW9kZWwuaXRlbXMpO1xuXHRcdFx0XHRcdC8vSW5jcmVtZW50IHRoZSBkcm9wIGluZGV4IGlmIHRoZSBpbmRpY2F0b3IgaXMgZGlzcGxheWVkIG9uIHRoZSBib3R0b20uXG5cdFx0XHRcdFx0aWYgKGRyb3BJZHggIT09IC0xICYmIGN1cnJlbnREcm9wSW5kaWNhdG9yTW9kZWwuZGlzcGxheURyb3BJbmRpY2F0b3JCb3R0b20pe1xuXHRcdFx0XHRcdFx0ZHJvcElkeCArPSAxO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiBkcm9wSWR4O1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZnVuY3Rpb24gYWRkSXRlbUF0KGl0ZW0sIGlkeCl7XG5cdFx0XHRcdFx0aWR4ID0gJC5pc051bWVyaWMoaWR4KSA/IGlkeCA6IC0xO1xuXHRcdFx0XHRcdGlmIChpZHggIT09IC0xKXtcblx0XHRcdFx0XHRcdHNjb3BlLmRhdGFNb2RlbC5pdGVtcy5zcGxpY2UoaWR4LCAwLCBpdGVtKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0c2NvcGUuZGF0YU1vZGVsLml0ZW1zLnB1c2goaXRlbSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZnVuY3Rpb24gcmVtb3ZlSXRlbShpdGVtLCBkZWxldGVDb3VudCl7XG5cdFx0XHRcdFx0ZGVsZXRlQ291bnQgPSAkLmlzTnVtZXJpYyhkZWxldGVDb3VudCkgPyBkZWxldGVDb3VudCA6IDE7XG5cdFx0XHRcdFx0dmFyIGN1cnJlbnRJZHggPSBnZXRDdXJyZW50SW5kZXgoaXRlbSk7XG5cdFx0XHRcdFx0aWYgKGN1cnJlbnRJZHggIT09IC0xKXtcblx0XHRcdFx0XHRcdHNjb3BlLmRhdGFNb2RlbC5pdGVtcy5zcGxpY2UoY3VycmVudElkeCwgZGVsZXRlQ291bnQpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIHJlbW92ZUl0ZW1BdEluZGV4KGlkeCwgZGVsZXRlQ291bnQpe1xuXHRcdFx0XHRcdGRlbGV0ZUNvdW50ID0gJC5pc051bWVyaWMoZGVsZXRlQ291bnQpID8gZGVsZXRlQ291bnQgOiAxO1xuXHRcdFx0XHRcdGlmIChpZHggIT09IC0xKXtcblx0XHRcdFx0XHRcdHNjb3BlLmRhdGFNb2RlbC5pdGVtcy5zcGxpY2UoaWR4LCBkZWxldGVDb3VudCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZnVuY3Rpb24gYWRkRHJvcEluZGljYXRvclRvcChkcmFnZ2FibGVNb2RlbCl7XG5cdFx0XHRcdFx0ZHJhZ2dhYmxlTW9kZWwuZGlzcGxheURyb3BJbmRpY2F0b3JUb3AgPSB0cnVlO1xuXHRcdFx0XHRcdGRyYWdnYWJsZU1vZGVsLmRpc3BsYXlEcm9wSW5kaWNhdG9yQm90dG9tID0gZmFsc2U7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBhZGREcm9wSW5kaWNhdG9yQm90dG9tKGRyYWdnYWJsZU1vZGVsKXtcblx0XHRcdFx0XHRkcmFnZ2FibGVNb2RlbC5kaXNwbGF5RHJvcEluZGljYXRvclRvcCA9IGZhbHNlO1xuXHRcdFx0XHRcdGRyYWdnYWJsZU1vZGVsLmRpc3BsYXlEcm9wSW5kaWNhdG9yQm90dG9tID0gdHJ1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIHJlbW92ZURyb3BJbmRpY2F0b3IoZHJhZ2dhYmxlTW9kZWwpe1xuXHRcdFx0XHRcdGRyYWdnYWJsZU1vZGVsLmRpc3BsYXlEcm9wSW5kaWNhdG9yVG9wID0gZmFsc2U7XG5cdFx0XHRcdFx0ZHJhZ2dhYmxlTW9kZWwuZGlzcGxheURyb3BJbmRpY2F0b3JCb3R0b20gPSBmYWxzZTtcblx0XHRcdFx0XHRyZXR1cm4gZHJhZ2dhYmxlTW9kZWw7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmdW5jdGlvbiBnZXREZWZhdWx0Q29tcGFyaXNvblR5cGUoZHJhZ2dhYmxlTW9kZWwpe1xuXHRcdFx0XHRcdGlmIChkcmFnZ2FibGVNb2RlbCBpbnN0YW5jZW9mIERhdGVSYW5nZSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICdkYXRldGltZS13aXRoaW4nO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoZHJhZ2dhYmxlTW9kZWwudHlwZSA9PSAnaW50JyB8fCBkcmFnZ2FibGVNb2RlbC50eXBlID09ICdkZWNpbWFsJyl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ2VxJztcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoZHJhZ2dhYmxlTW9kZWwudHlwZSA9PSAnc3RyaW5nJyB8fCBkcmFnZ2FibGVNb2RlbC50eXBlID09ICdkYXRlJyB8fCBkcmFnZ2FibGVNb2RlbCA9PSAnZW51bScpe1xuXHRcdFx0XHRcdFx0cmV0dXJuICdzdHJlcSc7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHJldHVybiAnZXEnO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIHRyYWNrRHJhZ0Ryb3AoZHJhZ2dhYmxlTW9kZWwpIHtcblx0XHRcdFx0XHR0cmFja1NlcnZpY2UudHJhY2tBY3Rpb24obnVsbCwgJ0RyYWcgRHJvcCcsIHtcblx0XHRcdFx0XHRcdGl0ZW1UeXBlOiBkcmFnZ2FibGVNb2RlbC5pdGVtVHlwZSxcblx0XHRcdFx0XHRcdGl0ZW1OYW1lOiBkcmFnZ2FibGVNb2RlbC5uYW1lLFxuXHRcdFx0XHRcdFx0aXRlbUlkOiBkcmFnZ2FibGVNb2RlbC5pZFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7XG4iLCJpbXBvcnQge1xuXHRQb3BvdmVyXG59IGZyb20gJ3VpLWNvcmUnXG5cbmFuZ3VsYXIubW9kdWxlKCdzZWdtZW50LWJ1aWxkZXInKVxuXHQuZGlyZWN0aXZlKCdzYkdlYXJQb3BvdmVyJywgZnVuY3Rpb24gKGdlYXJPcHRpb25zLCAkdGltZW91dCwgZXZlbnRCdXMsIEdFQVJfTkVXX1NVQl9HUk9VUCwgR0VBUl9ERUxFVEUsIEdFQVJfTkFNRSwgR0VBUl9JTkNMVURFLFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRHRUFSX05FV19TVUJfR1JPVVBfRlJPTV9TRUxFQ1RJT04sIEdFQVJfU0VUX1RJTUVfRlJBTUUsIEdFQVJfRVhDTFVERSwgJHdpbmRvdywgS2V5cykge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZXMvc2ItZ2Vhci1wb3BvdmVyLnRwbC5odG1sJyxcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0cmVwbGFjZTogdHJ1ZSxcblx0XHRcdGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcblx0XHRcdFx0c2NvcGUub3B0aW9ucyA9ICBnZWFyT3B0aW9ucy5kYXRhO1xuXG5cdFx0XHRcdHNjb3BlLm9uSXRlbUNsaWNrID0gZnVuY3Rpb24oZXZlbnQsIG9wdGlvbil7XG5cdFx0XHRcdFx0c3dpdGNoKG9wdGlvbi52YWx1ZSl7XG5cdFx0XHRcdFx0XHRjYXNlIEdFQVJfTkVXX1NVQl9HUk9VUCA6XG5cdFx0XHRcdFx0XHRcdHNjb3BlLmNyZWF0ZVN1Ykdyb3VwKCk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSBHRUFSX05FV19TVUJfR1JPVVBfRlJPTV9TRUxFQ1RJT04gOlxuXHRcdFx0XHRcdFx0XHRzY29wZS5jcmVhdGVTdWJHcm91cEZyb21TZWxlY3Rpb24oKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRjYXNlIEdFQVJfRVhDTFVERSA6XG5cdFx0XHRcdFx0XHRcdHNjb3BlLmRhdGFNb2RlbC5leGNsdWRlID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0c2NvcGUub3B0aW9uRmlsdGVyLmV4Y2x1ZGUgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRldmVudEJ1cy5wdWJsaXNoKCd1cGRhdGVWYWxpZGF0aW9uQXJlYScpO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGNhc2UgR0VBUl9JTkNMVURFIDpcblx0XHRcdFx0XHRcdFx0c2NvcGUuZGF0YU1vZGVsLmV4Y2x1ZGUgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0c2NvcGUub3B0aW9uRmlsdGVyLmV4Y2x1ZGUgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0ZXZlbnRCdXMucHVibGlzaCgndXBkYXRlVmFsaWRhdGlvbkFyZWEnKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRjYXNlIEdFQVJfTkFNRSA6XG5cdFx0XHRcdFx0XHRcdHNjb3BlLm5hbWVDb250YWluZXIoKTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRjYXNlIEdFQVJfREVMRVRFIDpcblx0XHRcdFx0XHRcdFx0c2NvcGUuZGVsZXRlQ29udGFpbmVyKCk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFBvcG92ZXIuY2xvc2UoZWxlbWVudC5nZXQoMCkpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHZhciB1bndhdGNoID0gc2NvcGUuJHdhdGNoKCdkYXRhTW9kZWwnLCBmdW5jdGlvbihkYXRhTW9kZWwpe1xuXHRcdFx0XHRcdGlmIChkYXRhTW9kZWwpIHtcblx0XHRcdFx0XHRcdHNjb3BlLm9wdGlvbkZpbHRlciA9IHNjb3BlLm9wdGlvbkZpbHRlciB8fCB7XG5cdFx0XHRcdFx0XHRcdHNlbGVjdGVkSXRlbUxlbmd0aDogc2NvcGUuc2VsZWN0ZWRJdGVtcyA/IHNjb3BlLnNlbGVjdGVkSXRlbXMubGVuZ3RoIDogMCxcblx0XHRcdFx0XHRcdFx0bW9kZWw6IHNjb3BlLmRhdGFNb2RlbCxcblx0XHRcdFx0XHRcdFx0ZXhjbHVkZTogc2NvcGUuZGF0YU1vZGVsLmV4Y2x1ZGVcblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdHVud2F0Y2goKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHNjb3BlLiR3YXRjaENvbGxlY3Rpb24oJ3NlbGVjdGVkSXRlbXMnLCBmdW5jdGlvbihzZWxlY3RlZEl0ZW1zKXtcblx0XHRcdFx0XHRpZiAoc2NvcGUub3B0aW9uRmlsdGVyKSB7XG5cdFx0XHRcdFx0XHRzY29wZS5vcHRpb25GaWx0ZXIuc2VsZWN0ZWRJdGVtTGVuZ3RoID0gc2VsZWN0ZWRJdGVtcyA/IHNlbGVjdGVkSXRlbXMubGVuZ3RoIDogMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7IiwiaW1wb3J0IHtcblx0UG9wb3ZlclxufSBmcm9tICd1aS1jb3JlJ1xuXG5pbXBvcnQge1xuXHRzZXF1ZW5jZUNvbnRhaW5lclR5cGVzXG59IGZyb20gJ21vZGVsJ1xuXG5hbmd1bGFyLm1vZHVsZSgnc2VnbWVudC1idWlsZGVyJylcblx0LmRpcmVjdGl2ZSgnc2JQcmVmaXhTdWZmaXhQb3BvdmVyJywgZnVuY3Rpb24gKGNvbnRleHRMaXN0LCBldmVudEJ1cywgJHdpbmRvdykge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZXMvc2ItcHJlZml4LXN1ZmZpeC1wb3BvdmVyLnRwbC5odG1sJyxcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0cmVwbGFjZTogdHJ1ZSxcblx0XHRcdGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcblx0XHRcdFx0c2NvcGUucHJlZml4U3VmZml4TGlzdCA9IHNlcXVlbmNlQ29udGFpbmVyVHlwZXMubGlzdDtcblx0XHRcdFx0XG5cdFx0XHRcdHNjb3BlLm9uUHJlZml4U3VmZml4SXRlbUNsaWNrID0gZnVuY3Rpb24ob3B0aW9uKXtcblx0XHRcdFx0XHRzY29wZS5kYXRhTW9kZWwuc2VxdWVuY2VDb250YWluZXJUeXBlID0gb3B0aW9uLnZhbHVlO1xuXHRcdFx0XHRcdFBvcG92ZXIuY2xvc2UoZWxlbWVudC5nZXQoMCkpO1xuXHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ3VwZGF0ZVZhbGlkYXRpb25BcmVhJyk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Ly9BY2NvdW50IGZvciBjaGFuZ2luZyB0aGUgY29udGV4dCBleHRlcm5hbGx5LlxuXHRcdFx0XHRzY29wZS4kd2F0Y2goJ2RhdGFNb2RlbC5zZXF1ZW5jZUNvbnRhaW5lclR5cGUnLCBmdW5jdGlvbih0eXBlLCBvbGRUeXBlKXtcblx0XHRcdFx0XHRzY29wZS5jdXJyZW50UHJlZml4U3VmZml4SXRlbSA9IHNlcXVlbmNlQ29udGFpbmVyVHlwZXMuZ2V0QnlJZCh0eXBlKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7XG4iLCJcbmFuZ3VsYXIubW9kdWxlKCdzZWdtZW50LWJ1aWxkZXInKVxuXHQuZGlyZWN0aXZlKCdzYlNlZ21lbnREZWZpbml0aW9uJywgZnVuY3Rpb24gKCRmaWx0ZXIsIGNvbnRleHRMaXN0LCBkZWZpbml0aW9uUGFyc2VyLCBEcmFnTWFuYWdlciwgZXZlbnRCdXMsIF8pIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdkaXJlY3RpdmVzL3NiLXNlZ21lbnQtZGVmaW5pdGlvbi50cGwuaHRtbCcsXG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdHJlcGxhY2U6IHRydWUsXG5cdFx0XHRzY29wZToge1xuXHRcdFx0XHRkYXRhTW9kZWw6ICc9bW9kZWwnXG5cdFx0XHR9LFxuXHRcdFx0bGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuXHRcdFx0XHRzY29wZS5jb250ZXh0TGlzdCA9IGNvbnRleHRMaXN0LmRhdGE7XG5cdFx0XHRcdHNjb3BlLnNlbGVjdGVkSXRlbXMgPSBbXTtcblxuXHRcdFx0XHRzY29wZS5nZWFyUG9wb3ZlcklkID0gXy51bmlxdWVJZCgnc2JTZWdtZW50RGVmaW50aW9uT3B0aW9uc18nKTtcblx0XHRcdFx0c2NvcGUucHJlZml4U3VmZml4UG9wb3ZlcklkID0gXy51bmlxdWVJZCgncHJlZml4U3VmZml4UG9wb3ZlcklkXycpO1xuXG5cdFx0XHRcdHNjb3BlLmNyZWF0ZVN1Ykdyb3VwID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRzY29wZS5kYXRhTW9kZWwuaXRlbXMucHVzaChkZWZpbml0aW9uUGFyc2VyLmVtcHR5Q29udGFpbmVyTW9kZWwoc2NvcGUuZGF0YU1vZGVsKSk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0c2NvcGUuY3JlYXRlU3ViR3JvdXBGcm9tU2VsZWN0aW9uID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHR2YXIgbmV3Q29udGFpbmVyID0gZGVmaW5pdGlvblBhcnNlci5lbXB0eUNvbnRhaW5lck1vZGVsKHNjb3BlLmRhdGFNb2RlbCksXG5cdFx0XHRcdFx0XHRuZXdDb250YWluZXJJZHggPSBzY29wZS5kYXRhTW9kZWwuaXRlbXMubGVuZ3RoO1xuXG5cdFx0XHRcdFx0bmV3Q29udGFpbmVyLmNvbnRleHQgPSBzY29wZS5kYXRhTW9kZWwuY29udGV4dDtcblx0XHRcdFx0XHRuZXdDb250YWluZXIubG9naWNhbE9wZXJhdG9yID0gc2NvcGUuZGF0YU1vZGVsLmxvZ2ljYWxPcGVyYXRvcjtcblxuXHRcdFx0XHRcdHNjb3BlLnNlbGVjdGVkSXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKXtcblx0XHRcdFx0XHRcdHZhciBpdGVtSWR4ID0gJC5pbkFycmF5KGl0ZW0sIHNjb3BlLmRhdGFNb2RlbC5pdGVtcyk7XG5cdFx0XHRcdFx0XHRpZiAoaXRlbUlkeCAhPT0gLTEpe1xuXHRcdFx0XHRcdFx0XHRuZXdDb250YWluZXJJZHggPSBNYXRoLm1pbihuZXdDb250YWluZXJJZHgsIGl0ZW1JZHgpO1xuXG5cdFx0XHRcdFx0XHRcdC8vcmVtb3ZlIHRoZSBpdGVtIGZyb20gdGhlIGN1cnJlbnQgYXJyYXkuXG5cdFx0XHRcdFx0XHRcdHNjb3BlLmRhdGFNb2RlbC5pdGVtcy5zcGxpY2UoaXRlbUlkeCwgMSk7XG5cblx0XHRcdFx0XHRcdFx0Ly9yZW1vdmUgdGhlIHNlbGVjdGVkIHN0YXRlXG5cdFx0XHRcdFx0XHRcdGl0ZW0uc2VsZWN0ZWQgPSBmYWxzZTtcblxuXHRcdFx0XHRcdFx0XHQvL0FkZCB0aGUgaXRlbSB0byB0aGUgbmV3IGFycmF5LlxuXHRcdFx0XHRcdFx0XHRuZXdDb250YWluZXIuaXRlbXMucHVzaChpdGVtKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdC8vTm93IGFkZCB0aGUgbmV3IGNvbnRhaW5lciB3aXRoIHRoZSBpdGVtcyB0byB0aGUgaXRlbXMgYXJyYXkgYXQgdGhlIGFwcHJvcHJpYXRlIGluZGV4LlxuXHRcdFx0XHRcdHNjb3BlLmRhdGFNb2RlbC5pdGVtcy5zcGxpY2UobmV3Q29udGFpbmVySWR4LCAwLCBuZXdDb250YWluZXIpO1xuXG5cdFx0XHRcdFx0Ly9VcGRhdGUgdGhlIGZpbHRlcmVkIGl0ZW1zLlxuXHRcdFx0XHRcdHNjb3BlLnNlbGVjdGVkSXRlbXMgPSBEcmFnTWFuYWdlci5zZWxlY3RlZERyYWdnYWJsZXMgPSAkZmlsdGVyKCdmaWx0ZXInKShzY29wZS5kYXRhTW9kZWwuaXRlbXMsIHtzZWxlY3RlZDp0cnVlfSk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0c2NvcGUub25Ub3BMZXZlbENvbnRhaW5lckNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ3VwZGF0ZVZhbGlkYXRpb25BcmVhJyk7XG5cdFx0XHRcdH07XG5cdFx0XHRcdFxuXHRcdFx0XHRzY29wZS5oYXNPcGVyYXRvciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBzY29wZS5kYXRhTW9kZWwgJiYgc2NvcGUuZGF0YU1vZGVsLml0ZW1zLmxlbmd0aCA+IDE7XG5cdFx0XHRcdH07XG5cdFx0XHRcdFxuXHRcdFx0XHR2YXIgdW53YXRjaERhdGFNb2RlbCA9IHNjb3BlLiR3YXRjaCgnZGF0YU1vZGVsJywgZnVuY3Rpb24oZGF0YU1vZGVsKXtcblx0XHRcdFx0XHRpZiAoZGF0YU1vZGVsKXtcblx0XHRcdFx0XHRcdHNjb3BlLm9wdGlvbkZpbHRlciA9IHNjb3BlLm9wdGlvbkZpbHRlciB8fCB7XG5cdFx0XHRcdFx0XHRcdHNlbGVjdGVkSXRlbUxlbmd0aDogc2NvcGUuc2VsZWN0ZWRJdGVtcyA/IHNjb3BlLnNlbGVjdGVkSXRlbXMubGVuZ3RoIDogMCxcblx0XHRcdFx0XHRcdFx0bW9kZWw6IHNjb3BlLmRhdGFNb2RlbCxcblx0XHRcdFx0XHRcdFx0ZXhjbHVkZTogc2NvcGUuZGF0YU1vZGVsLmV4Y2x1ZGVcblx0XHRcdFx0XHRcdH07XG5cblx0XHRcdFx0XHRcdHNjb3BlLm9wdGlvbkZpbHRlci5leGNsdWRlTmFtZSA9IHRydWU7XG5cdFx0XHRcdFx0XHRzY29wZS5vcHRpb25GaWx0ZXIuZXhjbHVkZURlbGV0ZSA9IHRydWU7XG5cdFx0XHRcdFx0XHR1bndhdGNoRGF0YU1vZGVsKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcbiIsIlxuYW5ndWxhci5tb2R1bGUoJ3NlZ21lbnQtYnVpbGRlcicpXG5cdC5kaXJlY3RpdmUoJ3NiU2VnbWVudEl0ZW0nLCBmdW5jdGlvbiAoJGNvbXBpbGUsIGxvZ2ljYWxPcGVyYXRvcnMpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdkaXJlY3RpdmVzL3NiLXNlZ21lbnQtaXRlbS50cGwuaHRtbCcsXG5cdFx0XHRyZXN0cmljdDogJ0VBJyxcblx0XHRcdHJlcGxhY2U6IHRydWUsXG5cdFx0XHRjb21waWxlOiBmdW5jdGlvbiAoKXtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRwcmU6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycyl7XG5cdFx0XHRcdFx0XHRlbGVtZW50LmZpbmQoJy5keW5hbWljLWNvbnRlbnQnKS5hcHBlbmQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdFx0aWYgKHNjb3BlLml0ZW0ucHVycG9zZSA9PSAncnVsZScpe1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiAkY29tcGlsZSgnJyArXG5cdFx0XHRcdFx0XHRcdFx0XHQnPHNiLWRyYWdnYWJsZS1ydWxlICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQnZGF0YS1tb2RlbD1cIml0ZW1cIiAnICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0J3JlbW92ZS1pdGVtPVwicmVtb3ZlRHJhZ2dhYmxlUnVsZShpdGVtKVwiICcgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQndG9nZ2xlLWl0ZW0tc2VsZWN0aW9uPVwidG9nZ2xlSXRlbVNlbGVjdGlvbigkZXZlbnQsIGl0ZW0pXCI+JyArXG5cdFx0XHRcdFx0XHRcdFx0XHQnPC9zYi1kcmFnZ2FibGUtcnVsZT4nKShzY29wZSk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoc2NvcGUuaXRlbS5wdXJwb3NlID09ICdjb250YWluZXInKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuICRjb21waWxlKCc8c2ItZGVmaW5pdGlvbi1jb250YWluZXIgZGF0YS1tb2RlbD1cIml0ZW1cIj48L3NiLWRlZmluaXRpb24tY29udGFpbmVyPicpKHNjb3BlKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJyc7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHBvc3Q6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycyl7XG5cdFx0XHRcdFx0XHRzY29wZS5sb2dpY2FsT3BlcmF0b3JMaXN0ID0gbG9naWNhbE9wZXJhdG9ycy5kYXRhO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcbiIsImltcG9ydCB7XG5cdFBvcG92ZXJcbn0gZnJvbSAndWktY29yZSdcblxuYW5ndWxhci5tb2R1bGUoJ3NlZ21lbnQtYnVpbGRlcicpXG5cdC5kaXJlY3RpdmUoJ3NiU2VxdWVuY2VQaWxsQm94JywgZnVuY3Rpb24gKF8sICR3aW5kb3cpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dGVtcGxhdGVVcmw6ICdkaXJlY3RpdmVzL3NiLXNlcXVlbmNlLXBpbGwtYm94LnRwbC5odG1sJyxcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0cmVwbGFjZTogdHJ1ZSxcblx0XHRcdGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcblx0XHRcdFx0c2NvcGUuc2VxdWVuY2VTZWxlY3RvclBvcG92ZXJJZCA9IF8udW5pcXVlSWQoJ3NlcXVlbmNlUGlsbEJveF8nKTtcblx0XHRcdFx0c2NvcGUuc2V0QWN0aXZlU3RhdGUgPSBmYWxzZTtcblxuXHRcdFx0XHRlbGVtZW50Lm9uKCdzaG93JywgJy5jb3JhbC1Qb3BvdmVyJywgZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRzY29wZS5zZXRBY3RpdmVTdGF0ZSA9IHRydWU7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHNjb3BlLmhpZGVBZnRlcldpdGhpblBvcG92ZXIgPSBmdW5jdGlvbihldmVudCl7XG5cdFx0XHRcdFx0aWYgKCFldmVudCB8fCAhZXZlbnQuZGVmYXVsdFByZXZlbnRlZCl7XG5cdFx0XHRcdFx0XHRQb3BvdmVyLmNsb3NlKCQoJyMnICsgc2NvcGUuc2VxdWVuY2VTZWxlY3RvclBvcG92ZXJJZCkuZ2V0KDApKTtcblx0XHRcdFx0XHRcdHNjb3BlLnNldEFjdGl2ZVN0YXRlID0gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHNjb3BlLmFmdGVyQ2xpY2tIYW5kbGVyID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRpZiAoIXNjb3BlLml0ZW0uYWZ0ZXJUaW1lUmVzdHJpY3Rpb24pe1xuXHRcdFx0XHRcdFx0c2NvcGUuaXRlbS5hZnRlclRpbWVSZXN0cmljdGlvbiA9IHtcblx0XHRcdFx0XHRcdFx0Y291bnQ6ICcxJyxcblx0XHRcdFx0XHRcdFx0dW5pdDogJ3dlZWsnXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRzY29wZS5oaWRlQWZ0ZXJXaXRoaW5Qb3BvdmVyKCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0c2NvcGUud2l0aGluQ2xpY2tIYW5kbGVyID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRpZiAoIXNjb3BlLml0ZW0ud2l0aGluVGltZVJlc3RyaWN0aW9uKXtcblx0XHRcdFx0XHRcdHNjb3BlLml0ZW0ud2l0aGluVGltZVJlc3RyaWN0aW9uID0ge1xuXHRcdFx0XHRcdFx0XHRjb3VudDogJzEnLFxuXHRcdFx0XHRcdFx0XHR1bml0OiAnd2Vlaydcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHNjb3BlLmhpZGVBZnRlcldpdGhpblBvcG92ZXIoKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRzY29wZS5yZW1vdmVBZnRlclBpbGwgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdHNjb3BlLml0ZW0uYWZ0ZXJUaW1lUmVzdHJpY3Rpb24gPSBudWxsO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHNjb3BlLnJlbW92ZVdpdGhpblBpbGwgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdHNjb3BlLml0ZW0ud2l0aGluVGltZVJlc3RyaWN0aW9uID0gbnVsbDtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRzY29wZS5kaXNwbGF5U2VxdWVuY2VQdWxsZG93biA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0cmV0dXJuICFzY29wZS5pdGVtLndpdGhpblRpbWVSZXN0cmljdGlvbiB8fCAhc2NvcGUuaXRlbS5hZnRlclRpbWVSZXN0cmljdGlvbjtcblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcbiIsImltcG9ydCB7XG5cdFBvcG92ZXJcbn0gZnJvbSAndWktY29yZSdcblxuaW1wb3J0IHtcblx0bDEwbkNvbmZpZ1xufSBmcm9tICdjb3JlJ1xuXG5hbmd1bGFyLm1vZHVsZSgnc2VnbWVudC1idWlsZGVyJylcblx0LmRpcmVjdGl2ZSgnc2JTZXF1ZW5jZVBpbGwnLCBmdW5jdGlvbiAodGltZVJlc3RyaWN0aW9uc09wZXJhdG9ycywgJHRpbWVvdXQsIGV2ZW50QnVzLCBfLCAkd2luZG93KSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHRlbXBsYXRlVXJsOiAnZGlyZWN0aXZlcy9zYi1zZXF1ZW5jZS1waWxsLnRwbC5odG1sJyxcblx0XHRcdHJlc3RyaWN0OiAnRUEnLFxuXHRcdFx0cmVwbGFjZTogdHJ1ZSxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdGxhYmVsOiAnQCcsXG5cdFx0XHRcdGRhdGFNb2RlbDogJz1tb2RlbCcsXG5cdFx0XHRcdHJlbW92ZUl0ZW06ICcmJ1xuXHRcdFx0fSxcblx0XHRcdGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcblx0XHRcdFx0c2NvcGUuY291bnRCdXR0b25BY3RpdmUgPSBmYWxzZTtcblx0XHRcdFx0c2NvcGUuc2VxdWVuY2VOdW1iZXJJbnB1dFBvcG92ZXJJZCA9IF8udW5pcXVlSWQoJ3NlcXVlbmNlUGlsbF8nKTtcblxuXHRcdFx0XHQvLyBJZiBKYXBhbmVzZSBkaXNwbGF5OiAne251bWJlcn0ge3VuaXR9IEFGVEVSL1dJVEhJTicgaW5zdGVhZCBvZiAnQUZURVIvV0lUSElOIHtudW1iZXJ9IHt1bml0fSdcblx0XHRcdFx0c2NvcGUuaXNKYXBhbmVzZSA9IChsMTBuQ29uZmlnLmN1cnJlbnRMb2NhbGUgPT09ICdqcF9KUCcpID8gdHJ1ZSA6IGZhbHNlO1xuXG5cdFx0XHRcdGVsZW1lbnQub24oJ3Nob3cnLCAnLmNvcmFsLVBvcG92ZXInLCBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdHNjb3BlLmNvdW50QnV0dG9uQWN0aXZlID0gdHJ1ZTtcblx0XHRcdFx0XHQkdGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0ZWxlbWVudC5maW5kKCcuY29yYWwtVGV4dGZpZWxkJykuZm9jdXMoKTtcblx0XHRcdFx0XHR9LCA1MCk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHNjb3BlLm9uVGltZVVuaXRDaGFuZ2UgPSBmdW5jdGlvbih1bml0KXtcblx0XHRcdFx0XHRzY29wZS5kYXRhTW9kZWwudW5pdCA9IHVuaXQ7XG5cdFx0XHRcdFx0ZXZlbnRCdXMucHVibGlzaCgndXBkYXRlVmFsaWRhdGlvbkFyZWEnKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRlbGVtZW50Lm9uKCdoaWRlJywgJy5jb3JhbC1Qb3BvdmVyJywgZnVuY3Rpb24oKXtcblx0XHRcdFx0XHR2YXIgcG9wb3ZlciA9IGVsZW1lbnQuZmluZCgnLmNvcmFsLVBvcG92ZXInKSxcblx0XHRcdFx0XHRcdG51bWJlcmlucHV0ID0gZWxlbWVudC5maW5kKCcuY29yYWwtVGV4dGZpZWxkJyk7XG5cblx0XHRcdFx0XHRwb3BvdmVyLmhpZGUoKTtcblx0XHRcdFx0XHRudW1iZXJpbnB1dC5ibHVyKCk7XG5cblx0XHRcdFx0XHQvL01ha2Ugc3VyZSB0aGF0IGEgdmFsaWQgbnVtZXJpYyBzdHJpbmcgd2FzIHNhdmVkIHRoZW4gdGhlIGRpYWxvZyBpcyBoaWRkZW5cblx0XHRcdFx0XHR2YXIgY250ID0gcGFyc2VJbnQoc2NvcGUuZGF0YU1vZGVsLmNvdW50LCAxMCk7XG5cdFx0XHRcdFx0aWYgKGlzTmFOKGNudCkpe1xuXHRcdFx0XHRcdFx0c2NvcGUuZGF0YU1vZGVsLmNvdW50ID0gJzEnO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoY250IDwgMSl7XG5cdFx0XHRcdFx0XHRzY29wZS5kYXRhTW9kZWwuY291bnQgPSAoLWNudCkgKyAnJztcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0c2NvcGUuZGF0YU1vZGVsLmNvdW50ID0gY250ICsgJyc7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly9HZXQgcmlkIG9mIHRoZSBhY3RpdmUgc3RhdGUgZm9yIHRoZSBidXR0b24uXG5cdFx0XHRcdFx0c2NvcGUuY291bnRCdXR0b25BY3RpdmUgPSBmYWxzZTtcblxuXHRcdFx0XHRcdC8vIFVwZGF0ZSB2YWxpZGF0aW9uIGNoYXJ0LlxuXHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ3VwZGF0ZVZhbGlkYXRpb25BcmVhJyk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHNjb3BlLmhpZGVDb3VudFBvcG92ZXIgPSBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFBvcG92ZXIuY2xvc2UoZWxlbWVudC5maW5kKCcuY29yYWwtUG9wb3ZlcicpLmdldCgwKSk7XG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7XG4iLCJpbXBvcnQge1xuXHREaWFsb2csXG5cdE9tZWdhVHJhY2tcbn0gZnJvbSAndWktY29yZSdcblxuaW1wb3J0IHtcblx0VGFnXG59IGZyb20gJ21vZGVsJ1xuXG5pbXBvcnQge1xuXHRWcnNDb21wb25lbnRTYXZlVXRpbFxufSBmcm9tICd1aSdcblxuYW5ndWxhci5tb2R1bGUoJ3NlZ21lbnQtYnVpbGRlcicpLmRpcmVjdGl2ZSgnc2VnbWVudEJ1aWxkZXInLFxuXG5cdGZ1bmN0aW9uIChhbmFseXRpY3NDb25maWcsICRxLCAkZG9jdW1lbnQsICRsb2NhdGlvbixcblx0XHRcdCAgZXZlbnRCdXMsICRmaWx0ZXIsIHNlZ21lbnREZWZpbml0aW9uU2VydmljZSwgdXNlciwgYXBwTW9kZWwsIGFhbVNlcnZpY2UsIERyYWdNYW5hZ2VyLCBkZWZpbml0aW9uUGFyc2VyLFxuXHRcdFx0ICAkdGltZW91dCwgY2FsbGJhY2tSZWdpc3RyeVNlcnZpY2UsIHNwaW5uZXJTZXJ2aWNlLCB0YWdSZXBvc2l0b3J5LCB1dGlsLCBzZWdtZW50U3VtbWFyeVZpZXdTdGF0ZSxcblx0XHRcdCAgYXBwRGVmYXVsdHMsIGN1c3RvbUNhbGxiYWNrRXhlY3V0b3IsIHNjVXJsLCB0cmFja1NlcnZpY2UsXG5cdFx0XHQgIGFwcENhY2hlLCAkd2luZG93LCBtb21lbnQsIF8pIHtcblxuXHRcdHJldHVybiB7XG5cdFx0XHR0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZXMvc2VnbWVudC1idWlsZGVyLnRwbC5odG1sJyxcblx0XHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0XHRyZXBsYWNlOiBmYWxzZSxcblx0XHRcdHNjb3BlOiB7XG5cdFx0XHRcdGVtYmVkZGVkOiAnQCcsXG5cdFx0XHRcdGRlZmluaXRpb246ICc9Jyxcblx0XHRcdFx0ZWRpdElkOiAnPScsXG5cdFx0XHRcdGRhdGVSYW5nZTogJz0/Jyxcblx0XHRcdFx0cGFzdGVJZDogJz0nLFxuXHRcdFx0XHRzdGF0ZTogJz0nIC8vIHN0YXRlIHRoYXQgd2FzIHByZXZpb3VzbHkgc3RvcmVkIHdoZW4gY2FsbGluZyBzYXZlU3RhdGVcblx0XHRcdH0sXG5cdFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbiAoJHNjb3BlLCAkZWxlbWVudCwgJGF0dHJzLCBfKSB7XG5cblx0XHRcdFx0JHNjb3BlLnNiU3Bpbm5lcklkID0gXy51bmlxdWVJZCgnc2JTcGlubmVyJyk7XG5cdFx0XHRcdC8vIFdoZW4gdGhpcyBkaXJlY3RpdmUgaXMgZW1iZWRkZWQgKGUuZy4gc2hvd24gaW5saW5lIGluIHdvcmtzcGFjZSlcblx0XHRcdFx0Ly8gd2UgbmVlZCB0byBjb21tdW5pY2F0ZSB3aXRoIHRoZSBwYXJlbnQgd2hlbiB0aGUgbWV0cmljIGlzIHZhbGlkIGFuZFxuXHRcdFx0XHQvLyBhbmQgY2FuIGJlIHNhdmVkLiBXZSBhbHNvIGxpc3RlbiBmb3IgYSBzYXZlIGV2ZW50IHNvIHRoZSBwYXJlbnQgY2FuXG5cdFx0XHRcdC8vIGNhbGwgc2F2ZSB3aGVuIHRoZSBzYXZlIGJ1dHRvbiBpcyBjbGlja2VkXG5cblx0XHRcdFx0aWYgKCRzY29wZS5lbWJlZGRlZCkge1xuXG5cdFx0XHRcdFx0JHNjb3BlLmNvbnRyb2xPYmplY3QgPSB7fTtcblxuXHRcdFx0XHRcdCRzY29wZS4kd2F0Y2goJ2NvbnRyb2xPYmplY3QuaXNWYWxpZCcsIGZ1bmN0aW9uKGNhblNhdmUpIHtcblx0XHRcdFx0XHRcdCRlbGVtZW50LnRyaWdnZXIoJ2Nhbi1zYXZlJywgY2FuU2F2ZSk7XG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHQkc2NvcGUuJHdhdGNoKCdjb250cm9sT2JqZWN0LmlzVmFsaWQnLCBmdW5jdGlvbihjYW5TYXZlQXMpIHtcblx0XHRcdFx0XHRcdCRlbGVtZW50LnRyaWdnZXIoJ2Nhbi1zYXZlLWFzJywgY2FuU2F2ZUFzKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCRzY29wZS5zZWdtZW50U3VtbWFyeVZpZXdTdGF0ZSA9IHNlZ21lbnRTdW1tYXJ5Vmlld1N0YXRlO1xuXHRcdFx0XHQkc2NvcGUuYWxlcnRzID0gW107XG5cdFx0XHRcdCRzY29wZS5pbml0aWFsaXppbmcgPSB0cnVlO1xuXHRcdFx0XHQkc2NvcGUuZHJhZ01hbmFnZXIgPSBEcmFnTWFuYWdlcjtcblx0XHRcdFx0JHNjb3BlLmRyYWdnaW5nID0gRHJhZ01hbmFnZXIuZHJhZ2dpbmc7XG5cdFx0XHRcdCRzY29wZS5zZWdtZW50U2VydmljZSA9IHNlZ21lbnREZWZpbml0aW9uU2VydmljZTtcblx0XHRcdFx0JHNjb3BlLmN1cnJlbnRSZXBvcnRTdWl0ZU5hbWUgPSBhcHBNb2RlbC5yZXBvcnRTdWl0ZS5uYW1lO1xuXHRcdFx0XHQkc2NvcGUudGFncyA9IG51bGw7XG5cdFx0XHRcdCRzY29wZS5jbGlja1RvQWRkTmV3SXRlbUxhYmVsID0gJGZpbHRlcignbDEwbicpKFsnc2JjbGlja1RvQWRkTmV3SXRlbUxhYmVsJywgJ0NsaWNrIHRvIGFkZCB0YWcgXFwnJXNcXCcnXSk7XG5cdFx0XHRcdCRzY29wZS5SU0lERmlsdGVyID0ge1xuXHRcdFx0XHRcdHNlZ21lbnRzOiB0cnVlXG5cdFx0XHRcdH07XG5cdFx0XHRcdCRzY29wZS5jdXJyZW50UmVwb3J0U3VpdGVOYW1lID0gYXBwTW9kZWwucmVwb3J0U3VpdGUubmFtZTtcblxuXHRcdFx0XHRpZiAoISRzY29wZS5lbWJlZGRlZCkge1xuXHRcdFx0XHRcdCRzY29wZS5jYWxsYmFja0tleSA9ICdzZWdtZW50LWJ1aWxkZXInO1xuXHRcdFx0XHRcdGNhbGxiYWNrUmVnaXN0cnlTZXJ2aWNlLmZldGNoQ2FsbGJhY2tQYXJhbXMoJHNjb3BlLmNhbGxiYWNrS2V5KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCRzY29wZS5pbml0RGF0YSA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0c3Bpbm5lclNlcnZpY2Uuc2hvdygkc2NvcGUuc2JTcGlubmVySWQpO1xuXHRcdFx0XHRcdHRyYWNrU2VydmljZS50cmFja0FjdGlvbihudWxsLCAnU2VnbWVudCBCdWlsZGVyIExvYWQnLCB7XG5cdFx0XHRcdFx0XHR0eXBlOiBwYWdlTG9hZFR5cGUoKVxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdFx0aWYgKCEkc2NvcGUuZWRpdElkKXtcblx0XHRcdFx0XHRcdC8vQ2hhbmdlIHRoZSB0aXRsZSBmb3Jcblx0XHRcdFx0XHRcdGFuYWx5dGljc0NvbmZpZy5oZWFkZXJDb25maWcudGl0bGUgPSAkZmlsdGVyKCdsMTBuJykoWyduZXdTZWdtZW50VGl0bGUnLCAnQ3JlYXRlIE5ldyBTZWdtZW50J10pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHNlZ21lbnREZWZpbml0aW9uU2VydmljZS5sb2FkU2VnbWVudCgkc2NvcGUuZWRpdElkLCAkc2NvcGUuZGVmaW5pdGlvbiB8fCAkc2NvcGUucGFzdGVJZCkudGhlbigoc2VnbWVudCkgPT4ge1xuXHRcdFx0XHRcdFx0JHNjb3BlLmluaXRTZWdtZW50KCRzY29wZS5zdGF0ZSB8fCBzZWdtZW50KTtcblx0XHRcdFx0XHRcdHNwaW5uZXJTZXJ2aWNlLmhpZGUoJHNjb3BlLnNiU3Bpbm5lcklkKTtcblx0XHRcdFx0XHRcdCRzY29wZS5pbml0aWFsaXppbmcgPSBmYWxzZTtcblx0XHRcdFx0XHR9KS5jYXRjaCgoZSkgPT4ge1xuXHRcdFx0XHRcdFx0c3Bpbm5lclNlcnZpY2UuaGlkZSgkc2NvcGUuc2JTcGlubmVySWQpO1xuXHRcdFx0XHRcdFx0JHNjb3BlLmluaXRpYWxpemluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRzY29wZS5pbml0U2VnbWVudCA9IGZ1bmN0aW9uKHNlZ21lbnQpe1xuXHRcdFx0XHRcdC8vIGRlZmF1bHQgdG8gZmFsc2UgLSB2YWxpZGF0aW9uIGNoYXJ0IChzZWdtZW50U3VtbWFyeSBzZXJ2aWNlKSB3aWxsIHVwZGF0ZSB2YWxpZGl0eVxuXHRcdFx0XHRcdF8uc2V0KCRzY29wZSwgJ2NvbnRyb2xPYmplY3QuaXNWYWxpZCcsIGZhbHNlKTtcblxuXHRcdFx0XHRcdF8uZXh0ZW5kKHNlZ21lbnQsICRzY29wZS5kZWZpbml0aW9uKTtcblx0XHRcdFx0XHQkc2NvcGUuc2VnbWVudCA9IHNlZ21lbnQ7XG5cdFx0XHRcdFx0Ly8gb3ZlcndyaXRlIHRoZSBleGlzdGluZyByc2lkIHdpdGggdGhlIGN1cnJlbnQgcnNpZCAob24gc2F2ZSB3ZSB3YW50IHRvIHNhdmUgdGhlIGN1cnJlbnQgcnNpZClcblx0XHRcdFx0XHQkc2NvcGUuc2VnbWVudC5yc2lkID0gYXBwTW9kZWwucmVwb3J0U3VpdGUucnNpZDtcblxuXHRcdFx0XHRcdGlmICgkc2NvcGUuc2VnbWVudC5kd0luVXNlKSB7XG5cdFx0XHRcdFx0XHRhcHBNb2RlbC5hZGRBbGVydCh7XG5cdFx0XHRcdFx0XHRcdHZhcmlhbnQ6ICdpbmZvJyxcblx0XHRcdFx0XHRcdFx0YXV0b0hpZGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRjbG9zYWJsZTogdHJ1ZSxcblx0XHRcdFx0XHRcdFx0Y29udGVudHM6ICRmaWx0ZXIoJ2wxMG4nKShbJ2RhdGFXYXJlaG91c2VJblVzZVdhcm5pbmdUZXh0JywgJ1RoaXMgc2VnbWVudCBpcyBjdXJyZW50bHkgaW4gdXNlIGJ5IERhdGEgV2FyZWhvdXNlLiddKVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCRzY29wZS5zZWdtZW50LmFzaUluVXNlKSB7XG5cdFx0XHRcdFx0XHRhcHBNb2RlbC5hZGRBbGVydCh7XG5cdFx0XHRcdFx0XHRcdHZhcmlhbnQ6ICdpbmZvJyxcblx0XHRcdFx0XHRcdFx0YXV0b0hpZGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHRjbG9zYWJsZTogdHJ1ZSxcblx0XHRcdFx0XHRcdFx0Y29udGVudHM6ICRmaWx0ZXIoJ2wxMG4nKShbJ2FzaUluVXNlV2FybmluZ1RleHQnLCAnVGhpcyBzZWdtZW50IGlzIGN1cnJlbnRseSBpbiB1c2UgYnkgQVNJLiddKVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0c2V0dXBBYW1VaUVsZW1lbnRzKCk7XHQvLyBwdWJsaXNoIHRvIG1hcmtldGluZyBjbG91ZFxuXHRcdFx0XHRcdCRzY29wZS5pbml0aWFsbHlJc0ludGVybmFsID0gc2VnbWVudC5pbnRlcm5hbDtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRmdW5jdGlvbiBzZXR1cEFhbVVpRWxlbWVudHMoKSB7XG5cdFx0XHRcdFx0Ly8gbG9hZCBleGl0aW5nIGxvb2tiYWNrIHZhbHVlLCBvciBzZXQgaXQgdG8gdGhlIGRlZmF1bHRcblx0XHRcdFx0XHQkc2NvcGUubG9va2JhY2tWYWx1ZSA9ICRzY29wZS5zZWdtZW50LmFhbVN0YXR1cy5pbmZvW2FwcE1vZGVsLnJlcG9ydFN1aXRlLnJzaWRdID9cblx0XHRcdFx0XHRcdCRzY29wZS5zZWdtZW50LmFhbVN0YXR1cy5pbmZvW2FwcE1vZGVsLnJlcG9ydFN1aXRlLnJzaWRdLmxvb2tiYWNrVmFsdWUgOlxuXHRcdFx0XHRcdFx0YXBwRGVmYXVsdHMuYXVkaWVuY2VQcmVzZXRXaW5kb3c7IC8vIGRlZmF1bHQgdmFsdWUgZm9yIGFhbSB3aW5kb3cgcHJlc2V0c1xuXG5cdFx0XHRcdFx0JHNjb3BlLnByZXNldHMgPSBbXG5cdFx0XHRcdFx0XHR7IGxhYmVsOiAkZmlsdGVyKCdsMTBuJykoWydhdWRpZW5jZVdpbmRvd1ByZXNldExhYmVsJywgJ0xhc3QgJXMgZGF5cyddLCcxNScpLCB2YWx1ZTogJzE1JyB9LFxuXHRcdFx0XHRcdFx0eyBsYWJlbDogJGZpbHRlcignbDEwbicpKFsnYXVkaWVuY2VXaW5kb3dQcmVzZXRMYWJlbCcsICdMYXN0ICVzIGRheXMnXSwgJzMwJyksIHZhbHVlOiAnMzAnIH0sXG5cdFx0XHRcdFx0XHR7IGxhYmVsOiAkZmlsdGVyKCdsMTBuJykoWydhdWRpZW5jZVdpbmRvd1ByZXNldExhYmVsJywgJ0xhc3QgJXMgZGF5cyddLCAnNjAnKSwgdmFsdWU6ICc2MCcgfSxcblx0XHRcdFx0XHRcdHsgbGFiZWw6ICRmaWx0ZXIoJ2wxMG4nKShbJ2F1ZGllbmNlV2luZG93UHJlc2V0TGFiZWwnLCAnTGFzdCAlcyBkYXlzJ10sICc5MCcpLCB2YWx1ZTogJzkwJyB9LFxuXHRcdFx0XHRcdFx0eyBsYWJlbDogJGZpbHRlcignbDEwbicpKFsnYXVkaWVuY2VXaW5kb3dQcmVzZXRMYWJlbCcsICdMYXN0ICVzIGRheXMnXSwgJzEyMCcpLCB2YWx1ZTogJzEyMCcgfVxuXHRcdFx0XHRcdF07XG5cblx0XHRcdFx0XHQvLyBpbi11c2UgYnkgYWFtIGZvciBhbnkgcmVwb3J0IHN1aXRlP1xuXHRcdFx0XHRcdGlmICgkc2NvcGUuc2VnbWVudC5hYW1TdGF0dXMuaW5Vc2UubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdFx0dmFyIHRleHRTaW5ndWxhciA9ICRmaWx0ZXIoJ2wxMG4nKShbJ3NlZ21lbnRJblVzZUJ5TWFya2V0aW5nQ2xvdWRXYXJuaW5nU2luZ3VsYXInLCAnVGhpcyBwdWJsaXNoZWQgc2VnbWVudCBpcyBjdXJyZW50bHkgaW4gdXNlIGluIHRoZSBNYXJrZXRpbmcgQ2xvdWQgZm9yIHJlcG9ydCBzdWl0ZSAlcy4gSWYgeW91IG1ha2UgY2hhbmdlcyB0byB0aGUgc2VnbWVudCwgaXQgbWF5IGFmZmVjdCBtYXJrZXRpbmcgZWZmb3J0cyB3aXRoaW4geW91ciBvcmdhbml6YXRpb24uIFBsZWFzZSBhbHNvIG5vdGUsIGFjdGl2ZSBNYXJrZXRpbmcgQ2xvdWQgc2VnbWVudHMgY2Fubm90IGJlIGRlbGV0ZWQgb3IgdW5wdWJsaXNoZWQuJ10sICRzY29wZS5zZWdtZW50LmFhbVN0YXR1cy5pblVzZS5qb2luKCcsICcpKTtcblx0XHRcdFx0XHRcdHZhciB0ZXh0UGx1cmFsID0gJGZpbHRlcignbDEwbicpKFsnc2VnbWVudEluVXNlQnlNYXJrZXRpbmdDbG91ZFdhcm5pbmcnLCAnVGhpcyBwdWJsaXNoZWQgc2VnbWVudCBpcyBjdXJyZW50bHkgaW4gdXNlIGluIHRoZSBNYXJrZXRpbmcgQ2xvdWQgZm9yIHJlcG9ydCBzdWl0ZXMgJXMuIElmIHlvdSBtYWtlIGNoYW5nZXMgdG8gdGhlIHNlZ21lbnQsIGl0IG1heSBhZmZlY3QgbWFya2V0aW5nIGVmZm9ydHMgd2l0aGluIHlvdXIgb3JnYW5pemF0aW9uLiBQbGVhc2UgYWxzbyBub3RlLCBhY3RpdmUgTWFya2V0aW5nIENsb3VkIHNlZ21lbnRzIGNhbm5vdCBiZSBkZWxldGVkIG9yIHVucHVibGlzaGVkLiddLCAkc2NvcGUuc2VnbWVudC5hYW1TdGF0dXMuaW5Vc2Uuam9pbignLCAnKSk7XG5cdFx0XHRcdFx0XHRhcHBNb2RlbC5hZGRBbGVydCh7XG5cdFx0XHRcdFx0XHRcdHZhcmlhbnQ6ICdub3RpY2UnLFxuXHRcdFx0XHRcdFx0XHRhdXRvSGlkZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdGNsb3NhYmxlOiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRjb250ZW50czogJHNjb3BlLnNlZ21lbnQuYWFtU3RhdHVzLmluVXNlLmxlbmd0aCA9PSAxID8gdGV4dFNpbmd1bGFyIDogdGV4dFBsdXJhbFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gYWFtIHN0YXR1cyBmb3IgdGhlIGN1cnJlbnQgcmVwb3J0IHN1aXRlXG5cdFx0XHRcdFx0aWYgKCRzY29wZS5zZWdtZW50LmFhbVN0YXR1cy5wdWJsaXNoZWQuaW5kZXhPZihhcHBNb2RlbC5yZXBvcnRTdWl0ZS5yc2lkKSAhPSAtMSkge1xuXHRcdFx0XHRcdFx0JHNjb3BlLmNhblNoYXJlVG9NQyA9IHRydWU7XG5cdFx0XHRcdFx0XHQkc2NvcGUuc2hhcmVkVG9NQyA9IHRydWU7XG5cblx0XHRcdFx0XHRcdC8vIGlmIGl0J3MgaW4gdGhlIFwiaW5Vc2VcIiBsaXN0LCBpdCB3aWxsIGFsc28gYmUgaW4gdGhlIFwicHVibGlzaGVkXCIgbGlzdFxuXHRcdFx0XHRcdFx0aWYgKCRzY29wZS5zZWdtZW50LmFhbVN0YXR1cy5pblVzZS5pbmRleE9mKGFwcE1vZGVsLnJlcG9ydFN1aXRlLnJzaWQpICE9IC0xKSB7XG5cdFx0XHRcdFx0XHRcdCRzY29wZS5zZWdtZW50LmFhbVN0YXR1c0ZvckN1cnJlbnRSc2lkID0gJ2luVXNlJztcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCRzY29wZS5zZWdtZW50LmFhbVN0YXR1c0ZvckN1cnJlbnRSc2lkID0gJ3B1Ymxpc2hlZCc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIGZpZ3VyZSBvdXQgaWYgYWFtIGlzIGNvbmZpZ3VyZWQgZm9yIHRoaXMgcmVwb3J0IHN1aXRlXG5cdFx0XHRcdFx0XHRhYW1TZXJ2aWNlLmFhbUNvbmZpZ3VyZWQoYXBwTW9kZWwucmVwb3J0U3VpdGUucnNpZCwgZnVuY3Rpb24ocmVzdWx0KSB7XG5cdFx0XHRcdFx0XHRcdCRzY29wZS5jYW5TaGFyZVRvTUMgPSByZXN1bHQuYWFtQ29uZmlndXJlZDtcblx0XHRcdFx0XHRcdFx0JHNjb3BlLnNoYXJlZFRvTUMgPSBmYWxzZTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdCRzY29wZS5oYXNQZXJtaXNzaW9uRm9yUnNpZCA9IGFwcE1vZGVsLnJlcG9ydFN1aXRlLnBlcm1pc3Npb25zLnNlZ21lbnRDcmVhdGlvbjtcblx0XHRcdFx0aWYgKCEkc2NvcGUuaGFzUGVybWlzc2lvbkZvclJzaWQpIHtcblx0XHRcdFx0XHRhcHBNb2RlbC5hZGRBbGVydCh7XG5cdFx0XHRcdFx0XHR2YXJpYW50OiAnZXJyb3InLFxuXHRcdFx0XHRcdFx0YXV0b0hpZGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0Y2xvc2FibGU6IHRydWUsXG5cdFx0XHRcdFx0XHRjb250ZW50czogJGZpbHRlcignbDEwbicpKFsnZG9lc05vdEhhdmVQZXJtaXNzaW9uJywgJ1lvdSBkbyBub3QgaGF2ZSBwZXJtaXNzaW9uIHRvIGNyZWF0ZSBjb21wb25lbnRzIGZvciB0aGlzIHJlcG9ydCBzdWl0ZS4nXSlcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCRzY29wZS5jYW5TYXZlU2VnbWVudCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiAoISRzY29wZS5zZWdtZW50IHx8ICEkc2NvcGUuc2VnbWVudC5pZCB8fCAodXNlci5pc0FkbWluIHx8ICRzY29wZS5zZWdtZW50Lm93bmVyLmlkID09IHVzZXIuaWQpKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkc2NvcGUuY2FuRGVsZXRlU2VnbWVudCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiAoJHNjb3BlLnNlZ21lbnQgJiYgJHNjb3BlLnNlZ21lbnQuaWQgJiYgKHVzZXIuaXNBZG1pbiB8fCAkc2NvcGUuc2VnbWVudC5vd25lci5pZCA9PSB1c2VyLmlkKSk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JHNjb3BlLnNob3dTYXZlUHJvbXB0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKCRzY29wZS5zZWdtZW50LnZpcnR1YWxSZXBvcnRTdWl0ZXMgJiYgJHNjb3BlLnNlZ21lbnQudmlydHVhbFJlcG9ydFN1aXRlcy5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdGxldCBjb25maXJtTGFiZWwgPSAkZmlsdGVyKCdsMTBuJykoWydhcmVZb3VTdXJlWW91V2FudFRvU2F2ZVdhcm5pbmdUZXh0VlJTJyxcblx0XHRcdFx0XHRcdFx0XHQnWW91IGFyZSBhYm91dCB0byBlZGl0IGEgc2VnbWVudCB0aGF0IGlzIHVzZWQgaW4gYSBWaXJ0dWFsIFJlcG9ydCBTdWl0ZSBkZWZpbml0aW9uLiBBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gc2F2ZSB5b3VyIGNoYW5nZXM/J10pO1xuXG5cdFx0XHRcdFx0XHREaWFsb2cuY29uZmlybShjb25maXJtTGFiZWwpLnRoZW4oKCkgPT4gc2F2ZVNlZ21lbnQoKSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHNhdmVTZWdtZW50KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRcblx0XHRcdFx0dmFyIHNhdmVTZWdtZW50ID0gVnJzQ29tcG9uZW50U2F2ZVV0aWwuZW5oYW5jZVNhdmVGdW5jdGlvbihhcHBNb2RlbCwgZnVuY3Rpb24ob3B0aW9ucykge1xuXHRcdFx0XHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdFx0XHRcdFx0aWYgKHNlZ21lbnRTdW1tYXJ5Vmlld1N0YXRlLmxvYWRpbmdTZWdtZW50U3VtbWFyeSkgeyAvLyBkb24ndCBsZXQgdXNlciBzYXZlIHNlZ21lbnQgaWYgY29tcGF0aWJpbGl0eSBoYXNuJ3QgZmluaXNoZWQgbG9hZGluZ1xuXHRcdFx0XHRcdFx0c3Bpbm5lclNlcnZpY2Uuc2hvdygkc2NvcGUuc2JTcGlubmVySWQpO1xuXHRcdFx0XHRcdFx0dmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0XHRcdFx0XHR2YXIgdW5iaW5kV2F0Y2ggPSAkc2NvcGUuJHdhdGNoKCdzZWdtZW50U3VtbWFyeVZpZXdTdGF0ZS5sb2FkaW5nU2VnbWVudFN1bW1hcnknLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoIXNlZ21lbnRTdW1tYXJ5Vmlld1N0YXRlLmxvYWRpbmdTZWdtZW50U3VtbWFyeSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0c3Bpbm5lclNlcnZpY2UuaGlkZSgkc2NvcGUuc2JTcGlubmVySWQpO1xuXHRcdFx0XHRcdFx0XHRcdFx0dW5iaW5kV2F0Y2goKTtcblx0XHRcdFx0XHRcdFx0XHRcdCAvLyBCdWcgQU4tMTQwOTUxOiBXaGVuIHVzZWQgYXMgYW4gaW5saW5lIGVkaXRvciwgaXQgZXhwZWN0cyBzYXZlU2VnbWVudCB0byByZXR1cm4gYSBwcm9taXNlLlxuXHRcdFx0XHRcdFx0XHRcdFx0IC8vIElmIHRoZSBzdW1tYXJ5IGlzIHN0aWxsIGxvYWRpbmcsIGl0IHdvdWxkIGp1c3QgcmV0dXJuIChub3QgYSBwcm9taXNlKSwgY2F1c2luZyBhIGpzIGVycm9yLlxuXHRcdFx0XHRcdFx0XHRcdFx0cmVzb2x2ZSggJHNjb3BlLnNhdmVTZWdtZW50KG9wdGlvbnMpICk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHByb21pc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICgkc2NvcGUuc2VnbWVudC5uYW1lID09PSAnJykge1xuXHRcdFx0XHRcdFx0YXBwTW9kZWwuYWRkQWxlcnQoe1xuXHRcdFx0XHRcdFx0XHR2YXJpYW50OiAnZXJyb3InLFxuXHRcdFx0XHRcdFx0XHRhdXRvSGlkZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdGNsb3NhYmxlOiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRjb250ZW50czogJGZpbHRlcignbDEwbicpKFsndGl0bGVSZXF1aXJlZFdhcm5pbmcnLCAnVGl0bGUgaXMgcmVxdWlyZWQgdG8gc2F2ZSBhIHNlZ21lbnQuJ10pXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdCQoJy50aXRsZUZpZWxkJykuZm9jdXMoKTtcblx0XHRcdFx0XHRcdHJldHVybiBQcm9taXNlLnJlamVjdCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoJHNjb3BlLnNoYXJlZFRvTUMgJiYgISRzY29wZS5jb250cm9sT2JqZWN0LmF4bGVTdXBwb3J0ZWQpIHtcblx0XHRcdFx0XHRcdGFwcE1vZGVsLmFkZEFsZXJ0KHtcblx0XHRcdFx0XHRcdFx0dmFyaWFudDogJ2Vycm9yJyxcblx0XHRcdFx0XHRcdFx0Y29udGVudHM6ICRmaWx0ZXIoJ2wxMG4nKShbJ21hcmtldGluZ0NvbXBhdGliaWxpdHlXYXJuaW5nJywgJ1NlZ21lbnQgbXVzdCBiZSBjb21wYXRpYmxlIHdpdGggUmVwb3J0cyAmIEFuYWx5dGljcyBhbmQgQWQgSG9jIEFuYWx5c2lzIHRvIHNoYXJlIHRvIE1hcmtldGluZyBDbG91ZC4nXSksXG5cdFx0XHRcdFx0XHRcdGF1dG9IaWRlOiBmYWxzZSxcblx0XHRcdFx0XHRcdFx0Y2xvc2FibGU6IHRydWVcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICgkc2NvcGUuc2hhcmVkVG9NQyAmJiAkc2NvcGUuc2VnbWVudC5kZXNjcmlwdGlvbiA9PT0gJycpIHtcblx0XHRcdFx0XHRcdGFwcE1vZGVsLmFkZEFsZXJ0KHtcblx0XHRcdFx0XHRcdFx0dmFyaWFudDogJ2Vycm9yJyxcblx0XHRcdFx0XHRcdFx0Y2xvc2FibGU6IHRydWUsXG5cdFx0XHRcdFx0XHRcdGNvbnRlbnRzOiAkZmlsdGVyKCdsMTBuJykoWyd0aXRsZURlc2NyaXB0aW9uUmVxdWlyZWRXYXJuaW5nJywgJ1RpdGxlIGFuZCBEZXNjcmlwdGlvbiBhcmUgcmVxdWlyZWQgdG8gc2hhcmUgdG8gdGhlIE1hcmtldGluZyBDbG91ZC4nXSksXG5cdFx0XHRcdFx0XHRcdGF1dG9IaWRlOiBmYWxzZVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHQkKCcuZGVzY3JpcHRpb25GaWVsZCcpLmZvY3VzKCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZighJHNjb3BlLmNvbnRyb2xPYmplY3QuaXNWYWxpZCl7XG5cdFx0XHRcdFx0XHRhcHBNb2RlbC5hZGRBbGVydCh7XG5cdFx0XHRcdFx0XHRcdHZhcmlhbnQ6ICdlcnJvcicsXG5cdFx0XHRcdFx0XHRcdGNsb3NhYmxlOiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRjb250ZW50czogJGZpbHRlcignbDEwbicpKFsndGl0bGVSZXF1aXJlZFdhcm5pbmdDYW5ub3RTYXZlJywgJ0luY29tcGxldGUgc2VnbWVudCwgY2Fubm90IHNhdmUgc2VnbWVudC4nXSksXG5cdFx0XHRcdFx0XHRcdGF1dG9IaWRlOiBmYWxzZVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHQkKCcuZGVzY3JpcHRpb25GaWVsZCcpLmZvY3VzKCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5yZWplY3QoKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBjb3B5IHRoZSBzZWdtZW50IChsb2NhbGx5IGluIG1lbW9yeSkgc28gdGhhdCB0aGUgVUkgZG9lc24ndCBhdXRvbWF0aWNhbGx5IHVwZGF0ZSB3aGVuIGRhdGEgaXMgcmV0dXJuZWQgZnJvbSB0aGUgc2VydmVyIChpZSwgYW5ndWxhciByZXNvdXJjZSlcblx0XHRcdFx0XHR2YXIgY29waWVkU2VnbWVudCA9ICRzY29wZS5zZWdtZW50LmNvcHkoKSxcblx0XHRcdFx0XHRcdHNlbGVjdGVkVGFnT2JqZWN0cyA9ICRzY29wZS50YWdzLmZpbHRlciggZnVuY3Rpb24odGFnKSB7IHJldHVybiB0YWcuc2VsZWN0ZWQ7IH0pLFxuXHRcdFx0XHRcdFx0c2VsZWN0ZWRUYWdzID0gdXRpbC5wbHVja01hcChzZWxlY3RlZFRhZ09iamVjdHMsIHsnbmFtZSc6J25hbWUnLCAnaWQnOidpZCd9KTtcblxuXHRcdFx0XHRcdC8vVHJhbnNsYXRlIHRoZSB1c2FibGUgZGF0YSBmb3JtYXQgYmFjayB0byBhIGZvcm1hdCB0aGF0IHRoZSBzZXJ2ZXIgaXMgZXhwZWN0aW5nLlxuXHRcdFx0XHRcdGNvcGllZFNlZ21lbnQuZGVmaW5pdGlvbiA9IGRlZmluaXRpb25QYXJzZXIuZGF0YU1vZGVsVG9EZWZpbml0aW9uKGNvcGllZFNlZ21lbnQuY29uc3VtYWJsZURlZmluaXRpb24pO1xuXHRcdFx0XHRcdGNvcGllZFNlZ21lbnQuYWFtU3RhdHVzRm9yQ3VycmVudFJzaWQgPSAkc2NvcGUuc2VnbWVudC5hYW1TdGF0dXNGb3JDdXJyZW50UnNpZDtcblx0XHRcdFx0XHRjb3BpZWRTZWdtZW50LnRhZ3MgPSBzZWxlY3RlZFRhZ3MubWFwKHRhZyA9PiBUYWcuZnJvbUpTT04odGFnKSk7XG5cblx0XHRcdFx0XHR1cGRhdGVBYW1TdGF0dXMoY29waWVkU2VnbWVudCk7XHQvLyBvbmx5IGlmIGFwcGxpY2FibGVcblxuXHRcdFx0XHRcdHNwaW5uZXJTZXJ2aWNlLnNob3coJHNjb3BlLnNiU3Bpbm5lcklkKTtcblxuXHRcdFx0XHRcdHRyYWNrU2VydmljZS50cmFja0FjdGlvbihudWxsLCAnU2F2ZSBTZWdtZW50Jywge1xuXHRcdFx0XHRcdFx0c2F2ZVR5cGU6IG9wdGlvbnMuc2F2ZUFzID8gJ3NhdmUtYXMnIDogJ3NhdmUnLFxuXHRcdFx0XHRcdFx0aGFzRGVzY3JpcHRpb246ICRzY29wZS5zZWdtZW50LmRlc2NyaXB0aW9uICYmICRzY29wZS5zZWdtZW50LmRlc2NyaXB0aW9uLmxlbmd0aCA+IDAsXG5cdFx0XHRcdFx0XHRoYXNUYWdzOiBzZWxlY3RlZFRhZ3MubGVuZ3RoID4gMCxcblx0XHRcdFx0XHRcdHNoYXJlZFRvTWFya2V0aW5nQ2xvdWQ6ICRzY29wZS5zaGFyZWRUb01DLFxuXHRcdFx0XHRcdFx0aXRlbUNvdW50OiBkZWZpbml0aW9uSXRlbUNvdW50KGNvcGllZFNlZ21lbnQuY29uc3VtYWJsZURlZmluaXRpb24pXG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHQvLyBTZW5kIHByb2plY3Qgb21lZ2EgdHJhY2tpbmcgaGl0XG5cdFx0XHRcdFx0dmFyIGVsZW1lbnQgPSBvcHRpb25zLnNhdmVBcyA/ICdzYXZlLWFzIGJ1dHRvbicgOiAnc2F2ZSBidXR0b24nO1xuXHRcdFx0XHRcdE9tZWdhVHJhY2sudHJhY2tFdmVudCh7XG5cdFx0XHRcdFx0XHRlbGVtZW50OiBlbGVtZW50LFxuXHRcdFx0XHRcdFx0YWN0aW9uOiAnY2xpY2snLFxuXHRcdFx0XHRcdFx0dHlwZTogJ2J1dHRvbicsXG5cdFx0XHRcdFx0XHR3aWRnZXQ6IHtcblx0XHRcdFx0XHRcdFx0XHRuYW1lOiAnc2VnbWVudC1idWlsZGVyJyxcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiAnZWRpdG9yJ1xuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGF0dHJpYnV0ZXM6IHtcblx0XHRcdFx0XHRcdFx0XHRzaGFyZWRUb01hcmtldGluZ0Nsb3VkOiAoJHNjb3BlLnNoYXJlZFRvTUMgPyAndHJ1ZScgOiAnZmFsc2UnKVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdGZlYXR1cmU6ICdzZWdtZW50LWJ1aWxkZXInXG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRyZXR1cm4gYXBwTW9kZWwucmVwby5zYXZlKGNvcGllZFNlZ21lbnQpLnRoZW4oZnVuY3Rpb24oc2VnbWVudCkge1xuXHRcdFx0XHRcdFx0aWYgKCRzY29wZS5lbWJlZGRlZCkge1xuXHRcdFx0XHRcdFx0XHRub3RpZnlTYXZlZChzZWdtZW50KTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHJldHVyblRvQXBwcm9wcmlhdGVMb2NhdGlvbihjb3BpZWRTZWdtZW50LmlkID8gJ3NhdmUnIDogJ2NyZWF0ZScsIHNlZ21lbnQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIHNlZ21lbnQ7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdCRzY29wZS5zYXZlU2VnbWVudCA9IHNhdmVTZWdtZW50O1xuXG5cdFx0XHRcdCRzY29wZS5zYXZlU2VnbWVudEFzID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHQkc2NvcGUuc2VnbWVudC5pZCA9IHVuZGVmaW5lZDtcblx0XHRcdFx0XHQkc2NvcGUuc2VnbWVudC5pbnRlcm5hbCA9IGZhbHNlO1xuXHRcdFx0XHRcdHJldHVybiBzYXZlU2VnbWVudCh7c2F2ZUFzOiB0cnVlfSk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0ZnVuY3Rpb24gdXBkYXRlQWFtU3RhdHVzKGNvcGllZFNlZ21lbnQpIHtcblx0XHRcdFx0XHRpZiAoIWNvcGllZFNlZ21lbnQuYWFtU3RhdHVzRm9yQ3VycmVudFJzaWQpIHtcblx0XHRcdFx0XHRcdHZhciByc2lkTG9jYXRpb24gPSBjb3BpZWRTZWdtZW50LmFhbVN0YXR1cy5wdWJsaXNoZWQuaW5kZXhPZihhcHBNb2RlbC5yZXBvcnRTdWl0ZS5yc2lkKTtcblx0XHRcdFx0XHRcdGlmIChyc2lkTG9jYXRpb24gIT0gLTEpIHtcblx0XHRcdFx0XHRcdFx0Y29waWVkU2VnbWVudC5hYW1TdGF0dXMucHVibGlzaGVkLnNwbGljZShyc2lkTG9jYXRpb24sIDEpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoY29waWVkU2VnbWVudC5hYW1TdGF0dXNGb3JDdXJyZW50UnNpZCA9PSAncHVibGlzaGVkJykge1xuXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGlmIChjb3BpZWRTZWdtZW50LmFhbVN0YXR1cy5wdWJsaXNoZWQuaW5kZXhPZihhcHBNb2RlbC5yZXBvcnRTdWl0ZS5yc2lkKSA9PSAtMSkge1x0XHQvL2NsZWFyIG91dCB0aGUgYXJyYXkgaW5zdGVhZCBvZiBhcHBlbmRpbmcgdG8gaXQgKGlmIGFwcGVuZGluZywgaXQgd2lsbCBjcmVhdGUgYSBkdXBsaWNhdGUgc2VnbWVudCBpbiB0aGUgb3RoZXIgcmVwb3J0IHN1aXRlKVxuXHRcdFx0XHRcdFx0XHRjb3BpZWRTZWdtZW50LmFhbVN0YXR1cy5wdWJsaXNoZWQgPSBbYXBwTW9kZWwucmVwb3J0U3VpdGUucnNpZF07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRjb3BpZWRTZWdtZW50LmFhbVN0YXR1cy5pbmZvW2NvcGllZFNlZ21lbnQucnNpZF0gPSB7fTtcblx0XHRcdFx0XHRcdGNvcGllZFNlZ21lbnQuYWFtU3RhdHVzLmluZm9bY29waWVkU2VnbWVudC5yc2lkXS5sb29rYmFja1ZhbHVlID0gJHNjb3BlLmxvb2tiYWNrVmFsdWU7XG5cdFx0XHRcdFx0XHRjb3BpZWRTZWdtZW50LmFhbVN0YXR1cy5pbmZvW2NvcGllZFNlZ21lbnQucnNpZF0ubG9va2JhY2tHcmFudWxhcml0eSA9ICdEJzsgLy8gY3VycmVudGx5IFVJIG9ubHkgc3VwcG9ydHMgZGF5IGdyYW51bGFyaXR5XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZnVuY3Rpb24gbm90aWZ5U2F2ZWQoc2VnbWVudCkge1xuXHRcdFx0XHRcdCRzY29wZS4kZW1pdCgnc2F2ZWQnLCB7aWQ6IHNlZ21lbnQuaWR9KTtcblx0XHRcdFx0XHRhcHBNb2RlbC51cGRhdGVPd25lckFuZENhY2hlQW5kQ29sbGVjdGlvbnNBbmRSZWxldmFuY3koc2VnbWVudCk7XG5cblx0XHRcdFx0XHQvLyBXb3Jrc3BhY2UgZG9lcyBub3QgdXNlIHRoZSBvbGQgYXBwQ2FjaGUuIFNvIHdlIG5lZWQgdG8gY2hlY2sgaWZcblx0XHRcdFx0XHQvLyBzZWdtZW50cyBleGlzdCBpbiB0aGUgYXBwQ2FjaGUgYmVmb3JlIHdlIGNhbiBwcm9jZWVkLlxuXHRcdFx0XHRcdGlmIChhcHBDYWNoZS5oYXMoJ3NlZ21lbnRzJykpIHtcblx0XHRcdFx0XHRcdGFwcENhY2hlLnVwZGF0ZUl0ZW0oJ3NlZ21lbnRzJywgc2VnbWVudCk7XG5cdFx0XHRcdFx0XHRpZiAoXy5nZXQoYXBwQ2FjaGUsICdkYXRhLmNvbXBvbmVudHNCeUlkJykpIHtcblx0XHRcdFx0XHRcdFx0YXBwQ2FjaGUudXBkYXRlSXRlbSgnY29tcG9uZW50cycsIHNlZ21lbnQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdCRzY29wZS5kZWxldGVTZWdtZW50ID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRsZXQgY29uZmlybU1lc3NhZ2UgPSAkc2NvcGUuc2VnbWVudC52aXJ0dWFsUmVwb3J0U3VpdGVzICYmICRzY29wZS5zZWdtZW50LnZpcnR1YWxSZXBvcnRTdWl0ZXMubGVuZ3RoID9cblx0XHRcdFx0XHRcdCRmaWx0ZXIoJ2wxMG4nKShbJ2FyZVlvdVN1cmVZb3VXYW50VG9EZWxldGVXYXJuaW5nVGV4dFZSUycsXG5cdFx0XHRcdFx0XHRcdCdZb3UgYXJlIGFib3V0IHRvIGRlbGV0ZSBhIHNlZ21lbnQgdGhhdCBpcyB1c2VkIGluIGEgVmlydHVhbCBSZXBvcnQgU3VpdGUgZGVmaW5pdGlvbi4gQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSB0aGlzIHNlZ21lbnQ/IFRoaXMgYWN0aW9uIGNhbm5vdCBiZSB1bmRvbmUuIEFueSBzY2hlZHVsZWQgcmVwb3J0cyB1c2luZyB0aGlzIHNlZ21lbnQgd2lsbCBjb250aW51ZSB0byB1c2UgdGhpcyBzZWdtZW50IGRlZmluaXRpb24gdW50aWwgeW91IHJlLXNhdmUgdGhlIHNjaGVkdWxlZCByZXBvcnQuJ10pIDpcblx0XHRcdFx0XHRcdCRmaWx0ZXIoJ2wxMG4nKShbJ2FyZVlvdVN1cmVZb3VXYW50VG9EZWxldGVXYXJuaW5nVGV4dCcsXG5cdFx0XHRcdFx0XHRcdCdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHRoaXMgc2VnbWVudD8gVGhpcyBhY3Rpb24gY2Fubm90IGJlIHVuZG9uZS4gQW55IHNjaGVkdWxlZCByZXBvcnRzIHVzaW5nIHRoaXMgc2VnbWVudCB3aWxsIGNvbnRpbnVlIHRvIHVzZSB0aGlzIHNlZ21lbnQgZGVmaW5pdGlvbiB1bnRpbCB5b3UgcmUtc2F2ZSB0aGUgc2NoZWR1bGVkIHJlcG9ydC4nXSk7XG5cblx0XHRcdFx0XHREaWFsb2cuY29uZmlybShjb25maXJtTWVzc2FnZSkudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0XHQvLyBjb3B5IHRoZSBzZWdtZW50IChsb2NhbGx5IGluIG1lbW9yeSkgc28gdGhhdCB0aGUgVUkgZG9lc24ndCBhdXRvbWF0aWNhbGx5IHVwZGF0ZSB3aGVuIGRhdGEgaXMgcmV0dXJuZWQgZnJvbSB0aGUgc2VydmVyIChpZSwgYW5ndWxhciByZXNvdXJjZSlcblx0XHRcdFx0XHRcdHNwaW5uZXJTZXJ2aWNlLnNob3coJHNjb3BlLnNiU3Bpbm5lcklkKTtcblx0XHRcdFx0XHRcdGFwcE1vZGVsLnJlcG8uZGVsZXRlKCRzY29wZS5zZWdtZW50KS50aGVuKCgpID0+IHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuVG9BcHByb3ByaWF0ZUxvY2F0aW9uKCdkZWxldGUnLCAkc2NvcGUuc2VnbWVudCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkc2NvcGUuY2FuY2VsID0gZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRyZXR1cm5Ub0FwcHJvcHJpYXRlTG9jYXRpb24oJ2NhbmNlbCcsICRzY29wZS5zZWdtZW50KTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRmdW5jdGlvbiByZXR1cm5Ub0FwcHJvcHJpYXRlTG9jYXRpb24oYWN0aW9uVHlwZSwgc2VnbWVudCkge1xuXHRcdFx0XHRcdC8vIG9ubHkgcGFzcyB0aHJvdWdoIHRoZSBzZWdtZW50IGlkIGFzIHBhcnQgb2YgdGhlIHNlZ21lbnQgb2JqZWN0XG5cdFx0XHRcdFx0aWYgKHNlZ21lbnQpIHtcblx0XHRcdFx0XHRcdHNlZ21lbnQgPSB7J2lkJzpzZWdtZW50LmlkfTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0c2VnbWVudCA9IG51bGw7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dmFyIGRlZmF1bHRDYWxsYmFja1VybCA9IHNjVXJsLnNwYXMoJ2NvbXBvbmVudC1tYW5hZ2VyJywgeydjb21wb25lbnRUeXBlJzonc2VnbWVudHMnfSk7XG5cdFx0XHRcdFx0Y2FsbGJhY2tSZWdpc3RyeVNlcnZpY2UuY2FsbGJhY2tQYXJhbXMuc2VnbWVudCA9IHNlZ21lbnQ7XG5cdFx0XHRcdFx0Y2FsbGJhY2tSZWdpc3RyeVNlcnZpY2UuY2FsbGJhY2tQYXJhbXMuYWN0aW9uVHlwZSA9IGFjdGlvblR5cGU7XG5cdFx0XHRcdFx0Y2FsbGJhY2tSZWdpc3RyeVNlcnZpY2UuZXhlY3V0ZShkZWZhdWx0Q2FsbGJhY2tVcmwsIGN1c3RvbUNhbGxiYWNrRXhlY3V0b3IpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JHNjb3BlLnJlbW92ZUFsZXJ0ID0gZnVuY3Rpb24oaW5kZXgpe1xuXHRcdFx0XHRcdCRzY29wZS5hbGVydHMuc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkc2NvcGUuJHdhdGNoKCdkcmFnTWFuYWdlci5kcmFnZ2luZycsIGZ1bmN0aW9uKGRyYWdnaW5nKXtcblx0XHRcdFx0XHQkc2NvcGUuZHJhZ2dpbmcgPSBkcmFnZ2luZztcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0JHNjb3BlLmxvYWRUYWdzID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JHNjb3BlLmxvYWRpbmdUYWdzID0gdHJ1ZTtcblx0XHRcdFx0XHR0YWdSZXBvc2l0b3J5LnF1ZXJ5KHt9KS50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0XHR2YXIgdGFncyA9IHJlc3BvbnNlO1xuXHRcdFx0XHRcdFx0JHNjb3BlLmxvYWRpbmdUYWdzID0gZmFsc2U7XG5cdFx0XHRcdFx0XHQvLyBvbmNlIHRoZSBzZWdtZW50IGxvYWRzLCBsb29wIHRocm91Z2ggdGhlIHNlZ21lbnQncyB0YWdzIHRvIHNldCB3aGljaCBvbmVzIGFyZSBzZWxlY3RlZFxuXHRcdFx0XHRcdFx0dmFyIHVuYmluZFdhdGNoZXIgPSAkc2NvcGUuJHdhdGNoKCdzZWdtZW50JywgZnVuY3Rpb24oc2VnbWVudCl7XG5cdFx0XHRcdFx0XHRcdGlmIChzZWdtZW50KSB7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIHNlbGVjdGVkVGFnSWRzID0gc2VnbWVudC50YWdzID8gc2VnbWVudC50YWdzLm1hcChmdW5jdGlvbih0YWcpe3JldHVybiB0YWcuaWQ7fSkgOiBbXTtcblx0XHRcdFx0XHRcdFx0XHRpZiAoc2VsZWN0ZWRUYWdJZHMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0YWdzLmZvckVhY2goZnVuY3Rpb24odGFnKXtcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKHNlbGVjdGVkVGFnSWRzLmluZGV4T2YodGFnLmlkKSAhPSAtMSkgeyB0YWcuc2VsZWN0ZWQgPSB0cnVlOyB9XG5cdFx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0JHNjb3BlLnRhZ3MgPSB0YWdzO1xuXHRcdFx0XHRcdFx0XHRcdHVuYmluZFdhdGNoZXIoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JHNjb3BlLnRvZ2dsZVNlZ21lbnRQcmV2aWV3ID0gZnVuY3Rpb24oY3VycmVudFRhcmdldCwgc2VnbWVudCkge1xuXHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ3RvZ2dsZVNlZ21lbnRQcmV2aWV3VmlzaWJpbGl0eScsIGN1cnJlbnRUYXJnZXQsIHNlZ21lbnQpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCRzY29wZS50b2dnbGVNZXRyaWNQcmV2aWV3ID0gZnVuY3Rpb24oY3VycmVudFRhcmdldCwgbWV0cmljKSB7XG5cdFx0XHRcdFx0ZXZlbnRCdXMucHVibGlzaCgnY2FsY3VsYXRlZC1tZXRyaWMtcHJldmlldzp0b2dnbGVWaXNpYmlsaXR5JywgY3VycmVudFRhcmdldCwgbWV0cmljKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkc2NvcGUudG9nZ2xlRGltZW5zaW9uUHJldmlldyA9IGZ1bmN0aW9uKGN1cnJlbnRUYXJnZXQsIGRpbWVuc2lvbikge1xuXHRcdFx0XHRcdGV2ZW50QnVzLnB1Ymxpc2goJ2RpbWVuc2lvbi1wcmV2aWV3OnRvZ2dsZVZpc2liaWxpdHknLCBjdXJyZW50VGFyZ2V0LCBkaW1lbnNpb24pO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdC8qIFRyYWNraW5nIGhlbHBlciBmdW5jdGlvbnMgKi9cblxuXHRcdFx0XHRmdW5jdGlvbiBwYWdlTG9hZFR5cGUoKSB7XG5cdFx0XHRcdFx0aWYgKGFuZ3VsYXIuaXNEZWZpbmVkKCRzY29wZS5lZGl0SWQpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ2VkaXQnO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoYW5ndWxhci5pc0RlZmluZWQoJHNjb3BlLnBhc3RlSWQpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJ3Bhc3RlYmluJztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKCRzY29wZS5kZWZpbml0aW9uKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICdkZWZpbml0aW9uJztcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cmV0dXJuICduZXcnO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZ1bmN0aW9uIGRlZmluaXRpb25JdGVtQ291bnQoZGVmaW5pdGlvbikge1xuXG5cdFx0XHRcdFx0ZnVuY3Rpb24gZGVlcENvdW50KGl0ZW0pIHtcblx0XHRcdFx0XHRcdGlmICghaXRlbSB8fCAhaXRlbS5pdGVtcykgeyByZXR1cm4gMDsgfVxuXHRcdFx0XHRcdFx0dmFyIGNvdW50ID0gaXRlbS5pdGVtcy5sZW5ndGg7XG5cdFx0XHRcdFx0XHRmb3IodmFyIGk9MDsgaSA8IGl0ZW0uaXRlbXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRcdFx0Y291bnQgKz0gZGVlcENvdW50KGl0ZW0uaXRlbXNbaV0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIGNvdW50O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJldHVybiBkZWVwQ291bnQoZGVmaW5pdGlvbik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkd2luZG93LmFkb2JlID0gJHdpbmRvdy5hZG9iZSB8fCB7fTtcblx0XHRcdFx0JHdpbmRvdy5hZG9iZS50b29scyA9ICR3aW5kb3cuYWRvYmUudG9vbHMgfHwge307XG5cdFx0XHRcdCR3aW5kb3cuYWRvYmUudG9vbHMuZXhwb3J0U2VnbWVudERlZmluaXRpb24gPSBmdW5jdGlvbih0b0pTT04pe1xuXHRcdFx0XHRcdHZhciBjb3BpZWRTZWdtZW50ID0gYW5ndWxhci5jb3B5KCRzY29wZS5zZWdtZW50KTtcblx0XHRcdFx0XHR2YXIgZGVmID0gZGVmaW5pdGlvblBhcnNlci5kYXRhTW9kZWxUb0RlZmluaXRpb24oY29waWVkU2VnbWVudC5jb25zdW1hYmxlRGVmaW5pdGlvbik7XG5cdFx0XHRcdFx0cmV0dXJuIHRvSlNPTiA/IEpTT04uc3RyaW5naWZ5KGRlZiwgbnVsbCwgMikgOiBkZWY7XG5cdFx0XHRcdH07XG5cblx0XHRcdFx0LyogRW5kIFRyYWNraW5nIGhlbHBlciBmdW5jdGlvbnMgKi9cblx0XHRcdH1cblx0XHR9O1xuXG5cdH0pO1xuIiwiXG5hbmd1bGFyLm1vZHVsZSgnc2VnbWVudC1idWlsZGVyJylcblx0LmZpbHRlcignZ2Vhckxpc3RGaWx0ZXInLCBmdW5jdGlvbiAoJGZpbHRlciwgR0VBUl9OQU1FLCBHRUFSX05FV19TVUJfR1JPVVBfRlJPTV9TRUxFQ1RJT04sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdEdFQVJfRVhDTFVERSwgR0VBUl9JTkNMVURFLCBHRUFSX0RFTEVURSkge1xuXHRcdHJldHVybiBmdW5jdGlvbiAobGlzdCwgZ2VhckZpbHRlcikge1xuXHRcdFx0cmV0dXJuIGxpc3QuZmlsdGVyKGZ1bmN0aW9uKG9wdGlvbil7XG5cdFx0XHRcdGlmIChnZWFyRmlsdGVyKSB7XG5cdFx0XHRcdFx0aWYgKGdlYXJGaWx0ZXIuc2VsZWN0ZWRJdGVtTGVuZ3RoID09PSAwICYmXG5cdFx0XHRcdFx0XHRvcHRpb24udmFsdWUgPT0gR0VBUl9ORVdfU1VCX0dST1VQX0ZST01fU0VMRUNUSU9OKXtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAob3B0aW9uLnZhbHVlID09IEdFQVJfTkFNRSAmJiBnZWFyRmlsdGVyLmV4Y2x1ZGVOYW1lKXtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKG9wdGlvbi52YWx1ZSA9PSBHRUFSX05BTUUpe1xuXHRcdFx0XHRcdFx0dmFyIG5hbWVDb250YWluZXJTdHJpbmcgPSBnZWFyRmlsdGVyLm1vZGVsLm5hbWUgIT09ICcnID9cblx0XHRcdFx0XHRcdFx0JGZpbHRlcignbDEwbicpKFsnZ2VhclJlbmFtZUNvbnRhaW5lcicsICdSZW5hbWUgY29udGFpbmVyJ10pIDpcblx0XHRcdFx0XHRcdFx0JGZpbHRlcignbDEwbicpKFsnZ2Vhck5hbWVDb250YWluZXInLCAnTmFtZSBjb250YWluZXInXSk7XG5cblx0XHRcdFx0XHRcdG9wdGlvbi5sYWJlbCA9IG5hbWVDb250YWluZXJTdHJpbmc7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKG9wdGlvbi52YWx1ZSA9PSBHRUFSX0VYQ0xVREUgJiYgZ2VhckZpbHRlci5leGNsdWRlKXtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAob3B0aW9uLnZhbHVlID09IEdFQVJfSU5DTFVERSAmJiAhZ2VhckZpbHRlci5leGNsdWRlKXtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAob3B0aW9uLnZhbHVlID09IEdFQVJfREVMRVRFICYmIGdlYXJGaWx0ZXIuZXhjbHVkZURlbGV0ZSl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fTtcblx0fSk7XG4iLCJcbmFuZ3VsYXIubW9kdWxlKCdzZWdtZW50LWJ1aWxkZXInKVxuXHQuY29udHJvbGxlcignc2JNYWluQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsICRyb3V0ZVBhcmFtcykge1xuXHRcdFxuXHR9KTtcbiIsImltcG9ydCB7XG5cdGwxMG5Db25maWdcbn0gZnJvbSAnY29yZSdcblxuYW5ndWxhci5tb2R1bGUoJ3NlZ21lbnQtYnVpbGRlcicpXG5cdC5mYWN0b3J5KCdhYW1TZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBhcHBNb2RlbCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhYW1Db25maWd1cmVkOiBmdW5jdGlvbihyc2lkLCBjYikge1xuXHRcdFx0XHQkaHR0cCh7XG5cdFx0XHRcdFx0bWV0aG9kOiAnR0VUJyxcblx0XHRcdFx0XHR1cmw6IGFwcE1vZGVsLmFwcFNlcnZpY2UuYmFzZVVSTCArICcvc2VnbWVudHMvYWFtc3RhdHVzJyxcblx0XHRcdFx0XHRwYXJhbXM6IHtcblx0XHRcdFx0XHRcdHJzaWQ6IHJzaWQsXG5cdFx0XHRcdFx0XHRsb2NhbGU6IGwxMG5Db25maWcuY3VycmVudExvY2FsZVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSkuc3VjY2VzcyhjYik7XG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7XG4iLCJcbmFuZ3VsYXIubW9kdWxlKCdzZWdtZW50LWJ1aWxkZXInKVxuXHQuZmFjdG9yeSgnYXBwRGVmYXVsdHMnLCBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdCdkdkFuaW1hdGlvbkR1cmF0aW9uJzogNTAwLFxuXHRcdFx0J2F1ZGllbmNlUHJlc2V0V2luZG93JzogJzkwJ1xuXHRcdH07XG5cdH0pO1xuIiwiXG5hbmd1bGFyLm1vZHVsZSgnc2VnbWVudC1idWlsZGVyJylcblx0LmZhY3RvcnkoJ2N1c3RvbUNhbGxiYWNrRXhlY3V0b3InLCBmdW5jdGlvbiAoc2NVcmwsIHV0aWwpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Z2V0RGVzdGluYXRpb25Vcmw6IGZ1bmN0aW9uKHBhcmFtcykge1xuXHRcdFx0XHRpZiAoIXBhcmFtcy5zZWdtZW50KSB7XG5cdFx0XHRcdFx0cmV0dXJuIHBhcmFtcy5kZXN0aW5hdGlvblVybDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBuZXdTZWdtZW50TGlzdCA9IHBhcmFtcy5leGlzdGluZ1NlZ21lbnRzIHx8IFtdLFxuXHRcdFx0XHRcdGRlc3RpbmF0aW9uUGFyYW1zID0gdXRpbC5nZXRRdWVyeVBhcmFtcyhwYXJhbXMuZGVzdGluYXRpb25VcmwpLFxuXHRcdFx0XHRcdGtleTtcblxuXHRcdFx0XHRpZiAocGFyYW1zLmFjdGlvblR5cGUgIT0gJ2NhbmNlbCcpIHsgLy8gZG9uJ3QgY2hhbmdlIGFueSBhcHBsaWVkIHNlZ21lbnRzIGlmIHRoZXkgY2FuY2VsbGVkXG5cdFx0XHRcdFx0aWYgKH5uZXdTZWdtZW50TGlzdC5pbmRleE9mKHBhcmFtcy5zZWdtZW50LmlkKSkgeyAvLyBjaGVjayBpZiBzZWdtZW50IGlzIGFscmVhZHkgYXBwbGllZCB0byByZXBvcnRcblx0XHRcdFx0XHRcdG5ld1NlZ21lbnRMaXN0LnNwbGljZShuZXdTZWdtZW50TGlzdC5pbmRleE9mKHBhcmFtcy5zZWdtZW50LmlkKSwgMSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHBhcmFtcy5hY3Rpb25UeXBlICE9ICdkZWxldGUnKSB7IC8vIGFwcGx5IHRoZSBzZWdtZW50IHRvIHRoZSByZXBvcnQgdW5sZXNzIHRoZXkgZGVsZXRlZCBpdFxuXHRcdFx0XHRcdFx0bmV3U2VnbWVudExpc3QucHVzaChwYXJhbXMuc2VnbWVudC5pZCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZGVsZXRlIGRlc3RpbmF0aW9uUGFyYW1zLmpwajsgLy8gc2NVcmwgdXBkYXRlcyBqcGogYW5kIHNzU2Vzc2lvbiBhdXRvbWF0aWNhbGx5XG5cdFx0XHRcdGRlbGV0ZSBkZXN0aW5hdGlvblBhcmFtcy5zc1Nlc3Npb247XG5cblx0XHRcdFx0c3dpdGNoKHBhcmFtcy50eXBlKSB7XG5cdFx0XHRcdFx0Y2FzZSAnc2MtcmVwb3J0JzpcblxuXHRcdFx0XHRcdFx0ZGVzdGluYXRpb25QYXJhbXMucnAgPSAnb2Jfc2VnbWVudF9pZHwnICsgbmV3U2VnbWVudExpc3Quam9pbignLCcpOyAvLyByZXBsYWNlIG9sZCBycCB3aXRoIHRoZSBuZXcgc2VnbWVudCBpZCB0byBiZSBhcHBsaWVkIChvbGQgcnAgc3RhdGUgaXMgd3JhcHBlZCBpbnRvIG5ldyBqcGogc3RhdGUpXG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NVcmwuZnMoZGVzdGluYXRpb25QYXJhbXMuYSwgZGVzdGluYXRpb25QYXJhbXMpOyAvLyBkb24ndCBwYXNzIGdhdGV3YXkgdXJsIGJlY2F1c2Ugd2UncmUgcmVidWlsZGluZyB0aGUgcGFyYW1zIGZyb20gc2NyYXRjaFxuXG5cdFx0XHRcdFx0Y2FzZSAnZGFzaGJvYXJkJzpcblxuXHRcdFx0XHRcdFx0Ly8gbmVlZCB0byBnbyB0aHJvdWdoIGFuZCByZW1vdmUgYWxsIG9iX3NlZ21lbnRfaWRbXSBwYXJhbXMgYmVjYXVzZSBleGlzdGluZyBzZWdtZW50cyB3aWxsIGJlIHJlLWFwcGVuZGVkIGFueXdheVxuXHRcdFx0XHRcdFx0Zm9yIChrZXkgaW4gZGVzdGluYXRpb25QYXJhbXMpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGRlc3RpbmF0aW9uUGFyYW1zLmhhc093blByb3BlcnR5KGtleSkgJiYga2V5LmluZGV4T2YoJ29iX3NlZ21lbnRfaWQnKSAhPSAtMSkge1xuXHRcdFx0XHRcdFx0XHRcdGRlbGV0ZSBkZXN0aW5hdGlvblBhcmFtc1trZXldO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRkZXN0aW5hdGlvblBhcmFtc1snb2Jfc2VnbWVudF9pZCddID0gbmV3U2VnbWVudExpc3Q7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NVcmwuZnMoZGVzdGluYXRpb25QYXJhbXMuYSwgZGVzdGluYXRpb25QYXJhbXMpOyAvLyBkb24ndCBwYXNzIGdhdGV3YXkgdXJsIGJlY2F1c2Ugd2UncmUgcmVidWlsZGluZyB0aGUgcGFyYW1zIGZyb20gc2NyYXRjaFxuXG5cdFx0XHRcdFx0Y2FzZSAnYW5vbWFseS1kZXRlY3Rpb24nOlxuXG5cdFx0XHRcdFx0XHR2YXIgZGVzdGluYXRpb25IYXNoUGFyYW1zID0gdXRpbC5nZXRIYXNoUGFyYW1zKHBhcmFtcy5kZXN0aW5hdGlvblVybCksXG5cdFx0XHRcdFx0XHRcdGRlc3RpbmF0aW9uVXJsID0gc2NVcmwuZnMoZGVzdGluYXRpb25QYXJhbXMuYSwgZGVzdGluYXRpb25QYXJhbXMpOyAvLyBkb24ndCBwYXNzIGdhdGV3YXkgdXJsIGJlY2F1c2Ugd2UncmUgcmVidWlsZGluZyB0aGUgaGFzaCBmcm9tIHNjcmF0Y2hcblx0XHRcdFx0XHRcdGRlc3RpbmF0aW9uSGFzaFBhcmFtcy5zZWxlY3RlZFNlZ21lbnRJZHMgPSBKU09OLnN0cmluZ2lmeShuZXdTZWdtZW50TGlzdCk7XG5cdFx0XHRcdFx0XHRkZXN0aW5hdGlvblVybCA9IHNjVXJsLmFwcGVuZEZyYWdtZW50KGRlc3RpbmF0aW9uVXJsLCAnYW5vbWFsaWVzJyk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2NVcmwuYXBwZW5kSGFzaFBhcmFtcyhkZXN0aW5hdGlvblVybCwgZGVzdGluYXRpb25IYXNoUGFyYW1zKTtcblxuXHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRyZXR1cm4gcGFyYW1zLmRlc3RpbmF0aW9uVXJsO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fTtcblx0fSk7XG4iLCJcbmFuZ3VsYXIubW9kdWxlKCdzZWdtZW50LWJ1aWxkZXInKVxuXHQuZmFjdG9yeSgnZ2Vhck9wdGlvbnMnLCBmdW5jdGlvbiAoJGZpbHRlciwgR0VBUl9ORVdfU1VCX0dST1VQLCBHRUFSX0VYQ0xVREUsIEdFQVJfSU5DTFVERSwgR0VBUl9ERUxFVEUsIEdFQVJfTkFNRSxcblx0XHRcdFx0XHRcdFx0XHRcdFx0R0VBUl9ORVdfU1VCX0dST1VQX0ZST01fU0VMRUNUSU9OKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGRhdGE6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGxhYmVsOiAkZmlsdGVyKCdsMTBuJykoWydnZWFyQ3JlYXRlTmV3U3ViR3JvdXBMYWJlbCcsICdBZGQgY29udGFpbmVyJ10pLFxuXHRcdFx0XHRcdHZhbHVlOiBHRUFSX05FV19TVUJfR1JPVVBcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGxhYmVsOiAkZmlsdGVyKCdsMTBuJykoWydnZWFyQ3JlYXRlTmV3U3ViR3JvdXBGcm9tU2VsZWN0aW9uTGFiZWwnLCAnQWRkIGNvbnRhaW5lciBmcm9tIHNlbGVjdGlvbiddKSxcblx0XHRcdFx0XHR2YWx1ZTogR0VBUl9ORVdfU1VCX0dST1VQX0ZST01fU0VMRUNUSU9OXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRsYWJlbDogJGZpbHRlcignbDEwbicpKFsnZ2VhckV4Y2x1ZGVMYWJlbCcsICdFeGNsdWRlJ10pLFxuXHRcdFx0XHRcdHZhbHVlOiBHRUFSX0VYQ0xVREVcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGxhYmVsOiAkZmlsdGVyKCdsMTBuJykoWydnZWFySW5jbHVkZUxhYmVsJywgJ0luY2x1ZGUnXSksXG5cdFx0XHRcdFx0dmFsdWU6IEdFQVJfSU5DTFVERVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bGFiZWw6ICRmaWx0ZXIoJ2wxMG4nKShbJ2dlYXJOYW1lQ29udGFpbmVyJywgJ05hbWUgY29udGFpbmVyJ10pLFxuXHRcdFx0XHRcdHZhbHVlOiBHRUFSX05BTUVcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGxhYmVsOiAkZmlsdGVyKCdsMTBuJykoWydnZWFyRGVsZXRlQ29udGFpbmVyJywgJ0RlbGV0ZSBjb250YWluZXInXSksXG5cdFx0XHRcdFx0dmFsdWU6IEdFQVJfREVMRVRFXG5cdFx0XHRcdH1cblx0XHRcdF0sXG5cblx0XHRcdGdldEJ5SWQ6IGZ1bmN0aW9uKGlkKSB7XG5cdFx0XHRcdHZhciBvYmo7XG5cdFx0XHRcdHRoaXMuZGF0YS5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pe1xuXHRcdFx0XHRcdGlmIChpdGVtLnZhbHVlID09IGlkKXtcblx0XHRcdFx0XHRcdG9iaiA9IGl0ZW07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuIG9iajtcblx0XHRcdH1cblx0XHR9O1xuXHR9KTtcbiIsIjxuYXYgYWQtYWN0aW9uLWJhci1vYnNlcnZlciBhZC1yZXNpemU9XCJvbkFjdGlvbkJhckNoYW5nZWQoKVwiIGFkLWNvbnRlbnQtY2hhbmdlZD1cIm9uQWN0aW9uQmFyQ2hhbmdlZCgpXCIgY2xhc3M9XCJzaGVsbC1QYW5lbC1oZWFkZXIgc2hlbGwtQWN0aW9uQmFyXCIgPlxuXHQ8ZGl2IGNsYXNzPVwic2hlbGwtQWN0aW9uQmFyLWxlZnRcIj5cblx0XHQ8aDEgY2xhc3M9XCJjb3JhbC1IZWFkaW5nIGNvcmFsLUhlYWRpbmctLTEgc2hlbGwtQWN0aW9uQmFyLXRpdGxlXCIgbmctaWY9XCIhZWRpdElkXCI+e3sgWyduZXdTZWdtZW50JywgJ05ldyBTZWdtZW50J10gfCBsMTBuIH19PC9oMT5cblx0XHQ8aDEgY2xhc3M9XCJjb3JhbC1IZWFkaW5nIGNvcmFsLUhlYWRpbmctLTEgc2hlbGwtQWN0aW9uQmFyLXRpdGxlXCIgbmctaWY9XCJlZGl0SWRcIj57eyBbJ2VkaXRTZWdtZW50JywgJ0VkaXQgU2VnbWVudCddIHwgbDEwbiB9fTwvaDE+XG5cdDwvZGl2PlxuXG5cdDxkaXYgY2xhc3M9XCJzaGVsbC1BY3Rpb25CYXItcmlnaHRcIj5cblx0XHQ8IS0tIHRoZSBjYWxsYmFjayBhdHRyaWJ1dGUgcmVmZXJzIHRvIGEgZnVuY3Rpb24gbmFtZSBvbiB0aGUgY29udHJvbGxlciBzY29wZSAtLT5cblx0XHQ8YW4tcmVwb3J0LXN1aXRlLXNlbGVjdG9yIHBhcmFtcz1cIntjb25maXJtOiB0cnVlfVwiPjwvYW4tcmVwb3J0LXN1aXRlLXNlbGVjdG9yPlxuXHQ8L2Rpdj5cbjwvbmF2PlxuIiwiPGRpdiBjbGFzcz1cImNvcmFsLVBvcG92ZXJcIiA+XG5cdDx1bCBjbGFzcz1cImNvcmFsMy1TZWxlY3RMaXN0IGlzLXZpc2libGVcIj5cblx0XHQ8bGkgY2xhc3M9XCJjb3JhbDMtU2VsZWN0TGlzdC1pdGVtIGNvcmFsMy1TZWxlY3RMaXN0LWl0ZW0tLW9wdGlvblwiXG5cdFx0XHRuZy1yZXBlYXQ9XCJjb250ZXh0SXRlbSBpbiBkYXRhTW9kZWwuY29udGV4dExpc3RcIlxuXHRcdFx0bmctY2xpY2s9XCJvbkNvbnRleHRJdGVtQ2xpY2soY29udGV4dEl0ZW0pXCI+XG5cdFx0XHQ8aSBjbGFzcz1cImNvcmFsLUljb24gY29yYWwzLVNlbGVjdExpc3QtaXRlbS1pY29uXCIgbmctY2xhc3M9XCJjb250ZXh0SXRlbS5pY29uXCI+PC9pPlxuXHRcdFx0e3tjb250ZXh0SXRlbS5sYWJlbH19XG5cdFx0PC9saT5cblx0PC91bD5cbjwvZGl2PlxuIiwiPGRpdiBjbGFzcz1cInNiLWRlZmluaXRpb24tY29udGFpbmVyXCIgbmctY2xhc3M9XCJ7J2V4Y2x1ZGUnOmRhdGFNb2RlbC5leGNsdWRlfVwiID5cblx0PGRpdiBjbGFzcz1cImRyYWdnYWJsZS1oZWFkZXJcIj5cblx0XHQ8YSB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjb3JhbC1CdXR0b24gY29yYWwtQnV0dG9uLS1zZWNvbmRhcnkgY29yYWwtQnV0dG9uLS1xdWlldCBjb2xsYXBzaWJsZS1idXR0b25cIlxuXHRcdCAgIG5nLWNsaWNrPVwiY29sbGFwc2VkID0gIWNvbGxhcHNlZFwiID5cblx0XHRcdDxpIGNsYXNzPVwiY29yYWwtSWNvbiBjb3JhbC1JY29uLS1zaXplWFNcIlxuXHRcdFx0ICAgbmctY2xhc3M9XCJ7J2NvcmFsLUljb24tLWFjY29yZGlvblJpZ2h0Jzpjb2xsYXBzZWQsICdjb3JhbC1JY29uLS1hY2NvcmRpb25Eb3duJzohY29sbGFwc2VkfVwiPjwvaT5cblx0XHRcdDxzcGFuIG5nLWhpZGU9XCJyZW5hbWluZ1wiID57eyBnZXROYW1lKCkgfX08L3NwYW4+XG5cdFx0PC9hPlxuXHRcdDxpbnB1dCBjbGFzcz1cIm5hbWUtaW5wdXRcIiB0eXBlPVwidGV4dFwiIG5nLW1vZGVsPVwiZGF0YU1vZGVsLm5hbWVcIiBuZy1zaG93PVwicmVuYW1pbmdcIlxuXHRcdFx0ICAgYWQtZW50ZXI9XCJyZW5hbWluZz1mYWxzZVwiIG5nLWJsdXI9XCJyZW5hbWluZz1mYWxzZVwiPlxuXG5cdFx0PGRpdiBjbGFzcz1cImNvbmZpZy1jb250YWluZXJcIiA+XG5cdFx0XHQ8YSB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjb3JhbC1CdXR0b24gY29yYWwtQnV0dG9uLS1zZWNvbmRhcnkgY29yYWwtQnV0dG9uLS1xdWlldFwiIFxuXHRcdFx0XHRkYXRhLXRhcmdldD1cIiN7e3ByZWZpeFN1ZmZpeFBvcG92ZXJJZH19XCIgbmctaWY9XCJkYXRhTW9kZWwubG9naWNhbE9wZXJhdG9yID09ICdzZXF1ZW5jZScgJiYgaGFzT3BlcmF0b3IoKVwiXG5cdFx0XHRcdGRhdGEtdG9nZ2xlPVwicG9wb3ZlclwiIGNsb3NlT3RoZXJQb3BvdmVycz1cInRydWVcIiBkYXRhLXBvaW50LWZyb209XCJib3R0b21cIiBkYXRhLWFsaWduLWZyb209XCJyaWdodFwiPlxuXHRcdFx0XHQ8aSBjbGFzcz1cImNvcmFsLUljb24gY29yYWwtSWNvbi0tc2l6ZVNcIiBuZy1jbGFzcz1cImN1cnJlbnRQcmVmaXhTdWZmaXhJdGVtLmljb25cIj48L2k+XG5cdFx0XHQ8L2E+XG5cdFx0XHQ8YSB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJjb3JhbC1CdXR0b24gY29yYWwtQnV0dG9uLS1zZWNvbmRhcnkgY29yYWwtQnV0dG9uLS1xdWlldFwiIGRhdGEtdGFyZ2V0PVwiI3t7Y29udGV4dFBvcG92ZXJJZH19XCJcblx0XHRcdCAgIGRhdGEtdG9nZ2xlPVwicG9wb3ZlclwiIGNsb3NlT3RoZXJQb3BvdmVycz1cInRydWVcIiBkYXRhLXBvaW50LWZyb209XCJib3R0b21cIiBkYXRhLWFsaWduLWZyb209XCJyaWdodFwiPlxuXHRcdFx0XHQ8aSBjbGFzcz1cImNvcmFsLUljb24gY29yYWwtSWNvbi0tc2l6ZVNcIiBuZy1jbGFzcz1cImN1cnJlbnRDb250ZXh0SXRlbS5pY29uXCI+PC9pPlxuXHRcdFx0PC9hPlxuXHRcdFx0PGEgdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiY29yYWwtQnV0dG9uIGNvcmFsLUJ1dHRvbi0tc2Vjb25kYXJ5IGNvcmFsLUJ1dHRvbi0tcXVpZXRcIiBkYXRhLXRhcmdldD1cIiN7e2dlYXJQb3BvdmVySWR9fVwiXG5cdFx0XHQgICBkYXRhLXRvZ2dsZT1cInBvcG92ZXJcIiBjbG9zZU90aGVyUG9wb3ZlcnM9XCJ0cnVlXCIgZGF0YS1wb2ludC1mcm9tPVwiYm90dG9tXCIgZGF0YS1hbGlnbi1mcm9tPVwicmlnaHRcIj5cblx0XHRcdFx0PGkgY2xhc3M9XCJjb3JhbC1JY29uIGNvcmFsLUljb24tLXNpemVTIGNvcmFsLUljb24tLWdlYXJcIj48L2k+XG5cdFx0XHQ8L2E+XG5cdFx0PC9kaXY+XG5cdDwvZGl2PlxuXHQ8c2ItZHJvcC16b25lIG5nLWhpZGU9XCJjb2xsYXBzZWRcIj48L3NiLWRyb3Atem9uZT5cblxuXHQ8c2ItcHJlZml4LXN1ZmZpeC1wb3BvdmVyIGlkPXt7cHJlZml4U3VmZml4UG9wb3ZlcklkfX0+PC9zYi1wcmVmaXgtc3VmZml4LXBvcG92ZXI+XG5cdDxzYi1nZWFyLXBvcG92ZXIgaWQ9XCJ7e2dlYXJQb3BvdmVySWR9fVwiPjwvc2ItZ2Vhci1wb3BvdmVyPlxuXHQ8c2ItY29udGV4dC1wb3BvdmVyIGlkPVwie3tjb250ZXh0UG9wb3ZlcklkfX1cIj48L3NiLWNvbnRleHQtcG9wb3Zlcj5cbjwvZGl2PlxuIiwiPGRpdj5cblx0PGFkLWF1dG9jb21wbGV0ZVxuXHRcdG5nLWluaXQ9XCJsb2FkRWxlbWVudHMoKVwiXG5cdFx0bmctaWY9XCJzaG93QXV0b0NvbXBsZXRlRHJvcGRvd25cIlxuXHRcdGRhdGEtcHJvdmlkZXI9XCJlbGVtZW50c1wiXG5cdFx0YWQtcGxhY2Vob2xkZXItdGV4dD1cInt7IFsnZW50ZXJWYWx1ZVBsYWNlaG9sZGVyJywgJ0VudGVyIFZhbHVlJ10gfCBsMTBuIH19XCJcblx0XHRzZWxlY3RlZC1pdGVtPVwic2VsZWN0ZWRFbGVtZW50XCJcblx0XHRsb2FkaW5nLWRhdGE9XCJsb2FkaW5nRWxlbWVudHNcIlxuXHRcdGNsZWFyYWJsZT1cInRydWVcIlxuXHRcdHNpemU9XCJibG9ja1wiXG5cdFx0YWRkLW5ldy1pdGVtLXRleHQta2V5PVwie3sgYWRkTmV3SXRlbVRleHRLZXkgfX1cIlxuXHRcdHNvcnQtYnktbmFtZT1cImZhbHNlXCJcblx0XHRpdGVtLWNoYW5nZWQtaGFuZGxlcj1cIm9uU2VsZWN0ZWRFbGVtZW50Q2hhbmdlKGl0ZW0sIHRleHQpXCJcblx0XHR0ZXh0LWNoYW5nZWQtaGFuZGxlcj1cIm9uRHJvcGRvd25UZXh0Q2hhbmdlKHRleHQpXCJcblx0XHRhbGxvdy1jcmVhdGU9XCJ0cnVlXCJcblx0XHR0cmltLXZhbHVlLW9uLWNyZWF0ZT1cInRydWVcIlxuXHRcdG11bHRpPVwiZmFsc2VcIj5cblx0PC9hZC1hdXRvY29tcGxldGU+XG5cdDxpbnB1dFxuXHRcdG5nLWNsaWNrPVwib25UZXh0SW5wdXRDbGljaygkZXZlbnQpXCJcblx0XHRuZy1tb2RlbD1cImRhdGFNb2RlbC52YWx1ZVwiXG5cdFx0Y2xhc3M9XCJ0ZXh0LWlucHV0LWJveFwiXG5cdFx0cGxhY2Vob2xkZXI9XCJ7eyBbJ2VudGVyVmFsdWVQbGFjZWhvbGRlcicsICdFbnRlciBWYWx1ZSddIHwgbDEwbiB9fVwiXG5cdFx0bmctaWY9XCIhc2hvd0F1dG9Db21wbGV0ZURyb3Bkb3duXCJcblx0XHRhZC1ibHVyPVwiY29tbWl0VGV4dElucHV0KClcIlxuXHRcdGFkLWVudGVyPVwiY29tbWl0VGV4dElucHV0KClcIj5cbjwvZGl2PlxuIiwiPGFkLW51bWJlcmlucHV0XG5cdG5nLWNsaWNrPVwib25FbGVtZW50Q2xpY2soJGV2ZW50KVwiXG5cdGRhdGEtdmFsdWU9XCJkYXRhTW9kZWwudmFsdWVcIlxuXHRvbi1ibHVyPVwiY29tbWl0TnVtYmVySW5wdXQoKVwiXG5cdG9uLWVudGVyPVwiY29tbWl0TnVtYmVySW5wdXQoKVwiPlxuPC9hZC1udW1iZXJpbnB1dD5cbiIsIjxkaXYgY2xhc3M9XCJkcmFnZ2FibGUtaXRlbSBkcmFnZ2FibGUtcnVsZVwiIGFkLWRyYWdnYWJsZT1cIntkcmFnZ2FibGVNb2RlbDogZGF0YU1vZGVsLCBkcmFnU3RhcnRUaHJlc2hvbGQ6IDUsIGRyYWdQcm94eU9wYWNpdHk6IC44NX1cIlxuXHQgbmctY2xhc3M9XCJ7c2VsZWN0ZWQ6ZGF0YU1vZGVsLnNlbGVjdGVkLCBkZXByZWNhdGVkOmRhdGFNb2RlbC5kZXByZWNhdGVkfVwiIG5nLWNsaWNrPVwib25JdGVtQ2xpY2soJGV2ZW50KVwiIG5nLWluaXQ9XCJpbml0KClcIj5cblx0PGRpdiBuZy1jbGFzcz1cIntkaW1lbnNpb246ZGF0YU1vZGVsLml0ZW1UeXBlID09ICdkaW1lbnNpb24nLCBtZXRyaWM6ZGF0YU1vZGVsLml0ZW1UeXBlID09ICdtZXRyaWMnLCBzZWdtZW50OihkYXRhTW9kZWwuaXRlbVR5cGUgPT0gJ3NlZ21lbnQnKSwgJ2RhdGUtcmFuZ2UnOmRhdGFNb2RlbC5pdGVtVHlwZSA9PSAnZGF0ZVJhbmdlJ31cIlxuXHRcdCBjbGFzcz1cIml0ZW0tdHlwZS1pbmRpY2F0b3JcIiA+PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJkcmFnLWhhbmRsZVwiPjwvZGl2PlxuXHQ8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cImNvcmFsLU1pbmltYWxCdXR0b24gY29yYWwtQ2xvc2VCdXR0b25cIiBuZy1jbGljaz1cInJlbW92ZSgpXCI+XG5cdFx0PGkgY2xhc3M9XCJjb3JhbC1NaW5pbWFsQnV0dG9uLWljb24gY29yYWwtSWNvbiBjb3JhbC1JY29uLS1zaXplWFMgY29yYWwtSWNvbi0tY2xvc2VcIj48L2k+XG5cdDwvYnV0dG9uPlxuXHQ8ZGl2IGNsYXNzPVwiZHJhZ2dhYmxlLWxhYmVsXCI+XG5cdFx0e3sgZGF0YU1vZGVsLm5hbWUgfX1cblx0XHQ8aSBuZy1pZj1cImRhdGFNb2RlbC5pdGVtVHlwZSA9PSAnZGF0ZVJhbmdlJ1wiIGNsYXNzPVwiY29yYWwtTWluaW1hbEJ1dHRvbi1pY29uIGNvcmFsLUljb24gY29yYWwtSWNvbi0tc2l6ZVhTIGNvcmFsLUljb24tLWluZm9DaXJjbGVcIiBuZy1jbGljaz1cInNob3dEYXRlUmFuZ2VQcmV2aWV3KCRldmVudClcIj48L2k+XG5cdDwvZGl2PlxuXHQ8ZGl2IGNsYXNzPVwiZHJhZ2dhYmxlLXNlbGVjdC1saXN0XCI+XG5cdFx0PGFkLXNlbGVjdFxuXHRcdFx0cXVpZXQ9XCJ0cnVlXCJcblx0XHRcdHNlbGVjdGlvbj1cImRhdGFNb2RlbC5jb21wYXJpc29uVHlwZVwiXG5cdFx0XHRvcHRpb25zPVwiY29tcGFyaXNvblR5cGVzTGlzdFwiXG5cdFx0XHRzZWxlY3Rpb24tY2hhbmdlPVwib25Db21wYXJpc29uVHlwZUNoYW5nZShuZXdWYWx1ZSlcIlxuXHRcdFx0bmctaGlkZT1cImRhdGFNb2RlbC5kZXByZWNhdGVkIHx8IGRhdGFNb2RlbC5pdGVtVHlwZSA9PSAnZGF0ZVJhbmdlJ1wiPlxuXHRcdDwvYWQtc2VsZWN0PlxuXHRcdDxsYWJlbCBjbGFzcz1cImNvcmFsLUxhYmVsXCIgbmctaWY9XCJkYXRhTW9kZWwuZGVwcmVjYXRlZFwiPnt7IGdldENvbXBhcmlzb25UeXBlKCkgfX08L2xhYmVsPlxuXHQ8L2Rpdj5cblx0PGRpdiBjbGFzcz1cImRyYWdnYWJsZS1vcHRpb25zXCIgYWQtY2xpY2stb3V0c2lkZT1cImNsaWNrT3V0c2lkZURyYWdnYWJsZVJ1bGUoKVwiPlxuXHRcdDxsYWJlbCBjbGFzcz1cImNvcmFsLUxhYmVsXCIgbmctaWY9XCJkaXNwbGF5VmFsdWVMYWJlbCgpXCIgbmctY2xpY2s9XCJvblZhbHVlTGFiZWxDbGljaygkZXZlbnQpXCI+e3sgKGRhdGFNb2RlbC52YWx1ZSB8IHJ1bGVWYWx1ZUZpbHRlcjpkYXRhTW9kZWwudHlwZTpyYW5nZVR5cGUpIHx8IChbXCJwYXJlbi1lbXB0eS12YWx1ZS1wYXJlblwiLCBcIihFbXB0eSB2YWx1ZSlcIl0gfCBsMTBuICkgfX08L2xhYmVsPlxuXHQ8L2Rpdj5cbjwvZGl2PlxuIiwiPGRpdiBjbGFzcz1cImRyb3Atem9uZVwiXG5cdCBhZC1kcmFnLWVudGVyPVwib25EcmFnRW50ZXIoJGV2ZW50LCAkbG9jYWxQdCwgJGRyYWdnYWJsZU1vZGVsKVwiXG5cdCBhZC1kcmFnLW92ZXI9XCJvbkRyYWdPdmVyKCRldmVudCwgJGxvY2FsUHQsICRkcmFnZ2FibGVNb2RlbClcIlxuXHQgYWQtZHJhZy1sZWF2ZT1cIm9uRHJhZ0xlYXZlKClcIlxuXHQgYWQtZHJhZy1kcm9wPVwib25EcmFnRHJvcCgkZXZlbnQsICRkcmFnZ2FibGVNb2RlbClcIlxuXHQgYWQtZHJhZy1kcm9wLW91dHNpZGU9XCJvbkRyYWdEcm9wT3V0c2lkZSgkZXZlbnQsICRkcmFnZ2FibGVNb2RlbClcIj5cblx0PGRpdiBjbGFzcz1cImVtcHR5LWRyb3AtY29udGFpbmVyXCIgbmctc2hvdz1cImRhdGFNb2RlbC5pdGVtcy5sZW5ndGggPT0gMFwiIG5nLWNsYXNzPVwieydkcmFnLW92ZXInOnNob3dEcmFnUHJveHl9XCI+XG5cdFx0e3sgWydlbXB0eURyYWdEcm9wQ29udGFpbmVyTGFiZWwtMDAxJywgJ0RyYWcgJiBkcm9wIE1ldHJpYyhzKSwgU2VnbWVudChzKSwgYW5kL29yIERpbWVuc2lvbnMgaGVyZS4nXSB8IGwxMG4gfX1cblx0PC9kaXY+XG5cdDxzYi1zZWdtZW50LWl0ZW0gbmctcmVwZWF0PVwiaXRlbSBpbiBkYXRhTW9kZWwuaXRlbXNcIiA+PC9zYi1zZWdtZW50LWl0ZW0+XG48L2Rpdj4iLCI8ZGl2IGNsYXNzPVwiY29yYWwtUG9wb3ZlclwiID5cblx0PHVsIGNsYXNzPVwiY29yYWwzLVNlbGVjdExpc3QgaXMtdmlzaWJsZVwiPlxuXHRcdDxsaSBjbGFzcz1cImNvcmFsMy1TZWxlY3RMaXN0LWl0ZW0gY29yYWwzLVNlbGVjdExpc3QtaXRlbS0tb3B0aW9uXCJcblx0XHRcdG5nLXJlcGVhdD1cIm9wdGlvbiBpbiBvcHRpb25zIHwgZ2Vhckxpc3RGaWx0ZXI6b3B0aW9uRmlsdGVyXCJcblx0XHRcdG5nLWNsaWNrPVwib25JdGVtQ2xpY2soJGV2ZW50LCBvcHRpb24pXCI+XG5cdFx0XHR7e29wdGlvbi5sYWJlbH19XG5cdFx0PC9saT5cblx0PC91bD5cbjwvZGl2PiIsIjxkaXYgY2xhc3M9XCJjb3JhbC1Qb3BvdmVyXCIgPlxuXHQ8dWwgY2xhc3M9XCJjb3JhbDMtU2VsZWN0TGlzdCBpcy12aXNpYmxlXCI+XG5cdFx0PGxpIGNsYXNzPVwiY29yYWwzLVNlbGVjdExpc3QtaXRlbSBjb3JhbDMtU2VsZWN0TGlzdC1pdGVtLS1vcHRpb25cIlxuXHRcdFx0bmctcmVwZWF0PVwiY29udGV4dEl0ZW0gaW4gcHJlZml4U3VmZml4TGlzdFwiXG5cdFx0XHRuZy1jbGljaz1cIm9uUHJlZml4U3VmZml4SXRlbUNsaWNrKGNvbnRleHRJdGVtKVwiPlxuXHRcdFx0PGkgY2xhc3M9XCJjb3JhbC1JY29uIGNvcmFsMy1TZWxlY3RMaXN0LWl0ZW0taWNvblwiIG5nLWNsYXNzPVwiY29udGV4dEl0ZW0uaWNvblwiPjwvaT5cblx0XHRcdHt7Y29udGV4dEl0ZW0ubGFiZWx9fVxuXHRcdDwvbGk+XG5cdDwvdWw+XG48L2Rpdj5cbiIsIjxkaXYgY2xhc3M9XCJzYi1zZWdtZW50LWRlZmluaXRpb25cIiBuZy1jbGFzcz1cInsnZXhjbHVkZSc6ZGF0YU1vZGVsLmV4Y2x1ZGV9XCIgaXMtZHJhZ2dpbmctY2xhc3M9XCJpcy1kcmFnZ2luZ1wiPlxuXHQ8ZGl2IGNsYXNzPVwiY29yYWwtV2VsbFwiPlxuXHRcdDxkaXYgY2xhc3M9XCJzZWdtZW50LWN0cmwtYnV0dG9uc1wiPlxuXHRcdFx0PGEgdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiY29yYWwtQnV0dG9uIGNvcmFsLUJ1dHRvbi0tcXVpZXQgc2ItcHJlZml4LXNvZmZpeC1idXR0b25cIiBkYXRhLXRhcmdldD1cIiN7e3ByZWZpeFN1ZmZpeFBvcG92ZXJJZH19XCIgbmctaWY9XCJkYXRhTW9kZWwubG9naWNhbE9wZXJhdG9yID09ICdzZXF1ZW5jZScgJiYgaGFzT3BlcmF0b3IoKVwiXG5cdFx0XHQgICBkYXRhLXRvZ2dsZT1cInBvcG92ZXJcIiBjbG9zZU90aGVyUG9wb3ZlcnM9XCJ0cnVlXCIgZGF0YS1wb2ludC1mcm9tPVwiYm90dG9tXCIgZGF0YS1hbGlnbi1mcm9tPVwicmlnaHRcIiBkYXRhLXBvaW50LWF0PVwiI3RvcC1sZXZlbC1zZXF1ZW5jZS1vcHRpb25zLWljb25cIj5cblx0XHRcdFx0PGkgY2xhc3M9XCJjb3JhbC1JY29uIGNvcmFsLUljb24tLXNpemVTXCIgbmctY2xhc3M9XCJjdXJyZW50UHJlZml4U3VmZml4SXRlbS5pY29uXCIgaWQ9XCJ0b3AtbGV2ZWwtc2VxdWVuY2Utb3B0aW9ucy1pY29uXCI+PC9pPlxuXHRcdFx0XHQ8c3BhbiBjbGFzcz1cImVuZG9yLUFjdGlvbkJ1dHRvbi1sYWJlbFwiPnt7IGN1cnJlbnRQcmVmaXhTdWZmaXhJdGVtLmxhYmVsIH19PC9zcGFuPlxuXHRcdFx0PC9hPlxuXHRcdFx0PGEgdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwiY29yYWwtQnV0dG9uIGNvcmFsLUJ1dHRvbi0tcXVpZXRcIiBkYXRhLXRhcmdldD1cIiN7e2dlYXJQb3BvdmVySWR9fVwiXG5cdFx0XHQgICBkYXRhLXRvZ2dsZT1cInBvcG92ZXJcIiBjbG9zZU90aGVyUG9wb3ZlcnM9XCJ0cnVlXCIgZGF0YS1wb2ludC1mcm9tPVwiYm90dG9tXCIgZGF0YS1hbGlnbi1mcm9tPVwicmlnaHRcIiBkYXRhLXBvaW50LWF0PVwiI3RvcC1sZXZlbC1zZWdtZW50LW9wdGlvbnMtaWNvblwiPlxuXHRcdFx0XHQ8aSBjbGFzcz1cImNvcmFsLUljb24gY29yYWwtSWNvbi0tZ2VhciBjb3JhbC1JY29uLS1zaXplU1wiIGlkPVwidG9wLWxldmVsLXNlZ21lbnQtb3B0aW9ucy1pY29uXCI+PC9pPlxuXHRcdFx0XHQ8c3BhbiBjbGFzcz1cImVuZG9yLUFjdGlvbkJ1dHRvbi1sYWJlbFwiPnt7IFsnc2VnbWVudE9wdGlvbnMnLCAnT3B0aW9ucyddIHwgbDEwbiB9fTwvc3Bhbj5cblx0XHRcdDwvYT5cblx0XHQ8L2Rpdj5cblx0XHQ8c3BhbiBjbGFzcz1cInNob3ctbGFiZWxcIj57eyBbJ3Nob3dMYWJlbCcsICdTaG93J10gfCBsMTBuIH19PC9zcGFuPlxuXHRcdDxhZC1zZWxlY3QgY2xhc3M9XCJkZWZpbml0aW9uLWNvbnRleHQtc2VsZWN0XCIgc2VsZWN0aW9uPVwiZGF0YU1vZGVsLmNvbnRleHRcIiBvcHRpb25zPVwiY29udGV4dExpc3RcIiBzZWxlY3Rpb24tY2hhbmdlPVwib25Ub3BMZXZlbENvbnRhaW5lckNoYW5nZSgpXCI+PC9hZC1zZWxlY3Q+XG5cdFx0PHNiLWRyb3Atem9uZT48L3NiLWRyb3Atem9uZT5cblx0PC9kaXY+XG5cblx0PHNiLXByZWZpeC1zdWZmaXgtcG9wb3ZlciBpZD17e3ByZWZpeFN1ZmZpeFBvcG92ZXJJZH19Pjwvc2ItcHJlZml4LXN1ZmZpeC1wb3BvdmVyPlxuXHQ8c2ItZ2Vhci1wb3BvdmVyIGlkPVwie3tnZWFyUG9wb3ZlcklkfX1cIj48L3NiLWdlYXItcG9wb3Zlcj5cbjwvZGl2PlxuIiwiPGRpdiBjbGFzcz1cInNlZ21lbnQtaXRlbVwiPlxuXHQ8ZGl2IGNsYXNzPVwic2ItZHJhZy1kcm9wLWluZGljYXRvclwiIG5nLWNsYXNzPVwie2FjdGl2ZTppdGVtLmRpc3BsYXlEcm9wSW5kaWNhdG9yVG9wfVwiPjwvZGl2PlxuXHQ8IS0tIFRoaXMgaXRlbSB3aWxsIGJlIHBvcHVsYXRlZCB3aXRoIGVpdGhlciBhIHJ1bGUgb3IgYSBjb2xsYXBzaWJsZSBjb250YWluZXIgd2l0aGluIHRoZSBjb21waWxlIGZ1bmN0aW9uIC0tPlxuXHQ8ZGl2IGNsYXNzPVwiZHluYW1pYy1jb250ZW50XCI+PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJzYi1kcmFnLWRyb3AtaW5kaWNhdG9yXCIgbmctY2xhc3M9XCJ7YWN0aXZlOml0ZW0uZGlzcGxheURyb3BJbmRpY2F0b3JCb3R0b219XCI+PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJzZWdtZW50LWpvaW4tZnVuY3Rpb25zXCIgbmctaWY9XCJkYXRhTW9kZWwuaXRlbXMubGVuZ3RoID4gMCAmJiAkaW5kZXggIT0gZGF0YU1vZGVsLml0ZW1zLmxlbmd0aC0xXCI+XG5cdFx0PGFkLXNlbGVjdFxuXHRcdFx0cXVpZXQ9XCJ0cnVlXCJcblx0XHRcdHNlbGVjdGlvbj1cImRhdGFNb2RlbC5sb2dpY2FsT3BlcmF0b3JcIlxuXHRcdFx0b3B0aW9ucz1cImxvZ2ljYWxPcGVyYXRvckxpc3RcIlxuXHRcdFx0c2VsZWN0aW9uLWNoYW5nZT1cIm9uTG9naWNhbE9wZXJhdG9yQ2hhbmdlKG5ld1ZhbHVlKVwiPlxuXHRcdDwvYWQtc2VsZWN0PlxuXHRcdDxzYi1zZXF1ZW5jZS1waWxsLWJveCBuZy1pZj1cImRhdGFNb2RlbC5sb2dpY2FsT3BlcmF0b3IgPT0gJ3NlcXVlbmNlJ1wiPjwvc2Itc2VxdWVuY2UtcGlsbC1ib3g+XG5cdDwvZGl2PlxuPC9kaXY+XG4iLCI8ZGl2IGNsYXNzPVwic2VxdWVuY2UtcGlsbC1ib3hcIj5cblx0PHNiLXNlcXVlbmNlLXBpbGxcblx0XHRsYWJlbD1cInt7IFsnc2VxdWVuY2VBZnRlcicsICdBZnRlciddIHwgbDEwbiB9fVwiXG5cdFx0cmVtb3ZlLWl0ZW09XCJyZW1vdmVBZnRlclBpbGwoKVwiXG5cdFx0ZGF0YS1tb2RlbD1cIml0ZW0uYWZ0ZXJUaW1lUmVzdHJpY3Rpb25cIlxuXHRcdG5nLWlmPVwiaXRlbS5hZnRlclRpbWVSZXN0cmljdGlvblwiPlxuXHQ8L3NiLXNlcXVlbmNlLXBpbGw+XG5cdDxzcGFuIG5nLWlmPVwiaXRlbS5hZnRlclRpbWVSZXN0cmljdGlvbiAmJiBpdGVtLndpdGhpblRpbWVSZXN0cmljdGlvblwiPnt7IFsnc2VxdWVuY2VCdXQnLCAnYnV0J10gfCBsMTBuIH19PC9zcGFuPlxuXHQ8c2Itc2VxdWVuY2UtcGlsbFxuXHRcdGxhYmVsPVwie3sgWydzZXF1ZW5jZVdpdGhpbicsICdXaXRoaW4nXSB8IGwxMG4gfX1cIlxuXHRcdHJlbW92ZS1pdGVtPVwicmVtb3ZlV2l0aGluUGlsbCgpXCJcblx0XHRkYXRhLW1vZGVsPVwiaXRlbS53aXRoaW5UaW1lUmVzdHJpY3Rpb25cIlxuXHRcdG5nLWlmPVwiaXRlbS53aXRoaW5UaW1lUmVzdHJpY3Rpb25cIj5cblx0PC9zYi1zZXF1ZW5jZS1waWxsPlxuXG5cblx0PGEgY2xhc3M9XCJjb3JhbC1CdXR0b24gY29yYWwtQnV0dG9uLS1zZWNvbmRhcnkgY29yYWwtQnV0dG9uLS1xdWlldCBzZXF1ZW5jZS1zZWxlY3Rvci1wb3B1cC1idXR0b25cIiBuZy1jbGFzcz1cInthY3RpdmU6c2V0QWN0aXZlU3RhdGV9XCIgbmctY2xpY2s9XCJzaG93QWZ0ZXJXaXRoaW5Qb3BvdmVyKCRldmVudClcIlxuXHQgICBuZy1pZj1cImRpc3BsYXlTZXF1ZW5jZVB1bGxkb3duKClcIiBkYXRhLXRhcmdldD1cIiN7e3NlcXVlbmNlU2VsZWN0b3JQb3BvdmVySWR9fVwiIGRhdGEtdG9nZ2xlPVwicG9wb3ZlclwiIGRhdGEtcG9pbnQtZnJvbT1cImJvdHRvbVwiXG5cdCAgIGRhdGEtYWxpZ24tZnJvbT1cInJpZ2h0XCI+XG5cdFx0PGkgY2xhc3M9XCJjb3JhbC1JY29uIGNvcmFsLUljb24tLWNsb2NrXCI+PC9pPlxuXHQ8L2E+XG5cblx0PGRpdiBjbGFzcz1cImNvcmFsLVBvcG92ZXJcIiBpZD1cInt7c2VxdWVuY2VTZWxlY3RvclBvcG92ZXJJZH19XCI+XG5cdFx0PHVsIGNsYXNzPVwiY29yYWwzLVNlbGVjdExpc3QgaXMtdmlzaWJsZVwiPlxuXHRcdFx0PGxpIGNsYXNzPVwiY29yYWwzLVNlbGVjdExpc3QtaXRlbSBjb3JhbDMtU2VsZWN0TGlzdC1pdGVtLS1vcHRpb25cIiBuZy1jbGljaz1cImFmdGVyQ2xpY2tIYW5kbGVyKClcIj5cblx0XHRcdFx0PGkgY2xhc3M9XCJjb3JhbC1JY29uIGNvcmFsMy1TZWxlY3RMaXN0LWl0ZW0taWNvbiBjb3JhbC1JY29uLS1jaGVjayB1LWNvcmFsLXB1bGxSaWdodFwiIG5nLWlmPVwiaXRlbS5hZnRlclRpbWVSZXN0cmljdGlvblwiPjwvaT5cblx0XHRcdFx0PHNwYW4gY2xhc3M9XCJzZXF1ZW5jZS1vcHRpb24tbGFiZWxcIiA+e3sgWydzZXF1ZW5jZUFmdGVyJywgJ0FmdGVyJ10gfCBsMTBuIH19PC9zcGFuPlxuXHRcdFx0PC9saT5cblx0XHRcdDxsaSBjbGFzcz1cImNvcmFsMy1TZWxlY3RMaXN0LWl0ZW0gY29yYWwzLVNlbGVjdExpc3QtaXRlbS0tb3B0aW9uXCIgbmctY2xpY2s9XCJ3aXRoaW5DbGlja0hhbmRsZXIoKVwiPlxuXHRcdFx0XHQ8aSBjbGFzcz1cImNvcmFsLUljb24gY29yYWwzLVNlbGVjdExpc3QtaXRlbS1pY29uIGNvcmFsLUljb24tLWNoZWNrIHUtY29yYWwtcHVsbFJpZ2h0XCIgbmctaWY9XCJpdGVtLndpdGhpblRpbWVSZXN0cmljdGlvblwiPjwvaT5cblx0XHRcdFx0PHNwYW4gY2xhc3M9XCJzZXF1ZW5jZS1vcHRpb24tbGFiZWxcIiA+e3sgWydzZXF1ZW5jZVdpdGhpbicsICdXaXRoaW4nXSB8IGwxMG4gfX08L3NwYW4+XG5cdFx0XHQ8L2xpPlxuXHRcdDwvdWw+XG5cdDwvZGl2PlxuPC9kaXY+XG4iLCI8ZGl2IGNsYXNzPVwic2VxdWVuY2UtcGlsbFwiPlxuXHQ8YnV0dG9uIGNsYXNzPVwiY29yYWwtTWluaW1hbEJ1dHRvbiBjb3JhbC1DbG9zZUJ1dHRvblwiIG5nLWNsaWNrPVwicmVtb3ZlSXRlbShkYXRhTW9kZWwpXCI+XG5cdFx0PGkgY2xhc3M9XCJjb3JhbC1NaW5pbWFsQnV0dG9uLWljb24gY29yYWwtSWNvbiBjb3JhbC1JY29uLS1zaXplWFMgY29yYWwtSWNvbi0tY2xvc2VcIj48L2k+XG5cdDwvYnV0dG9uPlxuXHQ8c3BhbiBjbGFzcz1cImNvcmFsLUxhYmVsXCIgbmctaGlkZT1cImlzSmFwYW5lc2VcIj57eyBsYWJlbCB9fTwvc3Bhbj5cblx0PHNwYW4gY2xhc3M9XCJjb3JhbC1TZWxlY3QgbmctaXNvbGF0ZS1zY29wZSBxdWlldFwiPlxuXHRcdDxidXR0b24gY2xhc3M9XCJjb3JhbC1TZWxlY3QtYnV0dG9uIGNvcmFsLU1pbmltYWxCdXR0b25cIiB0eXBlPVwiYnV0dG9uXCIgZGF0YS10b2dnbGU9XCJwb3BvdmVyXCIgZGF0YS1wb2ludC1mcm9tPVwiYm90dG9tXCJcblx0XHRcdFx0ZGF0YS1hbGlnbi1mcm9tPVwicmlnaHRcIiBkYXRhLXRhcmdldD1cIiN7e3NlcXVlbmNlTnVtYmVySW5wdXRQb3BvdmVySWR9fVwiIG5nLWNsYXNzPVwie2FjdGl2ZTpjb3VudEJ1dHRvbkFjdGl2ZX1cIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiY29yYWwtU2VsZWN0LWJ1dHRvbi10ZXh0XCI+e3sgZGF0YU1vZGVsLmNvdW50IH19PC9zcGFuPlxuXHRcdDwvYnV0dG9uPlxuXHQ8L3NwYW4+XG5cblx0PGFkLXJlYWN0LWNvbXBvbmVudCB0eXBlPVwiVGltZVVuaXRTZWxlY3RvclwiIHByb3BzPVwie3VuaXQ6IGRhdGFNb2RlbC51bml0LCBvbkNoYW5nZTogb25UaW1lVW5pdENoYW5nZX1cIj48L2FkLXJlYWN0LWNvbXBvbmVudD5cblxuXHQ8c3BhbiBjbGFzcz1cImNvcmFsLUxhYmVsXCIgbmctc2hvdz1cImlzSmFwYW5lc2VcIj57eyBsYWJlbCB9fTwvc3Bhbj5cblxuXHQ8ZGl2IGNsYXNzPVwiY29yYWwtUG9wb3ZlclwiIGlkPVwie3tzZXF1ZW5jZU51bWJlcklucHV0UG9wb3ZlcklkfX1cIiA+XG5cdFx0PGFkLW51bWJlcmlucHV0XG5cdFx0XHRsb3dlci1saW1pdD1cIjFcIlxuXHRcdFx0ZGF0YS12YWx1ZT1cImRhdGFNb2RlbC5jb3VudFwiXG5cdFx0XHRvbi1lbnRlcj1cImhpZGVDb3VudFBvcG92ZXIoKVwiPlxuXHRcdDwvYWQtbnVtYmVyaW5wdXQ+XG5cdDwvZGl2PlxuPC9kaXY+XG4iLCI8ZGl2IGNsYXNzPVwiZW5kb3ItUGFnZS1jb250ZW50IGVuZG9yLVBhbmVsXCIgPlxuXHQ8ZGl2IG5nLWluaXQ9XCJpbml0RGF0YSgpXCI+XG5cdFx0PGRpdiA+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiZW5kb3ItUGFuZWwtY29udGVudE1haW4gdS1jb3JhbC1wYWRkaW5nIHNiLW1haW4tY29udGVudFwiIG5nLWNsYXNzPVwie2lzRHJhZ2dpbmc6ZHJhZ2dpbmd9XCI+XG5cdFx0XHRcdDxkaXYgbmctc2hvdz1cIiFpbml0aWFsaXppbmdcIj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwic2Itc2VnbWVudC1jb250YWluZXJcIj5cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJzYi10b3Atc2VjdGlvbi1jb250YWluZXJcIj5cblx0XHRcdFx0XHRcdFx0PGFuLXNlZ21lbnQtc3VtbWFyeSBzZWdtZW50PVwic2VnbWVudFwiIGNvbnRyb2wtb2JqZWN0PVwiY29udHJvbE9iamVjdFwiIGRhdGUtcmFuZ2U9XCJkYXRlUmFuZ2VcIj48L2FuLXNlZ21lbnQtc3VtbWFyeT5cblx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInNiLWhlYWRpbmctZmllbGRzXCI+XG5cdFx0XHRcdFx0XHRcdFx0PGxhYmVsIGNsYXNzPVwic2ItaGVhZGluZ1wiPnt7IFsnc2VnbWVudFRpdGxlSGVhZGluZycsICdUaXRsZSddIHwgbDEwbiB9fTwvbGFiZWw+XG5cdFx0XHRcdFx0XHRcdFx0PGRpdj48aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cInRpdGxlRmllbGQgY29yYWwtVGV4dGZpZWxkXCIgbmctbW9kZWw9XCJzZWdtZW50Lm5hbWVcIj48L2Rpdj5cblx0XHRcdFx0XHRcdFx0XHQ8bGFiZWwgY2xhc3M9XCJzYi1oZWFkaW5nXCI+e3sgWydzZWdtZW50RGVzY3JpcHRpb25IZWFkaW5nJywgJ0Rlc2NyaXB0aW9uJ10gfCBsMTBuIH19PC9sYWJlbD5cblx0XHRcdFx0XHRcdFx0XHQ8dGV4dGFyZWEgY2xhc3M9XCJjb3JhbC1UZXh0ZmllbGQgY29yYWwtVGV4dGZpZWxkLS1tdWx0aWxpbmUgZGVzY3JpcHRpb25GaWVsZFwiIG5nLW1vZGVsPVwic2VnbWVudC5kZXNjcmlwdGlvblwiPjwvdGV4dGFyZWE+XG5cdFx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0XHQ8bGFiZWwgY2xhc3M9XCJzYi1oZWFkaW5nXCI+e3sgWyd0YWdzSGVhZGVyJywgJ1RhZ3MnXSB8IGwxMG4gfX08L2xhYmVsPlxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cImNvcmFsLVdlbGwgc2ItdGFnLXdlbGxcIj5cblx0XHRcdFx0XHRcdFx0PGFkLXF1aWNrLWFkZFxuXHRcdFx0XHRcdFx0XHRcdGl0ZW1zPVwidGFnc1wiXG5cdFx0XHRcdFx0XHRcdFx0bG9hZC1pdGVtcz1cImxvYWRUYWdzXCJcblx0XHRcdFx0XHRcdFx0XHRsb2FkaW5nLWl0ZW1zPVwibG9hZGluZ1RhZ3NcIlxuXHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyLXRleHQta2V5PVwie3sgWydhZGRUYWdzTGFiZWwnLCAnQWRkIFRhZ3MnXSB8IGwxMG4gfX1cIlxuXHRcdFx0XHRcdFx0XHRcdGljb24tY2xhc3MtbmFtZT1cInRhZ1wiXG5cdFx0XHRcdFx0XHRcdFx0YWxsb3ctY3JlYXRlPVwidHJ1ZVwiXG5cdFx0XHRcdFx0XHRcdFx0YWRkLW5ldy1pdGVtLXRleHQta2V5PVwie3tjbGlja1RvQWRkTmV3SXRlbUxhYmVsfX1cIj5cblx0XHRcdFx0XHRcdFx0PC9hZC1xdWljay1hZGQ+XG5cdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHRcdDxsYWJlbCBjbGFzcz1cInNiLWhlYWRpbmdcIj57eyBbJ3NlZ21lbnREZWZpbml0aW9uc0hlYWRpbmcnLCAnRGVmaW5pdGlvbnMnXSB8IGwxMG4gfX08L2xhYmVsPlxuXHRcdFx0XHRcdFx0PHNiLXNlZ21lbnQtZGVmaW5pdGlvbiBkYXRhLW1vZGVsPVwic2VnbWVudC5jb25zdW1hYmxlRGVmaW5pdGlvblwiPjwvc2Itc2VnbWVudC1kZWZpbml0aW9uPlxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInNoYXJlVG9NQ1wiIG5nLXNob3c9XCJjYW5TaGFyZVRvTUNcIj5cblx0XHRcdFx0XHRcdFx0PGxhYmVsIGNsYXNzPVwiY29yYWwtQ2hlY2tib3hcIiBuZy1jbGFzcz1cIntkaXNhYmxlZE9wdGlvbjpzZWdtZW50LmFhbVN0YXR1c0ZvckN1cnJlbnRSc2lkID09ICdpblVzZSd9XCI+XG5cdFx0XHRcdFx0XHRcdFx0PGlucHV0IGNsYXNzPVwiY29yYWwtQ2hlY2tib3gtaW5wdXRcIlxuXHRcdFx0XHRcdFx0XHRcdFx0ICAgdHlwZT1cImNoZWNrYm94XCJcblx0XHRcdFx0XHRcdFx0XHRcdCAgIG5nLW1vZGVsPVwic2hhcmVkVG9NQ1wiXG5cdFx0XHRcdFx0XHRcdFx0XHQgICBuZy1jaGFuZ2U9XCJzZWdtZW50LmFhbVN0YXR1c0ZvckN1cnJlbnRSc2lkID0gKHNoYXJlZFRvTUMgPyAncHVibGlzaGVkJyA6ICcnKVwiXG5cdFx0XHRcdFx0XHRcdFx0XHQgICBuZy1jaGVja2VkPVwic2VnbWVudC5hYW1TdGF0dXNGb3JDdXJyZW50UnNpZCA9PSAncHVibGlzaGVkJyB8fCBzZWdtZW50LmFhbVN0YXR1c0ZvckN1cnJlbnRSc2lkID09ICdpblVzZSdcIlxuXHRcdFx0XHRcdFx0XHRcdFx0ICAgbmctZGlzYWJsZWQ9XCJzZWdtZW50LmFhbVN0YXR1c0ZvckN1cnJlbnRSc2lkID09ICdpblVzZSdcIj5cblx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImNvcmFsLUNoZWNrYm94LWNoZWNrbWFya1wiPjwvc3Bhbj5cblx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImNvcmFsLUNoZWNrYm94LWRlc2NyaXB0aW9uXCI+e3sgWydtYWtlTWFya2V0aW5nQ2xvdWRBdWRpZW5jZScsICdNYWtlIHRoaXMgYSBNYXJrZXRpbmcgQ2xvdWQgYXVkaWVuY2UgKGZvciAlcyknXSB8IGwxMG4gfCBzcHJpbnRmOmN1cnJlbnRSZXBvcnRTdWl0ZU5hbWUgfX08L3NwYW4+XG5cdFx0XHRcdFx0XHRcdDwvbGFiZWw+XG5cdFx0XHRcdFx0XHRcdDxhZC10b29sdGlwIGNsYXNzPVwic2ItaWNvblwiIGxpbms9XCIvbWNsb3VkL3RfcHVibGlzaF9hdWRpZW5jZV9zZWdtZW50Lmh0bWxcIiBwb3NpdGlvbj1cImFib3ZlXCI+XG5cdFx0XHRcdFx0XHRcdFx0e3sgWydjaGVja2luZ01hcmtldGluZ0Nsb3VkQnRuJywgJ0NoZWNraW5nIHRoaXMgYm94IHdpbGwgbWFrZSB0aGUgYXVkaWVuY2UgZGVyaXZlZCBmcm9tIHRoaXMgc2VnbWVudCBhdmFpbGFibGUgaW4gdGhlIEF1ZGllbmNlIExpYnJhcnkgd2hlcmUgaXQgY2FuIGJlIHVzZWQgZm9yIG1hcmtldGluZyBhY3Rpdml0aWVzIGluIFRhcmdldCBhbmQgb3RoZXIgTWFya2V0aW5nIENsb3VkIHNvbHV0aW9ucy4nXSB8IGwxMG4gfX1cblx0XHRcdFx0XHRcdFx0PC9hZC10b29sdGlwPlxuXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwiYXVkaWVuY2Utd2luZG93XCIgbmctc2hvdz1cInNlZ21lbnQuYWFtU3RhdHVzRm9yQ3VycmVudFJzaWRcIj5cblx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImF1ZGllbmNlLXdpbmRvdy1sYWJlbFwiIG5nLWNsYXNzPVwieydkaXNhYmxlZE9wdGlvbic6c2VnbWVudC5hYW1TdGF0dXNGb3JDdXJyZW50UnNpZD09J2luVXNlJ31cIj5cblx0XHRcdFx0XHRcdFx0XHRcdHt7IFsnc2VsZWN0QXVkaWVuY2VXaW5kb3dMYWJlbCcsICdTZWxlY3QgdGhlIHdpbmRvdyBmb3IgYXVkaWVuY2UgY3JlYXRpb246J10gfCBsMTBuIH19XG5cdFx0XHRcdFx0XHRcdFx0PC9zcGFuPlxuXHRcdFx0XHRcdFx0XHRcdDxhZC1zZWxlY3Rcblx0XHRcdFx0XHRcdFx0XHRcdGNsYXNzPVwic2VnbWVudC1hdWRpZW5jZS1jcmVhdGlvbi1kcm9wZG93blwiXG5cdFx0XHRcdFx0XHRcdFx0XHRzZWxlY3Rpb249XCJsb29rYmFja1ZhbHVlXCJcblx0XHRcdFx0XHRcdFx0XHRcdG9wdGlvbnM9XCJwcmVzZXRzXCJcblx0XHRcdFx0XHRcdFx0XHRcdGRpc2FibGUtZHJvcGRvd249XCJzZWdtZW50LmFhbVN0YXR1c0ZvckN1cnJlbnRSc2lkID09ICdpblVzZSdcIj5cblx0XHRcdFx0XHRcdFx0XHQ8L2FkLXNlbGVjdD5cblx0XHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJzYi1tYWtlLXNlZ21lbnQtcHVibGljXCIgbmctaWY9XCJpbml0aWFsbHlJc0ludGVybmFsXCI+XG5cdFx0XHRcdFx0XHRcdDxsYWJlbCBjbGFzcz1cImNvcmFsLUNoZWNrYm94XCI+XG5cdFx0XHRcdFx0XHRcdFx0PGlucHV0IGNsYXNzPVwiY29yYWwtQ2hlY2tib3gtaW5wdXRcIlxuXHRcdFx0XHRcdFx0XHRcdFx0ICAgdHlwZT1cImNoZWNrYm94XCJcblx0XHRcdFx0XHRcdFx0XHRcdCAgIG5nLW1vZGVsPVwic2VnbWVudC5pbnRlcm5hbFwiXG5cdFx0XHRcdFx0XHRcdFx0XHQgICBuZy10cnVlLXZhbHVlPVwiZmFsc2VcIiBcblx0XHRcdFx0XHRcdFx0XHRcdCAgIG5nLWZhbHNlLXZhbHVlPVwidHJ1ZVwiXG5cdFx0XHRcdFx0XHRcdFx0XHQgICBuZy1jaGVja2VkPVwiIXNlZ21lbnQuaW50ZXJuYWxcIj5cblx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImNvcmFsLUNoZWNrYm94LWNoZWNrbWFya1wiPjwvc3Bhbj5cblx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImNvcmFsLUNoZWNrYm94LWRlc2NyaXB0aW9uXCI+e3sgWydtYWtlVGhpc1NlZ21lbnRQdWJsaWMnLCAnTWFrZSB0aGlzIHNlZ21lbnQgcHVibGljJ10gfCBsMTBuIH19PC9zcGFuPlxuXHRcdFx0XHRcdFx0XHQ8L2xhYmVsPlxuXHRcdFx0XHRcdFx0XHQ8YWQtdG9vbHRpcCBjbGFzcz1cInNiLWljb25cIiBwb3NpdGlvbj1cImFib3ZlXCI+XG5cdFx0XHRcdFx0XHRcdFx0e3sgWydtYWtlU2VnbWVudFB1YmxpY0Rlc2NyaXB0aW9uJywgJ1RoaXMgc2VnbWVudCBpcyBvbmx5IHZpc2libGUgaW4gdGhlIHByb2plY3Qgd2hlcmUgaXQgd2FzIGNyZWF0ZWQuIENoZWNraW5nIHRoaXMgYm94IHdpbGwgbWFrZSB0aGlzIHNlZ21lbnQgdmlzaWJsZSBldmVyeXdoZXJlLiddIHwgbDEwbiB9fVxuXHRcdFx0XHRcdFx0XHQ8L2FkLXRvb2x0aXA+XG5cdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwic2ItYnV0dG9uLWNvbnRhaW5lclwiIG5nLWlmPVwiOjogIWVtYmVkZGVkXCI+XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdDxidXR0b24gY2xhc3M9XCJjb3JhbC1CdXR0b24gY29yYWwtQnV0dG9uLS1wcmltYXJ5XCIgbmctY2xpY2s9XCJzaG93U2F2ZVByb21wdCgpXCIgbmctc2hvdz1cImNhblNhdmVTZWdtZW50KClcIiBuZy1kaXNhYmxlZD1cIiFjb250cm9sT2JqZWN0LmlzVmFsaWRcIj57eyBbJ3NhdmVCdXR0b25MYWJlbCcsICdTYXZlJ10gfCBsMTBuIH19PC9idXR0b24+XG5cblx0XHRcdFx0XHRcdDxidXR0b24gY2xhc3M9XCJjb3JhbC1CdXR0b24gY29yYWwtQnV0dG9uLS1wcmltYXJ5XCIgbmctY2xpY2s9XCJzYXZlU2VnbWVudEFzKClcIiBuZy1zaG93PVwic2VnbWVudC5pZFwiIG5nLWRpc2FibGVkPVwiIWNvbnRyb2xPYmplY3QuaXNWYWxpZFwiPnt7IFsnc2F2ZUFzQnV0dG9uTGFiZWwnLCAnU2F2ZSBBcyddIHwgbDEwbiB9fTwvYnV0dG9uPlxuXG5cdFx0XHRcdFx0XHQ8YnV0dG9uIGNsYXNzPVwiY29yYWwtQnV0dG9uIGNvcmFsLUJ1dHRvbi0td2FybmluZ1wiIG5nLXNob3c9XCJjYW5EZWxldGVTZWdtZW50KClcIiBuZy1jbGljaz1cImRlbGV0ZVNlZ21lbnQoKVwiIG5nLWRpc2FibGVkPVwic2VnbWVudC5pblVzZUJ5QWFtRm9yQXRMZWFzdE9uZVJzaWQgfHwgIWhhc1Blcm1pc3Npb25Gb3JSc2lkXCI+e3sgWydkZWxldGVCdXR0b25MYWJlbCcsICdEZWxldGUnXSB8IGwxMG4gfX08L2J1dHRvbj5cblxuXHRcdFx0XHRcdFx0PGEgY2xhc3M9XCJjb3JhbC1MaW5rXCIgbmctY2xpY2s9XCJjYW5jZWwoKVwiPlxuXHRcdFx0XHRcdFx0XHR7eyBbJ2NhbmNlbEJ1dHRvbkxhYmVsJywgJ0NhbmNlbCddIHwgbDEwbiB9fVxuXHRcdFx0XHRcdFx0PC9hPlxuXG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8YW4tc3Bpbm5lciBpZD1cInt7c2JTcGlubmVySWR9fVwiIGxhcmdlPVwidHJ1ZVwiIGNlbnRlcj1cInRydWVcIj48L2FuLXNwaW5uZXI+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0PC9kaXY+XG48L2Rpdj5cbiIsIjxkaXY+XG5cdDxzZWdtZW50LWJ1aWxkZXIgZWRpdC1pZD1cImVkaXRJZFwiIHBhc3RlLWlkPVwicGFzdGVJZFwiPjwvc2VnbWVudC1idWlsZGVyPlxuPC9kaXY+XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=