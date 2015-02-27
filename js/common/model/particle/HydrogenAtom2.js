// Copyright 2002-2014, University of Colorado Boulder
/**
 * The class represents a single atom of hydrogen in the model.
 *
 * @author John Blanco
 */
// TODO: Can this be deleted?
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var StatesOfMatterAtom = require( 'STATES_OF_MATTER/common/model/particle/StatesOfMatterAtom' );
  var AtomType = require( 'STATES_OF_MATTER/common/model/AtomType' );
  var StatesOfMatterConstants = require( 'STATES_OF_MATTER/common/StatesOfMatterConstants' );

// In picometers.
  var RADIUS = 120;
// In atomic mass units.
  var MASS = 1.00794;
  var ATOM_TYPE = AtomType.HYDROGEN;

  /**
   * @param {Number} xPos  position in picometers
   * @param {Number} yPos  position in picometers
   * @constructor
   */
  function HydrogenAtom2( xPos, yPos ) {
    StatesOfMatterAtom.call( this, xPos, yPos, RADIUS, MASS, StatesOfMatterConstants.HYDROGEN_COLOR );
  }

  return inherit( StatesOfMatterAtom, HydrogenAtom2, {
      getType: function() {
        return ATOM_TYPE;
      }
    },
//statics
    {
      RADIUS: RADIUS
    } );
} );

