// Copyright (c) 2002 - 2014. University of Colorado Boulder

/**
 * View for the solid-liquid-gas screen
 *
 * @author Aaron Davis
 * @author Siddhartha Chinthapally (Actual Concepts)
 */
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var ScreenView = require( 'JOIST/ScreenView' );
  var PhetFont = require( 'SCENERY_PHET/PhetFont' );
  var PlayPauseButton = require( 'SCENERY_PHET/buttons/PlayPauseButton' );
  var StepButton = require( 'SCENERY_PHET/buttons/StepButton' );
  var StoveNode = require( 'STATES_OF_MATTER/common/view/StoveNode' );
  var CompositeThermometerNode = require( 'STATES_OF_MATTER/common/view/CompositeThermometerNode' );
  var SolidLiquidGasMoleculesControlPanel = require( 'STATES_OF_MATTER/solid-liquid-gas/view/SolidLiquidGasMoleculesControlPanel' );
  var StatesOfMatterConstants = require( 'STATES_OF_MATTER/common/StatesOfMatterConstants' );
  var ParticleContainerNode = require( 'STATES_OF_MATTER/common/view/ParticleContainerNode' );
  var ModelViewTransform2 = require( 'PHETCOMMON/view/ModelViewTransform2' );
  var Vector2 = require( 'DOT/Vector2' );
  var ResetAllButton = require( 'SCENERY_PHET/buttons/ResetAllButton' );
  var SolidLiquidGasPhaseControlNode = require( 'STATES_OF_MATTER/solid-liquid-gas/view/SolidLiquidGasPhaseControlNode' );
  var Bounds2 = require( 'DOT/Bounds2' );
  var ParticleCanvasNode = require( 'STATES_OF_MATTER/common/view/ParticleCanvasNode' );

  // constants
  var inset = 10;
  var stoveNodeXOffset = 10;
  var stepButtonXOffset = 50;
  var stepButtonYOffset = 20;
  var compositeThermometerNodeLeftOffset = 100;
  var compositeThermometerNodeYOffset = 50;
  var layoutBoundsRightOffset = 15;
  var layoutBoundsYOffset = 10;
  var particlesLayerXOffset = 150;
  var particlesLayerYOffset = 680;
  var particleCanvasLayerBoundLimit = 1000;

  /**
   * @param {MultipleParticleModel} model of the sim
   * @constructor
   */
  function SolidLiquidGasScreenView( model ) {

    ScreenView.call( this, StatesOfMatterConstants.SCREEN_VIEW_OPTIONS );
    var mvtScale = StatesOfMatterConstants.VIEW_CONTAINER_WIDTH / StatesOfMatterConstants.CONTAINER_BOUNDS.width;

    // model-view transform
    var modelViewTransform = ModelViewTransform2.createSinglePointScaleInvertedYMapping( new Vector2( 0, 0 ),
      new Vector2( 0, StatesOfMatterConstants.VIEW_CONTAINER_HEIGHT ), mvtScale );

    // add stove Node
    var stoveNode = new StoveNode( model, { scale: 0.8,
      centerX: this.layoutBounds.centerX,
      bottom: this.layoutBounds.bottom - inset
    } );

    // add particle container
    var particleContainerNode = new ParticleContainerNode( model, modelViewTransform, false, false,
      {
        centerX: stoveNode.centerX - stoveNodeXOffset,
        bottom: stoveNode.top - inset
      } );

    // add particle Canvas layer
    this.particlesLayer = new ParticleCanvasNode( model.particles, modelViewTransform, {
      centerX: stoveNode.centerX - particlesLayerXOffset,
      bottom: stoveNode.top + particlesLayerYOffset,
      canvasBounds: new Bounds2( -particleCanvasLayerBoundLimit, -particleCanvasLayerBoundLimit,
        particleCanvasLayerBoundLimit, particleCanvasLayerBoundLimit )
    } );
    this.addChild( this.particlesLayer );
    this.addChild( particleContainerNode );
    this.addChild( stoveNode );

    // add compositeThermometer Node
    var compositeThermometerNode = new CompositeThermometerNode( model, {
      font: new PhetFont( 20 ),
      fill: 'white',
      right: particleContainerNode.left + compositeThermometerNodeLeftOffset,
      centerY: particleContainerNode.top + compositeThermometerNodeYOffset
    } );
    this.addChild( compositeThermometerNode );

    // add Molecule ControlPanel
    var solidLiquidGasMoleculesControlPanel = new SolidLiquidGasMoleculesControlPanel( model.moleculeTypeProperty, {
      right: this.layoutBounds.right - layoutBoundsRightOffset,
      top: this.layoutBounds.top + layoutBoundsYOffset
    } );
    this.addChild( solidLiquidGasMoleculesControlPanel );

    // add phases control node
    var solidLiquidGasPhaseControlNode = new SolidLiquidGasPhaseControlNode( model.stateProperty, {
      right: solidLiquidGasMoleculesControlPanel.right,
      top: solidLiquidGasMoleculesControlPanel.bottom + layoutBoundsYOffset
    } );
    this.addChild( solidLiquidGasPhaseControlNode );

    // Add reset all button
    var resetAllButton = new ResetAllButton(
      {
        listener: function() {
          model.reset();
          particleContainerNode.reset();
        },
        bottom: this.layoutBounds.bottom - layoutBoundsYOffset / 2,
        right: this.layoutBounds.right - layoutBoundsRightOffset,
        radius: 18
      } );

    // add play pause button and step button
    var stepButton = new StepButton(
      function() {
        model.stepInternal( 0.016 );
      },
      model.isPlayingProperty,
      {
        radius: 12,
        stroke: 'black',
        fill: '#005566',
        right: stoveNode.left - stepButtonXOffset,
        bottom: stoveNode.bottom - stepButtonYOffset
      }
    );

    this.addChild( stepButton );
    model.stateProperty.link( function( phase ) {
      model.setPhase( phase );
    } );
    model.moleculeTypeProperty.link( function() {
      model.temperatureSetPointProperty._notifyObservers();
    } );

    var playPauseButton = new PlayPauseButton( model.isPlayingProperty,
      {
        radius: 18,
        stroke: 'black',
        fill: '#005566',
        y: stepButton.centerY,
        right: stepButton.left - inset
      } );
    this.addChild( playPauseButton );
    this.addChild( resetAllButton );
  }

  return inherit( ScreenView, SolidLiquidGasScreenView, {
    step: function() {
      this.particlesLayer.step();
    }
  } );
} );
