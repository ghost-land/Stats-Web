import time
from flask import render_template
from .update_data import fetch_downloads


def log_execution_time(start_time, end_time):
    execution_time = end_time - start_time
    print(f"[INFO] Data processing took {execution_time:.6f} seconds")


def save_rendered_template(app, output_path):
    start_time = time.time()
    
    with app.app_context():
        rendered_content = render_template(
            'index.jinja',
            downloads=fetch_downloads(),
        )
        with open(output_path, 'w') as file:
            file.write(rendered_content)
    
    end_time = time.time()
    log_execution_time(start_time, end_time)