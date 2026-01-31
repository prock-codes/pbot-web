'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { MemberWithLevel, EmojiUsage } from '@/types';

interface VibeCheckProps {
  member: MemberWithLevel;
  topEmojis: EmojiUsage[];
}

interface Vibe {
  title: string;
  emoji: string;
  description: string;
  color: string;
}

function getVibe(member: MemberWithLevel, topEmojis: EmojiUsage[]): Vibe {
  const voiceRatio = member.voice_minutes / (member.message_count + 1);
  const isVoiceHeavy = voiceRatio > 5;
  const isTextHeavy = voiceRatio < 0.5;
  const isBalanced = !isVoiceHeavy && !isTextHeavy;
  
  // Check for emoji personality
  const emojiStr = topEmojis.map(e => e.emoji).join('');
  const hasLaughEmojis = /[😂🤣😆😹💀]/.test(emojiStr);
  const hasHeartEmojis = /[❤️💕💖💗💓🥰😍]/.test(emojiStr);
  const hasFireEmojis = /[🔥💯⚡️✨]/.test(emojiStr);
  const hasSkullEmojis = /[💀☠️👻]/.test(emojiStr);
  const hasThinkEmojis = /[🤔💭🧠]/.test(emojiStr);
  
  // High activity check
  const isHighActivity = member.xp > 50000;
  const isLegend = member.level >= 30;
  
  if (isLegend) {
    return {
      title: 'Server Legend',
      emoji: '👑',
      description: 'You practically live here. The server would not be the same without you.',
      color: 'from-yellow-500 to-amber-600',
    };
  }
  
  if (isVoiceHeavy && hasLaughEmojis) {
    return {
      title: 'The Life of the Party',
      emoji: '🎉',
      description: 'Always in voice, always bringing the laughs. You make hangouts legendary.',
      color: 'from-pink-500 to-purple-600',
    };
  }
  
  if (isVoiceHeavy) {
    return {
      title: 'Voice Chat Warrior',
      emoji: '🎧',
      description: 'Why type when you can talk? Your voice channels know you well.',
      color: 'from-green-500 to-emerald-600',
    };
  }
  
  if (isTextHeavy && hasSkullEmojis) {
    return {
      title: 'Chaos Agent',
      emoji: '💀',
      description: 'Your messages hit different. Somewhere between unhinged and iconic.',
      color: 'from-gray-600 to-zinc-800',
    };
  }
  
  if (isTextHeavy && hasHeartEmojis) {
    return {
      title: 'The Wholesome One',
      emoji: '💖',
      description: 'Spreading love through the chat. You make everyone feel welcome.',
      color: 'from-pink-400 to-rose-500',
    };
  }
  
  if (isTextHeavy && hasThinkEmojis) {
    return {
      title: 'Big Brain Energy',
      emoji: '🧠',
      description: 'Thoughtful takes and deep conversations. The intellectual of the group.',
      color: 'from-indigo-500 to-blue-600',
    };
  }
  
  if (isTextHeavy) {
    return {
      title: 'Keyboard Warrior',
      emoji: '⌨️',
      description: 'Your fingers do the talking. Fast typer, faster thinker.',
      color: 'from-blue-500 to-cyan-600',
    };
  }
  
  if (isBalanced && hasFireEmojis) {
    return {
      title: 'The Hype Machine',
      emoji: '🔥',
      description: 'You bring the energy wherever you go. Voice or text, you show up.',
      color: 'from-orange-500 to-red-600',
    };
  }
  
  if (isBalanced && isHighActivity) {
    return {
      title: 'The All-Rounder',
      emoji: '⭐',
      description: 'Voice, text, you do it all. A true server citizen.',
      color: 'from-purple-500 to-indigo-600',
    };
  }
  
  return {
    title: 'Rising Star',
    emoji: '✨',
    description: 'Your journey is just beginning. Keep vibing!',
    color: 'from-cyan-500 to-blue-500',
  };
}

export function VibeCheck({ member, topEmojis }: VibeCheckProps) {
  const vibe = getVibe(member, topEmojis);
  
  return (
    <Card className="overflow-hidden">
      <div className={`bg-gradient-to-r ${vibe.color} p-1`}>
        <div className="bg-discord-dark">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide text-gray-400">
              <Sparkles className="w-4 h-4" />
              Vibe Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span className="text-5xl">{vibe.emoji}</span>
              <div>
                <h3 className={`text-xl font-bold bg-gradient-to-r ${vibe.color} bg-clip-text text-transparent`}>
                  {vibe.title}
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {vibe.description}
                </p>
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
