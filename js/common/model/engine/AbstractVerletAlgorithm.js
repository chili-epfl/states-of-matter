// Copyright 2014-2015, University of Colorado Boulder

/**
 * This is an abstract base class for classes that implement the Verlet algorithm for simulating molecular interactions
 * based on the Lennard-Jones potential.
 *
 * @author John Blanco
 * @author Aaron Davis
 */
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var Property = require( 'AXON/Property' );
  var statesOfMatter = require( 'STATES_OF_MATTER/statesOfMatter' );

  // constants that control various aspects of the Verlet algorithm.
  var PRESSURE_CALC_TIME_WINDOW = 12; // in seconds, empirically determined to be responsive but not jumpy

  // Pressure at which explosion of the container will occur.  This is currently set so that container blows roughly
  // when the pressure gauge hits its max value.
  var EXPLOSION_PRESSURE = 1.05;

  /**
   * @param {MultipleParticleModel} multipleParticleModel of the simulation
   * @constructor
   */
  function AbstractVerletAlgorithm( multipleParticleModel ) {

    this.multipleParticleModel = multipleParticleModel; // @protected, read only

    this.pressureProperty = new Property( 0 ); // @public, read-only, in atm (atmospheres)

    // @protected, read-write, used to set where particles bounce
    this.sideBounceInset = 1;
    this.bottomBounceInset = 1;
    this.topBounceInset = 1;

    // @protected
    this.potentialEnergy = 0;
    this.temperature = 0;

    // Flag that indicates whether the lid affected the velocity of one or more particles, set during execution of the
    // Verlet algorithm, must be cleared by the client.
    this.lidChangedParticleVelocity = false;
  }

  statesOfMatter.register( 'AbstractVerletAlgorithm', AbstractVerletAlgorithm );

  return inherit( Object, AbstractVerletAlgorithm, {

    /**
     * @returns {boolean}
     * @param {number} xPos
     * @param {number} yPos
     * @protected
     */
    isNormalizedPositionInContainer: function( xPos, yPos ) {
      return xPos >= 0 && xPos <= this.multipleParticleModel.normalizedContainerWidth &&
             yPos >= 0 && yPos <= this.multipleParticleModel.normalizedTotalContainerHeight;
    },

    /**
     * Update the center of mass positions and rotational angles for the molecules based upon their current velocities
     * and rotation rates and the forces acting upon them, and handle any interactions with the wall, such as bouncing.
     * @param moleculeDataSet
     * @param timeStep
     * @private
     */
    updateMoleculePositions: function( moleculeDataSet, timeStep ) {

      var moleculeCenterOfMassPositions = moleculeDataSet.getMoleculeCenterOfMassPositions();
      var moleculeVelocities = moleculeDataSet.getMoleculeVelocities();
      var moleculeForces = moleculeDataSet.getMoleculeForces();
      var numberOfMolecules = moleculeDataSet.getNumberOfMolecules();
      var moleculeRotationAngles = moleculeDataSet.getMoleculeRotationAngles();
      var moleculeRotationRates = moleculeDataSet.getMoleculeRotationRates();
      var moleculeTorques = moleculeDataSet.getMoleculeTorques();
      var massInverse = 1 / moleculeDataSet.getMoleculeMass();
      var inertiaInverse = 1 / moleculeDataSet.getMoleculeRotationalInertia();
      var timeStepSqrHalf = timeStep * timeStep * 0.5;
      var middleHeight = this.multipleParticleModel.normalizedContainerHeight / 2;
      var accumulatedPressure = 0;

      // Since the normalized particle diameter is 1.0, and this is a diatomic particle joined at the center, use a
      // 'compromise' value of 1.5 as the offset from the edges where these molecules should bounce.
      var minX = this.sideBounceInset;
      var minY = this.bottomBounceInset;
      var maxX = this.multipleParticleModel.normalizedContainerWidth - this.sideBounceInset;
      var maxY = this.multipleParticleModel.normalizedContainerHeight - this.topBounceInset;

      for ( var i = 0; i < numberOfMolecules; i++ ) {

        var moleculeVelocity = moleculeVelocities[ i ];
        var moleculeVelocityX = moleculeVelocity.x; // optimization
        var moleculeVelocityY = moleculeVelocity.y; // optimization
        var moleculeCenterOfMassPosition = moleculeCenterOfMassPositions[ i ];

        // calculate new position based on time and velocity
        var xPos = moleculeCenterOfMassPosition.x +
                   ( timeStep * moleculeVelocityX ) +
                   ( timeStepSqrHalf * moleculeForces[ i ].x * massInverse);
        var yPos = moleculeCenterOfMassPosition.y +
                   ( timeStep * moleculeVelocityY ) +
                   ( timeStepSqrHalf * moleculeForces[ i ].y * massInverse);

        if ( !moleculeDataSet.insideContainer[ i ] && this.isNormalizedPositionInContainer( xPos, yPos ) ) {

          // The particle had left the container, but is now back inside, so update the status
          moleculeDataSet.insideContainer[ i ] = true;
        }

        // handle any bouncing off of the walls of the container
        if ( moleculeDataSet.insideContainer[ i ] ) {

          // handle bounce off the walls
          if ( xPos <= minX && moleculeVelocityX < 0 ) {
            xPos = minX;
            moleculeVelocity.x = -moleculeVelocityX;
            if ( xPos > middleHeight ) {
              accumulatedPressure += -moleculeVelocityX;
            }
          }
          else if ( xPos >= maxX && moleculeVelocityX > 0 ) {
            xPos = maxX;
            moleculeVelocity.x = -moleculeVelocityX;
            if ( xPos > middleHeight ) {
              accumulatedPressure += moleculeVelocityX;
            }
          }

          // handle bounce off the bottom
          if ( yPos <= minY && moleculeVelocityY <= 0 ) {
            yPos = minY;
            moleculeVelocity.y = -moleculeVelocityY;
          }
          // handle bounce off the top
          else if ( yPos >= maxY ) {

            if ( !this.multipleParticleModel.getContainerExploded() ) {

              yPos = maxY;
              var lidVelocity = this.multipleParticleModel.normalizedLidVelocityY;

              // if the lid velocity is non-zero, set a flag that indicates that the lid changed a particle's velocity
              if ( lidVelocity !== 0 ) {
                this.lidChangedParticleVelocity = true;
              }

              if ( moleculeVelocityY > 0 ) {

                // Bounce the particle off of the lid and factor in the lid velocity.  Not quite all of the lid
                // velocity is used, and the multiplier was empirically determined to look reasonable without causing
                // the pressure to go up too quickly when compressing the container.
                moleculeVelocity.y = -moleculeVelocityY + lidVelocity * 0.3;
                accumulatedPressure += Math.abs( moleculeVelocityY );
              }
              else if ( Math.abs( moleculeVelocityY ) < Math.abs( lidVelocity ) ) {
                moleculeVelocity.y = lidVelocity;
              }
            }
            else {
              // This particle has left the container.
              moleculeDataSet.insideContainer[ i ] = false;
            }
          }
        }

        // set new position
        moleculeCenterOfMassPositions[ i ].setXY( xPos, yPos );

        // set new rotation (does nothing in the monatomic case)
        moleculeRotationAngles[ i ] += ( timeStep * moleculeRotationRates[ i ]) +
                                       ( timeStepSqrHalf * moleculeTorques[ i ] * inertiaInverse);
      }

      // Now that the molecule position information has been updated, update the positions of the individual atoms.
      this.positionUpdater.updateAtomPositions( moleculeDataSet );

      // Update the pressure - the multiplier is empirically determined to get pressure values that work in the larger
      // context of the sim.
      this.updatePressure( accumulatedPressure * 65, timeStep );
    },

    /**
     * Update the motion of the particles and the forces that are acting upon them.  This is the heart of this class,
     * and it is here that the actual Verlet algorithm is contained.
     * @public
     */
    updateForcesAndMotion: function( timeStep ) {

      // Obtain references to the model data and parameters so that we can perform fast manipulations.
      var moleculeDataSet = this.multipleParticleModel.moleculeDataSet;

      // Update the atom positions based on velocities, current forces, and interactions with the wall.
      this.updateMoleculePositions( moleculeDataSet, timeStep );

      // Set initial values for the forces that are acting on each atom or molecule, will be further updated below.
      this.initializeForces( moleculeDataSet );

      // Calculate the forces created through interactions with other atoms/molecules.
      this.updateInteractionForces( moleculeDataSet );

      // Update the velocities and rotation rates based on the forces acting on the atoms/molecules.
      this.updateVelocitiesAndRotationRates( moleculeDataSet, timeStep );
    },

    // @protected
    initializeForces: function( moleculeDataSet ) {
      assert && assert( false, 'abstract method, must be overridden in descendant classes' );
    },

    // @protected
    updateInteractionForces: function( moleculeDataSet ) {
      assert && assert( false, 'abstract method, must be overridden in descendant classes' );
    },

    // @protected
    updateVelocitiesAndRotationRates: function( moleculeDataSet ) {
      assert && assert( false, 'abstract method, must be overridden in descendant classes' );
    },

    setScaledEpsilon: function() {
      // This should be implemented in descendant classes.
      assert && assert( false, 'Setting epsilon is not implemented for this class' );
    },

    /**
     * @returns {number}
     * @public
     */
    getScaledEpsilon: function() {
      // This should be implemented in descendant classes.
      assert && assert( false, 'Getting scaled epsilon is not implemented for this class' );
      return 0;
    },

    /**
     * @param {number} pressureZoneWallForce
     * @param {number} dt
     * @public
     */
    updatePressure: function( pressureZoneWallForce, dt ) {

      if ( this.multipleParticleModel.isExplodedProperty.get() ) {

        // If the container has exploded, there is essentially no pressure.
        this.pressureProperty.set( 0 );
      }
      else {
        this.pressureProperty.set( ( dt / PRESSURE_CALC_TIME_WINDOW ) *
                                   ( pressureZoneWallForce / ( this.multipleParticleModel.normalizedContainerWidth +
                                                    this.multipleParticleModel.normalizedContainerHeight ) ) +
                                   ( PRESSURE_CALC_TIME_WINDOW - dt ) / PRESSURE_CALC_TIME_WINDOW * this.pressureProperty.get() );

        if ( ( this.pressureProperty.get() > EXPLOSION_PRESSURE ) && !this.multipleParticleModel.isExplodedProperty.get() ) {

          // The pressure has reached the point where the container should explode, so blow 'er up.
          this.multipleParticleModel.setContainerExploded( true );
        }
      }
    },

    // static final
    PARTICLE_INTERACTION_DISTANCE_THRESH_SQRD: 6.25,

    // Constant used to limit the proximity of atoms when calculating the interaction potential.  This does NOT actually
    // limit how close they can get to one another, just the value used in the LJ calculation.  Having such a limit
    // helps to prevent getting huge potential value numbers and thus unmanageably high particle velocities.  It is in
    // model units and is empirically determined such that the particles appear to interact well but don't go crazy when
    // the container is compressed.  Take care when modifying it - such modifications can have somewhat unexpected side
    // effects, such as changing how water crystalizes when it freezes.
    MIN_DISTANCE_SQUARED: 0.90
  } );
} );
