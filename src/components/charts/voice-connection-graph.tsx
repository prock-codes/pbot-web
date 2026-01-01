'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getVoiceGraph, calculateVoiceConnections, getVoiceConnections, transformToGraph } from '@/lib/queries/voice-connections';
import { VoiceGraphNode, VoiceGraphEdge, VoiceConnectionTimeRange } from '@/types';
import { Users, Clock, RefreshCw } from 'lucide-react';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div className="w-full h-[500px] bg-discord-darker rounded-lg animate-pulse" />,
});

interface VoiceConnectionGraphProps {
  serverId: string;
}

type TimeRangeOption = {
  value: VoiceConnectionTimeRange;
  label: string;
};

const TIME_RANGES: TimeRangeOption[] = [
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

interface GraphData {
  nodes: (VoiceGraphNode & { val: number })[];
  links: VoiceGraphEdge[];
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Image cache for avatars
const imageCache = new Map<string, HTMLImageElement>();
const loadingCallbacks = new Map<string, Set<() => void>>();
const DEFAULT_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png';

function getOrLoadImage(url: string | null, onLoad?: () => void): HTMLImageElement | null {
  const imageUrl = url || DEFAULT_AVATAR;

  if (imageCache.has(imageUrl)) {
    const img = imageCache.get(imageUrl)!;
    if (img.complete && img.naturalWidth > 0) {
      return img;
    }
    // Image still loading, register callback
    if (onLoad) {
      const callbacks = loadingCallbacks.get(imageUrl) || new Set();
      callbacks.add(onLoad);
      loadingCallbacks.set(imageUrl, callbacks);
    }
    return null;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  imageCache.set(imageUrl, img);

  // Register callback if provided
  if (onLoad) {
    const callbacks = new Set<() => void>();
    callbacks.add(onLoad);
    loadingCallbacks.set(imageUrl, callbacks);
  }

  img.onload = () => {
    const callbacks = loadingCallbacks.get(imageUrl);
    if (callbacks) {
      callbacks.forEach((cb) => cb());
      loadingCallbacks.delete(imageUrl);
    }
  };

  img.onerror = () => {
    // On error, try default avatar instead
    imageCache.delete(imageUrl);
    loadingCallbacks.delete(imageUrl);
    if (imageUrl !== DEFAULT_AVATAR && onLoad) {
      getOrLoadImage(DEFAULT_AVATAR, onLoad);
    }
  };

  img.src = imageUrl;

  return null; // Return null while loading
}

export function VoiceConnectionGraph({ serverId }: VoiceConnectionGraphProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [timeRange, setTimeRange] = useState<VoiceConnectionTimeRange>('30d');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [calculatedAt, setCalculatedAt] = useState<Date | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoveredNode, setHoveredNode] = useState<VoiceGraphNode | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [, setImagesLoaded] = useState(0); // Trigger re-render when images load

  // Force graph to repaint when images load
  const triggerRepaint = useCallback(() => {
    setImagesLoaded((n) => n + 1);
    // Also try to refresh the graph directly
    if (graphRef.current?.refresh) {
      graphRef.current.refresh();
    }
  }, []);

  // Force refresh the cache
  const handleRefresh = useCallback(async () => {
    setCalculating(true);
    try {
      await calculateVoiceConnections(serverId, timeRange);
      const connections = await getVoiceConnections(serverId, timeRange);
      const { nodes, edges } = transformToGraph(connections);

      // Calculate node sizes based on total shared time (normalized)
      const maxTime = Math.max(...nodes.map((n) => n.totalSharedTime), 1);
      const graphNodes = nodes.map((node) => ({
        ...node,
        val: 3 + (node.totalSharedTime / maxTime) * 9, // Size between 3 and 12
      }));

      setGraphData({
        nodes: graphNodes,
        links: edges,
      });
      setCalculatedAt(new Date());
      setRefreshKey((k) => k + 1);

      // Trigger repaint after a short delay to ensure images render
      setTimeout(() => {
        triggerRepaint();
      }, 100);
    } catch (err) {
      console.error('Failed to refresh voice connections:', err);
    } finally {
      setCalculating(false);
    }
  }, [serverId, timeRange, triggerRepaint]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setDimensions({
            width: rect.width,
            height: 500,
          });
        }
      }
    };

    // Run after a short delay to ensure container is rendered
    const timer = setTimeout(updateDimensions, 50);

    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [graphData]); // Re-run when graphData changes (container becomes visible)

  // Load graph data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { nodes, edges, calculatedAt, isStale } = await getVoiceGraph(
          serverId,
          timeRange
        );

        if (isStale) {
          setCalculating(true);
        }

        // Calculate node sizes based on total shared time (normalized)
        const maxTime = Math.max(...nodes.map((n) => n.totalSharedTime), 1);
        const graphNodes = nodes.map((node) => ({
          ...node,
          val: 3 + (node.totalSharedTime / maxTime) * 9, // Size between 3 and 12
        }));

        setGraphData({
          nodes: graphNodes,
          links: edges,
        });
        setCalculatedAt(calculatedAt);

        // Trigger repaint after a short delay to ensure images render
        setTimeout(() => {
          setImagesLoaded((n) => n + 1);
        }, 100);
      } catch (err) {
        console.error('Failed to load voice connections:', err);
      } finally {
        setLoading(false);
        setCalculating(false);
      }
    }

    loadData();
  }, [serverId, timeRange]);

  // Handle node click - navigate to member profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeClick = useCallback(
    (node: any) => {
      router.push(`/${serverId}/${node.id}`);
    },
    [router, serverId]
  );

  // Custom node rendering
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D) => {
      if (node.x === undefined || node.y === undefined) return;

      const size = node.val;
      const isHovered = hoveredNode?.id === node.id;

      // Try to get avatar image
      const img = getOrLoadImage(node.avatarUrl, triggerRepaint);

      ctx.save();

      // Create circular clipping path
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.closePath();

      if (img) {
        // Draw avatar image clipped to circle
        ctx.clip();
        ctx.drawImage(
          img,
          node.x - size,
          node.y - size,
          size * 2,
          size * 2
        );
        ctx.restore();

        // Draw border on top
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
        ctx.strokeStyle = isHovered ? '#FFFFFF' : '#7289DA';
        ctx.lineWidth = isHovered ? 3 : 1.5;
        ctx.stroke();
      } else {
        // Fallback to colored circle while image loads
        ctx.fillStyle = isHovered ? '#5865F2' : '#4752C4';
        ctx.fill();
        ctx.strokeStyle = isHovered ? '#FFFFFF' : '#7289DA';
        ctx.lineWidth = isHovered ? 3 : 1.5;
        ctx.stroke();
        ctx.restore();
      }

    },
    [hoveredNode, triggerRepaint]
  );

  // Custom pointer area for proper hover/click detection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paintNodePointerArea = useCallback(
    (node: any, color: string, ctx: CanvasRenderingContext2D) => {
      if (node.x === undefined || node.y === undefined) return;

      const size = node.val;
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    },
    []
  );

  // Custom link rendering
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paintLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D) => {
      const source = link.source;
      const target = link.target;

      if (source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) return;

      // Calculate line width based on shared time (normalized)
      const maxSeconds = 3600 * 10; // 10 hours max for visualization
      const normalizedWidth = Math.min(link.sharedSeconds / maxSeconds, 1);
      const lineWidth = 0.5 + normalizedWidth * 4;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = `rgba(114, 137, 218, ${0.2 + normalizedWidth * 0.4})`; // Discord blurple with opacity
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    },
    []
  );

  if (loading && !graphData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Social Web
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[500px] rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Social Web
            {calculating && (
              <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                disabled={calculating}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeRange === range.value
                    ? 'bg-discord-blurple text-white'
                    : 'bg-discord-darker text-gray-400 hover:text-white'
                } disabled:opacity-50`}
              >
                {range.label}
              </button>
            ))}
            <button
              onClick={handleRefresh}
              disabled={calculating}
              className="px-3 py-1 text-sm rounded-md bg-discord-darker text-gray-400 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1"
              title="Refresh cache"
            >
              <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
        {calculatedAt && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last updated: {calculatedAt.toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {!graphData || graphData.nodes.length === 0 ? (
          <div className="w-full h-[500px] flex items-center justify-center text-gray-400">
            <p>No voice connections found for this time period</p>
          </div>
        ) : (
          <div ref={containerRef} className="relative w-full h-[500px] bg-discord-darker rounded-lg overflow-hidden">
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor="#1e1f22"
              nodeRelSize={1}
              nodeCanvasObject={paintNode}
              nodePointerAreaPaint={paintNodePointerArea}
              linkCanvasObject={paintLink}
              onNodeClick={handleNodeClick}
              onNodeHover={(node) => setHoveredNode(node as VoiceGraphNode | null)}
              cooldownTicks={100}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
              linkDirectionalParticles={0}
              enableNodeDrag={true}
              enableZoomInteraction={true}
              enablePanInteraction={true}
            />
            {hoveredNode && (
              <div className="absolute bottom-4 left-4 bg-discord-light p-3 rounded-lg shadow-lg">
                <p className="font-medium text-white">
                  {hoveredNode.displayName || hoveredNode.username || 'Unknown'}
                </p>
                <p className="text-sm text-gray-400">
                  {hoveredNode.totalConnections} connection{hoveredNode.totalConnections !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-400">
                  {formatTime(hoveredNode.totalSharedTime)} shared
                </p>
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3 text-center">
          Larger nodes = more time spent in voice. Thicker lines = more time together. Click a node to view profile.
        </p>
      </CardContent>
    </Card>
  );
}
