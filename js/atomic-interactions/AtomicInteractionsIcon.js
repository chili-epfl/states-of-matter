// Copyright 2002-2015, University of Colorado Boulder

/**
 * Programmatically generated icon for the 'Interaction' screen.
 *
 * @author John Blanco
 */
define( function( require ) {
    'use strict';

    // modules
    var ArrowNode = require( 'SCENERY_PHET/ArrowNode' );
    var Circle = require( 'SCENERY/nodes/Circle' );
    var Color = require( 'SCENERY/util/Color' );
    var inherit = require( 'PHET_CORE/inherit' );
    var Node = require( 'SCENERY/nodes/Node' );
    var RadialGradient = require( 'SCENERY/util/RadialGradient' );
    var Rectangle = require( 'SCENERY/nodes/Rectangle' );
    var StatesOfMatterConstants = require( 'STATES_OF_MATTER/common/StatesOfMatterConstants' );

    // images
    var gasIconImage = require( 'image!STATES_OF_MATTER/gas-icon.png' );
    var liquidIconImage = require( 'image!STATES_OF_MATTER/liquid-icon.png' );
    var solidIconImage = require( 'image!STATES_OF_MATTER/solid-icon.png' );

    // constants
    var PARTICLE_COLOR = new Color( StatesOfMatterConstants.ADJUSTABLE_ATTRACTION_COLOR );

    /**
     * {Dimension2} size
     * @constructor
     */
    function AtomicInteractionsIcon( size ) {
      var self = this;
      Node.call( this );

      // background
      var backgroundRect = new Rectangle( 0, 0, size.width, size.height, 0, 0, {
        fill: 'black'
      } );
      this.addChild( backgroundRect );

      // create the two atoms under a parent node
      var atomRadius = size.width * 0.2;
      var gradient = new RadialGradient( 0, 0, 0, 0, 0, atomRadius )
        .addColorStop( 0, PARTICLE_COLOR )
        .addColorStop( 1, PARTICLE_COLOR.darkerColor( 0.5 ) );

      var atomsNode = new Node();
      atomsNode.addChild( new Circle( atomRadius, {
        fill: gradient,
        opacity: 0.85,
        centerX: -atomRadius * 0.7
      } ) );
      atomsNode.addChild( new Circle( atomRadius, {
        fill: gradient,
        opacity: 0.85,
        centerX: atomRadius * 0.7
      } ) );

      // position and add the two interacting atoms
      atomsNode.centerX = backgroundRect.width / 2;
      atomsNode.centerY = backgroundRect.height / 2;
      this.addChild( atomsNode );
    }

    return inherit( Node, AtomicInteractionsIcon );
  }
);