import { useStore } from "zustand";
import { session } from "../auth/session";

export const useSession = () => useStore(session.store);
export const sessionActions = session;
