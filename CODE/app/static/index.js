const width = 1200;
const height = 600;
const daysInYear = 365;

/*
 * Color definitions
 */

const wildfireColor = "#ee3838"
const wildfireOpacity = 0.3;

const temperatureScaleDomain = [32, 95];
const temperatureQuantileScale = d3.scaleQuantile()
        .domain(temperatureScaleDomain)  // 0 to 35 degrees Celsius
        .range(['rgb(215,181,216)','rgb(223,101,176)','rgb(221,28,119)','rgb(152,0,67)']);  // from color brewer

const precpScaleDomain = [0, 100];
const precpQuantileScale = d3.scaleQuantile()
        .domain(precpScaleDomain)
        .range(['rgb(189,215,231)', 'rgb(107,174,214)', 'rgb(49,130,189)', 'rgb(8,81,156)'])

/*Yang updated the num of mlpredsScaleDomain, color .range*/
// const mlpredsScaleDomain = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
// const mlpredsOrdinalScale = d3.scaleOrdinal()
//   .domain(mlpredsScaleDomain)
//   .range(['#ffffe5','#fff7bc','#fee391','#fec44f','#fe9929','#ec7014','#cc4c02','#8c2d04']);

const mlpredsScaleDomain = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const mlpredsOrdinalScale = d3.scaleOrdinal()
        .domain(mlpredsScaleDomain)
        .range(['#00ff00','#00b9f2','#ffeb3d','#ffbfbf','#ff8000','#ff0000','#bf0040']);  

// Pretty much this line can be used as is.
let socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

// yang added dictionary
var ml_color = { 
  'A' : '#00ff00' , 
  'B' : '#00b9f2' , 
  'C' : '#ffeb3d' , 
  'D' : '#ffbfbf' , 
  'E' : '#ff8000' , 
  'F' : '#ff0000' , 
  'G' : '#bf0040' , 
};


/**
 * Data request payload is used with the socketIO emit. When the web browser requests data from
 * the backend, it should specify the time and dtime of the requested data. Then, the backend
 * will reply with all data contained within time-dtime and time+dtime.
 *
 * The values returned by this function are extracted from the HTML document. Therefore, these
 * variables somehow act like globally available variables.
 *
 * Notes:
 * 1. time is represented in UNIX epoch. It is the center point of the time interval.
 * 2. dtime is represented in seconds.
 *
 * @returns {{time: number, dtime: number}}
 */
function dataRequestPayload() {
  let timeSelector = document.getElementById('timeSelector');
  let year = +(timeSelector.value);
  let timestamp = new Date(year, 0, 1).getTime() / 1000;  // Divide by 100 to convert ms to s

  const secondsInYear = 31536000;
  let step = +($(timeSelector).attr('step'));
  let dtime = secondsInYear * step / 2;

  return {'time': timestamp + dtime,
    'dtime': dtime};
}

/**
 * Function handler when a slider input event occurs.
 * @param e
 */
function sliderInput(e) {
  let timeInput = document.getElementById('timeSelector');
  let timeDisplay = document.getElementById('timeSelected');
  let value = +(timeInput.value);

  let year = Math.floor(value);
  let dayInYear = Math.round(daysInYear * (value - year));

  // https://stackoverflow.com/questions/4048688/how-can-i-convert-day-of-year-to-date-in-javascript
  let dateDay0 = new Date(year, 0);
  let date = new Date(dateDay0.setDate(dayInYear));

  timeDisplay.innerHTML = `Date selected: ${date.toDateString()}`;
}

/**
 * Function handler when a slider change event occurs.
 * @param e
 */
function sliderChange(e) {
  socket.emit('data request', dataRequestPayload());
}

/**
 * Define a list of fire size in acres, radius in pixels pairs.
 * For example,
 *
 *   `wildFireRadii = [[0, 1], [0.25, 3], [10, 5], [100, 7], [300, 9], [1000, 11]]`
 *
 * This means:
 *   if 0 <= fire_size < 0.25, radius is 1 pixel
 *   if 0.25 <= fire_size < 10, radius is 3 pixels
 *   ...
 *   if 1000 <= fire_size, radius is 11 pixels
 */
const wildFireRadii = [[0, 1], [0.25, 3], [10, 5], [100, 7], [300, 9], [1000, 11]]

