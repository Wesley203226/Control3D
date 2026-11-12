import { Toaster } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';

export default function AppToaster() {
  const { dark } = useTheme();
  return <Toaster theme={dark ? 'dark' : 'light'} position="top-right" richColors closeButton />;
}
