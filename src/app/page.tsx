import { Card } from '@/components/ui/card';
import { Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Zap className="w-10 h-10 text-discord-blurple" />
          <h1 className="text-4xl font-bold text-white">PBot</h1>
        </div>
        <p className="text-gray-400 text-lg">
          View your Discord server statistics and leaderboards
        </p>
      </div>

      <Card className="text-center py-12">
        <p className="text-xl text-white mb-2">PBot is lurking in your servers...</p>
        <p className="text-gray-400">
          Silently judging your activity and taking notes. Always watching. Never sleeping.
        </p>
      </Card>
    </div>
  );
}
