import { Worker } from 'worker_threads';
import path from 'path';

interface WorkerPoolOptions {
  size?: number;
  maxQueueSize?: number;
}

interface WorkerTask {
  type: 'query' | 'get';
  query: string;
  params?: any[];
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private queue: WorkerTask[] = [];
  private activeWorkers = new Map<Worker, boolean>();
  private maxQueueSize: number;

  constructor({ size = 4, maxQueueSize = 1000 }: WorkerPoolOptions = {}) {
    this.maxQueueSize = maxQueueSize;
    
    // Create worker threads
    for (let i = 0; i < size; i++) {
      const worker = new Worker(path.join(process.cwd(), 'src/lib/workers/db-worker.js'));
      this.setupWorker(worker);
      this.workers.push(worker);
      this.activeWorkers.set(worker, false);
    }
  }

  private setupWorker(worker: Worker) {
    worker.on('message', (response) => {
      this.activeWorkers.set(worker, false);
      
      if (response.success) {
        this.queue[0]?.resolve(response.data);
      } else {
        this.queue[0]?.reject(new Error(response.error));
      }
      
      this.queue.shift();
      this.processQueue();
    });

    worker.on('error', (error) => {
      this.activeWorkers.set(worker, false);
      this.queue[0]?.reject(error);
      this.queue.shift();
      this.processQueue();
    });
  }

  private getAvailableWorker(): Worker | null {
    for (const [worker, active] of this.activeWorkers.entries()) {
      if (!active) return worker;
    }
    return null;
  }

  private processQueue() {
    if (this.queue.length === 0) return;

    const worker = this.getAvailableWorker();
    if (!worker) return;

    const task = this.queue[0];
    this.activeWorkers.set(worker, true);
    worker.postMessage({
      type: task.type,
      query: task.query,
      params: task.params
    });
  }

  async query(query: string, params?: any[]): Promise<any[]> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Query queue is full');
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ type: 'query', query, params, resolve, reject });
      this.processQueue();
    });
  }

  async get(query: string, params?: any[]): Promise<any> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Query queue is full');
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ type: 'get', query, params, resolve, reject });
      this.processQueue();
    });
  }

  terminate() {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.queue = [];
    this.activeWorkers.clear();
  }
}