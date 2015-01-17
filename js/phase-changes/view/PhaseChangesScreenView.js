// Copyright (c) 2002 - 2014. University of Colorado Boulder

/**
 * View for the phase changes screen
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
  var CompositeThermometerNode = require( 'STATES_OF_MATTER/common/view/CompositeThermometerNode' );
  var StoveNode = require( 'STATES_OF_MATTER/common/view/StoveNode' );
  var PhaseChangesMoleculesControlPanel = require( 'STATES_OF_MATTER/phase-changes/view/PhaseChangesMoleculesControlPanel' );
  var StatesOfMatterConstants = require( 'STATES_OF_MATTER/common/StatesOfMatterConstants' );
  var ParticleContainerNode = require( 'STATES_OF_MATTER/common/view/ParticleContainerNode' );
  var ModelViewTransform2 = require( 'PHETCOMMON/view/ModelViewTransform2' );
  var Vector2 = require( 'DOT/Vector2' );
  var ResetAllButton = require( 'SCENERY_PHET/buttons/ResetAllButton' );
  var Bounds2 = require( 'DOT/Bounds2' );
  var BicyclePumpNode = require( 'STATES_OF_MATTER/common/view/BicyclePumpNode' );
  var PhaseDiagram = require( 'STATES_OF_MATTER/phase-changes/view/PhaseDiagram' );
  var EpsilonControlInteractionPotentialDiagram = require( 'STATES_OF_MATTER/phase-changes/view/EpsilonControlInteractionPotentialDiagram' );
  var ParticleCanvasNode = require( 'STATES_OF_MATTER/common/view/ParticleCanvasNode' );
  var TextPushButton = require( 'SUN/buttons/TextPushButton' );
  var ObservableArray = require( 'AXON/ObservableArray' );

  //strings
  var returnLidString = require( 'string!STATES_OF_MATTER/returnLid' );

  // constants
  var inset = 10;
  // Constants used when mapping the model pressure and temperature to the phase diagram.
  var TRIPLE_POINT_TEMPERATURE_IN_MODEL = StatesOfMatterConstants.TRIPLE_POINT_MONATOMIC_MODEL_TEMPERATURE;
  var TRIPLE_POINT_TEMPERATURE_ON_DIAGRAM = 0.375;

  var CRITICAL_POINT_TEMPERATURE_IN_MODEL = StatesOfMatterConstants.CRITICAL_POINT_MONATOMIC_MODEL_TEMPERATURE;
  var CRITICAL_POINT_TEMPERATURE_ON_DIAGRAM = 0.8;
  var SLOPE_IN_1ST_REGION = TRIPLE_POINT_TEMPERATURE_ON_DIAGRAM / TRIPLE_POINT_TEMPERATURE_IN_MODEL;
  var SLOPE_IN_2ND_REGION = ( CRITICAL_POINT_TEMPERATURE_ON_DIAGRAM - TRIPLE_POINT_TEMPERATURE_ON_DIAGRAM ) /
                            ( CRITICAL_POINT_TEMPERATURE_IN_MODEL - TRIPLE_POINT_TEMPERATURE_IN_MODEL );
  var OFFSET_IN_2ND_REGION = TRIPLE_POINT_TEMPERATURE_ON_DIAGRAM -
                             ( SLOPE_IN_2ND_REGION * TRIPLE_POINT_TEMPERATURE_IN_MODEL );
  // Used for calculating moving averages needed to mellow out the graph
  // behavior.  Value empirically determined.
  var MAX_NUM_HISTORY_SAMPLES = 100;
  var PRESSURE_FACTOR = 35;

  var particleLayerCanvasBoundLimit = 1000;
  var particleLayerXOffset = 150;
  var particleLayerYOffset = 680;
  var particleContainerXOffset = 60;
  var layBoundsRightOffset = 15;
  var layBoundsYOffset = 10;
  var stepButtonXOffset = 50;
  var stepButtonYOffset = 20;
  var bicyclePumpNodeYOffset = 90;
  var bicyclePumpNodeXOffset = 100;
  var returnLidButtonYOffset = 100;

  /**
   *
   * @param {MultipleParticleModel} multipleParticleModel - model of the simulation
   * @param {Boolean} isInteractionDiagramEnabled
   * @param {Property<Boolean>} projectorColorsProperty - true to use the projector color scheme, false to use regular color scheme
   * @constructor
   */
  function PhaseChangesScreenView( multipleParticleModel, isInteractionDiagramEnabled, projectorColorsProperty ) {
    var phaseChangesScreenView = this;

    ScreenView.call( this, StatesOfMatterConstants.SCREEN_VIEW_OPTIONS );
    var mvtScale = StatesOfMatterConstants.VIEW_CONTAINER_WIDTH / StatesOfMatterConstants.CONTAINER_BOUNDS.width;

    // model-view transform
    var modelViewTransform = ModelViewTransform2.createSinglePointScaleInvertedYMapping( new Vector2( 0, 0 ),
      new Vector2( 0, StatesOfMatterConstants.VIEW_CONTAINER_HEIGHT ), mvtScale );

    // add stove node
    var stoveNode = new StoveNode( multipleParticleModel, {
      scale: 0.8,
      centerX: this.layoutBounds.centerX,
      bottom: this.layoutBounds.bottom - inset
    } );

    this.multipleParticleModel = multipleParticleModel;
    this.modelTemperatureHistory = new ObservableArray();

    // add particle container node
    var particleContainerNode = new ParticleContainerNode( multipleParticleModel, modelViewTransform, true, true,
      {
        centerX: stoveNode.centerX - particleContainerXOffset,
        bottom: stoveNode.top - inset
      } );

    // add particle canvas layer for particle rendering
    this.particlesLayer = new ParticleCanvasNode( multipleParticleModel.particles, modelViewTransform, projectorColorsProperty, {
      centerX: stoveNode.centerX - particleLayerXOffset,
      bottom: stoveNode.top + particleLayerYOffset,
      canvasBounds: new Bounds2( -particleLayerCanvasBoundLimit, -particleLayerCanvasBoundLimit,
        particleLayerCanvasBoundLimit, particleLayerCanvasBoundLimit )
    } );
    this.addChild( this.particlesLayer );
    this.addChild( particleContainerNode );
    this.addChild( stoveNode );

    // add compositeThermometer node
    var compositeThermometerNode = new CompositeThermometerNode( multipleParticleModel, {
      font: new PhetFont( 20 ),
      fill: 'white',
      right: stoveNode.left + 3 * inset
    } );
    this.addChild( compositeThermometerNode );

    // add phase diagram
    this.phaseDiagram = new PhaseDiagram( multipleParticleModel.expandedProperty );

    //add phase change control panel
    var phaseChangesMoleculesControlPanel = new PhaseChangesMoleculesControlPanel( multipleParticleModel, isInteractionDiagramEnabled,
      {
        right: this.layoutBounds.right - layBoundsRightOffset,
        top:   this.layoutBounds.top + layBoundsYOffset
      } );
    this.addChild( phaseChangesMoleculesControlPanel );

    // Add reset all button
    var resetAllButton = new ResetAllButton(
      {
        listener: function() {
          phaseChangesScreenView.modelTemperatureHistory.clear();
          multipleParticleModel.reset();
          compositeThermometerNode.setRotation( 0 );
          particleContainerNode.reset();
        },
        bottom: this.layoutBounds.bottom - layBoundsYOffset / 2,
        right:  this.layoutBounds.right - layBoundsRightOffset,
        radius: 18
      } );

    // add play pause button and step button
    var stepButton = new StepButton(
      function() {
        multipleParticleModel.stepInternal( 0.016 );
      },
      multipleParticleModel.isPlayingProperty,
      {
        radius: 12,
        stroke: 'black',
        fill: '#005566',
        right: stoveNode.left - stepButtonXOffset,
        bottom: stoveNode.bottom - stepButtonYOffset

      }
    );
    this.addChild( stepButton );

    var playPauseButton = new PlayPauseButton( multipleParticleModel.isPlayingProperty,
      {
        radius: 18, stroke: 'black',
        fill: '#005566',
        y: stepButton.centerY,
        right: stepButton.left - inset
      } );
    this.addChild( playPauseButton );
    this.addChild( resetAllButton );

    // add bicycle pump node
    this.addChild( new BicyclePumpNode( 200, 250, multipleParticleModel, {
      bottom: stoveNode.top + bicyclePumpNodeYOffset,
      right: particleContainerNode.left + bicyclePumpNodeXOffset
    } ) );
    // add return Lid button
    this.returnLidButton = new TextPushButton( returnLidString, {
      font: new PhetFont( 14 ),
      baseColor: 'yellow',
      listener: function() {
        multipleParticleModel.returnLid();
        particleContainerNode.reset();
      },
      visible: false,
      xMargin: 10,
      right: particleContainerNode.left - 2 * layBoundsRightOffset,
      top: particleContainerNode.centerY + returnLidButtonYOffset
    } );
    this.addChild( this.returnLidButton );
    multipleParticleModel.isExplodedProperty.linkAttribute( this.returnLidButton, 'visible' );


    // add interaction Potential Diagram
    if ( isInteractionDiagramEnabled ) {
      var epsilonControlInteractionPotentialDiagram = new EpsilonControlInteractionPotentialDiagram(
        StatesOfMatterConstants.MAX_SIGMA, StatesOfMatterConstants.MIN_EPSILON, false, multipleParticleModel, {
          right: this.layoutBounds.right - layBoundsRightOffset,
          top: phaseChangesMoleculesControlPanel.bottom + layBoundsYOffset / 2
        } );
      this.addChild( epsilonControlInteractionPotentialDiagram );
    }

    multipleParticleModel.moleculeTypeProperty.link( function( moleculeId ) {
      phaseChangesScreenView.modelTemperatureHistory.clear();
      phaseChangesScreenView.updatePhaseDiagram();
      phaseChangesScreenView.phaseDiagram.setDepictingWater( moleculeId === StatesOfMatterConstants.WATER );

      // enable/disable phase diagram on molecule type change
      if ( moleculeId === StatesOfMatterConstants.USER_DEFINED_MOLECULE ) {
        if ( phaseChangesScreenView.isChild( phaseChangesScreenView.phaseDiagram ) ) {
          phaseChangesScreenView.removeChild( phaseChangesScreenView.phaseDiagram );
        }
        multipleParticleModel.interactionStrengthProperty.value = StatesOfMatterConstants.MAX_EPSILON;
        if ( isInteractionDiagramEnabled ) {
          epsilonControlInteractionPotentialDiagram.top = phaseChangesMoleculesControlPanel.bottom +
                                                          layBoundsYOffset / 2;
        }
      }
      else {
        if ( !phaseChangesScreenView.isChild( phaseChangesScreenView.phaseDiagram ) ) {
          phaseChangesScreenView.addChild( phaseChangesScreenView.phaseDiagram );
          phaseChangesScreenView.phaseDiagram.right = phaseChangesScreenView.layoutBounds.right - layBoundsRightOffset;
          if ( isInteractionDiagramEnabled ) {
            epsilonControlInteractionPotentialDiagram.top = phaseChangesMoleculesControlPanel.bottom +
                                                            layBoundsYOffset / 2;
            phaseChangesScreenView.phaseDiagram.top = epsilonControlInteractionPotentialDiagram.bottom +
                                                      layBoundsYOffset / 2;
          }
          else {
            phaseChangesScreenView.phaseDiagram.top = phaseChangesMoleculesControlPanel.bottom + layBoundsYOffset / 2;
          }
        }
      }
      if ( multipleParticleModel.getContainerExploded() ) {
        particleContainerNode.reset();
      }
    } );
    multipleParticleModel.particleContainerHeightProperty.link( function() {
      var rotationRate = 0;
      var containerRect = multipleParticleModel.getParticleContainerRect();

      // adjust composite thermometer node position
      if ( !multipleParticleModel.getContainerExploded() ) {
        rotationRate = 0;
        compositeThermometerNode.setRotation( rotationRate );
        compositeThermometerNode.setTranslation( compositeThermometerNode.x,
          particleContainerNode.y + compositeThermometerNode.height / 3 +
          Math.abs( modelViewTransform.modelToViewDeltaY( StatesOfMatterConstants.PARTICLE_CONTAINER_INITIAL_HEIGHT -
                                                          containerRect.getHeight() ) )
        );
      }
      else {
        rotationRate = -( Math.PI / 100 + ( Math.random() * Math.PI / 50 ) );
        compositeThermometerNode.rotate( rotationRate );
        compositeThermometerNode.setTranslation(
          compositeThermometerNode.x,
          ( particleContainerNode.y -
            modelViewTransform.modelToViewDeltaY( StatesOfMatterConstants.PARTICLE_CONTAINER_INITIAL_HEIGHT -
                                                  containerRect.getHeight() ) )
        );
      }
    } );

    multipleParticleModel.temperatureSetPointProperty.link( function() {
      phaseChangesScreenView.modelTemperatureHistory.clear();
      phaseChangesScreenView.updatePhaseDiagram();
    } );
  }

  return inherit( ScreenView, PhaseChangesScreenView, {
    step: function() {
      this.particlesLayer.step();
    },
    /**
     * Update the position of the marker on the phase diagram based on the
     * temperature and pressure values within the model.
     */
    updatePhaseDiagram: function() {

      // If the container has exploded, don't bother showing the dot.
      if ( this.multipleParticleModel.getContainerExploded() ) {
        this.phaseDiagram.setStateMarkerVisible( false );
      }
      else {
        this.phaseDiagram.setStateMarkerVisible( true );
        var movingAverageTemperature = this.updateMovingAverageTemperature( this.multipleParticleModel.getTemperatureSetPoint() );
        var modelPressure = this.multipleParticleModel.getModelPressure();
        var mappedTemperature = this.mapModelTemperatureToPhaseDiagramTemperature( movingAverageTemperature );
        var mappedPressure = this.mapModelTempAndPressureToPhaseDiagramPressureAlternative1( modelPressure,
          movingAverageTemperature );
        this.phaseDiagram.setStateMarkerPos( mappedTemperature, mappedPressure );

      }
    },

    updateMovingAverageTemperature: function( newTemperatureValue ) {
      if ( this.modelTemperatureHistory.length === MAX_NUM_HISTORY_SAMPLES ) {
        this.modelTemperatureHistory.shift();
      }
      this.modelTemperatureHistory.push( newTemperatureValue );
      var totalOfAllTemperatures = 0;
      for ( var i = 0; i < this.modelTemperatureHistory.length; i++ ) {
        totalOfAllTemperatures += this.modelTemperatureHistory.get( i );
      }
      return totalOfAllTemperatures / this.modelTemperatureHistory.length;
    },

    mapModelTemperatureToPhaseDiagramTemperature: function( modelTemperature ) {

      var mappedTemperature;
      if ( modelTemperature < TRIPLE_POINT_TEMPERATURE_IN_MODEL ) {
        mappedTemperature = SLOPE_IN_1ST_REGION * modelTemperature;
      }
      else {
        mappedTemperature = modelTemperature * SLOPE_IN_2ND_REGION + OFFSET_IN_2ND_REGION;
      }

      return Math.min( mappedTemperature, 1 );
    },


    mapModelTempAndPressureToPhaseDiagramPressure: function( modelPressure, modelTemperature ) {
      var mappedTemperature = this.mapModelTemperatureToPhaseDiagramTemperature( modelTemperature );
      var mappedPressure;

      if ( modelTemperature < TRIPLE_POINT_TEMPERATURE_IN_MODEL ) {
        mappedPressure = 1.4 * ( Math.pow( mappedTemperature, 2 ) ) + PRESSURE_FACTOR * Math.pow( modelPressure, 2 );
      }
      else if ( modelTemperature < CRITICAL_POINT_TEMPERATURE_IN_MODEL ) {
        mappedPressure = 0.19 + 1.2 * ( Math.pow( mappedTemperature - TRIPLE_POINT_TEMPERATURE_ON_DIAGRAM, 2 ) ) +
                         PRESSURE_FACTOR * Math.pow( modelPressure, 2 );
      }
      else {
        mappedPressure = 0.43 + ( 0.43 / 0.81 ) * ( mappedTemperature - 0.81 ) +
                         PRESSURE_FACTOR * Math.pow( modelPressure, 2 );
      }
      return Math.min( mappedPressure, 1 );
    },

    // TODO: This was added by jblanco on 3/23/2012 as part of effort to
    // improve phase diagram behavior, see #3287. If kept, it needs to be
    // cleaned up, including deletion of the previous version of this method.

    // Map the model temperature and pressure to a normalized pressure value
    // suitable for use in setting the marker position on the phase chart.
    mapModelTempAndPressureToPhaseDiagramPressureAlternative1: function( modelPressure, modelTemperature ) {
      // This method is a total tweak fest.  All values and equations are
      // made to map to the phase diagram, and are NOT based on any real-
      // world equations that define phases of matter.
      var cutOverTemperature = TRIPLE_POINT_TEMPERATURE_ON_DIAGRAM - 0.025;
      var mappedTemperature = this.mapModelTemperatureToPhaseDiagramTemperature( modelTemperature );
      var mappedPressure;
      if ( mappedTemperature < cutOverTemperature ) {
        mappedPressure = Math.pow( mappedTemperature, 1.5 );
      }
      else {
        mappedPressure = Math.pow( mappedTemperature - cutOverTemperature, 1.8 ) + 0.2;
      }
      return Math.min( mappedPressure, 1 );
    }

  } );
} );