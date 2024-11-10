from utils.get_config import config
from utils.render import start_periodic_render
from flask import Flask
import os
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