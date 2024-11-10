import time
import threading
from flask import render_template
from .update_data import fetch_downloads


def log_execution_time(start_time, end_time):
    execution_time = end_time - start_time
    print(f"[INFO] Data processing took {execution_time:.6f} seconds")


def save_rendered_template(app, output_path):
    start_time = time.time()
    
    downloads, total_downloads = fetch_downloads()
    with app.app_context():
        rendered_content = render_template(
            'index.jinja',
            downloads=downloads,
            total_downloads=total_downloads,
        )
        with open(output_path, 'w', encoding="utf-8") as file:
            file.write(rendered_content)
    
    end_time = time.time()
    log_execution_time(start_time, end_time)
    
def start_periodic_render(app, output_path, interval_hours):
    def periodic_render():
        while True:
            save_rendered_template(app, output_path)
            time.sleep(interval_hours * 3600)
    
    thread = threading.Thread(target=periodic_render)
    thread.daemon = True
    thread.start()