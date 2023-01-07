import 'tailwindcss/tailwind.css';
import { ThemeProvider } from 'next-themes';

import Navbar from './../components/Navbar';

function MyApp({ Component, pageProps }) {
  return (
    <ThemeProvider attribute="class">
      <div className="dark:bg-gray-900 bg-gray-50 w-full min-h-screen">
        <Navbar />
        <Component { ...pageProps } />
      </div>
    </ThemeProvider>
  );
}

export default MyApp;
