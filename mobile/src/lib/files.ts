import * as FS from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";

const capacity = 500 * 1024 * 1024;
const types: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};
type FileMetadata = { file_id: string; mime_type: string; size_bytes: number };
type Link = { url: string; size_bytes: number; mime_type: string };
const flights = new Map<string, Promise<string>>();
const tasks = new Map<FS.DownloadResumable, () => void>();
let generation = 0;
let cacheQueue = Promise.resolve();
function folder() {
  if (!FS.cacheDirectory) throw new Error("File storage is unavailable.");
  return FS.cacheDirectory + "files/";
}
async function index() {
  try {
    const parsed: unknown = JSON.parse(
      await FS.readAsStringAsync(folder() + "index.json"),
    );
    if (typeof parsed === "object" && parsed !== null)
      return Object.fromEntries(
        Object.entries(parsed).filter(
          (entry): entry is [string, number] =>
            typeof entry[1] === "number" && Number.isFinite(entry[1]),
        ),
      );
  } catch {
    /* A missing or damaged index is rebuilt from file metadata. */
  }
  return {} as Record<string, number>;
}
async function touchAndTrim(uri: string, epoch: number) {
  cacheQueue = cacheQueue
    .catch(() => undefined)
    .then(async () => {
      if (epoch !== generation) throw new Error("File access cancelled.");
      const times = await index();
      const filename = uri.slice(folder().length);
      times[filename] = Date.now();
      const entries = [];
      for (const name of await FS.readDirectoryAsync(folder())) {
        if (!/^[a-f\d]{24}\.(pdf|png|jpg|webp|pptx|docx)$/.test(name)) continue;
        const info = await FS.getInfoAsync(folder() + name);
        if (info.exists && !info.isDirectory)
          entries.push({
            name,
            size: info.size,
            last: times[name] ?? info.modificationTime * 1000,
          });
      }
      let total = entries.reduce((sum, entry) => sum + entry.size, 0);
      for (const entry of entries.sort((a, b) => a.last - b.last)) {
        if (total <= capacity) break;
        if (entry.name === filename) continue;
        await FS.deleteAsync(folder() + entry.name, { idempotent: true });
        total -= entry.size;
        delete times[entry.name];
      }
      if (epoch !== generation) throw new Error("File access cancelled.");
      await FS.writeAsStringAsync(
        folder() + "index.json",
        JSON.stringify(times),
      );
    });
  await cacheQueue;
}

export async function cachedFile(file: FileMetadata): Promise<string | null> {
  const extension = types[file.mime_type];
  if (!extension || !/^[a-f\d]{24}$/.test(file.file_id))
    throw new Error("Invalid file details.");
  const uri = folder() + file.file_id + "." + extension;
  const info = await FS.getInfoAsync(uri);
  if (!info.exists || info.isDirectory || info.size !== file.size_bytes)
    return null;
  await touchAndTrim(uri, generation);
  return uri;
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
    if (signal?.aborted) throw new Error("Download cancelled.");
    const cached = await cachedFile(file);
    if (cached) {
      onProgress(1);
      return cached;
    }
    const link = await getLink();
    if (epoch !== generation || signal?.aborted)
      throw new Error("Download cancelled.");
    if (
      !link.url.startsWith("https://") ||
      link.mime_type !== file.mime_type ||
      link.size_bytes !== file.size_bytes
    )
      throw new Error("Invalid download details.");
    const uri = folder() + file.file_id + "." + types[file.mime_type];
    const partial = uri + ".part";
    await FS.makeDirectoryAsync(folder(), { intermediates: true });
    const task = FS.createDownloadResumable(link.url, partial, {}, (event) => {
      if (event.totalBytesExpectedToWrite > 0)
        onProgress(
          Math.min(
            1,
            event.totalBytesWritten / event.totalBytesExpectedToWrite,
          ),
        );
    });
    let rejectAbort: (reason: Error) => void = () => undefined;
    const aborted = new Promise<never>((_, reject) => {
      rejectAbort = reject;
    });
    const abort = () => {
      void task.cancelAsync().catch(() => undefined);
      rejectAbort(new Error("Download cancelled or timed out. Try again."));
    };
    tasks.set(task, abort);
    const timer = setTimeout(abort, 120_000);
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const result = await Promise.race([task.downloadAsync(), aborted]);
      const info = await FS.getInfoAsync(partial);
      if (epoch !== generation || signal?.aborted)
        throw new Error("Download cancelled.");
      if (
        !result ||
        result.status !== 200 ||
        !info.exists ||
        info.isDirectory ||
        info.size !== file.size_bytes
      )
        throw new Error("Couldn't finish downloading. Try again.");
      await FS.moveAsync({ from: partial, to: uri });
      await touchAndTrim(uri, epoch);
      onProgress(1);
      return uri;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      tasks.delete(task);
      await FS.deleteAsync(partial, { idempotent: true });
    }
  })().finally(() => flights.delete(file.file_id));
  flights.set(file.file_id, flight);
  return flight;
}

export async function cancelDownloads() {
  generation += 1;
  for (const abort of tasks.values()) abort();
  await Promise.allSettled([...tasks.keys()].map((task) => task.cancelAsync()));
  await cacheQueue.catch(() => undefined);
}
export async function clearDownloads() {
  await cancelDownloads();
  await FS.deleteAsync(folder(), { idempotent: true });
}
export async function removeCachedFile(file: FileMetadata) {
  const extension = types[file.mime_type];
  if (extension && /^[a-f\d]{24}$/.test(file.file_id))
    await FS.deleteAsync(folder() + file.file_id + "." + extension, {
      idempotent: true,
    });
}
export async function openDocument(uri: string, mime: string) {
  if (Platform.OS === "android") {
    const content = await FS.getContentUriAsync(uri);
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: content,
      flags: 1,
      type: mime,
    });
  } else {
    if (!(await Sharing.isAvailableAsync()))
      throw new Error("No file viewer is available.");
    await Sharing.shareAsync(uri, { mimeType: mime });
  }
}
