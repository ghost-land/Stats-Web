use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use dashmap::DashMap;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use parking_lot::RwLock;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use tokio::fs;
use tokio::time::interval;
use tracing::{info, warn};

#[derive(Debug, Serialize, Deserialize)]
struct GameStats {
    per_date: std::collections::BTreeMap<String, u64>,
    tid_downloads: std::collections::HashMap<String, u64>,
    total_downloads: u64,
}

#[derive(Debug, Serialize)]
struct IndexedGame {
    tid: String,
    is_base: bool,
    is_update: bool,
    is_dlc: bool,
    base_tid: Option<String>,
    stats: GameStats,
    last_updated: DateTime<Utc>,
}

struct GameIndex {
    games: DashMap<String, IndexedGame>,
}

impl GameIndex {
    fn new() -> Self {
        Self {
            games: DashMap::new(),
        }
    }

    async fn process_file(&self, path: &Path) -> Result<()> {
        // Extract TID from filename (remove _downloads.json)
        let tid = path.file_stem()
            .and_then(|s| s.to_str())
            .and_then(|s| s.strip_suffix("_downloads"))
            .context("Invalid filename")?;

        let content = fs::read_to_string(path).await?;
        let stats: GameStats = serde_json::from_str(&content)?;
        
        let game = IndexedGame {
            tid: tid.to_string(),
            is_base: tid.ends_with("000"),
            is_update: tid.ends_with("800"),
            is_dlc: !tid.ends_with("000") && !tid.ends_with("800"),
            base_tid: if tid.ends_with("000") {
                None
            } else {
                Some(format!("{}000", &tid[..12]))
            },
            stats,
            last_updated: Utc::now(),
        };

        self.games.insert(tid.to_string(), game);
        Ok(())
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let index = Arc::new(GameIndex::new());
    let data_dir = PathBuf::from("data");

    // Initial indexing
    info!("Starting initial indexing...");
    let mut entries = fs::read_dir(&data_dir).await?;
    while let Some(entry) = entries.next_entry().await? {
        if let Err(e) = index.process_file(&entry.path()).await {
            warn!("Error processing file {:?}: {}", entry.path(), e);
        }
    }

    // Watch for changes
    let index_clone = index.clone();
    let mut watcher = RecommendedWatcher::new(
        move |res| {
            if let Ok(event) = res {
                // Handle file system events
                // Only process files ending with _downloads.json
                if let notify::Event::Create(path) | notify::Event::Modify(path) = event {
                    if path.to_str()
                        .map(|s| s.ends_with("_downloads.json"))
                        .unwrap_or(false)
                    {
                        // Process the file
                    }
                }
            }
        },
        notify::Config::default(),
    )?;

    watcher.watch(&data_dir, RecursiveMode::Recursive)?;

    tokio::signal::ctrl_c().await?;
    Ok(())
}