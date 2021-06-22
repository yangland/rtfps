from typing import Tuple
import datetime
import sqlite3
import pandas as pd

from models import DataInterface


class WildFire(DataInterface):
    """
    The WildFire class is an interface for the wildfire database.

    To use this class, the pattern is as follows:

        wildfire = WildFire('/path/to/FPA_FOD_20170508.sqlite')

        wildfire_df = wildfire.get(timestamp, dtime)  # Get fires within timestamp +/- dtime

        min_year, max_year = wildfire.year_span  # Get year span
    """
    def __init__(self, path_to_wildfire):
        """
        Initialize a wildfire database reader. The database must be the one
        downloaded from Kaggle 1.88Million wildfire dataset.

        :param path_to_wildfire: Path to the wild fire dataset e.g. '~/FPA_FOD_20170508.sqlite'
        """
        self._path_to_wildfire = path_to_wildfire
        self._connection = sqlite3.connect(path_to_wildfire)
        self._df: pd.DataFrame = pd.read_sql("SELECT FIRE_YEAR, DISCOVERY_DOY, DISCOVERY_TIME, DISCOVERY_DATE, "
                                             "CONT_DOY, CONT_TIME, CONT_DATE, FIRE_SIZE, LATITUDE, "
                                             "LONGITUDE FROM Fires", con=self._connection)

        self._df['DISCOVERY_DATE'] = pd.to_datetime(self._df['DISCOVERY_DATE'] - pd.Timestamp(0).to_julian_date(), unit='D')
        self._df['CONT_DATE'] = pd.to_datetime(self._df['CONT_DATE'] - pd.Timestamp(0).to_julian_date(), unit='D')

        self._df.set_index('DISCOVERY_DATE')

    def get(self, timestamp, dtime=10000):
        """
        Get wild fire based on the time filtering. In particular, this returns
        the fires contained between timestamp-dtime and timestamp+dtime.

        :param timestamp:
        :param dtime:
        :return:
        """
        datetime1 = pd.to_datetime(pd.Timestamp(datetime.date.fromtimestamp(timestamp - dtime)))
        datetime2 = pd.to_datetime(pd.Timestamp(datetime.date.fromtimestamp(timestamp + dtime)))
        inrange = (self._df['DISCOVERY_DATE'] >= datetime1) & \
                  (self._df['DISCOVERY_DATE'] <= datetime2)

        return self._df[inrange]

    @property
    def year_span(self) -> Tuple[int, int]:
        """ Return the year span (min_year, max_year) of the wildfire data """
        max_year = self._df['DISCOVERY_DATE'].max().year
        min_year = self._df['DISCOVERY_DATE'].min().year

        return min_year, max_year


