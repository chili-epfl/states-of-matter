// Copyright 2002-2014, University of Colorado
/**
 * This class represents a node that looks like a large finger, which can be
 * used to push down on things.
 * @author Siddhartha Chinthapally (Actual Concepts)
 */
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var StatesOfMatterConstants = require( 'STATES_OF_MATTER/common/StatesOfMatterConstants' );
  var SimpleDragHandler = require( 'SCENERY/input/SimpleDragHandler' );
  var Node = require( 'SCENERY/nodes/Node' );
  var ArrowNode = require( 'SCENERY_PHET/ArrowNode' );
  var Image = require( 'SCENERY/nodes/Image' );

  //images
  var fingerImage = require( 'image!STATES_OF_MATTER/finger-4.png' );

// Width of the finger node as a proportion of the width of the particle

  // var HAND_NODE_WIDTH_PROPORTION = 0.55;


  function PointingHandNode( model, modelViewTransform ) {

    var pointingHandNode = this;
    Node.call( this );
    this.model = model;
    //this.mouseMovementAmount;
    //this.containerSizeAtDragStart;
    this.modelViewTransform = modelViewTransform;
    this.mouseOver = false;
    this.beingDragged = false;
    this.hintNode = new Node();

    this.model = model;

    // Add the up arrow.
    this.upArrowNode = new ArrowNode( 0, 0, 0, 25, {
      headHeight: 10,
      headWidth: 10,
      tailWidth: 6,
      fill: '#33FF00',
      stroke: '#33FF00',
      pickable: true
    } );
    this.upArrowNode.setRotation( 2 * Math.PI / 2 );

    this.hintNode.addChild( this.upArrowNode );

    // Add the down arrow.
    this.downArrow = new ArrowNode( 0, 0, 0, 25, {
      headHeight: 10,
      headWidth: 10,
      tailWidth: 6,
      fill: '#33FF00',
      stroke: '#33FF00',
      pickable: true
    } );
    this.downArrow.top = this.upArrowNode.bottom + 5;
    this.hintNode.addChild( this.downArrow );
    this.hintNode.setVisible( false );
    //var containerRect = model.getParticleContainerRect();
    // var desiredHandWidth = containerRect.getWidth() * HAND_NODE_WIDTH_PROPORTION;


    this.hintNode.setVisible( false );
    //var scale = desiredHandWidth /fingerImage.width;
    // Load and scale the image.
    this.fingerImageNode = new Image( fingerImage, {scale: 0.5, cursor: 'ns-resize', pickable: true} );

    this.hintNode.top = this.fingerImageNode.bottom - 50;
    this.hintNode.left = this.fingerImageNode.right;

    // Set ourself up to listen for and handle mouse dragging events.
    var startY, endY;
    this.fingerImageNode.addInputListener( new SimpleDragHandler(
      {
        start: function( event ) {
          startY = pointingHandNode.fingerImageNode.globalToParentPoint( event.pointer.point ).y;
          pointingHandNode.beingDragged = true;
          pointingHandNode.mouseMovementAmount = 0;
          pointingHandNode.containerSizeAtDragStart = pointingHandNode.model.getParticleContainerHeight();
          pointingHandNode.updateHintVisibility();

        },
        drag: function( event ) {
          endY = pointingHandNode.fingerImageNode.globalToParentPoint( event.pointer.point ).y;
          var d = endY - startY;
          pointingHandNode.mouseMovementAmount += d;
          // Resize the container based on the amount that the node has moved.
          pointingHandNode.model.setTargetParticleContainerHeight(
              pointingHandNode.containerSizeAtDragStart - pointingHandNode.mouseMovementAmount );
          pointingHandNode.updateHintVisibility();
        },
        end: function() {
          // in size that is currently underway.
          pointingHandNode.model.setTargetParticleContainerHeight( pointingHandNode.model.getParticleContainerHeight() );
          pointingHandNode.beingDragged = false;
          pointingHandNode.updateHintVisibility();
        }
      } ) );
    this.fingerImageNode.addInputListener( {
      enter: function() {
        pointingHandNode.mouseOver = true;
        pointingHandNode.updateHintVisibility();
      },
      exit: function() {
        pointingHandNode.mouseOver = false;
        pointingHandNode.updateHintVisibility();
      }
    } );

    // Add the finger node as a child.
    this.addChild( this.fingerImageNode );
    this.addChild( this.hintNode );
    model.particleContainerHeightProperty.link( function() {
      pointingHandNode.handleContainerSizeChanged();
      pointingHandNode.updateArrowVisibility();
    } );
    // Set our initial offset.
    // pointingHandNode.setTranslation( containerRect.getX() + containerRect.getWidth() * NODE_X_POS_PROPORTION, -this.height );
  }

  return inherit( Node, PointingHandNode, {
    updateArrowVisibility: function() {
      if ( this.model.getParticleContainerHeight() === StatesOfMatterConstants.PARTICLE_CONTAINER_INITIAL_HEIGHT ) {
        // At the height limit, so only show the down arrow.
        this.upArrowNode.setVisible( false );
      }
      else if ( this.model.getParticleContainerHeight() === 0 ) {
        // Particle container all the way down, so show only the up arrow.
        this.upArrowNode.setVisible( false );
      }
      else {
        this.upArrowNode.setVisible( true );
        this.upArrowNode.setVisible( true );
      }
    },

    handleContainerSizeChanged: function() {
      var containerRect = this.model.getParticleContainerRect();
      if ( !this.model.getContainerExploded() ) {
        this.setTranslation( this.x,
            Math.abs( this.modelViewTransform.modelToViewDeltaY( StatesOfMatterConstants.PARTICLE_CONTAINER_INITIAL_HEIGHT -
                                                                 containerRect.getHeight() ) ) - this.height );
      }
      else {
        // quickly.
        this.setTranslation( this.x,
            -this.modelViewTransform.modelToViewDeltaY( StatesOfMatterConstants.PARTICLE_CONTAINER_INITIAL_HEIGHT -
                                                        ( containerRect.getHeight() * 2 ) ) -
            this.height );
      }
    },

    updateHintVisibility: function() {
      this.hintNode.setVisible( this.mouseOver || this.beingDragged );
    }
  } );
} );
