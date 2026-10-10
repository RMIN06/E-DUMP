export async function removePickedFile(uri: string) {
  if (uri.startsWith("blob:")) URL.revokeObjectURL(uri);
}
export async function pickedFileInfo(uri: string) {
  const blob = await (await fetch(uri)).blob();
  return { exists: true, isDirectory: false, size: blob.size };
}
