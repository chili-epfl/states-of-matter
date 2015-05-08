// Copyright  2002 - 2015, University of Colorado Boulder

/**
 * The 'Solid Liquid Gas' screen. Conforms to the contract specified in joist/Screen.
 *
 * @author Aaron Davis
 * @author Siddhartha Chinthapally (Actual Concepts)
 */
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var Screen = require( 'JOIST/Screen' );
  var SolidLiquidGasScreenView = require( 'STATES_OF_MATTER/solid-liquid-gas/view/SolidLiquidGasScreenView' );
  var MultipleParticleModel = require( 'STATES_OF_MATTER/common/model/MultipleParticleModel' );
  var Image = require( 'SCENERY/nodes/Image' );
  var AtomicInteractionColors = require( 'STATES_OF_MATTER/atomic-interactions/view/AtomicInteractionColors' );

  // strings
  var statesString = require( 'string!STATES_OF_MATTER/states' );

  // images
  var statesScreenIcon = require( 'image!STATES_OF_MATTER/som-states-icon.png' );

  /**
   * @param {Property<boolean>} projectorColorsProperty - true for projector color scheme (white back ground), false for regular black back ground
   * @constructor
   */
  function SolidLiquidGasScreen( projectorColorsProperty ) {
    Screen.call( this,
      statesString,
      new Image( statesScreenIcon ),
      function() { return new MultipleParticleModel(); },
      function( model ) { return new SolidLiquidGasScreenView( model, projectorColorsProperty ); },
      { backgroundColor: 'black' }
    );
    var screen = this;
    projectorColorsProperty.link( function( color ) {
      if ( color ) {
        AtomicInteractionColors.applyProfile( 'projector' );
      }
      else {
        AtomicInteractionColors.applyProfile( 'default' );
      }
    } );
    AtomicInteractionColors.linkAttribute( 'background', screen, 'backgroundColor' );
  }

  return inherit( Screen, SolidLiquidGasScreen );
} );