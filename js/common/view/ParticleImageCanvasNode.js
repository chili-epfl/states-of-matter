// Copyright 2016, University of Colorado Boulder

/**
 * A particle layer rendered on canvas that uses images rather than calling context.arc for improved performance.
 *
 * @author John Blanco
 */
define( function( require ) {
  'use strict';

  // modules
  var AtomType = require( 'STATES_OF_MATTER/common/model/AtomType' );
  var inherit = require( 'PHET_CORE/inherit' );
  var CanvasNode = require( 'SCENERY/nodes/CanvasNode' );
  var statesOfMatter = require( 'STATES_OF_MATTER/statesOfMatter' );
  var StatesOfMatterColorProfile = require( 'STATES_OF_MATTER/common/view/StatesOfMatterColorProfile' );
  var StatesOfMatterConstants = require( 'STATES_OF_MATTER/common/StatesOfMatterConstants' );

  // constants
  var PARTICLE_IMAGE_CANVAS_LENGTH = 32; // amount of canvas used to create a particle image, will be squared 
  
  // set up the association between atom types and the colors used to represent them
  var PARTICLE_COLOR_TABLE = {};
  PARTICLE_COLOR_TABLE[ AtomType.ARGON ] = StatesOfMatterConstants.ARGON_COLOR;
  PARTICLE_COLOR_TABLE[ AtomType.NEON ] = StatesOfMatterConstants.NEON_COLOR;
  PARTICLE_COLOR_TABLE[ AtomType.OXYGEN ] = StatesOfMatterConstants.OXYGEN_COLOR;
  PARTICLE_COLOR_TABLE[ AtomType.HYDROGEN ] = StatesOfMatterConstants.HYDROGEN_COLOR;

  /**
   * @param {ObservableArray<Particle>} particles that need to be rendered on the canvas
   * @param {ModelViewTransform2} modelViewTransform to convert between model and view coordinate frames
   * @param {Object} [options] that can be passed on to the underlying node
   * @constructor
   */
  function ParticleImageCanvasNode( particles, modelViewTransform, options ) {

    var self = this;
    this.particles = particles;
    this.modelViewTransform = modelViewTransform;
    CanvasNode.call( this, options );

    // create a canvas and render the particle images that will be used, one row with strokes and one row without
    this.particleImageCanvas = document.createElement( 'canvas' );
    this.particleImageCanvas.width = Object.getOwnPropertyNames( AtomType ).length * PARTICLE_IMAGE_CANVAS_LENGTH;
    this.particleImageCanvas.height = PARTICLE_IMAGE_CANVAS_LENGTH * 2;

    // create a map of particle types to position in the particle image canvas, will be populated below
    this.mapAtomTypeToImageXPosition = {};

    // Draw the particles on the canvas, top row is without black stroke, the bottom row is with black stroke (for
    // projector mode).
    var context = this.particleImageCanvas.getContext( '2d' );
    var index = 0;
    for ( var atomType in AtomType ){

      if ( !AtomType.hasOwnProperty( atomType ) ){
        // skip prototype properties
        continue;
      }

      // draw particle with stroke that matches the fill
      context.strokeStyle = PARTICLE_COLOR_TABLE[ atomType ];
      context.fillStyle = PARTICLE_COLOR_TABLE[ atomType ];
      context.lineWidth = 1;
      context.beginPath();
      context.arc(
        PARTICLE_IMAGE_CANVAS_LENGTH * index + PARTICLE_IMAGE_CANVAS_LENGTH / 2,
        PARTICLE_IMAGE_CANVAS_LENGTH / 2,
        PARTICLE_IMAGE_CANVAS_LENGTH / 2 * 0.95,
        0,
        Math.PI * 2
      );
      context.fill();
      context.stroke();

      // draw particle with dark stroke
      context.strokeStyle = 'black';
      context.beginPath();
      context.arc(
        PARTICLE_IMAGE_CANVAS_LENGTH * index + PARTICLE_IMAGE_CANVAS_LENGTH / 2,
        PARTICLE_IMAGE_CANVAS_LENGTH * 1.5,
        PARTICLE_IMAGE_CANVAS_LENGTH / 2 * 0.95,
        0,
        Math.PI * 2
      );
      context.fill();
      context.stroke();

      // populate the map for this atom type
      self.mapAtomTypeToImageXPosition[ atomType ] = index * PARTICLE_IMAGE_CANVAS_LENGTH;

      index++;
    }

    // initiate the first paint
    this.invalidatePaint();

    StatesOfMatterColorProfile.particleStrokeProperty.link( function( color ) {
      self.useStrokedParticles = color.toCSS() !== 'rgb(255,255,255)';
    } );
    this.mutate( options );
  }

  statesOfMatter.register( 'ParticleImageCanvasNode', ParticleImageCanvasNode );

  return inherit( CanvasNode, ParticleImageCanvasNode, {

    /**
     * Paints the particles on the canvas node.
     * @param {CanvasRenderingContext2D} context
     */
    paintCanvas: function( context ) {
      var particle;
      var i;
      var particleViewRadius;

      for ( i = 0; i < this.particles.length; i++ ) {
        particle = this.particles.get( i );
        particleViewRadius = this.modelViewTransform.modelToViewDeltaX( particle.radius );
        context.drawImage(
          this.particleImageCanvas,
          this.mapAtomTypeToImageXPosition[ particle.getType() ],
          this.useStrokedParticles ? PARTICLE_IMAGE_CANVAS_LENGTH : 0,
          PARTICLE_IMAGE_CANVAS_LENGTH,
          PARTICLE_IMAGE_CANVAS_LENGTH,
          this.modelViewTransform.modelToViewX( particle.positionProperty.value.x ) - particleViewRadius,
          this.modelViewTransform.modelToViewY( particle.positionProperty.value.y ) - particleViewRadius,
          particleViewRadius * 2,
          particleViewRadius * 2
        );
      }
    },

    step: function() {
      this.invalidatePaint();
    }

  } );
} );