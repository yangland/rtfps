import datetime
from datetime import date
from datetime import datetime
import pandas as pd
import numpy as np
import requests
import time
# import seaborn as sns
import pyspark
import pickle
import math
import csv
import os

# From API download data and output ML result for 10 selected cities

# PAID API KEY
# https://weatherstack.com
api_key = '81cc3fa49c6271ca9d72c8c85a85bc6d'

# Read 10cities look up file
lookup = pd.read_csv("10city_fmc_fips.csv")

# load machine learning model
filename = 'gbr_model.sav'
GradientBoostingRegressor = pickle.load(open(filename, 'rb'))

# 10 selected cities
cities = ['Los Angeles','San Francisco','Denver','Las Vegas','Houston','San Antonio','Charlotte','Atlanta','San Diego','Dallas']

def comparahis(city,cdate):
    #deal with historical API parameters
    #cordvalue = cord['coordinates']
    datavalue = cdate
    paramsloadhis = {
        'access_key': api_key,
        'query': city,
        'historical_date': datavalue,
        'hourly': '1',
        'interval':'24'
    }
    return paramsloadhis

def comparafor(city):
    # deal with historical API parameters
    # cordvalue = cord['coordinates']
    paramsloadfor = {
        'access_key': api_key,
        'query': city,
        'forecast_days': '7',
        'hourly': '1',
        'interval':'24'
    }
    return paramsloadfor

def getdates(mode, days):
    if mode== 'F':
        dates = pd.date_range(start = date.today(), periods=days)
    elif mode == 'P':
        dates = pd.date_range(end = date.today() - pd.Timedelta(days=1), periods=days)
    else:
        dates = 'mode can only be "F" future or "P" past'
    return(dates)

def fire_class(size):
    if size <= 0.25:
        fire_class = 'A'
    elif size > 0.25 and size <= 10:
        fire_class = 'B'
    elif size > 10 and size <= 100:
        fire_class = 'C'
    elif size >100 and size <= 300:
        fire_class = 'D'
    elif size >300 and size <= 1000:
        fire_class = 'E'
    elif size >1000 and size <= 5000:
        fire_class = 'F'
    else:
        fire_class = 'G'
    return(fire_class)


def api_ml(target):

    # get the fmc from lookup table
    record = lookup.loc[lookup['city'] == target]
    # print("record", record)
    fips = record['fips'].values[0]
    fmc = record['fmc'].values[0]

    day_21 = []

    # get the weather forecast
    paramsloadfor = comparafor(target)
    api_result_for = requests.get('https://api.weatherstack.com/forecast?', params=paramsloadfor)
    api_response_for = api_result_for.json()

    city = api_response_for['location']['name']
    region = api_response_for['location']['region']
    lat = api_response_for['location']['lat']
    lon = api_response_for['location']['lon']

    for i in api_response_for['forecast']:
        date0 = api_response_for['forecast'][i]['date']
        mintemp = api_response_for['forecast'][i]['mintemp']
        maxtemp = api_response_for['forecast'][i]['maxtemp']
        avgtemp = api_response_for['forecast'][i]['avgtemp']
        avgdata = api_response_for['forecast'][i]['hourly']
        precip = avgdata[0]['precip']
        wind_speed = avgdata[0]['wind_speed']

        is_forecast = 'T'

        # incorporate fuel_mositure
        record = lookup.loc[lookup['city'] == target]
        fips = record['fips'].values[0]
        fmc = record['fmc'].values[0]

        print([city, region, lat, lon, fips, date0, mintemp, maxtemp, avgtemp, precip, wind_speed, fmc, is_forecast])
        day_21.append([city, region, lat, lon, fips, date0, mintemp, maxtemp, avgtemp, precip, wind_speed, fmc, is_forecast])

    #get the weather historical
    today = date.today()
    history_dates = pd.date_range(end=today - pd.Timedelta(days=1), periods=14, freq='D')
    daystr = history_dates.strftime('%Y-%m-%d').tolist()
    s = ';'
    pastdays_str = s.join(daystr)

    paramsloadhis = comparahis(target,pastdays_str)
    api_result_his = requests.get('https://api.weatherstack.com/historical?', params=paramsloadhis)
    api_response_his = api_result_his.json()

    for i in api_response_his['historical']:
        date1 = api_response_his['historical'][i]['date']
        mintemp1 = api_response_his['historical'][i]['mintemp']
        maxtemp1 = api_response_his['historical'][i]['maxtemp']
        avgtemp1 = api_response_his['historical'][i]['avgtemp']
        avgdata1 = api_response_his['historical'][i]['hourly']
        precip1 = avgdata1[0]['precip']
        wind_speed1 = avgdata1[0]['wind_speed']

        is_forecast = 'F'

        # incorporate fuel_mositure
        record = lookup.loc[lookup['city'] == target]
        fips = record['fips'].values[0]
        fmc = record['fmc'].values[0]

        print([city, region, lat, lon, fips, date1, mintemp1, maxtemp1, avgtemp1, precip1, wind_speed1, fmc, is_forecast])
        day_21.append([city, region, lat, lon, fips, date1, mintemp1, maxtemp1, avgtemp1, precip1, wind_speed1, fmc, is_forecast])

    # Create dataframe for average 21 days
    df = pd.DataFrame(day_21, columns = ['city', 'region', 'lat', 'lon', 'fips', 'date', 'mintemp', 'maxtemp', 'avgtemp', 'precip', 'wind_speed', 'fmc', 'is_forecast'])
    df['month'] = pd.to_datetime(df['date']).dt.month
    target_mean = df.groupby(['city', 'fips', 'lat', 'lon']).mean()
    target_mean_f = target_mean.reset_index()
    fips=target_mean_f['fips'][0]

    ml_input = target_mean_f[['wind_speed', 'maxtemp', 'mintemp', 'avgtemp', 'precip', 'fmc', 'month', 'lat', 'lon']]
    ml_output = GradientBoostingRegressor.predict(ml_input)[0]

    return (target, fips, ml_output)

# main function loop over city list, write csv file

if os.path.exists("datasets/mlpreds/ml_output.csv"):
  os.remove("datasets/mlpreds/ml_output.csv")

with open('datasets/mlpreds/ml_output.csv', 'w', newline='') as csvfile:
    fieldnames = ['city', 'fips', 'ml_output', 'fireclass']
    writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
    writer.writeheader()

    for target in cities:
        print("target", target)
        city, fips, ml_output = api_ml(target)
        fireclass = fire_class(ml_output)
        ml_output_two = float("{0:.2f}".format(ml_output))

        print("ML: ", [city, fips, ml_output, fireclass])

        # write to the csv
        writer.writerow({'city': city, 'fips': fips, 'ml_output': ml_output_two, 'fireclass': fireclass})
