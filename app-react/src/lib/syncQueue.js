const STORAGE_KEY = 'pendingSyncQueue';

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function enqueue(type, payload) {
  const queue = readQueue();
  queue.push({ id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, type, payload });
  writeQueue(queue);
}

export function queueSize() {
  return readQueue().length;
}

// executors: { [type]: async (payload) => void } — cada operação pendente é
// reexecutada; só sai da fila se a execução não lançar erro.
export async function flushQueue(executors) {
  const queue = readQueue();
  if (!queue.length) return { flushed: 0, remaining: 0 };

  const succeededIds = new Set();
  for (const op of queue) {
    const exec = executors[op.type];
    if (!exec) continue;
    try {
      await exec(op.payload);
      succeededIds.add(op.id);
    } catch (err) {
      console.error('flushQueue:', op.type, err);
    }
  }

  // Relê a fila em vez de sobrescrever com o snapshot do início — evita perder
  // itens que foram enfileirados enquanto os `await exec(...)` acima rodavam.
  const current = readQueue().filter(op => !succeededIds.has(op.id));
  writeQueue(current);
  return { flushed: succeededIds.size, remaining: current.length };
}
