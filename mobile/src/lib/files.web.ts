import { session } from "../auth/session";
type FileMetadata = { file_id: string; mime_type: string; size_bytes: number };
type Link = { url: string; size_bytes: number; mime_type: string };
const cacheName = "edump-private-files";
const capacity = 500 * 1024 * 1024;
const objects = new Map<string, string>();
const controllers = new Set<AbortController>();
const flights = new Map<string, Promise<string>>();
let generation = 0;
let queue = Promise.resolve();
function key(file: FileMetadata) {
  if (!/^[a-f\d]{24}$/.test(file.file_id))
    throw new Error("Invalid file details.");
  return new URL(`/saved-files/${file.file_id}`, location.origin).href;
}
function objectUrl(file: FileMetadata, blob: Blob) {
  const existing = objects.get(file.file_id);
  if (existing) return existing;
  const uri = URL.createObjectURL(blob);
  objects.set(file.file_id, uri);
  return uri;
}
export async function cachedFile(file: FileMetadata): Promise<string | null> {
  const epoch = generation;
  const cache = await caches.open(cacheName);
  const saved = await cache.match(key(file));
  if (!saved) return null;
  const blob = await saved.blob();
  if (blob.size !== file.size_bytes || blob.type !== file.mime_type)
    return null;
  if (epoch !== generation) throw new Error("File access cancelled.");
  // CacheStorage insertion order supplies the least-recently-used eviction order.
  queue = queue
    .catch(() => undefined)
    .then(async () => {
      if (epoch !== generation) throw new Error("File access cancelled.");
      await cache.delete(key(file));
      await cache.put(
        key(file),
        new Response(blob, {
          headers: {
            "Content-Type": file.mime_type,
            "Content-Length": String(blob.size),
          },
        }),
      );
    });
  await queue;
  return objectUrl(file, blob);
}
export function downloadFile(
  file: FileMetadata,
  getLink: () => Promise<Link>,
  onProgress: (value: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const running = flights.get(file.file_id);
  if (running) return running;
  const epoch = generation;
  const flight = (async () => {
    const saved = await cachedFile(file);
    if (signal?.aborted || epoch !== generation)
      throw new Error("Download cancelled.");
    if (saved) {
      onProgress(1);
      return saved;
    }
    const link = await getLink();
    if (
      !link.url.startsWith("https://") ||
      link.size_bytes !== file.size_bytes ||
      link.mime_type !== file.mime_type
    )
      throw new Error("Invalid download details.");
    const controller = new AbortController();
    controllers.add(controller);
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, 120_000);
    try {
      if (signal?.aborted || epoch !== generation) controller.abort();
      const response = await fetch(
        `/api/download?url=${encodeURIComponent(link.url)}`,
        {
          headers: {
            Authorization: `Bearer ${session.store.getState().accessToken ?? ""}`,
          },
          signal: controller.signal,
        },
      );
      if (!response.ok || !response.body)
        throw new Error("Couldn't download. Try again.");
      const reader = response.body.getReader();
      const parts: Uint8Array<ArrayBuffer>[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(new Uint8Array(value));
        received += value.length;
        if (received > file.size_bytes) {
          await reader.cancel();
          throw new Error("Invalid download size.");
        }
        onProgress(received / file.size_bytes);
      }
      if (received !== file.size_bytes || epoch !== generation)
        throw new Error("Download cancelled or incomplete.");
      const blob = new Blob(parts, { type: file.mime_type });
      queue = queue
        .catch(() => undefined)
        .then(async () => {
          if (epoch !== generation) throw new Error("Download cancelled.");
          const cache = await caches.open(cacheName);
          let total = blob.size;
          const entries = [];
          for (const request of await cache.keys()) {
            const response = await cache.match(request);
            const size = Number(response?.headers.get("Content-Length") ?? 0);
            total += size;
            entries.push({ request, size });
          }
          for (const entry of entries) {
            if (total <= capacity) break;
            await cache.delete(entry.request);
            const id =
              new URL(entry.request.url).pathname.split("/").pop() ?? "";
            const uri = objects.get(id);
            if (uri) URL.revokeObjectURL(uri);
            objects.delete(id);
            total -= entry.size;
          }
          await cache.put(
            key(file),
            new Response(blob, {
              headers: {
                "Content-Type": file.mime_type,
                "Content-Length": String(blob.size),
              },
            }),
          );
        });
      await queue;
      onProgress(1);
      return objectUrl(file, blob);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      controllers.delete(controller);
    }
  })().finally(() => flights.delete(file.file_id));
  flights.set(file.file_id, flight);
  return flight;
}
export async function cancelDownloads() {
  generation += 1;
  for (const controller of controllers) controller.abort();
  await Promise.allSettled([...flights.values()]);
  await queue.catch(() => undefined);
  for (const uri of objects.values()) URL.revokeObjectURL(uri);
  objects.clear();
}
export async function clearDownloads() {
  await cancelDownloads();
  await caches.delete(cacheName);
}
export async function removeCachedFile(file: FileMetadata) {
  await (await caches.open(cacheName)).delete(key(file));
  const uri = objects.get(file.file_id);
  if (uri) URL.revokeObjectURL(uri);
  objects.delete(file.file_id);
}
export async function openDocument(uri: string, mime: string) {
  // Downloads avoid pop-up blockers after an asynchronous API/file operation.
  const anchor = document.createElement("a");
  anchor.href = uri;
  anchor.download =
    "E-DUMP-file." +
    ({
      "application/pdf": "pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "docx",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        "pptx",
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
    }[mime] ?? "bin");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
