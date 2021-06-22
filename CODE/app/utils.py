"""
Utility functions and classes for D3 wildfire visualization
"""


import pandas as pd


class Adaptor:
    """
    A set of adaptor functions to convert various data structures.
    For example, we may want to convert a Pandas dataframe so that it is compatible
    with the SocketIO interface.

    For reference, see https://sourcemaking.com/design_patterns/adapter
    """
    @staticmethod
    def wildfire(df: pd.DataFrame):
        """
        Convert a pandas wildfire dataframe to a list of dictionaries with the
        following structure

            ``output = [..., {'LATITUDE': lat, 'LONGITUDE': lon, 'FIRE_SIZE': fsize},...]``

        :param df: Pandas dataframe that contains the following columns: LATITUDE, LONGITUDE, FIRE_SIZE
        :return: The aforementioned list of dictionaries
        """
        return df[['LATITUDE', 'LONGITUDE', 'FIRE_SIZE']].to_dict('records')

    @staticmethod
    def fuel(df: pd.DataFrame):
        """
        Convert a pandas fuel dataframe to a list of dictionaries with the following structure

            ``output = [..., {'latitude': lat, 'longitude': lon, 'fuel': fuel, 'percent': pcent}, ...]``

        :param df: Pandas dataframe that contains the following columns:
            latitude, longitude, fuel, percent
        :return: The aforementioned list of dictionaries
        """
        return df[['latitude', 'longitude', 'fuel', 'percent']].to_dict('records')

    @staticmethod
    def temp_precp(df: pd.DataFrame):
        """
        Convert a pandas temperature and precipitation dataframe to a list of
        dictionaries with the following structure

            ``output= [...,
            {'tmax': tmax, 'tmin': tmin, 'tavg': tavg, 'prcp': prcp, 'county_fips': fips}, ...]``

        :param df: Pandas dataframe that contains the above columns
        :return: The aforementioned list of dictionaries
        """
        return df[['tmax', 'tmin', 'tavg', 'prcp', 'county_fips']].to_dict('records')

    @staticmethod
    def wind(df: pd.DataFrame):
        return df[['fips', 'latitude', 'longitude', 'wind_u', 'wind_v']].to_dict('records')

    @staticmethod
    def mlpreds(df: pd.DataFrame):
        return df.to_dict('records')


class Filters:
    @staticmethod
    def filter_temp_precp(df: pd.DataFrame):
        return df.groupby('county_fips', as_index=False).mean()

    @staticmethod
    def filter_wind(df: pd.DataFrame):
        return df.groupby('fips', as_index=False).mean()

