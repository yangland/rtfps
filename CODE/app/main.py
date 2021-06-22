"""
Visualization of the fire data available.
"""
import os
import datetime
import pandas as pd

# Import flask
from flask import Flask, render_template
from flask_socketio import SocketIO, emit

# Import Classes in the models directory
# from models.mlpreds import MLPreds
from models.wildfire import WildFire
from models.fuel import Fuel
from models.temp_precp import TempPrecp, TempPrecpCSV
from models.wind import Wind, WindCSV

# Import path to the datasets
from constants import PATH_TO_WILDFIRE, PATH_TO_FUEL_MOISTURE, PATH_TO_TEMPERATURE_AND_PRECIPITATION, PATH_TO_WIND, \
    PATH_TO_MLPREDS

from utils import Adaptor, Filters

''' Initialize the models to access data '''
# fuel, wildfire, temp_precp, wind, mlpreds
fuel = None
if os.path.isfile(PATH_TO_FUEL_MOISTURE):
    print('Loading fuel')
    fuel = Fuel(PATH_TO_FUEL_MOISTURE)
else:
    print(f'{PATH_TO_FUEL_MOISTURE} does not exist')

wildfire = None
if os.path.isfile(PATH_TO_WILDFIRE):
    print('Loading wildfire')
    wildfire = WildFire(PATH_TO_WILDFIRE)
else:
    print(f'{PATH_TO_WILDFIRE} does not exist')

temp_precp = None
if os.path.isfile(PATH_TO_TEMPERATURE_AND_PRECIPITATION):
    print('Loading temperature and precipitation')
    temp_precp = TempPrecpCSV(PATH_TO_TEMPERATURE_AND_PRECIPITATION)
else:
    print(f'{PATH_TO_TEMPERATURE_AND_PRECIPITATION} does not exist')

wind = None
if os.path.isfile(PATH_TO_WIND):
    print('Loading wind')
    wind = WindCSV(PATH_TO_WIND)
else:
    print(f'{PATH_TO_WIND} does not exist')

mlpreds = None
if os.path.isfile(PATH_TO_MLPREDS):
    print('Loading ML Predictions')
    # mlpreds = MLPreds(PATH_TO_MLPREDS)

    # load csv file as data frame
    mlpreds = pd.read_csv(PATH_TO_MLPREDS) 

else:
    print(f'{PATH_TO_MLPREDS} does not exist')


''' Flask app and the SocketIO '''
app = Flask(__name__, static_folder='./static/')
socketio = SocketIO(app)


@app.route('/')
def index():
    """
    Handle HTTP GET method on "localhost:port_number".

    :return: A rendered HTML page.
    """
    min_year, max_year = wildfire.year_span
    configs = {'min_year': min_year,
               'max_year': max_year}
    return render_template('index.html', configs=configs)


@app.route('/gmaps')
def gmaps():
    """
    Handle Google Maps visualization. This is hidden on purpose. To access the
    page, go to localhost:8080/gmaps.

    It just shows wildfires. The development could have been continued, but after
    discussion and experimentation, we would like to use Choropleth. Therefore, it is
    not ideal to use Google Maps as it contains a lot of information such as terrain.

    :return: Rendered template with Google Maps visualization.
    """
    min_year, max_year = wildfire.year_span
    configs = {'min_year': min_year,
               'max_year': max_year}
    return render_template('gmaps.html', configs=configs)


@socketio.on("data request")
def data_request(message):
    """
    This function is called every time there is a socketio event "data request".
    The backend looks up the message and returns the relevant data as per what the
    user requested.

    The message should be a dictionary with the following structure:
        `{'time': time_value, 'dtime': dtime_value}`

    :param message: A dictionary from the web-interface with structure outlined above.
    :return: None. The data is sent via socketio `emit()` method.
    """
    timestamp = message['time']  # time is timestamp in seconds
    dtime = message['dtime']  # dtime is query "tolerance" in seconds

    if wildfire:
        wildfire_df: pd.DataFrame = wildfire.get(timestamp, dtime)
        socketio_wildfire = Adaptor.wildfire(wildfire_df)  # Data to be sent via socketio
    else:
        socketio_wildfire = []

    if fuel:
        fuel_df: pd.DataFrame = fuel.get(timestamp, dtime)
        socketio_fuel = Adaptor.fuel(fuel_df)
    else:
        socketio_fuel = []

    if temp_precp:
        temp_precp_df: pd.DataFrame = temp_precp.get(timestamp, dtime)
        temp_precp_df = Filters.filter_temp_precp(temp_precp_df)
        socketio_temp_precp = Adaptor.temp_precp(temp_precp_df)
    else:
        socketio_temp_precp = []

    if wind:
        wind_df: pd.DataFrame = wind.get(timestamp, dtime)
        wind_df = Filters.filter_wind(wind_df)
        socketio_wind = Adaptor.wind(wind_df)
    else:
        socketio_wind = []

    # Yang: mlpreds need to be updated without timestamp
    if not mlpreds.empty:
        # yang changed
        # mlpreds_df: pd.DataFrame = mlpreds.get(timestamp, dtime)
        # socketio_mlpreds = Adaptor.mlpreds(mlpreds_df)

        mlpreds2 = mlpreds[['fips', 'fireclass']].copy()
        mlpreds3 = mlpreds2.rename(columns={"fireclass": "predicted_class"})
        mlpreds_df = mlpreds3
        
        socketio_mlpreds = Adaptor.mlpreds(mlpreds_df)
    else:
        socketio_mlpreds = []

    emit('data broadcast', {'wildfire': socketio_wildfire,
                            'fuel': socketio_fuel,
                            'temp_precp': socketio_temp_precp,
                            'wind': socketio_wind,
                            'mlpreds': socketio_mlpreds}, broadcast=False)


if __name__ == '__main__':
    # Yang added "debug=True"
    app.run(port=8080, debug=True)
    # app.run(port=8080)
