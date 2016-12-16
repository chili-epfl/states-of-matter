// Copyright 2014-2015, University of Colorado Boulder

/**
 * This class is used to change the phase state (i.e. solid, liquid, or gas)
 * for a set of diatomic (i.e. two atoms per molecule) molecules.
 *
 * @author John Blanco
 * @author Siddhartha Chinthapally (Actual Concepts)
 */
define( function( require ) {
  'use strict';

  // modules
  var AbstractPhaseStateChanger = require( 'STATES_OF_MATTER/common/model/engine/AbstractPhaseStateChanger' );
  var DiatomicAtomPositionUpdater = require( 'STATES_OF_MATTER/common/model/engine/DiatomicAtomPositionUpdater' );
  var inherit = require( 'PHET_CORE/inherit' );
  var PhaseStateEnum = require( 'STATES_OF_MATTER/common/PhaseStateEnum' );
  var Random = require( 'DOT/Random' );
  var statesOfMatter = require( 'STATES_OF_MATTER/statesOfMatter' );
  var StatesOfMatterConstants = require( 'STATES_OF_MATTER/common/StatesOfMatterConstants' );

  // constants
  var MIN_INITIAL_DIAMETER_DISTANCE = 2.0;

  // The following constants can be adjusted to make the the corresponding phase more or less dense.
  var LIQUID_SPACING_FACTOR = 0.7;

  /**
   * @param {MultipleParticleModel} multipleParticleModel of the simulation
   * @constructor
   */
  function DiatomicPhaseStateChanger( multipleParticleModel ) {

    // Make sure this is not being used on an inappropriate data set.
    assert && assert( multipleParticleModel.moleculeDataSet.getAtomsPerMolecule() === 2 );

    // initialization
    this.positionUpdater = DiatomicAtomPositionUpdater; // @private
    AbstractPhaseStateChanger.call( this, multipleParticleModel );
    this.multipleParticleModel = multipleParticleModel; // @private
    this.rand = new Random(); // @private
  }

  statesOfMatter.register( 'DiatomicPhaseStateChanger', DiatomicPhaseStateChanger );

  return inherit( AbstractPhaseStateChanger, DiatomicPhaseStateChanger, {

    /**
     * @param {number} phaseState - phase state (solid/liquid/gas) of the collection of molecules
     * @public
     */
    setPhase: function( phaseState ) {
      var postChangeModelSteps = 0;
      switch( phaseState ) {
        case PhaseStateEnum.SOLID:
          this.setPhaseSolid();
          postChangeModelSteps = 0;
          break;
        case PhaseStateEnum.LIQUID:
          this.setPhaseLiquid();
          postChangeModelSteps = 20;
          break;
        case PhaseStateEnum.GAS:
          this.setPhaseGas();
          postChangeModelSteps = 0;
          break;
        default:
          throw new Error( 'invalid phaseState: ' + phaseState );
      }

      var moleculeDataSet = this.multipleParticleModel.moleculeDataSet;

      // Sync up the atom positions with the molecule positions.
      this.positionUpdater.updateAtomPositions( moleculeDataSet );

      // Step the model a number of times in order to prevent the particles from looking too organized.  The number of
      // steps was empirically determined.
      for ( var i = 0; i < postChangeModelSteps; i++ ) {
        this.multipleParticleModel.stepInternal( StatesOfMatterConstants.NOMINAL_TIME_STEP );
      }
    },

    /**
     * Set the phase to the solid state.
     * @public
     */
    setPhaseSolid: function() {

      // Set the model temperature for this phase.
      this.multipleParticleModel.setTemperature( StatesOfMatterConstants.SOLID_TEMPERATURE );

      // Get references to the various elements of the data set.
      var moleculeDataSet = this.multipleParticleModel.moleculeDataSet;
      var numberOfMolecules = moleculeDataSet.getNumberOfMolecules();
      var moleculeCenterOfMassPositions = moleculeDataSet.moleculeCenterOfMassPositions;
      var moleculeVelocities = moleculeDataSet.moleculeVelocities;
      var moleculeRotationAngles = moleculeDataSet.moleculeRotationAngles;
      var moleculesInsideContainer = this.multipleParticleModel.moleculeDataSet.insideContainer;

      // Create and initialize other variables needed to do the job.
      var temperatureSqrt = Math.sqrt( this.multipleParticleModel.temperatureSetPointProperty.get() );
      var moleculesPerLayer = (Math.round( Math.sqrt( numberOfMolecules * 2 ) ) / 2 );

      // Establish the starting position, which will be the lower left corner of the "cube".  The molecules will all be
      // rotated so that they are lying down.
      var crystalWidth = moleculesPerLayer * ( 2.0 - 0.3 ); // Final term is a fudge factor that can be adjusted to center the cube.
      var startingPosX = ( this.multipleParticleModel.normalizedContainerWidth / 2 ) - ( crystalWidth / 2);

      var startingPosY = 1.2 + this.DISTANCE_BETWEEN_PARTICLES_IN_CRYSTAL; // multiplier can be tweaked to minimize initial "bounce"

      // Place the molecules by placing their centers of mass.
      var moleculesPlaced = 0;
      var xPos;
      var yPos;
      for ( var i = 0; i < numberOfMolecules; i++ ) {      // One iteration per layer.

        for ( var j = 0; ( j < moleculesPerLayer ) && ( moleculesPlaced < numberOfMolecules ); j++ ) {
          xPos = startingPosX + ( j * MIN_INITIAL_DIAMETER_DISTANCE );
          if ( i % 2 !== 0 ) {

            // Every other row is shifted a bit to create hexagonal pattern.
            xPos += ( 1 + this.DISTANCE_BETWEEN_PARTICLES_IN_CRYSTAL ) / 2;
          }
          yPos = startingPosY + ( i * MIN_INITIAL_DIAMETER_DISTANCE * 0.5 );
          var moleculeIndex = ( i * moleculesPerLayer ) + j;
          moleculeCenterOfMassPositions[ moleculeIndex ].setXY( xPos, yPos );
          moleculeRotationAngles[ moleculeIndex ] = 0;
          moleculesPlaced++;

          // Assign each molecule an initial velocity.
          var xVel = temperatureSqrt * this.rand.nextGaussian();
          var yVel = temperatureSqrt * this.rand.nextGaussian();
          moleculeVelocities[ moleculeIndex ].setXY( xVel, yVel );

          // Mark the molecule as being in the container.
          moleculesInsideContainer[ i ] = true;
        }
      }
    },

    /**
     * Set the phase to the liquid state.
     * @protected
     */
    setPhaseLiquid: function() {
      AbstractPhaseStateChanger.prototype.setPhaseLiquidMultiAtom.call(
        this,
        MIN_INITIAL_DIAMETER_DISTANCE,
        LIQUID_SPACING_FACTOR
      );
    }
  } );
} );
