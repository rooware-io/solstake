import { Brightness6 } from "@material-ui/icons";
import { IconButton } from "@material-ui/core";
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