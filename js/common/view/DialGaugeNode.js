// Copyright 2002-2014, University of Colorado
/**
 * This class represents a node that displays a dial gauge, which is a
 * circular instrument that can be used to portray measurements of temperature,
 * pressure, etc.
 *
 * @author John Blanco
 * @author Siddhartha Chinthapally (Actual Concepts)
 */
define( function( require ) {
  'use strict';


  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var Node = require( 'SCENERY/nodes/Node' );
  var Shape = require( 'KITE/Shape' );
  var Path = require( 'SCENERY/nodes/Path' );
  var LinearGradient = require( 'SCENERY/util/LinearGradient' );
  var GaugeNode = require( 'SCENERY_PHET/GaugeNode' );
  var Text = require( 'SCENERY/nodes/Text' );
  var PhetFont = require( 'SCENERY_PHET/PhetFont' );
  var Rectangle = require( 'SCENERY/nodes/Rectangle' );


  // Length of non-elbowed connector wrt overall diameter.
  var CONNECTOR_LENGTH_PROPORTION = 1;

  // Width of connector wrt overall diameter.
  var CONNECTOR_WIDTH_PROPORTION = 0.15;

  /**
   * @param {MultipleParticleModel} model
   * @constructor
   */
  function DialGaugeNode( model ) {

    var dialGaugeNode = this;
    Node.call( this );

    this.elbowEnabled = false;
    this.elbowHeight = 0;

    this.dialComponentsNode = new Node();
    this.dialComponentsNode.setTranslation( 0, 0 );
    var gaugeNode = new GaugeNode( model.pressureProperty, 'pressure',
      {min: 0, max: 200 }, {scale: 0.5} );


    // Add the textual readout display.
    this.textualReadoutBoxShape = new Rectangle( 0, 0, 80, 15, 2, 2, { fill: 'white', stroke: 'black'} );
    this.textualReadoutBoxShape.centerX = gaugeNode.centerX;
    this.textualReadoutBoxShape.top = gaugeNode.bottom - 15;
    this.textualReadout = new Text( "pressure  ", {font: new PhetFont( 12 ), fill: 'black'} );
    this.textualReadout.center = this.textualReadoutBoxShape.center;

    this.connector = new Path( null, { lineWidth: 8,
      stroke: new LinearGradient( 0, 0, 60, 60 )
        .addColorStop( 0, '#D8D7D8' )
        .addColorStop( 0.4, '#E1E2E3' )
        .addColorStop( 0.8, '#D5D7D8' )
        .addColorStop( 0.9, '#E2E3E4' )
    } );
    var roundedRectangle = new Rectangle( 0, 0, 30, 25, 2, 2, {fill: new LinearGradient( 0, 0, 0, 25 )
      .addColorStop( 0, '#5F6973' )
      .addColorStop( 0.6, '#F0F1F2' )
    } );

    roundedRectangle.centerY = gaugeNode.centerY;
    roundedRectangle.left = gaugeNode.right - 10;
    this.dialComponentsNode.addChild( this.connector );
    this.dialComponentsNode.addChild( roundedRectangle );
    this.dialComponentsNode.addChild( gaugeNode );
    this.dialComponentsNode.addChild( this.textualReadoutBoxShape );
    this.dialComponentsNode.addChild( this.textualReadout );
    this.connector.centerY = roundedRectangle.centerY;
    this.connector.x = roundedRectangle.centerX + roundedRectangle.width / 2;

    // Set the initial value.
    model.pressure = model.getPressureInAtmospheres();
    model.pressureProperty.link( function() {
      dialGaugeNode.textualReadout.setText( model.getPressureInAtmospheres().toFixed( 2 ) + "atm" );
    } );

    this.updateConnector();

    // Now add the dial as a child of the main node.
    this.addChild( this.dialComponentsNode );

  }

  return inherit( Node, DialGaugeNode, {

    /**
     * This turns on/off the "elbow" portion of the connector, which allows
     * the pressure gauge to connect to something above or below it.
     *
     * @param elbowEnabled
     */
    setElbowEnabled: function( elbowEnabled ) {
      this.elbowEnabled = elbowEnabled;
      this.updateConnector();
    },
    /**
     * Set the height of the elbow.  Height is specified with respect to the
     * vertical center of the node.
     */
    setElbowHeight: function( height ) {
      this.elbowHeight = height;
      this.updateConnector();
    },

    updateConnector: function() {
      var width = (CONNECTOR_WIDTH_PROPORTION * 30);
      var length = (CONNECTOR_LENGTH_PROPORTION * 60);
      this.connectorPath = new Shape();
      if ( !this.elbowEnabled ) {
        var connectorShape = new Shape.rect( 0, 0, length, width );
        this.connector.setShape( connectorShape );
        // this.connector.setTranslation( this.dialComponentsNode.width * 0.9, this.diameter / 2 - width / 2 );
      }
      else {
        this.connectorPath.moveTo( 0, 0 );
        if ( Math.abs( this.elbowHeight ) < width / 2 ) {
          // width.
          this.connectorPath.lineTo( length + width, 0 );
          this.connectorPath.lineTo( (length + width), width );
          this.connectorPath.lineTo( 0, width );
          this.connectorPath.close();
          this.connector.setShape( this.connectorPath );
        }
        else if ( this.elbowHeight < 0 ) {
          // Connector is pointing upwards.
          this.connectorPath.lineTo( length, 0 );
          this.connectorPath.lineTo( length, (this.elbowHeight + width / 2) );
          this.connectorPath.lineTo( (length + width), (this.elbowHeight + width / 2) );
          this.connectorPath.lineTo( (length + width), width / 2 );
          this.connectorPath.quadraticCurveTo( length + width, width, (length + (width / 2)), width );
          this.connectorPath.lineTo( 0, width );
          this.connectorPath.close();
          this.connector.setShape( this.connectorPath );
        }
        else {

          // Connector is pointing downwards.
          this.connectorPath.lineTo( (length + (width / 2)), 0 );
          this.connectorPath.quadraticCurveTo( length + width, 0, (length + width), width / 2 );
          this.connectorPath.lineTo( (length + width), (this.elbowHeight + width / 2) );
          this.connectorPath.lineTo( length, (this.elbowHeight + width / 2) );
          this.connectorPath.lineTo( length, width );
          this.connectorPath.lineTo( 0, width );
          this.connectorPath.close();
          this.connector.setShape( this.connectorPath );
        }
      }
    }
  } );
} );
