import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { getDownload, type Material } from "../../../api/materials";
import { downloadFile, openDocument } from "../../../lib/files";
import { queryClient } from "../../../api/queryClient";

export function useOpenFile(navigateImages = true) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const open = async (item: Material) => {
    if (controller.current) return;
    controller.current = new AbortController();
    setError(null);
    setProgress(0);
    queryClient.setQueryData(["material", item.id], item);
    try {
      const uri = await downloadFile(
        item,
        () => getDownload(item.id),
        setProgress,
        controller.current.signal,
      );
      if (item.mime_type.startsWith("image/")) {
        if (navigateImages) router.push(`/material/${item.id}`);
      } else {
        try {
          await openDocument(uri, item.mime_type);
        } catch {
          throw new Error(
            "Couldn't open the file. Install a viewer and try again.",
          );
        }
      }
    } catch (reason) {
      if (!controller.current?.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : "Couldn't open the file. Install a viewer and try again.",
        );
    } finally {
      controller.current = null;
      setProgress(null);
    }
  };
  return { open, progress, error, cancel: () => controller.current?.abort() };
}