/**
 * Draw wildfire visualization. It follows D3's enter-update-exit pattern.
 * This function should be called every time there is new wildfire data.
 *
 * @param group The svg group to visualize the wildfire data
 * @param wildfire The wildfire data must have the following structure
 *  `[..., {'LATITUDE': lat, 'LONGITUDE': lon, 'FIRE_SIZE': fsize},...]`
 * @param projection projection type, such as d3.geoMercator()
 */
function drawWildfires(group, wildfire, projection){
  let update = group.selectAll('.wildfire').data(wildfire);

  update.enter()
    .append("circle")
    .attr('class', 'wildfire')
    .merge(update)
    .attr("cx", d => projection([d.LONGITUDE, d.LATITUDE])[0])
    .attr("cy", d => projection([d.LONGITUDE, d.LATITUDE])[1])
    .attr("r", d => {
      for (let i = wildFireRadii.length - 1; i >= 0; i--) {
        let [area, r] = wildFireRadii[i];
        if (d.FIRE_SIZE >= area) return r;
      }
    })
    .style("fill", wildfireColor)
    .attr("stroke", "none")
    .attr("fill-opacity", wildfireOpacity)
    .raise();  // Bring to front

  update.exit().remove();
}


/**
 * Function to get fuel radius
 * @param d
 * @returns {number}
 */
const fuelRadius = d => Math.exp(-d.percent/100) * 10;

/**
 * Draw fuel visualization. It follows D3's enter-update-exit pattern.
 * This function should be called every time there is new fuel data.
 *
 * @param group The svg group to visualize the fuel data
 * @param fuel `[..., {'latitude': lat, 'longitude': lon, 'fuel': fuel, 'percent': pcent},...]`
 * @param projection projection projection type, such as d3.geoMercator()
 */
function drawFuel(group, fuel, projection) {
  let update = group.selectAll('.fuel').data(fuel);

  update.enter()
    .append("circle")
    .attr('class', 'fuel')
    .merge(update)
    .attr("cx", d => projection([d.longitude, d.latitude])[0])
    .attr("cy", d => projection([d.longitude, d.latitude])[1])
    .attr("r", d => Math.exp(-d.percent/100) * 10)  // Could come up with a better function than 10*exp(-percent/100)
    .style("fill", "#55710a")
    .attr("stroke", "none")
    .attr("fill-opacity", .2)
    .raise(); // Bring to front

  update.exit().remove();
}

const pixelsPerWindSpeed = 1;  // Tunable parameter to scale wind speed to pixels

function drawWind(group, wind, projection) {
  const x1 = d => projection([d.longitude, d.latitude])[0] - pixelsPerWindSpeed * d.wind_u;
  const x2 = d => projection([d.longitude, d.latitude])[0] + pixelsPerWindSpeed * d.wind_u;
  const y1 = d => projection([d.longitude, d.latitude])[1] + pixelsPerWindSpeed * d.wind_v;
  const y2 = d => projection([d.longitude, d.latitude])[1] - pixelsPerWindSpeed * d.wind_v;

  let update = group.selectAll('.wind').data(wind);

  update.enter()
    .append('line')
    .attr('class', 'wind')
    .merge(update)
    .attr("x1", x1)
    .attr("y1", y1)
    .attr("x2", x2)
    .attr("y2", y2)
    .attr("stroke-width", 1)
    .attr("stroke", "black")
    .attr("marker-end", "url(#triangle)")
    .raise();

  update.exit().remove();
}


