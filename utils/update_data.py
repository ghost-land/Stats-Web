import os
import json

from utils.get_config import config


def get_downloads(limit=None):
    downloads = {}
    data_dir = config.get('data_file_path', 'data')
    files_processed = 0

    for filename in os.listdir(data_dir):
        if filename.endswith('_downloads.json'):
            if limit is not None and files_processed >= limit:
                break
            with open(os.path.join(data_dir, filename), 'r') as file:
                data = json.load(file)
                
                for tid, count in data.get("tid_downloads", {}).items():
                    
                    # Add total downloads
                    if tid in downloads:
                        downloads[tid]["count"] += count
                    else:
                        downloads[tid] = {
                            "count": count,
                        }
                    
                # Add per-date data
                key = filename.replace('_downloads.json', '')
                if key not in downloads:
                    downloads[key] = {}
                downloads[key]["per_data"] = data.get("per_date", {})
                
                
            files_processed += 1

    return downloads


def fetch_downloads(config=config):
    if config['development'].get('production', False):
        return get_downloads(limit=None)
    return get_downloads(limit=config['development'].get('file_processing_limit', 25))