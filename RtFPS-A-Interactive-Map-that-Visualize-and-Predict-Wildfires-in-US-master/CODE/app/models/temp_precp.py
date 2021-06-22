import sqlite3
import numpy as np
import pandas as pd
import datetime
import os

from models import DataInterface


class TempPrecp(DataInterface):
    def __init__(self, path_to_temp_precp):
        """
        Initialize the temperature and precipitation reader.

        :param path_to_temp_precp: Path to the temperature and precipitation SQLite database
        """
        self._path_to_temp_rain = path_to_temp_precp

    def get(self, timestamp, dtime=10000):
        datetime1 = datetime.date.fromtimestamp(timestamp - dtime)
        datetime2 = datetime.date.fromtimestamp(timestamp + dtime)

        yyyymmdd1 = np.int64(datetime1.strftime('%Y%m%d'))
        yyyymmdd2 = np.int64(datetime2.strftime('%Y%m%d'))

        conn = sqlite3.connect(self._path_to_temp_rain)
        inrange = pd.read_sql(f'SELECT * FROM temp_and_precipitation WHERE "YEAR/MONTH/DAY" BETWEEN {yyyymmdd1} AND {yyyymmdd2}', con=conn)

        return inrange


class TempPrecpCSV(DataInterface):
    def __init__(self, path_to_tp_csv: str):
        self._path_to_wind = path_to_tp_csv
        # Yang updated ", low_memory=False"
        self._df: pd.DataFrame = pd.read_csv(self._path_to_wind, low_memory=False)
        self._df['date'] = pd.to_datetime(self._df['date'], format='%Y%m%d')

    def get(self, timestamp, dtime=10000):
        datetime1 = pd.to_datetime(pd.Timestamp(datetime.date.fromtimestamp(timestamp - dtime)))
        datetime2 = pd.to_datetime(pd.Timestamp(datetime.date.fromtimestamp(timestamp + dtime)))

        # yyyymmdd1 = np.int64(datetime1.strftime('%Y%m%d'))
        # yyyymmdd2 = np.int64(datetime2.strftime('%Y%m%d'))

        inrange = (self._df['date'] >= datetime1) & \
                  (self._df['date'] <= datetime2)

        return self._df[inrange]


if __name__ == '__main__':
    """ Basic test """
    d = datetime.datetime.strptime('01/02/1992', '%d/%m/%Y')
    time = d.timestamp()

    seconds_in_year = 31536000
    dtime = seconds_in_year/12/2

    temp_precp = TempPrecpCSV('datasets/temperature_and_precipitation/tp_zipcode_county.csv')
    df = temp_precp.get(time + dtime, dtime)
    print(df)