function drawLegend(group, dataSelected) {
  /*****************************************************************************
   * Draw wildfire legend
   *****************************************************************************/

  // Put text "Wildfire area legend" if it does not exist yet
  if (!document.getElementById('wildfire-legend-text')) {
    group.append('text')
      .text('Wildfire area legend')
      .attr('dy', '0.32em')
      .attr('y', 20)
      .attr('id', 'wildfire-legend-text');
  }

  let wildfireGroupUpdate = group.selectAll('.wildfire-legend-group')
    .data(wildFireRadii);

  let wildfireGroupEnter = wildfireGroupUpdate.enter()
    .append('g')
    .attr('class', 'wildfire-legend-group');

  let spaceBetweenCircles = Math.max(wildFireRadii[wildFireRadii.length-1][1] * 1.5, 15)

  wildfireGroupEnter.merge(wildfireGroupUpdate)
    .attr('transform', (d, i) => {
      return `translate(${spaceBetweenCircles}, ${spaceBetweenCircles * (i + 1) + 20})`
    });

  wildfireGroupEnter
    .append('circle')
    .merge(wildfireGroupUpdate.select('circle'))
    .attr('r', d => d[1])
    .attr('fill', wildfireColor)
    .attr('fill-opacity', wildfireOpacity);

  wildfireGroupEnter.append('text')
    .merge(wildfireGroupUpdate.select('text'))
    .text((d, i) => {
      if (i < wildFireRadii.length-1) {
        return `[${wildFireRadii[i][0]}, ${wildFireRadii[i+1][0]}) acres`;
      } else {
        return `>= ${wildFireRadii[i][0]} acres`;
      }
    }).attr('dy', `0.32em`)
    .attr('x', wildFireRadii[wildFireRadii.length-1][1] + 5);

  /**
   * Amount of vertical translation for "the other" legend e.g. fuel, temperature, ML prediction, etc.
   * @type {number}
   */
  const yTranslation = spaceBetweenCircles * (wildFireRadii.length + 3) + 20;

  /*****************************************************************************
   * Draw fuel legend
   *****************************************************************************/

  let fuelRadii = [];
  if (dataSelected === "fuel") {
    fuelRadii = [0, 20, 40, 60, 80, 100].map(d => [d, fuelRadius({percent: d})]);

    // Put text "Fuel moisture legend" if it does not exist yet
    if (!document.getElementById('fuel-legend-text')) {
      group.append('text')
        .attr('y', yTranslation)
        .attr('id', 'fuel-legend-text')
        .text('Fuel moisture legend');
    }
  } else {
    d3.select('#fuel-legend-text').remove();
  }

  let fuelGroupUpdate = group.selectAll('.fuel-legend-group')
    .data(fuelRadii);

  let fuelGroupEnter = fuelGroupUpdate.enter()
    .append('g')
    .attr('class', 'fuel-legend-group');

  let spaceBetweenFuelCircles = 15;
  if (fuelRadii.length > 0)
    spaceBetweenFuelCircles = Math.max(fuelRadii[fuelRadii.length-1][1] * 1.5, 15);

  fuelGroupEnter.merge(fuelGroupUpdate)
    .attr('transform', (d, i) => `translate(${spaceBetweenCircles}, ${yTranslation + spaceBetweenFuelCircles * (i + 1)})`);

  fuelGroupEnter
    .append('circle')
    .merge(fuelGroupUpdate.select('circle'))
    .attr('r', d => d[1])
    .attr('fill', 'green')
    .attr('fill-opacity', 0.3);

  fuelGroupUpdate.exit().remove();

  fuelGroupEnter.append('text')
    .merge(fuelGroupUpdate.select('text'))
    .text((d, i) => `${d[0]}% fuel moisture`)
    .attr('dy', '0.32em')
    .attr('x', spaceBetweenCircles + 5);

  /*****************************************************************************
   * Temperature legend
   *****************************************************************************/
  let temperatureLegend = d3.legendColor()
    .labelFormat(d3.format(".2f"))
    .scale(temperatureQuantileScale);

  let temperatureLegendData = [];
  if (dataSelected === "temperature") {
    temperatureLegendData = [1];  // Dummy data

    // put text "Temperature legend" if it does not exist yet
    if (!document.getElementById('temperature-legend-text')) {
      group.append('text')
        .attr('y', yTranslation)
        .attr('id', 'temperature-legend-text')
        .text('Temperature legend');
    }
  } else {
    d3.select('#temperature-legend-text').remove();
  }

  let temperatureLegendUpdate = group.selectAll('.temperature-legend-group')
    .data(temperatureLegendData);

  let temperatureLegendEnter = temperatureLegendUpdate.enter()
    .append('g')
    .attr('class', 'temperature-legend-group')
    .attr('transform', `translate(0, ${yTranslation + 20})`);

  temperatureLegendEnter
    .merge(temperatureLegendUpdate)
    .call(temperatureLegend);

  temperatureLegendUpdate.exit().remove();

  /*****************************************************************************
   * Precipitation legend
   *****************************************************************************/
  let precipitationLegend = d3.legendColor()
    .labelFormat(d3.format(".2f"))
    .scale(precpQuantileScale);

  let precipitationLegendData = [];
  if (dataSelected === "precipitation") {
    precipitationLegendData = [1];  // Dummy data

    // Put text "Precipitation legend" if it does not exist yet
    if (!document.getElementById('precipitation-legend-text')) {
      group.append('text')
        .attr('y', yTranslation)
        .attr('id', 'precipitation-legend-text')
        .text('Precipitation legend');
    }
  } else {
    d3.select('#precipitation-legend-text').remove();
  }

  let precipitationLegendUpdate = group.selectAll('.precipitation-legend-group')
    .data(precipitationLegendData);

  let precipitationLegendEnter = precipitationLegendUpdate.enter()
    .append('g')
    .attr('class', 'precipitation-legend-group')
    .attr('transform', `translate(0, ${yTranslation + 20})`);

  precipitationLegendEnter
    .merge(precipitationLegendUpdate)
    .call(precipitationLegend);

  precipitationLegendUpdate.exit().remove();

  /*****************************************************************************
   * Wind legend
   *****************************************************************************/

  let windLegendData = [];

  if (dataSelected === "wind") {
    windLegendData = [10, 50, 100, 150];

    // Put text "Wind legend" if it does not exist yet
    if (!document.getElementById('wind-legend-text')) {
      group.append('text')
        .attr('y', yTranslation)
        .attr('id', 'wind-legend-text')
        .text('Wind legend');
    }
  } else {
    d3.select('#wind-legend-text').remove();
  }

  let windGroupUpdate = group.selectAll('.wind-legend-group')
    .data(windLegendData);

  let windGroupEnter = windGroupUpdate.enter()
    .append('g')
    .attr('class', 'wind-legend-group');

  let spaceBetweenArrows = 15;

  windGroupEnter.merge(windGroupUpdate)
    .attr('transform', (d, i) => `translate(0, ${yTranslation + spaceBetweenArrows * (i + 1)})`);

  windGroupEnter
    .append('line')
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", d => d * pixelsPerWindSpeed)
    .attr("y2", 0)
    .attr("stroke-width", 1)
    .attr("stroke", "black")
    .attr("marker-end", "url(#triangle)")

  windGroupUpdate.exit().remove();

  windGroupEnter.append('text')
    .merge(fuelGroupUpdate.select('text'))
    .text((d, i) => `${d * pixelsPerWindSpeed} m/s`)
    .attr('dy', '0.32em')
    .attr('x', d => d * pixelsPerWindSpeed + 10);

  /*****************************************************************************
   * ML prediction legend
   *****************************************************************************/

  let domainWithDescription = ['A: [0, 0.25] acres', 'B: [0.26, 10) acres',
      'C: [10, 100) acres', 'D: [100, 300) acres', 'E: [300, 1000) acres',
      'F: [1000, 5000) acres', 'G: >= 5000 acres'];

  let mlpredsLegend = d3.legendColor()
    .scale(mlpredsOrdinalScale.domain(domainWithDescription));

  let mlpredsLegendData = [];
  if (dataSelected === "mlpredictions") {
    mlpredsLegendData = [1];  // Dummy data

    // Put text "ML prediction legend" if it does not exist yet
    if (!document.getElementById('mlpreds-legend-text')) {
      group.append('text')
        .attr('y', yTranslation)
        .attr('id', 'mlpreds-legend-text')
        .text('ML prediction legend');
    }
  } else {
    d3.select('#mlpreds-legend-text').remove();
  }

  let mlpredsLegendUpdate = group.selectAll('.mlpreds-legend-group')
    .data(mlpredsLegendData);

  let mlpredsLegendEnter = mlpredsLegendUpdate.enter()
    .append('g')
    .attr('class', 'mlpreds-legend-group')
    .attr('transform', `translate(0, ${yTranslation + 20})`);

  mlpredsLegendEnter
    .merge(mlpredsLegendUpdate)
    .call(mlpredsLegend);

  mlpredsLegendUpdate.exit().remove();
}


