import datetime
import pandas as pd
from models import DataInterface


class MLPreds(DataInterface):
    def __init__(self, path_to_mlmodel):
        df: pd.DataFrame = pd.read_csv(path_to_mlmodel)
        # Yang update ".copy()"
        self._df: pd.DataFrame = df[['date', 'fips', 'fire_class']].copy()
        self._df['date'] = pd.to_datetime(self._df['date'])
        self._df = self._df.rename(columns={'fire_class': 'predicted_class'})

    def get(self, timestamp, dtime: float = 10000) -> pd.DataFrame:
        """
        Return a dummy pandas dataframe with the following columns

        fips | predicted_class |
        """
        datetime1 = pd.to_datetime(pd.Timestamp(datetime.date.fromtimestamp(timestamp - dtime)))
        datetime2 = pd.to_datetime(pd.Timestamp(datetime.date.fromtimestamp(timestamp + dtime)))
        inrange = (self._df['date'] >= datetime1) & \
                  (self._df['date'] <= datetime2)

        # Mapping using fips code
        return self._df[inrange][['fips', 'predicted_class']]


if __name__ == '__main__':
    # mlpreds = MLPreds('datasets/mlpreds/ml2.csv')
    # d = datetime.datetime.strptime('01/02/1992', '%d/%m/%Y')
    # time = d.timestamp()

    # seconds_in_year = 31536000
    # dtime = seconds_in_year / 12 / 2

    # df = mlpreds.get(time + dtime, dtime)
    # print(df)

    # yang updated for real-time 
    mlpreds = MLPreds('datasets/mlpreds/ml_output.csv')

    df = mlpreds[['fips', 'fireclass']]

    print(df)
