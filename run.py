from utils.get_config import config
from utils.render import save_rendered_template
from flask import Flask
import os
from waitress import serve

print('Starting Flask app...')
app = Flask(__name__)

output_path = 'temp/index.html'
os.makedirs(os.path.dirname(output_path), exist_ok=True)
save_rendered_template(app, output_path)


@app.route('/')
def home():
    with open('temp/index.html', 'r') as file:
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