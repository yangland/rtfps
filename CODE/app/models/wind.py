import sqlite3
import numpy as np
import pandas as pd
import datetime
import os

from models import DataInterface


class Wind(DataInterface):
    def __init__(self, path_to_wind):
        """
        Initialize the wind data reader.

        :param path_to_wind: Path to the wind SQLite database
        """
        self._path_to_wind = path_to_wind

    def get(self, timestamp: float, dtime: float=10000):
        datetime1 = pd.to_datetime(pd.Timestamp(datetime.date.fromtimestamp(timestamp - dtime)))
        datetime2 = pd.to_datetime(pd.Timestamp(datetime.date.fromtimestamp(timestamp + dtime)))

        conn = sqlite3.connect(self._path_to_wind)
        query = f'SELECT * FROM wind WHERE time >= "{datetime1}" AND time <= "{datetime2}"'
        inrange = pd.read_sql(query, con=conn)

        return inrange


class WindCSV(DataInterface):
    def __init__(self, path_to_wind: str):
        self._path_to_wind = path_to_wind
        self._df: pd.DataFrame = pd.read_csv(self._path_to_wind)
        self._df['date'] = pd.to_datetime(self._df['date'], format='%Y-%m-%d')

    def get(self, timestamp, dtime=10000) -> pd.DataFrame:
        datetime1 = pd.to_datetime(pd.Timestamp(datetime.date.fromtimestamp(timestamp - dtime)))
        datetime2 = pd.to_datetime(pd.Timestamp(datetime.date.fromtimestamp(timestamp + dtime)))
        inrange = (self._df['date'] >= datetime1) & \
                  (self._df['date'] <= datetime2)

        return self._df[inrange]


if __name__ == '__main__':
    """ Basic test """
    d = datetime.datetime.strptime('01/02/1992', '%d/%m/%Y')
    time = d.timestamp()

    seconds_in_year = 31536000
    dtime = seconds_in_year/12/2

    wind = WindCSV('datasets/wind/wind_with_fips.csv')
    df = wind.get(time + dtime, dtime)
    print(df)


