from utils.get_config import config
from utils.render import start_periodic_render
from flask import Flask, render_template
import requests
import os
import json
from waitress import serve

print('Starting Flask app...')
app = Flask(__name__)

output_path = 'temp/index.html'
os.makedirs(os.path.dirname(output_path), exist_ok=True)
start_periodic_render(app, output_path, config['interval_hours'])


@app.route('/')
def home():
    with open('temp/index.html', 'r', encoding='utf-8') as file:
        return file.read()
    
@app.route('/<tid>')
def game_info(tid: str):
    tid = tid.upper()
    
    path = os.path.join(config['data_file_path'], f'{tid}_downloads.json')
    if not os.path.isfile(path):
        return 'TID not found', 404
    
    game_info = None
    try:
        response = requests.get(f'https://api.nlib.cc/nx/{tid}')
        if response.status_code != 200:
            print(f'Failed to fetch game info from API: {response.status_code}')
        game_info = response.json()
        print(game_info)
    except Exception as e:
        print(f'Error fetching game info: {str(e)}')
    if not game_info:
        game_info = {'name': 'Error'}
    game_info['base_tid'] = game_info.get('base_tid', tid)
    
    with open(path, 'r', encoding='utf-8') as file:
        data = json.load(file)
        
        return render_template(
            'game_info.jinja',
            tid=tid,
            downloads=data,
            game_info=game_info,
        )


if __name__ == '__main__':
    print('Flask app started!')
    if config['development']['production']:
        serve(
            app,
            host='0.0.0.0',
            port=config['development']['port']
        )
    else:
        app.run(
            debug=True,
            host='0.0.0.0',
            port=config['development']['port']
        )