/* Global variable to store the last data from backend */
let lastDataFromBackend = {'wildfire': [], 'fuel': [], 'temp_precp': [], 'wind': [], 'fipsToTempPrecp': {}};

/**
 * Function to start visualization when the necessary data e.g. JSON file is loaded.
 * @param data [unitedStates, fipsCSV]
 */
function startVisualization(data) {
  /*****************************************************************************
   * Extract data
   *****************************************************************************/

  // United States topojson
  let unitedStates = data[0]  // Unpack data

  // Convert the read csv to a lookup table to map FIPS to county name
  let fips2County = {}
  data[1].forEach((item, index) => {
    fips2County[item["fips"]] = item["county_name"];
  })

  /*****************************************************************************
   * Select HTML elements
   *****************************************************************************/

  let svg = d3.select("#wildfire-visualization")
    .append('svg')
    .attr("width", width)
    .attr("height", height);

  let svgLegend = d3.select("#legend")
    .append('svg')
    .attr("width", '100%')
    .attr("height", '600')

  let wildfireCheckbox = document.getElementById('wildfire-checkbox');
  let fuelRadioButton = document.getElementById('fuel-radio');
  let tempRadioButton = document.getElementById('temperature-radio')
  let rainRadioButton = document.getElementById('rain-radio');
  let windRadioButton = document.getElementById('wind-radio');
  let mlpredsRadioButton =  document.getElementById('mlpreds-radio');


  /*****************************************************************************
   * Append a marker definition
   *
   * https://stackoverflow.com/questions/36579339/how-to-draw-line-with-arrow-using-d3-js
   * or
   * https://observablehq.com/@harrylove/draw-an-arrowhead-marker-connected-to-a-line-in-d3
   *****************************************************************************/
  svg.append("svg:defs").append("svg:marker")
    .attr("id", "triangle")
    .attr("refX", 2)
    .attr("refY", 2)
    .attr("markerWidth", 10)
    .attr("markerHeight", 20)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 0 0 4 2 0 4 1 2")
    .style("fill", "black");

  const projection = d3.geoAlbersUsa()

  /**
   * This function augments the projection defined above because it sometimes just
   * returns `null` when the requested coordinates are outside the specified range.
   * Therefore, just convert them to some value.
   *
   * @param longLat
   * @returns {number[]|*}
   */
  const safeProjection  = longLat =>
  {
    let p = projection(longLat);
    if (p != null) return p;
    else return [-width, -height];
  }

  const pathGenerator = d3.geoPath().projection(projection);

  let tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-8, -6])
    .html(d => {
      let id = d.id;
      return `${fips2County[id]}`;
    });

  // The group for wildfire visualization
  const g = svg.append('g');
  g.call(tip);

  // The group for legend
  const legendGroup = svgLegend.append('g');

  function countyColor(d) {
    const defaultColor = 'rgb(194,194,194)';

    let fips = d.id;

    if (tempRadioButton.checked) {
      if (lastDataFromBackend.fipsToTempPrecp.hasOwnProperty(fips)) {
        let tavg = lastDataFromBackend.fipsToTempPrecp[fips].tavg;
        return temperatureQuantileScale(tavg);
      }
    }

    if (rainRadioButton.checked) {
      if (lastDataFromBackend.fipsToTempPrecp.hasOwnProperty(fips)) {
        let prcp = lastDataFromBackend.fipsToTempPrecp[fips].prcp;
        return precpQuantileScale(prcp);
      }
    }

    if (mlpredsRadioButton.checked) {

      //yand add 
      wildfireCheckbox.checked = false;

      if (lastDataFromBackend.fipsToMLPreds.hasOwnProperty(fips)) {
        let pred = lastDataFromBackend.fipsToMLPreds[fips].predicted_class;
        // debugging
        // window.alert(pred) //correct
        // mlpredsOrdinalScale(pred) bug
        return ml_color[pred];
      }
    }

    // none of these radio buttons is checked
    return defaultColor;
  }

  /**
   * Redraw the counties. This function depends on the global variable and
   * other variables defined outside it, especially for updating choropleth colors.
   */
  function redrawCounties(group) {
    let update = group.selectAll('path .counties')
      .data(topojson.feature(unitedStates, unitedStates.objects.counties).features);

    update.enter().append('path')
      .attr('class', 'counties')
      .attr('stroke', 'white')
      .attr('stroke-width', '0.5')
      .attr('d', pathGenerator)
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide)
      .merge(update)
      .attr('fill', countyColor({'id': 'We need to draw the base color first'}))
      .attr('fill', countyColor);

    update.exit().remove();

    const stateBorderColor = 'rgba(56,56,56,0.5)';

    let stateUpdate = g.selectAll('path .states')
      .data(topojson.feature(unitedStates, unitedStates.objects.states).features);

    stateUpdate.enter().append('path')
      .attr('class', 'states')
      .attr('fill', 'None')
      .attr('d', pathGenerator)
      .merge(stateUpdate)
      .attr('stroke-width', '1')
      .attr('stroke', stateBorderColor)
  }

  /**
   * This function is used to redraw all the map. It handles which layers need to be drawn first to last.
   *
   * @param group
   * @param legendGroup
   */
  function redrawAll(group, legendGroup) {
    // For choropleth: temperature, precipitation, and ml predictions
    redrawCounties(group);

    let dataSelected = ""

    if (tempRadioButton.checked) dataSelected = "temperature";
    if (rainRadioButton.checked) dataSelected = "precipitation";
    if (mlpredsRadioButton.checked) dataSelected = "mlpredictions"

    if (fuelRadioButton.checked) {
      drawFuel(group, lastDataFromBackend['fuel'], safeProjection);
      dataSelected = "fuel";
    } else drawFuel(group, [], safeProjection);

    if (windRadioButton.checked) {
      drawWind(group, lastDataFromBackend['wind'], safeProjection);
      dataSelected = "wind";
    } else drawWind(group, [], safeProjection);

    if (wildfireCheckbox.checked) {
      drawWildfires(group, lastDataFromBackend['wildfire'], safeProjection);
      // yang added 
      mlpredsRadioButton.checked = false;
      // document.getElementById('timeSelected').backgroundColor = "red";

    } else {
      drawWildfires(group, [], safeProjection);
    }


    drawLegend(legendGroup, dataSelected);
  }

  let slider = document.getElementById('timeSelector');
  $(slider).attr('step', 1.0/daysInYear);  // Set the tolerance to a month

  slider.addEventListener('input', sliderInput);
  slider.addEventListener('change', sliderChange);

  // Update the displayed time with the initial value
  // This will also trigger the data request from the backend.
  sliderInput(null);
  sliderChange(null);

  wildfireCheckbox.addEventListener('change', e => {redrawAll(g, legendGroup);});
  fuelRadioButton.addEventListener('change', e => {redrawAll(g, legendGroup);});
  tempRadioButton.addEventListener('change', e => {redrawAll(g, legendGroup);});
  rainRadioButton.addEventListener('change', e => {redrawAll(g, legendGroup);});
  windRadioButton.addEventListener('change', e => {redrawAll(g, legendGroup);});
  mlpredsRadioButton.addEventListener('change', e => {redrawAll(g, legendGroup); });


  socket.on('connect', ()=>{
    socket.emit('data request', {'time': +(document.getElementById('timeSelector').value)})
  })

  /**
   * This function is called when there is some data broadcast from the Python
   * backend to the web browser.
   *
   * The wildfire visualization is updated as per the data returned by the backend.
   */
  socket.on('data broadcast', dataFromBackend => {
    // Update the global variable
    lastDataFromBackend = dataFromBackend

    let tempPrecp = dataFromBackend['temp_precp']

    // Create a lookup table from FIPS -> Temperature and precipitation
    let fipsToTempPrecp = {};
    tempPrecp.forEach(item => {
      fipsToTempPrecp[item["county_fips"]] = {tmax: item.tmax, tmin: item.tmin, tavg: item.tavg, prcp: item.prcp};
    });
    lastDataFromBackend['fipsToTempPrecp'] = fipsToTempPrecp;

    let fipsToMLPreds = {};
    let mlPreds = dataFromBackend['mlpreds'];
    mlPreds.forEach(item => {
      fipsToMLPreds[item['fips']] = {predicted_class: item.predicted_class};
    })

    lastDataFromBackend['fipsToMLPreds'] = fipsToMLPreds;

    redrawAll(g, legendGroup);
  });
}


/**
 * This is necessary so that the Javascript file is called only after the
 * Document Object Manager content is properly loaded.
 */
document.addEventListener('DOMContentLoaded', ()=>{
  var element = document.getElementById("ml_text");
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  var yyyy = today.getFullYear();

  today = '('+ mm + '/' + dd + '/' + yyyy + ')';

  current_label = "Real-time prediction"
  element.innerHTML = current_label.concat(today)

  let jsonPromise = d3.json("/static/us-counties.json");
  let csvPromise = d3.csv("/static/county_fips.csv");
  Promise.all([jsonPromise, csvPromise])
    .then(startVisualization);
});


// element.style.color='red'
// yang add, read ml_prediction file created data
// const fs = require('fs');

// // fetch file details
// fs.stat(PATH_TO_MLPREDS, (err, stats) => {
//     if(err) {
//         throw err;
//     }

//     // print file last modified date
//     console.log(`File Data Last Modified: ${stats.mtime}`);
//     console.log(`File Status Last Modified: ${stats.ctime}`);
// });
