// Copyright 2014-2015, University of Colorado Boulder

/**
 * view for the Phase Changes screen
 *
 * @author Aaron Davis
 * @author Siddhartha Chinthapally (Actual Concepts)
 * @author John Blanco
 */
define( function( require ) {
  'use strict';

  // modules
  var BicyclePumpNode = require( 'STATES_OF_MATTER/common/view/BicyclePumpNode' );
  var Bounds2 = require( 'DOT/Bounds2' );
  var CompositeThermometerNode = require( 'STATES_OF_MATTER/common/view/CompositeThermometerNode' );
  var HeaterCoolerNode = require( 'SCENERY_PHET/HeaterCoolerNode' );
  var EpsilonControlInteractionPotentialDiagram = require( 'STATES_OF_MATTER/phase-changes/view/EpsilonControlInteractionPotentialDiagram' );
  var inherit = require( 'PHET_CORE/inherit' );
  var ModelViewTransform2 = require( 'PHETCOMMON/view/ModelViewTransform2' );
  var MultiLineText = require( 'SCENERY_PHET/MultiLineText' );
  var MultipleParticleModel = require( 'STATES_OF_MATTER/common/model/MultipleParticleModel' );
  var ObservableArray = require( 'AXON/ObservableArray' );
  var ParticleContainerNode = require( 'STATES_OF_MATTER/common/view/ParticleContainerNode' );
  var PhaseChangesMoleculesControlPanel = require( 'STATES_OF_MATTER/phase-changes/view/PhaseChangesMoleculesControlPanel' );
  var PhaseDiagram = require( 'STATES_OF_MATTER/phase-changes/view/PhaseDiagram' );
  var PhetFont = require( 'SCENERY_PHET/PhetFont' );
  var ResetAllButton = require( 'SCENERY_PHET/buttons/ResetAllButton' );
  var statesOfMatter = require( 'STATES_OF_MATTER/statesOfMatter' );
  var StatesOfMatterConstants = require( 'STATES_OF_MATTER/common/StatesOfMatterConstants' );
  var ScreenView = require( 'JOIST/ScreenView' );
  var SOMPlayPauseStepControl = require( 'STATES_OF_MATTER/common/view/SOMPlayPauseStepControl' );
  var SubstanceType = require( 'STATES_OF_MATTER/common/SubstanceType' );
  var TextPushButton = require( 'SUN/buttons/TextPushButton' );
  var Vector2 = require( 'DOT/Vector2' );

  // strings
  var returnLidString = require( 'string!STATES_OF_MATTER/returnLid' );

  // constants
  var PANEL_WIDTH = 170; // empirically determined to be wide enough for all contents using English strings with some margin
  var INTER_PANEL_SPACING = 8;

  // constants used when mapping the model pressure and temperature to the phase diagram.
  var TRIPLE_POINT_TEMPERATURE_IN_MODEL = StatesOfMatterConstants.TRIPLE_POINT_MONATOMIC_MODEL_TEMPERATURE;
  var TRIPLE_POINT_TEMPERATURE_ON_DIAGRAM = 0.375;
  var CRITICAL_POINT_TEMPERATURE_IN_MODEL = StatesOfMatterConstants.CRITICAL_POINT_MONATOMIC_MODEL_TEMPERATURE;
  var CRITICAL_POINT_TEMPERATURE_ON_DIAGRAM = 0.8;
  var SLOPE_IN_1ST_REGION = TRIPLE_POINT_TEMPERATURE_ON_DIAGRAM / TRIPLE_POINT_TEMPERATURE_IN_MODEL;
  var SLOPE_IN_2ND_REGION = ( CRITICAL_POINT_TEMPERATURE_ON_DIAGRAM - TRIPLE_POINT_TEMPERATURE_ON_DIAGRAM ) /
                            ( CRITICAL_POINT_TEMPERATURE_IN_MODEL - TRIPLE_POINT_TEMPERATURE_IN_MODEL );
  var OFFSET_IN_2ND_REGION = TRIPLE_POINT_TEMPERATURE_ON_DIAGRAM -
                             ( SLOPE_IN_2ND_REGION * TRIPLE_POINT_TEMPERATURE_IN_MODEL );

  // Used for calculating moving averages needed to mellow out the graph behavior.  Value empirically determined.
  var MAX_NUM_HISTORY_SAMPLES = 100;

  // constants used in the layout process
  var CONTROL_PANEL_X_INSET = 15;

  /**
   * @param {MultipleParticleModel} multipleParticleModel - model of the simulation
   * @param {boolean} isInteractionDiagramEnabled
   * @constructor
   */
  function PhaseChangesScreenView( multipleParticleModel, isInteractionDiagramEnabled ) {
    var self = this;

    ScreenView.call( this, StatesOfMatterConstants.SCREEN_VIEW_OPTIONS );
    this.multipleParticleModel = multipleParticleModel;
    this.modelTemperatureHistory = new ObservableArray( { allowDuplicates: true } );

    // Create the model-view transform. The multipliers for the 2nd parameter can be used to adjust where the point
    // (0, 0) in the model, which is the lower left corner of the particle container, appears in the view.The final
    // parameter is the scale, and can be changed to make the view more zoomed in or out.
    var modelViewTransform = ModelViewTransform2.createSinglePointScaleInvertedYMapping(
      new Vector2( 0, 0 ),
      new Vector2( this.layoutBounds.width * 0.325, this.layoutBounds.height * 0.75 ),
      StatesOfMatterConstants.VIEW_CONTAINER_WIDTH / MultipleParticleModel.PARTICLE_CONTAINER_WIDTH
    );

    // figure out where in the view the particles will be when the container is not exploded
    var nominalParticleAreaViewBounds = new Bounds2(
      modelViewTransform.modelToViewX( 0 ),
      modelViewTransform.modelToViewY( 0 ) + modelViewTransform.modelToViewDeltaY( multipleParticleModel.getInitialParticleContainerHeight() ),
      modelViewTransform.modelToViewX( 0 ) + modelViewTransform.modelToViewDeltaX( multipleParticleModel.getParticleContainerWidth() ),
      modelViewTransform.modelToViewY( 0 )
    );

    this.multipleParticleModel = multipleParticleModel;
    this.modelTemperatureHistory = new ObservableArray( { allowDuplicates: true } );

    // create the particle container - it takes care of positioning itself
    this.particleContainerNode = new ParticleContainerNode( multipleParticleModel, modelViewTransform, true, true );

    // add the particle container
    this.addChild( this.particleContainerNode );

    // add heater/cooler node
    var heaterCoolerNode = new HeaterCoolerNode( {
      scale: 0.8,
      centerX: nominalParticleAreaViewBounds.centerX,
      top: nominalParticleAreaViewBounds.maxY + 30 // offset from container bottom empirically determined
    } );
    this.addChild( heaterCoolerNode );

    // hook the heater/cooler node up to the model
    heaterCoolerNode.heatCoolAmountProperty.link( function( heat ) {
      multipleParticleModel.setHeatingCoolingAmount( heat );
    } );

    // add the thermometer node
    this.compositeThermometerNode = new CompositeThermometerNode( multipleParticleModel, modelViewTransform, {
      font: new PhetFont( 20 ),
      fill: 'white'
    } );
    this.addChild( this.compositeThermometerNode );

    // add reset all button
    var resetAllButton = new ResetAllButton( {
      listener: function() {
        self.modelTemperatureHistory.clear();
        self.compositeThermometerNode.reset();
        multipleParticleModel.reset();
        // Reset phase diagram state in SOM basic version.
        multipleParticleModel.phaseDiagramExpandedProperty.value = isInteractionDiagramEnabled;
      },
      radius: StatesOfMatterConstants.RESET_ALL_BUTTON_RADIUS,
      touchAreaDilation: StatesOfMatterConstants.RESET_ALL_BUTTON_TOUCH_AREA_DILATION,
      right: this.layoutBounds.maxX - StatesOfMatterConstants.RESET_ALL_BUTTON_DISTANCE_FROM_SIDE,
      bottom: this.layoutBounds.maxY - StatesOfMatterConstants.RESET_ALL_BUTTON_DISTANCE_FROM_BOTTOM
    } );
    this.addChild( resetAllButton );

    // add play pause button and step button
    this.addChild( new SOMPlayPauseStepControl(
      multipleParticleModel.isPlayingProperty,
      multipleParticleModel.stepInternal.bind( multipleParticleModel ),
      { right: heaterCoolerNode.left - 50, centerY: heaterCoolerNode.centerY }
    ) );

    // add bicycle pump node
    this.pumpNode = new BicyclePumpNode( 200, 250, multipleParticleModel, {
      right: nominalParticleAreaViewBounds.left,
      bottom: nominalParticleAreaViewBounds.bottom + 100 // empirically determined to line up with injection point
    } );
    this.addChild( this.pumpNode );

    // add return lid button
    this.returnLidButton = new TextPushButton( returnLidString, {
      font: new PhetFont( 14 ),
      baseColor: 'yellow',
      maxWidth: 100,
      listener: function() {
        multipleParticleModel.returnLid();
      },
      visible: false,
      xMargin: 10,
      centerX: nominalParticleAreaViewBounds.minX - 150,
      centerY: nominalParticleAreaViewBounds.minY
    } );
    this.addChild( this.returnLidButton );
    multipleParticleModel.isExplodedProperty.linkAttribute( this.returnLidButton, 'visible' );

    // add interaction potential diagram
    if ( isInteractionDiagramEnabled ) {
      var epsilonControlInteractionPotentialDiagram = new EpsilonControlInteractionPotentialDiagram(
        StatesOfMatterConstants.MAX_SIGMA,
        StatesOfMatterConstants.MIN_EPSILON,
        false,
        multipleParticleModel,
        {
          maxWidth: PANEL_WIDTH,
          minWidth: PANEL_WIDTH,
          right: this.layoutBounds.right - CONTROL_PANEL_X_INSET
        }
      );
      this.addChild( epsilonControlInteractionPotentialDiagram );
    }

    // add the atom/molecule selection control panel
    var phaseChangesMoleculesControlPanel = new PhaseChangesMoleculesControlPanel(
      multipleParticleModel,
      isInteractionDiagramEnabled,
      {
        right: this.layoutBounds.right - CONTROL_PANEL_X_INSET,
        top: 5,
        maxWidth: PANEL_WIDTH,
        minWidth: PANEL_WIDTH
      }
    );
    this.addChild( phaseChangesMoleculesControlPanel );

    // add phase diagram - in SOM basic version by default phase diagram should be closed.
    multipleParticleModel.phaseDiagramExpandedProperty.value = isInteractionDiagramEnabled;
    this.phaseDiagram = new PhaseDiagram( multipleParticleModel.phaseDiagramExpandedProperty, {
      minWidth: PANEL_WIDTH,
      maxWidth: PANEL_WIDTH,
      right: phaseChangesMoleculesControlPanel.right,
      top: phaseChangesMoleculesControlPanel.top + INTER_PANEL_SPACING
    } );
    this.addChild( this.phaseDiagram );

    multipleParticleModel.isExplodedProperty.link( function( isExploded ) {
      self.modelTemperatureHistory.clear();
      if ( !isExploded ) {
        self.compositeThermometerNode.setRotation( 0 );
        self.compositeThermometerNode.centerX = nominalParticleAreaViewBounds.minX + nominalParticleAreaViewBounds.width * 0.35;
        self.compositeThermometerNode.centerY = modelViewTransform.modelToViewY(
          multipleParticleModel.particleContainerHeightProperty.get()
        );
      }
      self.updatePhaseDiagram();
    } );

    // Hook up a function that updates several view attributes when the substance changes.
    multipleParticleModel.substanceProperty.link( function( substance ) {
      self.modelTemperatureHistory.clear();
      self.updatePhaseDiagram();
      self.phaseDiagram.setDepictingWater( substance === StatesOfMatterConstants.WATER );
      if ( isInteractionDiagramEnabled ) {
        if ( substance === SubstanceType.ADJUSTABLE_ATOM ||
             substance === SubstanceType.DIATOMIC_OXYGEN ||
             substance === SubstanceType.WATER ) {
          epsilonControlInteractionPotentialDiagram.setMolecular( true );
        }
        else {
          epsilonControlInteractionPotentialDiagram.setMolecular( false );
        }
      }

      // don't show the phase diagram for adjustable attraction, since we need the space for other things
      if ( substance === SubstanceType.ADJUSTABLE_ATOM ) {
        self.phaseDiagram.visible = false;
        if ( isInteractionDiagramEnabled ) {
          epsilonControlInteractionPotentialDiagram.top = phaseChangesMoleculesControlPanel.bottom + INTER_PANEL_SPACING;
        }
      }
      else {
        self.phaseDiagram.visible = true;
        if ( isInteractionDiagramEnabled ) {
          epsilonControlInteractionPotentialDiagram.top = phaseChangesMoleculesControlPanel.bottom + INTER_PANEL_SPACING;
          self.phaseDiagram.top = epsilonControlInteractionPotentialDiagram.bottom + INTER_PANEL_SPACING;
        }
        else {
          self.phaseDiagram.top = phaseChangesMoleculesControlPanel.bottom + INTER_PANEL_SPACING;
        }
      }
    } );

    // Happy Easter
    var egg = new MultiLineText( 'Goodbye boiling water -\nyou will be mist!', {
      fill: 'yellow',
      font: new PhetFont( 14 ),
      align: 'left',
      left: this.returnLidButton.left,
      top: this.returnLidButton.bottom + 20
    } );
    this.addChild( egg );

    var eggShown = false;
    multipleParticleModel.isPlayingProperty.link( function( isPlaying ) {
      egg.visible = !isPlaying && multipleParticleModel.isExplodedProperty.get() &&
                    multipleParticleModel.substanceProperty.get() === SubstanceType.WATER && !eggShown;
      if ( egg.visible ) {
        eggShown = true;
      }
    } );

    // Monitor the model for changes of the container size and adjust the view accordingly.
    multipleParticleModel.particleContainerHeightProperty.link( function( containerHeight, previousContainerHeight ) {

      // move the thermometer with the lid
      self.compositeThermometerNode.centerX = nominalParticleAreaViewBounds.minX + nominalParticleAreaViewBounds.width * 0.35;
      self.compositeThermometerNode.centerY = modelViewTransform.modelToViewY( containerHeight );

      // if the container has exploded, rotate the thermometer as it moves up
      if ( multipleParticleModel.isExplodedProperty.get() ) {
        var containerHeightChange = previousContainerHeight - containerHeight;
        self.compositeThermometerNode.rotateAround(
          self.compositeThermometerNode.center,
          containerHeightChange * 0.0001 * Math.PI );
      }

      // other updates
      self.updatePhaseDiagram();
    } );

    multipleParticleModel.temperatureSetPointProperty.link( function() {
      self.modelTemperatureHistory.clear();
      self.updatePhaseDiagram();
    } );

    multipleParticleModel.particles.lengthProperty.link( function() {
      self.updatePhaseDiagram();
    } );
  }

  statesOfMatter.register( 'PhaseChangesScreenView', PhaseChangesScreenView );

  return inherit( ScreenView, PhaseChangesScreenView, {

    // @public
    step: function( dt ) {
      this.particleContainerNode.step( dt );
      this.pumpNode.step( dt );
    },

    /**
     * Update the position of the marker on the phase diagram based on the temperature and pressure values within the
     * model.
     * @private
     */
    updatePhaseDiagram: function() {

      // If the container has exploded, don't bother showing the dot.
      if ( this.multipleParticleModel.isExplodedProperty.get() || this.multipleParticleModel.particles.length === 0 ) {
        this.phaseDiagram.setStateMarkerVisible( false );
      }
      else {
        this.phaseDiagram.setStateMarkerVisible( true );
        var movingAverageTemperature = this.updateMovingAverageTemperature(
          this.multipleParticleModel.temperatureSetPointProperty.get()
        );
        var modelPressure = this.multipleParticleModel.getModelPressure();
        var mappedTemperature = this.mapModelTemperatureToPhaseDiagramTemperature( movingAverageTemperature );
        var mappedPressure = this.mapModelTempAndPressureToPhaseDiagramPressure( modelPressure, movingAverageTemperature );
        this.phaseDiagram.setStateMarkerPos( mappedTemperature, mappedPressure );
      }
    },

    /**
     * Update and returns the moving average taking into account the new temperature value.
     * @param {number} newTemperatureValue
     * @returns {number}
     * @private
     */
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

    /**
     * Map the model temperature to phase diagram temperature based on the phase chart shape.
     * @param {number} modelTemperature
     * @returns {number}
     * @private
     */
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

    /**
     * Map the model temperature and pressure to a normalized pressure value suitable for use in setting the marker
     * position on the phase chart.
     * @param {number} modelPressure
     * @param {number} modelTemperature
     * @returns {number}
     * @private
     */
    mapModelTempAndPressureToPhaseDiagramPressure: function( modelPressure, modelTemperature ) {

      // This method is a total tweak fest.  All values and equations are made to map to the phase diagram, and are NOT
      // based on any real-world equations that define phases of matter.
      var cutOverTemperature = TRIPLE_POINT_TEMPERATURE_ON_DIAGRAM - 0.025;
      var mappedTemperature = this.mapModelTemperatureToPhaseDiagramTemperature( modelTemperature );
      var mappedPressure;
      if ( mappedTemperature <= cutOverTemperature ) {
        mappedPressure = Math.pow( mappedTemperature, 1.6 );
      }
      else {
        mappedPressure = Math.pow( mappedTemperature - cutOverTemperature, 1.75 ) + 0.192;
      }
      return Math.min( mappedPressure, 1 );
    }
  } );
} );