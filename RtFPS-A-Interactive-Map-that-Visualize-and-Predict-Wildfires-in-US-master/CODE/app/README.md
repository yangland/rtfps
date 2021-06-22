# Description

This project is the source code for Wildfire and Climate Change in US by Group 4 - Asia Pacific.
With this project, it is possible to visualize historical wildfire data from 1992 to 2015.
Moreover, some other factors that may affect wildfires are included, such as fuel, temperature,
rain and wind. Finally, we included prediction results of our machine learning model.


The following figure shows what this project is about.
![screenshot](app%20screenshot.PNG)

This D3 visualization shows how the datasets can be visualized with the following
technologies:

1. D3 for the web visualization
2. Bootstrap for web styling.
3. Flask as the Python web-development framework
4. SocketIO as the interactive communication channel between the front-end and back-end.

# System Requirements

To run this code example, you will need the following Python packages. It can be installed
with `pip install -r requirements.txt`.

Module           | Version |
-----------------|---------|
`pandas`         | 1.1.3   |    
`flask`          | 1.1.2   | 
`flask-socketio` | 4.3.1   |
`numpy`          | 1.19.1  |

The directory `static/lib/` contains some D3 library files. These are the library files from
 CSE6242's homework 2. In addition you will need an internet connection as some web 
libraries e.g. Bootstrap is linked directly to the publicly available source. 


# Quick Start

Before running the code, make sure you download these datasets:
 1. `FPA_FOD_20170508.sqlite` wildfire data in `dataset/wildfire/FPA_FOD_20170508.sqlite`. This file can be downloaded from Kaggle
[here](https://www.kaggle.com/rtatman/188-million-us-wildfires).
 2. The rest of the `datasets` folder can be downloaded [here](https://1drv.ms/u/s!An2FrTaQfEmmmIQZmdWqCj0b-upwFQ?e=pvm2UY).
 
The `datasets` folder structure should be
```
datasets
   ├── fuel_moisture
   │   └── nfmd_compiled.csv
   ├── mlpreds
   │   └── ml2.csv
   ├── temperature_and_precipitation
   │   └── tp_zipcode_county.csv
   ├── wildfire
   │   └── FPA_FOD_20170508.sqlite
   └── wind
       └── wind_with_fips.csv
```

To run the code, from this directory, type `python3 main.py`.
Then, on a browser, go to `127.0.0.1:8080`.


PS: In case you are interested in running the Google Maps version as part of our (obsolete) experiments, go to `127.0.0.1:8080/gmaps`.  

