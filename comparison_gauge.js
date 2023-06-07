/**
 * Welcome to the Looker Custom Visualization Builder! Please refer to the following resources 
 * to help you write your visualization:
 *  - API Documentation - https://github.com/looker/custom_visualizations_v2/blob/master/docs/api_reference.md
 *  - Example Visualizations - https://github.com/looker/custom_visualizations_v2/tree/master/src/examples
 *  - How to use the CVB - https://developers.looker.com/marketplace/tutorials/about-custom-viz-builder
 **/

const handleErrors = (vis, res, options) => {

  const check = (group, noun, count, min, max) => {
    if (!vis.addError || !vis.clearErrors) return false
    if (count < min) {
      vis.addError({
        title: `Not Enough ${noun}s`,
        message: `This visualization requires ${min === max ? 'exactly' : 'at least'} ${min} ${noun.toLowerCase()}${ min === 1 ? '' : 's' }.`,
        group
      })
      return false
    }
    if (count > max) {
      vis.addError({
        title: `Too Many ${noun}s`,
        message: `This visualization requires ${min === max ? 'exactly' : 'no more than'} ${max} ${noun.toLowerCase()}${ min === 1 ? '' : 's' }.`,
        group
      })
      return false
    }
    vis.clearErrors(group)
    return true
  }

  const { pivots, dimensions, measure_like: measures } = res.fields

  return (check('pivot-req', 'Pivot', pivots.length, options.min_pivots, options.max_pivots)
   && check('dim-req', 'Dimension', dimensions.length, options.min_dimensions, options.max_dimensions)
   && check('mes-req', 'Measure', measures.length, options.min_measures, options.max_measures))
}

