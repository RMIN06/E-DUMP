import * as FS from "expo-file-system/legacy";
export const removePickedFile = (uri: string) =>
  FS.deleteAsync(uri, { idempotent: true });
export const pickedFileInfo = (uri: string) => FS.getInfoAsync(uri);
