from utils.get_config import config
from utils.render import start_periodic_render
from flask import Flask, render_template
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
    
    with open(path, 'r', encoding='utf-8') as file:
        data = json.load(file)
        
        return render_template(
            'game_info.jinja',
            tid=tid,
            downloads=data,
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