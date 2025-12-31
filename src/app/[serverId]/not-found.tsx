import Link from 'next/link';
import { Home, AlertCircle } from 'lucide-react';

export default function ServerNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <AlertCircle className="w-16 h-16 text-discord-red mb-4" />
      <h1 className="text-4xl font-bold text-white mb-2">Server Not Found</h1>
      <p className="text-gray-400 mb-6">
        This server doesn't exist or the bot hasn't been added yet.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-discord-blurple hover:bg-discord-blurple/80 text-white px-4 py-2 rounded-lg transition-colors"
      >
        <Home className="w-4 h-4" />
        <span>Back to Home</span>
      </Link>
    </div>
  );
}
