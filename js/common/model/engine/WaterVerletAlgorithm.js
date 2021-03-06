// Copyright 2014-2015, University of Colorado Boulder

/**
 * Implementation of the Verlet algorithm for simulating molecular interaction based on the Lennard-Jones potential.
 * This version is used specifically for simulating water, i.e. H2O, and also includes calculations for the charge
 * distributions present in this molecule.
 *
 * @author John Blanco
 * @author Siddhartha Chinthapally (Actual Concepts)
 * @author Jonathan Olson
 */
define( function( require ) {
  'use strict';

  // modules
  var AbstractVerletAlgorithm = require( 'STATES_OF_MATTER/common/model/engine/AbstractVerletAlgorithm' );
  var inherit = require( 'PHET_CORE/inherit' );
  var statesOfMatter = require( 'STATES_OF_MATTER/statesOfMatter' );
  var WaterAtomPositionUpdater = require( 'STATES_OF_MATTER/common/model/engine/WaterAtomPositionUpdater' );

  // constants, mostly parameters used for "hollywooding" of the water crystal
  var WATER_FULLY_MELTED_TEMPERATURE = 0.3;
  var WATER_FULLY_MELTED_ELECTROSTATIC_FORCE = 1.0;
  var WATER_FULLY_FROZEN_TEMPERATURE = 0.22;
  var WATER_FULLY_FROZEN_ELECTROSTATIC_FORCE = 4.25;
  var MAX_REPULSIVE_SCALING_FACTOR_FOR_WATER = 5.25;
  var MAX_ROTATION_RATE = 16; // revolutions per second, empirically determined, see usage below
  var TEMPERATURE_BELOW_WHICH_GRAVITY_INCREASES = 0.10;

  /**
   * @param {MultipleParticleModel}  multipleParticleModel of the simulation
   * @constructor
   */
  function WaterVerletAlgorithm( multipleParticleModel ) {

    this.positionUpdater = WaterAtomPositionUpdater;
    AbstractVerletAlgorithm.call( this, multipleParticleModel );

    // @private precomputed values to save time later
    this.massInverse = 1 / multipleParticleModel.moleculeDataSet.getMoleculeMass();
    this.inertiaInverse = 1 / multipleParticleModel.moleculeDataSet.getMoleculeRotationalInertia();

    // @private pre-allocated arrays to avoid reallocation with each force and position update
    this.normalCharges = new Array( 3 );
    this.alteredCharges = new Array( 3 );
  }

  statesOfMatter.register( 'WaterVerletAlgorithm', WaterVerletAlgorithm );

  return inherit( AbstractVerletAlgorithm, WaterVerletAlgorithm, {

    /**
     * @param moleculeDataSet
     * @override
     * @protected
     */
    initializeForces: function( moleculeDataSet ){
      var temperatureSetPoint = this.multipleParticleModel.temperatureSetPointProperty.get();
      var accelerationDueToGravity = this.multipleParticleModel.gravitationalAcceleration;
      if ( temperatureSetPoint < TEMPERATURE_BELOW_WHICH_GRAVITY_INCREASES ) {

        // Below a certain temperature, gravity is increased to counteract some odd-looking behavior caused by the
        // thermostat.  The multiplier was empirically determined.
        accelerationDueToGravity = accelerationDueToGravity *
                                    ( 1 + ( TEMPERATURE_BELOW_WHICH_GRAVITY_INCREASES - temperatureSetPoint ) * 0.32 );
      }
      var nextMoleculeForces = moleculeDataSet.nextMoleculeForces;
      var nextMoleculeTorques = moleculeDataSet.nextMoleculeTorques;
      for ( var i = 0; i < moleculeDataSet.getNumberOfMolecules(); i++ ) {
        nextMoleculeForces[ i ].setXY( 0, accelerationDueToGravity );
        nextMoleculeTorques[ i ] = 0;
      }
    },

    /**
     * @param moleculeDataSet
     * @override
     * @protected
     */
    updateInteractionForces: function( moleculeDataSet ) {

      var moleculeCenterOfMassPositions = moleculeDataSet.moleculeCenterOfMassPositions;
      var atomPositions = moleculeDataSet.atomPositions;
      var nextMoleculeForces = moleculeDataSet.nextMoleculeForces;
      var nextMoleculeTorques = moleculeDataSet.nextMoleculeTorques;
      var temperatureSetPoint = this.multipleParticleModel.temperatureSetPointProperty.get();

      // Verify that this is being used on an appropriate data set.
      assert && assert( moleculeDataSet.getAtomsPerMolecule() === 3 );

      // Set up the values for the charges that will be used when calculating the coloumb interactions.
      var q0;
      var temperatureFactor;

      // A scaling factor is added here for the repulsive portion of the Lennard-Jones force.  The idea is that the
      // force goes up at lower temperatures in order to make the ice appear more spacious.  This is not real physics,
      // it is "hollywooding" in order to get the crystalline behavior we need for ice.
      var repulsiveForceScalingFactor;

      if ( temperatureSetPoint < WATER_FULLY_FROZEN_TEMPERATURE ) {

        // Use stronger electrostatic forces in order to create more of a crystal structure.
        q0 = WATER_FULLY_FROZEN_ELECTROSTATIC_FORCE;

        // Scale by the max to force space in the crystal.
        repulsiveForceScalingFactor = MAX_REPULSIVE_SCALING_FACTOR_FOR_WATER;
      }
      else if ( temperatureSetPoint > WATER_FULLY_MELTED_TEMPERATURE ) {

        // Use weaker electrostatic forces in order to create more of an appearance of liquid.
        q0 = WATER_FULLY_MELTED_ELECTROSTATIC_FORCE;

        // No scaling of the repulsive force.
        repulsiveForceScalingFactor = 1;
      }
      else {
        // We are somewhere in between the temperature for being fully melted or frozen, so scale accordingly.
        temperatureFactor = ( temperatureSetPoint - WATER_FULLY_FROZEN_TEMPERATURE ) /
                            ( WATER_FULLY_MELTED_TEMPERATURE - WATER_FULLY_FROZEN_TEMPERATURE );
        q0 = WATER_FULLY_FROZEN_ELECTROSTATIC_FORCE -
             ( temperatureFactor * ( WATER_FULLY_FROZEN_ELECTROSTATIC_FORCE - WATER_FULLY_MELTED_ELECTROSTATIC_FORCE ) );
        repulsiveForceScalingFactor = MAX_REPULSIVE_SCALING_FACTOR_FOR_WATER -
                                      ( temperatureFactor * (MAX_REPULSIVE_SCALING_FACTOR_FOR_WATER - 1 ) );
      }
      this.normalCharges[ 0 ] = -2 * q0;
      this.normalCharges[ 1 ] = q0;
      this.normalCharges[ 2 ] = q0;
      this.alteredCharges[ 0 ] = -2 * q0;
      this.alteredCharges[ 1 ] = 1.67 * q0;
      this.alteredCharges[ 2 ] = 0.33 * q0;

      // Calculate the force and torque due to inter-particle interactions.
      var numberOfMolecules = moleculeDataSet.getNumberOfMolecules();
      for ( var i = 0; i < numberOfMolecules; i++ ) {
        var moleculeCenterOfMassPosition1 = moleculeCenterOfMassPositions[ i ];
        var m1x = moleculeCenterOfMassPosition1.x;
        var m1y = moleculeCenterOfMassPosition1.y;
        var nextMoleculeForceI = nextMoleculeForces[ i ];

        // Select which charges to use for this molecule.  This is part of the "hollywooding" to make the solid form
        // appear more crystalline.
        var chargesA;
        if ( i % 2 === 0 ) {
          chargesA = this.normalCharges;
        }
        else {
          chargesA = this.alteredCharges;
        }

        for ( var j = i + 1; j < numberOfMolecules; j++ ) {
          var moleculeCenterOfMassPosition2 = moleculeCenterOfMassPositions[ j ];
          var m2x = moleculeCenterOfMassPosition2.x;
          var m2y = moleculeCenterOfMassPosition2.y;
          var nextMoleculeForceJ = nextMoleculeForces[ j ];

          // Calculate Lennard-Jones potential between mass centers.
          var dx = m1x - m2x;
          var dy = m1y - m2y;
          var distanceSquared = Math.max( dx * dx + dy * dy, this.MIN_DISTANCE_SQUARED );
          if ( distanceSquared < this.PARTICLE_INTERACTION_DISTANCE_THRESH_SQRD ) {
            // Select charges for the other molecule.
            var chargesB;
            if ( j % 2 === 0 ) {
              chargesB = this.normalCharges;
            }
            else {
              chargesB = this.alteredCharges;
            }

            // Calculate the Lennard-Jones interaction forces.
            var r2inv = 1 / distanceSquared;
            var r6inv = r2inv * r2inv * r2inv;

            var forceScalar = 48 * r2inv * r6inv * ( ( r6inv * repulsiveForceScalingFactor ) - 0.5 );
            var forceX = dx * forceScalar;
            var forceY = dy * forceScalar;
            nextMoleculeForceI.addXY( forceX, forceY );
            nextMoleculeForceJ.subtractXY( forceX, forceY );
            this.potentialEnergy += 4 * r6inv * ( r6inv - 1 ) + 0.016316891136;

            // Calculate coulomb-like interactions between atoms on individual water molecules.
            for ( var ii = 0; ii < 3; ii++ ) {
              var atomIndex1 = 3 * i + ii;
              if ( ( atomIndex1 + 1 ) % 6 === 0 ) {

                // This is a hydrogen atom that is not going to be included in the calculation in order to try to
                // create a more crystalline solid.  This is part of the "hollywooding" that we do to create a better
                // looking water crystal at low temperatures.
                continue;
              }

              var chargeAii = chargesA[ ii ];
              var atomPosition1 = atomPositions[ atomIndex1 ];
              var a1x = atomPosition1.x;
              var a1y = atomPosition1.y;

              for ( var jj = 0; jj < 3; jj++ ) {
                var atomIndex2 = 3 * j + jj;
                if ( ( atomIndex2 + 1 ) % 6 === 0 ) {

                  // This is a hydrogen atom that is not going to be included in the calculation in order to try to
                  // create a more crystalline solid.  This is part of the "hollywooding" that we do to create a better
                  // looking water crystal at low temperatures.
                  continue;
                }

                var atomPosition2 = atomPositions[ atomIndex2 ];
                var a2x = atomPosition2.x;
                var a2y = atomPosition2.y;

                dx = atomPosition1.x - atomPosition2.x;
                dy = atomPosition1.y - atomPosition2.y;
                distanceSquared = Math.max( dx * dx + dy * dy, this.MIN_DISTANCE_SQUARED );
                r2inv = 1 / distanceSquared;
                forceScalar = chargeAii * chargesB[ jj ] * r2inv * r2inv;
                forceX = dx * forceScalar;
                forceY = dy * forceScalar;
                nextMoleculeForceI.addXY( forceX, forceY );
                nextMoleculeForceJ.subtractXY( forceX, forceY );
                nextMoleculeTorques[ i ] += ( a1x - m1x ) * forceY - ( a1y - m1y ) * forceX;
                nextMoleculeTorques[ j ] -= ( a2x - m2x ) * forceY - ( a2y - m2y ) * forceX;
              }
            }
          }
        }
      }
    },

    /**
     * @param moleculeDataSet
     * @param {number} timeStep
     * @override
     * @protected
     */
    updateVelocitiesAndRotationRates: function( moleculeDataSet, timeStep ) {

      var numberOfMolecules = moleculeDataSet.getNumberOfMolecules();
      var moleculeVelocities = moleculeDataSet.moleculeVelocities;
      var moleculeForces = moleculeDataSet.moleculeForces;
      var nextMoleculeForces = moleculeDataSet.nextMoleculeForces;
      var moleculeRotationRates = moleculeDataSet.moleculeRotationRates;
      var moleculeTorques = moleculeDataSet.moleculeTorques;
      var nextMoleculeTorques = moleculeDataSet.nextMoleculeTorques;

      var timeStepHalf = timeStep / 2;

      // Update the velocities and rotation rates and calculate kinetic energy.
      var centersOfMassKineticEnergy = 0;
      var rotationalKineticEnergy = 0;
      for ( var i = 0; i < numberOfMolecules; i++ ) {
        var xVel = moleculeVelocities[ i ].x + timeStepHalf * ( moleculeForces[ i ].x + nextMoleculeForces[ i ].x ) * this.massInverse;
        var yVel = moleculeVelocities[ i ].y + timeStepHalf * ( moleculeForces[ i ].y + nextMoleculeForces[ i ].y ) * this.massInverse;
        moleculeVelocities[ i ].setXY( xVel, yVel );
        var rotationRate = moleculeRotationRates[ i ] +
                           timeStepHalf * ( moleculeTorques[ i ] + nextMoleculeTorques[ i ] ) * this.inertiaInverse;

        // If needed, clamp the rotation rate to an empirically determined max to prevent runaway rotation, see
        // https://github.com/phetsims/states-of-matter/issues/152
        if ( rotationRate > MAX_ROTATION_RATE ) {
          rotationRate = MAX_ROTATION_RATE;
        }
        else if ( rotationRate < -MAX_ROTATION_RATE ) {
          rotationRate = -MAX_ROTATION_RATE;
        }
        moleculeRotationRates[ i ] = rotationRate;

        // calculate the kinetic energy
        centersOfMassKineticEnergy += 0.5 * moleculeDataSet.getMoleculeMass() * moleculeVelocities[ i ].magnitudeSquared();
        rotationalKineticEnergy += 0.5 * moleculeDataSet.getMoleculeRotationalInertia() *
                                   moleculeRotationRates[ i ] * moleculeRotationRates[ i ];

        // Move the newly calculated forces and torques into the current spots.
        moleculeForces[ i ].setXY( nextMoleculeForces[ i ].x, nextMoleculeForces[ i ].y );
        moleculeTorques[ i ] = nextMoleculeTorques[ i ];
      }

      // Record the calculated temperature.
      this.temperature = ( centersOfMassKineticEnergy + rotationalKineticEnergy ) / numberOfMolecules / 1.5;
    }
  } );
} );
