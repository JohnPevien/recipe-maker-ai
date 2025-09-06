
import Link from 'next/link';

const Navigation: React.FC = () => {
  return (
    <header className="flex justify-between items-center p-4 bg-white shadow-md dark:bg-black
    border-b-[0.5px] border-white container mx-auto">
      <div className=" flex items-center">
        <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300">
          Recipe Maker AI
        </Link>
      </div>
      <nav
        className="flex space-x-4 md:space-x-6"
        role="navigation"
        aria-label="Main navigation"
      >
        <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          Home
        </Link>
        <Link href="/about" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          About
        </Link>
      </nav>
    </header>
  );
};

export default Navigation;