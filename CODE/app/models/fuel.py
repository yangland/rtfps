import pandas as pd
import datetime

from models import DataInterface


class Fuel(DataInterface):
    def __init__(self, path_to_fuel_csv):
        self._df: pd.DataFrame = pd.read_csv(path_to_fuel_csv)

        # Convert columns to the correct data types
        self._df.date = pd.to_datetime(self._df.date, format='%Y-%m-%d')
        self._df.latitude = self._df.latitude.astype('float')
        self._df.longitude = self._df.longitude.astype('float')
        self._df.percent = self._df.percent.astype('float')

    def get(self, timestamp, dtime: float = 10000):
        datetime1 = pd.to_datetime(pd.Timestamp(datetime.date.fromtimestamp(timestamp - dtime)))
        datetime2 = pd.to_datetime(pd.Timestamp(datetime.date.fromtimestamp(timestamp + dtime)))
        inrange = (self._df['date'] >= datetime1) & \
                  (self._df['date'] <= datetime2)

        return self._df[inrange]
