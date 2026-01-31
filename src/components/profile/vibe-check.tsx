'use client';

import { Card, CardContent } from '@/components/ui/card';
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
  gradient: string;
  bgPattern: string;
}

function getVibe(member: MemberWithLevel, topEmojis: EmojiUsage[]): Vibe {
  const voiceRatio = member.voice_minutes / (member.message_count + 1);
  const isVoiceHeavy = voiceRatio > 5;
  const isTextHeavy = voiceRatio < 0.5;
  const isBalanced = !isVoiceHeavy && !isTextHeavy;
  
  const emojiStr = topEmojis.map(e => e.emoji).join('');
  const hasLaughEmojis = /[😂🤣😆😹💀]/.test(emojiStr);
  const hasHeartEmojis = /[❤️💕💖💗💓🥰😍]/.test(emojiStr);
  const hasFireEmojis = /[🔥💯⚡️✨]/.test(emojiStr);
  const hasSkullEmojis = /[💀☠️👻]/.test(emojiStr);
  const hasThinkEmojis = /[🤔💭🧠]/.test(emojiStr);
  
  const isHighActivity = member.xp > 50000;
  const isLegend = member.level >= 30;
  
  if (isLegend) {
    return {
      title: 'Server Legend',
      emoji: '👑',
      description: 'You practically live here. The server would not be the same without you.',
      gradient: 'from-yellow-400 via-amber-500 to-orange-500',
      bgPattern: 'radial-gradient(circle at 20% 80%, rgba(251, 191, 36, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.15) 0%, transparent 50%)',
    };
  }
  
  if (isVoiceHeavy && hasLaughEmojis) {
    return {
      title: 'Life of the Party',
      emoji: '🎉',
      description: 'Always in voice, always bringing the laughs. You make hangouts legendary.',
      gradient: 'from-pink-500 via-purple-500 to-indigo-500',
      bgPattern: 'radial-gradient(circle at 10% 90%, rgba(236, 72, 153, 0.15) 0%, transparent 50%), radial-gradient(circle at 90% 10%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',
    };
  }
  
  if (isVoiceHeavy) {
    return {
      title: 'Voice Chat Warrior',
      emoji: '🎧',
      description: 'Why type when you can talk? Your voice channels know you well.',
      gradient: 'from-emerald-400 via-green-500 to-teal-500',
      bgPattern: 'radial-gradient(circle at 30% 70%, rgba(52, 211, 153, 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(20, 184, 166, 0.15) 0%, transparent 50%)',
    };
  }
  
  if (isTextHeavy && hasSkullEmojis) {
    return {
      title: 'Chaos Agent',
      emoji: '💀',
      description: 'Your messages hit different. Somewhere between unhinged and iconic.',
      gradient: 'from-slate-400 via-zinc-500 to-neutral-600',
      bgPattern: 'radial-gradient(circle at 50% 50%, rgba(161, 161, 170, 0.1) 0%, transparent 50%)',
    };
  }
  
  if (isTextHeavy && hasHeartEmojis) {
    return {
      title: 'The Wholesome One',
      emoji: '💖',
      description: 'Spreading love through the chat. You make everyone feel welcome.',
      gradient: 'from-pink-400 via-rose-400 to-red-400',
      bgPattern: 'radial-gradient(circle at 25% 75%, rgba(251, 113, 133, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(244, 114, 182, 0.15) 0%, transparent 50%)',
    };
  }
  
  if (isTextHeavy && hasThinkEmojis) {
    return {
      title: 'Big Brain Energy',
      emoji: '🧠',
      description: 'Thoughtful takes and deep conversations. The intellectual of the group.',
      gradient: 'from-indigo-400 via-blue-500 to-cyan-500',
      bgPattern: 'radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.15) 0%, transparent 50%)',
    };
  }
  
  if (isTextHeavy) {
    return {
      title: 'Keyboard Warrior',
      emoji: '⌨️',
      description: 'Your fingers do the talking. Fast typer, faster thinker.',
      gradient: 'from-blue-400 via-sky-500 to-cyan-400',
      bgPattern: 'radial-gradient(circle at 40% 60%, rgba(56, 189, 248, 0.15) 0%, transparent 50%)',
    };
  }
  
  if (isBalanced && hasFireEmojis) {
    return {
      title: 'The Hype Machine',
      emoji: '🔥',
      description: 'You bring the energy wherever you go. Voice or text, you show up.',
      gradient: 'from-orange-400 via-red-500 to-rose-500',
      bgPattern: 'radial-gradient(circle at 30% 70%, rgba(251, 146, 60, 0.2) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(239, 68, 68, 0.15) 0%, transparent 50%)',
    };
  }
  
  if (isBalanced && isHighActivity) {
    return {
      title: 'The All-Rounder',
      emoji: '⭐',
      description: 'Voice, text, you do it all. A true server citizen.',
      gradient: 'from-violet-400 via-purple-500 to-fuchsia-500',
      bgPattern: 'radial-gradient(circle at 25% 75%, rgba(167, 139, 250, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(217, 70, 239, 0.15) 0%, transparent 50%)',
    };
  }
  
  return {
    title: 'Rising Star',
    emoji: '✨',
    description: 'Your journey is just beginning. Keep vibing!',
    gradient: 'from-cyan-400 via-sky-500 to-blue-500',
    bgPattern: 'radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.15) 0%, transparent 60%)',
  };
}

export function VibeCheck({ member, topEmojis }: VibeCheckProps) {
  const vibe = getVibe(member, topEmojis);
  
  return (
    <Card className="relative overflow-hidden border-0 bg-discord-darker">
      {/* Animated background */}
      <div 
        className="absolute inset-0 opacity-60"
        style={{ background: vibe.bgPattern }}
      />
      
      {/* Gradient border effect */}
      <div className={`absolute inset-0 bg-gradient-to-r ${vibe.gradient} opacity-20`} />
      <div className="absolute inset-[1px] bg-discord-darker rounded-lg" />
      
      {/* Content */}
      <CardContent className="relative p-6">
        <div className="flex items-center gap-2 text-gray-500 mb-4">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Vibe Check</span>
        </div>
        
        <div className="flex items-center gap-5">
          {/* Emoji with glow effect */}
          <div className="relative">
            <div 
              className={`absolute inset-0 bg-gradient-to-r ${vibe.gradient} blur-2xl opacity-40 scale-150`} 
            />
            <span className="relative text-6xl drop-shadow-lg">{vibe.emoji}</span>
          </div>
          
          {/* Text content */}
          <div className="flex-1">
            <h3 className={`text-2xl font-bold bg-gradient-to-r ${vibe.gradient} bg-clip-text text-transparent`}>
              {vibe.title}
            </h3>
            <p className="text-gray-400 text-sm mt-1 leading-relaxed">
              {vibe.description}
            </p>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className={`absolute top-4 right-4 w-20 h-20 bg-gradient-to-br ${vibe.gradient} rounded-full blur-3xl opacity-20`} />
        <div className={`absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-tr ${vibe.gradient} rounded-full blur-2xl opacity-15`} />
      </CardContent>
    </Card>
  );
}
