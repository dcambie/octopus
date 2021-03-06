// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2013-2014 MIT, All rights reserved
// Released under the MIT License https://raw.github.com/mit-cml/app-inventor/master/mitlicense.txt
/**
 * @license
 * @fileoverview Editable parameter field with flydown menu of a getter and setter block.
 * @author fturbak@wellesley.edu (Lyn Turbak)
 */

'use strict';

import Blockly from './blockly';
import FieldFlydown from './field_flydown';
import {inherits} from './utils';

/**
 * Class for a parameter declaration field with flyout menu of getter/setter blocks on mouse over
 * @param {string} text The initial parameter name in the field.
 * @param {boolean} isEditable Indicates whether the the name in the flydown is editable.
 * @param {opt_additionalChangeHandler} function A one-arg function indicating what to do in addition to
 *   renaming lexical variables. May be null/undefined to indicate nothing extra to be done.
 * @extends {FieldFlydown}
 * @constructor
 */
// [lyn, 10/26/13] Added opt_additionalChangeHandler to handle propagation of renaming
//    of proc decl params
var FieldParameterFlydown = function(name, isEditable, displayLocation, opt_additionalChangeHandler) {
  // [lyn, 07/02/14] Modified change handler so can be turned off with FieldParameterFlydown.changeHandlerEnabled flag
  var changeHandler = function (text) {
    if (FieldParameterFlydown.changeHandlerEnabled) {
      // changeHandler is invoked as method on field, so "this" will be the field.
      // Need to pass correct "this" to both functions!
      if (opt_additionalChangeHandler) {
        opt_additionalChangeHandler.call(this, text);
      }
      //return possiblyRenamedText;
      return text;
    } else {
      return text;
    }
  }
  FieldParameterFlydown.super_.call(this, name, isEditable, displayLocation, changeHandler);
};
inherits(FieldParameterFlydown, FieldFlydown);
export default FieldParameterFlydown;

FieldParameterFlydown.prototype.fieldCSSClassName = 'blocklyFieldParameter'

FieldParameterFlydown.prototype.flyoutCSSClassName = 'blocklyFieldParameterFlydown'

// [lyn, 07/02/14] Added this flag to control changeHandler
//   There are several spots where we want to disable the changeHandler to avoid
//   unwanted calls to renameParam, such as when these fields are deleted and then readded
//   in updates to procedures and local variable declarations.
FieldParameterFlydown.changeHandlerEnabled = true;

// [lyn, 07/02/14] Execute thunk with changeHandler disabled
FieldParameterFlydown.withChangeHanderDisabled= function (thunk) {
  var oldFlag = FieldParameterFlydown.changeHandlerEnabled;
  FieldParameterFlydown.changeHandlerEnabled = false;
  try {
    thunk();
  } finally {
    FieldParameterFlydown.changeHandlerEnabled = oldFlag;
  }
};

// [lyn, 06/30/2014] Prevent infinite loops from change handlers on these fields!
// Path of infinite loop: setText -> renameParam change handler -> renameBound (if renaming capturables) -> setText
// DON'T DO ANYTHING IMPORTANT HERE - it is also called with text=null when the mutator arg is being disposed.
// (this only doesn't cause problems due to withChangeHanderDisabled() (?))
FieldParameterFlydown.prototype.setText = function(text) {
  if (! this.alreadySettingText) {
    this.alreadySettingText = true;
    Blockly.FieldTextInput.prototype.setText.call(this,text);
    this.alreadySettingText = false;
  }
};

 /**
  * Method for creating blocks
  * Returns a list of two XML elements: a getter block for name and a setter block for this parameter field.
  *  @return {!Array.<string>} List of two XML elements.
  */
FieldParameterFlydown.prototype.flydownBlocksXML_ = function() {
  var name, text = this.getText(), scope = this.sourceBlock_.getVariableScope();
  if (scope) {
    name = text + '@@' + scope.getName() + '::' + text;
  } else {
    name = text; // global name for this parameter field.
  }
  var getterSetterXML =
       '<xml>' +
         '<block type="lexical_variable_get">' +
           '<title name="VAR">' +
             name +
           '</title>' +
         '</block>' +
         '<block type="lexical_variable_set">' +
           '<title name="VAR">' +
             name +
           '</title>' +
         '</block>' +
       '</xml>';
  return getterSetterXML;
}

/**
 * [lyn, 10/24/13]
 * Add an option for toggling horizontal vs. vertical placement of parameter lists
 * on the given block. Put before "Collapse Block in uncollapsed block"
 * [lyn, 10/27/13] Also remove any "Inline Inputs" option, since vertical params
 * doesn't interact well with it (in procedures_defreturn).
 */
FieldParameterFlydown.addHorizontalVerticalOption = function (block, options) {
  var numParams = 0;
  if (block.getParameters) {
    numParams = block.getParameters().length;
  }
  if (Blockly.collapse && ! this.collapsed && numParams > 0) {
    var horizVertOption =
        { enabled: true,
             text: block.horizontalParameters ? Blockly.MSG_VERTICAL_PARAMETERS : Blockly.MSG_HORIZONTAL_PARAMETERS,
         callback: function () { block.setParameterOrientation(!block.horizontalParameters); }
        };

    // Find the index of "Collapse Block" option and inset horizonta/vertical option before it
    var insertionIndex = 0;
    for (var option = null; option = options[insertionIndex]; insertionIndex++) {
      if (option.text === Blockly.MSG_COLLAPSE_BLOCK) {
        break; // Stop loop when insertion point found
      }
    }
    if (insertionIndex < options.length) { // If didn't find "Collapse Block" option, something's wrong.
      options.splice(insertionIndex, 0, horizVertOption);
    }

    // Remove an "Inline Inputs" option (if there is one)
    var removalIndex = -1;
    for (var i = 0, option = null; option = options[i]; i++) {
      if (option.text === Blockly.MSG_INLINE_INPUTS) {
        removalIndex = i;
        break; // Stop loop when insertion point found
      }
    }
    if (removalIndex >= 0) {
      options.splice(removalIndex, 1);
    }
  }
}
