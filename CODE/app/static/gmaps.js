// Pretty much this line can be used as is.
let socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

/*******************************************************************************
 * Global variable for Google Maps
 *******************************************************************************/
let gmapsDraw = null;


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
  // Currently dtime is just a dummy number. This could be adjusted in the future.
  let timeSelector = document.getElementById('timeSelector');
  let year = +(timeSelector.value)
  let timestamp = new Date(year, 0, 1).getTime() / 1000;

  const secondsInYear = 31536000
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
  let value = +(timeInput.value)
  timeDisplay.innerHTML = `Year selected: ${value}`;
}

/**
 * Function handler when a slider change event occurs.
 * @param e
 */
function sliderChange(e) {
  socket.emit('data request', dataRequestPayload());
}

/* Global variable to store the last data from backend */
let lastDataFromBackend = {'wildfire': [], 'fuel': [], 'temp_precp': [], 'wind': []};


/**
 * This is necessary so that the Javascript file is called only after the
 * Document Object Manager content is properly loaded.
 */
document.addEventListener('DOMContentLoaded', ()=>{
  let slider = document.getElementById('timeSelector');
  $(slider).attr('step', 1.0/24);  // Set the tolerance to a month

  slider.addEventListener('input', sliderInput);
  slider.addEventListener('change', sliderChange);

  // Update the displayed time with the initial value
  // This will also trigger the data request from the backend.
  sliderInput(null);
  sliderChange(null);

  socket.on('connect', ()=>{
    socket.emit('data request', {'time': +(document.getElementById('timeSelector').value)})
    console.log('socketio created');
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

    // Redraw google maps overlay. It will get the data from a global variable: lastDataFromBackend
    if (gmapsDraw != null) gmapsDraw();
  });

  /*****************************************************************************
   * Code below is related to Google Maps
   *****************************************************************************/
  let map = new google.maps.Map(d3.select("#google-map").node(), {
    zoom: 3,
    center: new google.maps.LatLng(37.76487, -122.41948),
    mapTypeId: google.maps.MapTypeId.TERRAIN
  });

  let googleMapsOverlay = new google.maps.OverlayView();

  googleMapsOverlay.onAdd = function() {
    let layer = d3.select(this.getPanes().overlayLayer)
      .append("div").attr('class', 'gmap-wildfires');

    gmapsDraw = () => {
      console.log('Inside gmapsDraw\n');
      let gmapsProjection = this.getProjection();

      let update = layer.selectAll('svg')
        .data(lastDataFromBackend['wildfire']);

      let marker = update
        .each(transformWildFire) // Update pattern
        .enter().append('svg')
        .each(transformWildFire)
        .attr('class', 'marker');

      function wildfireRadius(d) {
        if (d.FIRE_SIZE <= 0.25) return 1;
        else if (d.FIRE_SIZE < 10) return 3;
        else if (d.FIRE_SIZE < 100) return 5;
        else if (d.FIRE_SIZE < 300) return 7;
        else if (d.FIRE_SIZE < 1000) return 9;
        else return 11;
      }

      marker.append('circle')
        .attr('r', wildfireRadius)
        .attr('cx', wildfireRadius)
        .attr('cy', wildfireRadius)
        .style("fill", "#ee3838")
        .attr("stroke", "none")
        .attr("fill-opacity", .3);

      update.exit().remove();

      function transformWildFire(d) {
        d = new google.maps.LatLng(d.LATITUDE, d.LONGITUDE);
        d = gmapsProjection.fromLatLngToDivPixel(d);
        return d3.select(this)
              .style("left", (d.x - wildfireRadius(d)) + "px")
              .style("top", (d.y - wildfireRadius(d)) + "px");
      }
    }

    googleMapsOverlay.draw = gmapsDraw;
  }

  googleMapsOverlay.setMap(map);
});

