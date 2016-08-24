// Copyright 2014-2015, University of Colorado Boulder

/**
 * Implementation of the Verlet algorithm for simulating molecular interaction based on the Lennard-Jones potential.
 * This version is used specifically for simulating water, i.e. H2O, and also includes calculations for the charge
 * distributions present in this molecule.
 *
 * @author John Blanco
 * @author Siddhartha Chinthapally (Actual Concepts)
 */
define( function( require ) {
  'use strict';

  // modules
  var AbstractVerletAlgorithm = require( 'STATES_OF_MATTER/common/model/engine/AbstractVerletAlgorithm' );
  var inherit = require( 'PHET_CORE/inherit' );
  var statesOfMatter = require( 'STATES_OF_MATTER/statesOfMatter' );
  var WaterAtomPositionUpdater = require( 'STATES_OF_MATTER/common/model/engine/WaterAtomPositionUpdater' );
  var Vector2 = require( 'DOT/Vector2' );

  // parameters used for "hollywooding" of the water crystal
  var WATER_FULLY_MELTED_TEMPERATURE = 0.3;
  var WATER_FULLY_MELTED_ELECTROSTATIC_FORCE = 1.0;
  var WATER_FULLY_FROZEN_TEMPERATURE = 0.22;
  var WATER_FULLY_FROZEN_ELECTROSTATIC_FORCE = 4.0;
  var MAX_REPULSIVE_SCALING_FACTOR_FOR_WATER = 3.0;

  /**
   * @param {MultipleParticleModel}  multipleParticleModel of the simulation
   * @constructor
   */
  function WaterVerletAlgorithm( multipleParticleModel ) {

    this.positionUpdater = WaterAtomPositionUpdater;
    AbstractVerletAlgorithm.call( this, multipleParticleModel );

    // precompute a couple of values to save time later
    this.massInverse = 1 / multipleParticleModel.moleculeDataSet.getMoleculeMass();
    this.inertiaInverse = 1 / multipleParticleModel.moleculeDataSet.getMoleculeRotationalInertia();

    // reusable vector, used in order to reduce allocations
    this.force = new Vector2();

    // pre-allocate arrays so that they don't have to be reallocated with each force and position update
    this.normalCharges = new Array( 3 );
    this.alteredCharges = new Array( 3 );
  }

  statesOfMatter.register( 'WaterVerletAlgorithm', WaterVerletAlgorithm );

  return inherit( AbstractVerletAlgorithm, WaterVerletAlgorithm, {

    /**
     * @public
     * @returns {number}
     */
    getPressure: function() {
      return this.pressure;
    },

    /**
     * @public
     * @returns {number}
     */
    getTemperature: function() {
      return this.temperature;
    },

    /**
     * Update the motion of the particles and the forces that are acting upon them.  This is the heart of this class,
     * and it is here that the actual Verlet algorithm is contained.
     * @public
     */
    updateForcesAndMotion: function( timeStep ) {

      // Obtain references to the model data and parameters so that we can perform fast manipulations.
      var moleculeDataSet = this.multipleParticleModel.getMoleculeDataSetRef();
      var numberOfMolecules = moleculeDataSet.getNumberOfMolecules();
      var moleculeCenterOfMassPositions = moleculeDataSet.getMoleculeCenterOfMassPositions();
      var atomPositions = moleculeDataSet.getAtomPositions();
      var moleculeVelocities = moleculeDataSet.getMoleculeVelocities();
      var moleculeForces = moleculeDataSet.getMoleculeForces();
      var nextMoleculeForces = moleculeDataSet.getNextMoleculeForces();
      var moleculeRotationAngles = moleculeDataSet.getMoleculeRotationAngles();
      var moleculeRotationRates = moleculeDataSet.getMoleculeRotationRates();
      var moleculeTorques = moleculeDataSet.getMoleculeTorques();
      var nextMoleculeTorques = moleculeDataSet.getNextMoleculeTorques();

      // Initialize other values that will be needed for the calculations.
      var pressureZoneWallForce = 0;
      var temperatureSetPoint = this.multipleParticleModel.getTemperatureSetPoint();
      var timeStepSqrHalf = timeStep * timeStep * 0.5;
      var timeStepHalf = timeStep / 2;

      // Verify that this is being used on an appropriate data set.
      assert && assert( moleculeDataSet.getAtomsPerMolecule() === 3 );

      // Set up the values for the charges that will be used when calculating the coloumb interactions.
      var q0;
      var temperatureFactor;

      // A scaling factor is added here for the repulsive portion of the Lennard-Jones force.  The idea is that the
      // force goes up at lower temperatures in order to make the ice appear more spacious.  This is not real physics,
      // it is "hollywooding" in order to get the crystalline behavior we need for ice.
      var repulsiveForceScalingFactor;
      var r2inv;
      var r6inv;
      var forceScalar;

      if ( temperatureSetPoint < WATER_FULLY_FROZEN_TEMPERATURE ) {

        // Use stronger electrostatic forces in order to create more of a crystal structure.
        q0 = WATER_FULLY_FROZEN_ELECTROSTATIC_FORCE;
      }
      else if ( temperatureSetPoint > WATER_FULLY_MELTED_TEMPERATURE ) {

        // Use weaker electrostatic forces in order to create more of an appearance of liquid.
        q0 = WATER_FULLY_MELTED_ELECTROSTATIC_FORCE;
      }
      else {
        // We are somewhere in between the temperature for being fully melted or frozen, so scale accordingly.
        temperatureFactor = ( temperatureSetPoint - WATER_FULLY_FROZEN_TEMPERATURE ) /
                            ( WATER_FULLY_MELTED_TEMPERATURE - WATER_FULLY_FROZEN_TEMPERATURE );
        q0 = WATER_FULLY_FROZEN_ELECTROSTATIC_FORCE -
             ( temperatureFactor * ( WATER_FULLY_FROZEN_ELECTROSTATIC_FORCE - WATER_FULLY_MELTED_ELECTROSTATIC_FORCE ) );
      }
      this.normalCharges[ 0 ] = -2 * q0;
      this.normalCharges[ 1 ] = q0;
      this.normalCharges[ 2 ] = q0;
      this.alteredCharges[ 0 ] = -2 * q0;
      this.alteredCharges[ 1 ] = 1.67 * q0;
      this.alteredCharges[ 2 ] = 0.33 * q0;

      // Update center of mass positions and angles for the molecules.
      for ( var i = 0; i < numberOfMolecules; i++ ) {
        var xPos = moleculeCenterOfMassPositions[ i ].x + ( timeStep * moleculeVelocities[ i ].x ) +
                   ( timeStepSqrHalf * moleculeForces[ i ].x * this.massInverse );
        var yPos = moleculeCenterOfMassPositions[ i ].y + ( timeStep * moleculeVelocities[ i ].y ) +
                   ( timeStepSqrHalf * moleculeForces[ i ].y * this.massInverse );
        moleculeCenterOfMassPositions[ i ].setXY( xPos, yPos );
        moleculeRotationAngles[ i ] += ( timeStep * moleculeRotationRates[ i ] ) +
                                       ( timeStepSqrHalf * moleculeTorques[ i ] * this.inertiaInverse );
      }
      this.positionUpdater.updateAtomPositions( moleculeDataSet );

      // Calculate the force from the walls.  This force is assumed to act on the center of mass, so there is no torque.
      for ( i = 0; i < numberOfMolecules; i++ ) {

        // Clear the previous calculation's particle forces and torques.
        nextMoleculeForces[ i ].setXY( 0, 0 );
        nextMoleculeTorques[ i ] = 0;

        // Get the force values caused by the container walls.
        this.calculateWallForce( moleculeCenterOfMassPositions[ i ], nextMoleculeForces[ i ] );

        // Accumulate this force value as part of the pressure being exerted on the walls of the container.
        if ( nextMoleculeForces[ i ].y < 0 ) {
          pressureZoneWallForce += -nextMoleculeForces[ i ].y;
        }
        else if ( moleculeCenterOfMassPositions[ i ].y > this.multipleParticleModel.getNormalizedContainerHeight() / 2 ) {

          // If the particle bounced on one of the walls above the midpoint, add in that value to the pressure.
          pressureZoneWallForce += Math.abs( nextMoleculeForces[ i ].x );
        }

        // Add in the effect of gravity.
        var gravitationalAcceleration = this.multipleParticleModel.getGravitationalAcceleration();
        if ( this.multipleParticleModel.getTemperatureSetPoint() < this.TEMPERATURE_BELOW_WHICH_GRAVITY_INCREASES ) {

          // Below a certain temperature, gravity is increased to counteract some odd-looking behavior caused by the
          // thermostat.
          gravitationalAcceleration = gravitationalAcceleration *
                                      ( ( this.TEMPERATURE_BELOW_WHICH_GRAVITY_INCREASES -
                                          this.multipleParticleModel.getTemperatureSetPoint() ) *
                                        this.LOW_TEMPERATURE_GRAVITY_INCREASE_RATE + 1 );
        }
        nextMoleculeForces[ i ].setY( nextMoleculeForces[ i ].y - gravitationalAcceleration );
      }

      // Update the pressure calculation.
      this.updatePressure( pressureZoneWallForce );

      // If there are any atoms that are currently designated as "unsafe", check them to see if they can be moved into
      // the "safe" category.
      if ( moleculeDataSet.getNumberOfSafeMolecules() < numberOfMolecules ) {
        this.updateMoleculeSafety();
      }

      // Set the value of the scaling factor used to adjust how the water behaves as temperature changes, part of the
      // "hollywooding" that we do to make water freeze and thaw the way we want it to.
      if ( temperatureSetPoint > WATER_FULLY_MELTED_TEMPERATURE ) {

        // No scaling of the repulsive force.
        repulsiveForceScalingFactor = 1;
      }
      else if ( temperatureSetPoint < WATER_FULLY_FROZEN_TEMPERATURE ) {

        // Scale by the max to force space in the crystal.
        repulsiveForceScalingFactor = MAX_REPULSIVE_SCALING_FACTOR_FOR_WATER;
      }
      else {

        // We are somewhere between fully frozen and fully liquified, so adjust the scaling factor accordingly.
        temperatureFactor = ( temperatureSetPoint - WATER_FULLY_FROZEN_TEMPERATURE) /
                            ( WATER_FULLY_MELTED_TEMPERATURE - WATER_FULLY_FROZEN_TEMPERATURE );
        repulsiveForceScalingFactor = MAX_REPULSIVE_SCALING_FACTOR_FOR_WATER -
                                      ( temperatureFactor * (MAX_REPULSIVE_SCALING_FACTOR_FOR_WATER - 1 ) );
      }

      // Calculate the force and torque due to inter-particle interactions.
      var numberOfSafeMolecules = moleculeDataSet.getNumberOfSafeMolecules();
      for ( i = 0; i < numberOfSafeMolecules; i++ ) {

        // Select which charges to use for this molecule.  This is part of the "hollywooding" to make the solid form
        // appear more crystalline.
        var chargesA;
        if ( i % 2 === 0 ) {
          chargesA = this.normalCharges;
        }
        else {
          chargesA = this.alteredCharges;
        }
        for ( var j = i + 1; j < numberOfSafeMolecules; j++ ) {

          // Select charges for the other molecule.
          var chargesB;
          if ( j % 2 === 0 ) {
            chargesB = this.normalCharges;
          }
          else {
            chargesB = this.alteredCharges;
          }

          // Calculate Lennard-Jones potential between mass centers.
          var dx = moleculeCenterOfMassPositions[ i ].x - moleculeCenterOfMassPositions[ j ].x;
          var dy = moleculeCenterOfMassPositions[ i ].y - moleculeCenterOfMassPositions[ j ].y;
          var distanceSquared = dx * dx + dy * dy;
          if ( distanceSquared < this.PARTICLE_INTERACTION_DISTANCE_THRESH_SQRD ) {

            // Calculate the Lennard-Jones interaction forces.
            distanceSquared = Math.max( distanceSquared, this.MIN_DISTANCE_SQUARED );
            r2inv = 1 / distanceSquared;
            r6inv = r2inv * r2inv * r2inv;

            forceScalar = 48 * r2inv * r6inv * ( ( r6inv * repulsiveForceScalingFactor ) - 0.5 );
            this.force.setXY( dx * forceScalar, dy * forceScalar );
            nextMoleculeForces[ i ].add( this.force );
            nextMoleculeForces[ j ].subtract( this.force );
            this.potentialEnergy += 4 * r6inv * ( r6inv - 1 ) + 0.016316891136;

            // Calculate coulomb-like interactions between atoms on individual water molecules.
            for ( var ii = 0; ii < 3; ii++ ) {
              for ( var jj = 0; jj < 3; jj++ ) {
                var atomIndex1 = 3 * i + ii;
                var atomIndex2 = 3 * j + jj;
                if ( ( ( atomIndex1 + 1 ) % 6 === 0 ) || ( ( atomIndex2 + 1 ) % 6 === 0 ) ) {

                  // This is a hydrogen atom that is not going to be included in the calculation in order to try to
                  // create a more crystalline solid.  This is part of the "hollywooding" that we do to create a better
                  // looking water crystal at low temperatures.
                  continue;
                }

                dx = atomPositions[ atomIndex1 ].x - atomPositions[ atomIndex2 ].x;
                dy = atomPositions[ atomIndex1 ].y - atomPositions[ atomIndex2 ].y;
                distanceSquared = ( dx * dx + dy * dy );
                distanceSquared = Math.max( distanceSquared, this.MIN_DISTANCE_SQUARED );
                r2inv = 1 / distanceSquared;
                forceScalar = chargesA[ ii ] * chargesB[ jj ] * r2inv * r2inv;
                this.force.setXY( dx * forceScalar, dy * forceScalar );
                nextMoleculeForces[ i ].add( this.force );
                nextMoleculeForces[ j ].subtract( this.force );
                nextMoleculeTorques[ i ] += ( atomPositions[ atomIndex1 ].x - moleculeCenterOfMassPositions[ i ].x ) * this.force.y -
                                            ( atomPositions[ atomIndex1 ].y - moleculeCenterOfMassPositions[ i ].y ) * this.force.x;
                nextMoleculeTorques[ j ] -= ( atomPositions[ atomIndex2 ].x - moleculeCenterOfMassPositions[ j ].x ) * this.force.y -
                                            ( atomPositions[ atomIndex2 ].y - moleculeCenterOfMassPositions[ j ].y ) * this.force.x;
              }
            }
          }
        }
      }

      // Update the velocities and rotation rates and calculate kinetic energy.
      var centersOfMassKineticEnergy = 0;
      var rotationalKineticEnergy = 0;
      for ( i = 0; i < numberOfMolecules; i++ ) {
        var xVel = moleculeVelocities[ i ].x + timeStepHalf * ( moleculeForces[ i ].x + nextMoleculeForces[ i ].x ) * this.massInverse;
        var yVel = moleculeVelocities[ i ].y + timeStepHalf * ( moleculeForces[ i ].y + nextMoleculeForces[ i ].y ) * this.massInverse;
        moleculeVelocities[ i ].setXY( xVel, yVel );
        moleculeRotationRates[ i ] += timeStepHalf * ( moleculeTorques[ i ] + nextMoleculeTorques[ i ] ) *
                                      this.inertiaInverse;
        centersOfMassKineticEnergy += 0.5 * moleculeDataSet.getMoleculeMass() *
                                      moleculeVelocities[ i ].x * moleculeVelocities[ i ].x +
                                      moleculeVelocities[ i ].y * moleculeVelocities[ i ].y;
        rotationalKineticEnergy += 0.5 * moleculeDataSet.getMoleculeRotationalInertia() *
                                   moleculeRotationRates[ i ] * moleculeRotationRates[ i ];

        // Move the newly calculated forces and torques into the current spots.
        moleculeForces[ i ].setXY( nextMoleculeForces[ i ].x, nextMoleculeForces[ i ].y );
        moleculeTorques[ i ] = nextMoleculeTorques[ i ];
      }

      // Record the calculated temperature.
      this.temperature = (centersOfMassKineticEnergy + rotationalKineticEnergy) / numberOfMolecules / 1.5;
    }
  } );
} );