const visObject = {
  /**
   * Configuration options for your visualization. In Looker, these show up in the vis editor
   * panel but here, you can just manually set your default values in the code.
   **/
   options: {
     first_node_color: {
       label: 'First Node Color',
       default: '#36c1b3',
       type: 'string',
       display: 'color'
     },
     second_node_color: {
       label: 'Second Node Color',
       default: '#702963',
       type: 'string',
       display: 'color'
     }
   },
  
  /**
   * The create function gets called when the visualization is mounted but before any
   * data is passed to it.
   **/
     create: function(element, config){
       this.svg = d3.select(element).append('svg');
     },
 
  /**
   * UpdateAsync is the function that gets called (potentially) multiple times. It receives
   * the data and should update the visualization with the new data.
   **/
    updateAsync: function(data, element, config, queryResponse, details, doneRendering){
      if (!handleErrors(this, queryResponse, {
         min_pivots: 0, max_pivots: 0,
         min_dimensions: 1, max_dimensions: undefined,
         min_measures: 0, max_measures: undefined
      })) return

      const cellData = [{
          field_name: "First Rating",
          value: 8.6,
          row: 1
        }, {
          field_name: "Last Rating",
          value: 9.0,
          row: 2
        }]
   
      let i = 0
      const nodeColors = {
        1: (config && config.first_node_color) || this.options.first_node_color.default,
        2: (config && config.second_node_color) || this.options.second_node_color.default
      }

      // CONFIGS
      const bodyRadius = 120;
      const gaugeWidthPercent = .4;
      const gaugeSweep = 180; // degrees
      const hasBody = false;
      const bodyStrokeWidth = 14;
      const scaleStart = 0;
      const scaleEnd = 10;
      const scaleIncrement = 1;
      const fieldNamePosition = "above";
      const hasComparison = true;
      const labelAdjustDy = 60;
      const comparisonText = "Rating Change";
      const comparisonSignificance = 1;
      const valueTextSize = 40;
      const scaleTextSize = 18;
      const labelTextSize = 28;
      const compareTextSize = 20;
      const nodeGap = 100;

      const pathTriangle =  `
        m 0, -0.5
        l 0.5, 1
        l -1, 0
        z
      `
      const pathNoChange = `
        m 0, -0.5
        l 0.5, 1
        l -1, 0
        z
        m 0, 0.25
        l -0.3, 0.6
        l 0.6, 0
        z
        m -0.62, 0.85
        l 1, -1
        l 0.08, 0.08
        l -1, 1
        z
      `
      // SVG
      const margin = { y: 10, x: 10};
      // Gauge Body
      const bodyStrokeColor = 'hsl(250, 20%, 96%)';
      const bodyFillColor = 'hsl(250, 20%, 99%)';
      // Pips
      const gaugeColor = d3.interpolateRgbBasis(["red", "purple", "blue"]);
      const emptyPipColor = hasBody ? 'hsl(250, 20%, 90%)' : 'hsl(250, 20%, 97%)';
      const gaugeWidth = bodyRadius * gaugeWidthPercent;
      const gaugeRadius = bodyRadius - (gaugeWidth/2) - (bodyStrokeWidth/2) + .5;
      const pipCount = (scaleEnd - scaleStart) / scaleIncrement;
      const pipBorderArcLength = 2;
      // Gauge Markers
      const markerStartRadius = gaugeRadius - gaugeWidth/2;
      const markerLength = (hasBody ? bodyStrokeWidth : 0) + gaugeWidth;
      const markerEndRadius = gaugeWidth*.25
      const markerWidth = pipBorderArcLength * (bodyRadius/50)
      const markerPath = 
         `m ${markerStartRadius}, ${markerWidth/4}
         l ${markerLength}, ${markerWidth/4}
         a ${markerEndRadius}, ${markerWidth/2}, 180, 1, 0, 0, -${markerWidth}
         l-${markerLength}, ${markerWidth/4}
         z`

      const svg = this.svg
        .html('')
        .attr('x', 0)
        .attr('y', 0)

      const vizNode = svg.append('g');
      const gNode = vizNode.append("g");
      const defs = svg.append("defs");
   
 
      // ****************** nodes section ***************************
       
      const height = bodyRadius * 2;
      const width = (nodeGap/2 + bodyRadius) * 4;
      const columnSize = width / 4;
      const gaugeSweepGap = 360 - gaugeSweep;
      const gaugeSweepOffset = -90 - (gaugeSweepGap/2)
      const pipArcLength = (gaugeSweep / pipCount) - pipBorderArcLength;

      // offset used for stroke offset of empty pips
      const pipDashoffset = `${pipArcLength}, ${pipBorderArcLength}, `.repeat(pipCount) + `0, ${gaugeSweepGap}`;
       
        // Set gauge length per node, accounts for pip gaps
      cellData.forEach((d, i, cellData) => {
        let value = d.value - scaleStart;
        value = value < 0 ? 0 : value;
        const pipIndex = Math.floor(value/scaleIncrement);
        d.gaugeArcLength = (pipArcLength * value/scaleIncrement) + (pipIndex * pipBorderArcLength);
        d.x = d.row === 1 ? columnSize : columnSize * 3
      })
     
      const node = gNode.selectAll("g")
        .data(cellData);
     
       // Enter any new nodes at the parent's previous position.
      const nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x}, ${height / 2})`);
     
        // Blocking space around gauges for BBox sizing -> viewBox at end
      const rectSide = bodyRadius + bodyStrokeWidth;
      nodeEnter.append('rect')
        .attr('x', -rectSide)
        .attr('y', -rectSide)
        .attr('width', rectSide*2)
        .attr('height', rectSide)
        .style('fill-opacity', 0)
     
      // Gauge Body
      if (hasBody) {
        nodeEnter.append('circle')
          .attr('r', d => markerStartRadius + bodyStrokeWidth/2)
          .style('fill', d => bodyFillColor)
      }

              
       // Empty Pips
       nodeEnter.append('circle')
         .attr('r', gaugeRadius)
         .style('fill-opacity', 0)
         .style('stroke', d => emptyPipColor)
         .attr('stroke-width', gaugeWidth)
         .attr('pathLength', 360)
         .attr('stroke-dashoffset', gaugeSweepOffset - (pipBorderArcLength/2))
         .attr('stroke-dasharray', pipDashoffset)
 
       // Gauge Mask
       const gaugeMask = nodeEnter.append('mask')
         .attr('id', d => `gaugeMask${d.row}`)
         .attr('height', bodyRadius*2)
         .attr('width', bodyRadius*2)
         .attr('x', -bodyRadius)
         .attr('y', -bodyRadius)
         .attr('maskUnits', 'userSpaceOnUse')
       gaugeMask.append('circle')
         .attr('r', gaugeRadius)
         .attr('fill', 'black')
         .attr('stroke-width', gaugeWidth)
         .attr('stroke', 'black')
       gaugeMask.append('circle')
         .attr('r', d => gaugeRadius)
         .style('stroke', `white`)
         .attr('stroke-width', gaugeWidth + 1)
         .attr('pathLength', 360)
         .attr('stroke-dashoffset', d => gaugeSweepOffset - (pipBorderArcLength/2))
         .attr('stroke-dasharray', d => `${d.gaugeArcLength}, ${360 - d.gaugeArcLength}`)
       
       // Gauge (colored pips + mask)
       const colorPip = nodeEnter.append('g')
         .attr('mask',d => `url(#gaugeMask${d.row})`)
       
       for(let i = 0; i < pipCount; i++) {
         pipOffset = (pipBorderArcLength + pipArcLength) * i;
         colorPip.append('circle')
         .attr('r', gaugeRadius)
         .style('fill-opacity', 0)
         // .style('stroke', d => `${gaugeColor(d.value/pipCount)}`)
         .style('stroke', d => `${gaugeColor((i/pipCount) + .05)}`)
         .style('stroke-opacity', 1)
         .attr('stroke-width', gaugeWidth)
         .attr('pathLength', 360)
         .attr('stroke-dashoffset', gaugeSweepOffset - (pipBorderArcLength/2) - pipOffset)
         .attr('stroke-dasharray', `${pipArcLength}, ${360 - pipArcLength}`)
       }
       
        // Gauge Body Stroke
       const gaugeEndAngle = Math.PI * (90 - gaugeSweep/2) / 180;
       if (hasBody) {
         nodeEnter.append('circle')
           .attr('r', d => bodyRadius)
           .attr('fill-opacity', 0)
           .style('stroke', d => bodyStrokeColor)
           .attr('stroke-width', bodyStrokeWidth)
           .attr('pathLength', 360)
           .attr('stroke-dashoffset', d => gaugeSweepOffset)
           .attr('stroke-dasharray', d => `${gaugeSweep}, ${gaugeSweepGap}`)
           .attr('stroke-linecap', 'round')

         nodeEnter.append('circle')
           .attr('r', d => markerStartRadius + bodyStrokeWidth/2)
           .attr('fill-opacity', 0)
           .style('stroke', d => bodyStrokeColor)
           .attr('stroke-width', bodyStrokeWidth)
           .attr('pathLength', 360)
           .attr('stroke-dashoffset', d => gaugeSweepOffset + gaugeSweepGap)
           .attr('stroke-dasharray', d => `${gaugeSweepGap}, ${gaugeSweep}`)

         nodeEnter.append('rect')
           .attr('x', markerStartRadius + bodyStrokeWidth/2)
           .attr('y', -markerWidth/4 - bodyStrokeWidth)
           .attr('width', bodyRadius - markerStartRadius)
           .attr('height', bodyStrokeWidth)
           .attr('fill', bodyStrokeColor)
           .attr('transform', `rotate(${-gaugeSweepOffset + (pipBorderArcLength/2)})`)

         nodeEnter.append('rect')
           .attr('x', markerStartRadius + bodyStrokeWidth/2)
           .attr('y', markerWidth/4)
           .attr('width', bodyRadius - markerStartRadius)
           .attr('height', bodyStrokeWidth)
           .attr('fill', bodyStrokeColor)
         .attr('transform', `rotate(${-gaugeSweepOffset - gaugeSweepGap - (pipBorderArcLength/2)})`)
       }
       
       // Gauge Markers       
       const gaugeMarker = nodeEnter.append('g')
         .attr('fill', 'black')
       gaugeMarker.append('path') // Left Marker
         .attr('d', markerPath)
         .attr('transform', `rotate(${-gaugeSweepOffset + (pipBorderArcLength/2)})`)
       gaugeMarker.append('path') // Right Marker
         .attr('d', markerPath)
         .attr('transform', `rotate(${-gaugeSweepOffset - gaugeSweepGap - (pipBorderArcLength/2)})`)

       // Marker Labels
       const markerOuterRadius = markerStartRadius + markerLength + markerEndRadius;
       const markerTextOffsetY = Math.sin(gaugeEndAngle + (Math.PI/45)) * markerOuterRadius*1.05 ;
       const markerTextOffsetX = Math.cos(gaugeEndAngle + (Math.PI/45)) * markerOuterRadius*1.05 ;

       const markerLabel = nodeEnter.append('g')
         .style('font-family', "'Open Sans', Helvetica, sans-serif")
         .style('font-size', scaleTextSize + 'px')
         .attr('dominant-baseline', "central")
       markerLabel // Left Marker
         .append('text')
         .attr('text-anchor', "end")
         .text((d) => `${scaleStart}`)
         .attr('dx', -markerTextOffsetX)
         .attr('dy', -markerTextOffsetY)
       markerLabel // Right Marker
         .append('text')
         .attr('text-anchor', "start")
         .text((d) => `${scaleEnd}`)
         .attr('dx', markerTextOffsetX)
         .attr('dy', -markerTextOffsetY)

       // Value Labels
       nodeEnter
         .append('text')
         .style('font-family', "'Open Sans', Helvetica, sans-serif")
         .style('font-weight', "bold")
         .style('font-size', valueTextSize + 'px')
         .text((d) => `${d.value}`)
         .attr('dominant-baseline', "central")
         .attr('text-anchor', "middle")
         .attr('dy', (d, i, nodes) => {
           if (hasBody) return 0;
           const textNode = d3.select(nodes[i]).node();
           const textHeight = textNode.getBBox().height;
           const textAdjustmentY = -textHeight/3 - (Math.sin(gaugeEndAngle) * textHeight/3);
           return textAdjustmentY;
       })

       // Field Name Labels
       const markerEndY = -Math.sin(gaugeEndAngle) * markerOuterRadius;
       const bodyAboveY = hasBody ? bodyRadius + bodyStrokeWidth : 0;
       const bodyBelowY = hasBody ? markerStartRadius + bodyStrokeWidth : 0;
       const dyAbove = Math.min(markerEndY, -bodyAboveY, -gaugeRadius - gaugeWidth/2);
       const dyBelow = Math.max(markerEndY, bodyBelowY, 0);
       const textLabelConfig = {
         'above': dyAbove - labelAdjustDy,
         'below': dyBelow + labelAdjustDy,
       }
         
      nodeEnter
         .append('text')
         .style('font-family', "'Open Sans', Helvetica, sans-serif")
         .style('font-weight', "bold")
         .style('font-size', labelTextSize + 'px')
         .text((d) => `${d.field_name}`)
         .attr('dominant-baseline', "central")
         .attr('text-anchor', "middle")
         .attr('dy', textLabelConfig[fieldNamePosition])

      // Comparison
      const appendComparison = (node) => {
        const firstValue = new BigNumber(cellData[0].value);
        const secondValue = new BigNumber(cellData[1].value);
        const valueDifference = secondValue.minus(firstValue);
        const compareX = width/2 - compareTextSize/2;
        const compareNodeOffsetY = fieldNamePosition === 'above' ? textLabelConfig.below : textLabelConfig.above;
        const compareY = height/2 + compareNodeOffsetY;
  
        const comparison = node.append('g');
        const compareLabel = comparison.append('text')
           .attr('x', compareX)
           .attr('y', compareY)
           .style('font-family', "'Open Sans', Helvetica, sans-serif")
           .style('font-size', compareTextSize + 'px')
           .attr('dominant-baseline', "central")
           .attr('text-anchor', "middle")
        compareLabel.append('tspan')
           .style('font-weight', "bold")
           .text(`${valueDifference.toFixed(comparisonSignificance)}`)
        compareLabel.append('tspan')
           .text(` ${comparisonText}`)
       
        const compareTextBBox = compareLabel.node().getBBox();
        const compareDX = compareX + compareTextBBox.width/2 + compareTextSize*.75;
        const baseTransform = `translate(${compareDX}, ${compareY}) scale(${compareTextSize})`;
        const compareIcon = comparison.append('path')
          .attr('transform', baseTransform)
        if (valueDifference > 0) {
          compareIcon.attr('d', pathTriangle)
          .attr('fill', 'green')
        } else if (valueDifference.isEqualTo(0)) {
          compareIcon.attr('d', pathNoChange)
          .attr('fill', 'hsl(0, 0%, 35%)')
        } else {
          compareIcon.attr('d', pathTriangle)
          .attr('fill', 'red')
          .attr('transform', baseTransform + ' rotate(180)')
        }
      }
      
      if (hasComparison) appendComparison(vizNode);

       // Adjust ViewBox
       const vizNodeRect = vizNode.node().getBBox();
       const viewBox = {
         'x': vizNodeRect.x - margin.x,
         'y': vizNodeRect.y - margin.y,
         'width': vizNodeRect.width + margin.x*2,
         'height': vizNodeRect.height + margin.y*2
       };
       svg
         .attr('width', element.clientWidth)
         .attr('height', element.clientHeight)
         .attr('viewBox', `${viewBox.x}, ${viewBox.y}, ${viewBox.width}, ${viewBox.height}`)
         .attr('preserveAspectRatio', "xMidYMid meet")
       
     }
 };
 
 looker.plugins.visualizations.add(visObject);