import { useEffect } from "react"
import { useLocalStorageState } from "../utils/utils";

function usePrefersDarkMode() {
  return false;
}

export function useDarkMode() {
  const prefersDarkMode = usePrefersDarkMode();
  const [
    isEnabled, 
    setIsEnabled] = useLocalStorageState('dark-mode', undefined);

  const enabled = 
    isEnabled === undefined ? prefersDarkMode : isEnabled;

  useEffect(() => {
    if (window === undefined) return
    const root = window.document.documentElement;
    root.classList.remove(enabled ? 'light' : 'dark');
    root.classList.add(enabled ? 'dark' : 'light');
  }, [enabled]);

  return [enabled, setIsEnabled];
}

