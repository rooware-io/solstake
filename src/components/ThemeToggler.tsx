import { Brightness6 } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useDarkMode } from "../hooks/useDarkMode";

export function ThemeToggler() {
  const [isDark, setIsDark] = useDarkMode();

  return (
    <IconButton
      onClick={(e) => setIsDark(!isDark)}
    >
      <Brightness6 />
    </IconButton>
  )
}