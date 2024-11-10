import os
import json
import requests
from tqdm import tqdm

from functools import lru_cache
from datetime import datetime, timedelta
from utils.get_config import config


def init_nlib():
    nlib_path = 'temp/nlib.json'
    update_needed = True

    if os.path.isfile(nlib_path):
        file_mod_time = datetime.fromtimestamp(os.path.getmtime(nlib_path))
        if datetime.now() - file_mod_time < timedelta(weeks=1):
            update_needed = False

    if update_needed:
        url = 'https://api.nlib.cc/nx/all'
        tqdm.write(f"[REQUEST] {url}")
        response = requests.get(url, stream=True)
        total_size = int(response.headers.get('content-length', 0))
        block_size = 1024
        t = tqdm(total=total_size, unit='iB', unit_scale=True)
        with open(nlib_path, 'wb') as file:
            for data in response.iter_content(block_size):
                t.update(len(data))
                file.write(data)
        t.close()

        with open(nlib_path, 'r', encoding="utf-8") as file:
            data = json.load(file)
        
        with open(nlib_path, 'w', encoding="utf-8") as file:
            json.dump(data.get('titledb', {}), file, indent=4)

    with open(nlib_path, 'r', encoding="utf-8") as file:
        nlib = json.load(file)
    
    return nlib

nlib_data = init_nlib()

@lru_cache(maxsize=1024)
def nlib(tid, force=False, call_api_if_not_found=False):
    global nlib_data
    
    if tid in nlib_data and not force:
        # tqdm.write(f"Using cached data for {tid}")
        return nlib_data[tid]
    
    if call_api_if_not_found:
        url = f'https://api.nlib.cc/nx/{tid}'
        tqdm.write(f"[REQUEST] {url}")
        response = requests.get(url)
        if response.status_code == 200:
            try:
                nlib_data[tid] = response.json()
                return response.json()
            finally:
                with open('temp/nlib.json', 'w', encoding="utf-8") as file:
                    json.dump(nlib_data, file, indent=4)
    
    return {}


def get_downloads(limit=None):
    downloads = {}
    data_dir = config.get('data_file_path', 'data')
    files_processed = 0

    for filename in tqdm(os.listdir(data_dir), desc="Processing files"):
        # tqdm.write(filename)
        if filename.endswith('_downloads.json'):
            if limit is not None and files_processed >= limit:
                break
            with open(os.path.join(data_dir, filename), 'r', encoding="utf-8") as file:
                data = json.load(file)
                
                for tid, count in data.get("tid_downloads", {}).items():
                    
                    # Add total downloads
                    if tid in downloads:
                        downloads[tid]["count"] += count
                    else:
                        downloads[tid] = {
                            "count": count,
                        }
                    
                    if "infos" not in downloads[tid]:
                        downloads[tid]["infos"] = nlib(tid)
                    
                # Add per-date data
                key = filename.replace('_downloads.json', '')
                if key not in downloads:
                    downloads[key] = {}
                downloads[key]["per_data"] = data.get("per_date", {})
                
            files_processed += 1

    # Calculate total downloads
    total_downloads = sum(item["count"] for item in downloads.values() if "count" in item)

    sorted_games = sorted(downloads.items(), key=lambda item: item[1]["count"], reverse=True)
    return dict(sorted_games), total_downloads


def fetch_downloads(config=config):
    if config['development'].get('production', False):
        return get_downloads(limit=None)
    return get_downloads(limit=config['development'].get('file_processing_limit', 25))