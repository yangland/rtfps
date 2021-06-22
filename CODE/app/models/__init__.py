import abc
import pandas as pd


class DataInterface(abc.ABC):
    @abc.abstractmethod
    def get(self, timestamp, dtime: float=10000) -> pd.DataFrame:
        """
        Get the relevant data within timestamp +/- dtime. This method must be overriden by all model classes.

        :param timestamp: Unix epoch timestamp
        :param dtime: Time tolerance
        :return: Pandas dataframe
        """
        pass
