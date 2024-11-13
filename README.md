# Stats-Web

> https://stats.ghostland.at

Stats-Web is a web application designed to display download statistics for [Ghost eShop](https://social.ghostland.at/). This app allows users to view general download data as well as specific information on individual titles, such as total downloads, daily download history, and additional title metadata.


## Features

- **Home Page**: Shows overall download statistics.
- **Game Info Page**: Displays detailed download history for individual titles, including a line chart for visual representation.
- **API Integration**: Fetches additional title information (e.g., title name and type) from [Nlib API](https://github.com/ghost-land/Nlib-API).


## Development 
### Installation (dev)

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ghost-land/Stats-Web.git
   cd Stats-Web
   ```

2. **Install Dependencies**:
   Use `pip` to install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```


### Configuration

1. **Config File**:
   Edit the configuration file (`config.yml`) in the root directory and make sure to specify the `data_file_path` value

2. **Data Files**:
   Each game should have a JSON file in the specified `data_file_path` directory, named `{TID}_downloads.json`. This file should contain download history, organized by date.


### Usage

1. **Run the Application**:
   To start the application locally, use the following command:
   ```bash
   python run.py
   ```

2. **Access the Application**:
   Open your browser and go to `http://127.0.0.1:80` to access the home page.


### Project Structure

- `run.py`: The main file to start the Flask application.
- `templates/`: HTML templates for the app's pages.
- `static/`: Contains static assets such as CSS, JavaScript, and icons.
- `utils/`: Utility functions for configuration and rendering.
