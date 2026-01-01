'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getVoiceConnections,
  calculateVoiceConnections,
} from '@/lib/queries/voice-connections';
import {
  getTextConnections,
  calculateTextConnections,
  getServerActivityWeight,
} from '@/lib/queries/text-connections';
import { ConnectionTimeRange, ServerActivityWeight } from '@/types';
import { Users, Clock, RefreshCw, Mic, MessageSquare } from 'lucide-react';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-discord-darker rounded-lg animate-pulse" />
  ),
});

interface CombinedConnectionGraphProps {
  serverId: string;
}

type TimeRangeOption = {
  value: ConnectionTimeRange;
  label: string;
};

type ViewMode = 'combined' | 'voice' | 'text';

type ViewModeOption = {
  value: ViewMode;
  label: string;
  icon: React.ReactNode;
};

const TIME_RANGES: TimeRangeOption[] = [
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' },
];

const VIEW_MODES: ViewModeOption[] = [
  { value: 'combined', label: 'All', icon: <Users className="w-3 h-3" /> },
  { value: 'voice', label: 'Voice', icon: <Mic className="w-3 h-3" /> },
  { value: 'text', label: 'Text', icon: <MessageSquare className="w-3 h-3" /> },
];

interface CombinedNode {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  voiceScore: number;
  textScore: number;
  combinedScore: number;
  val: number;
  // Position fields added by force-graph (optional, may not exist initially)
  x?: number;
  y?: number;
}

interface CombinedEdge {
  source: string | CombinedNode;
  target: string | CombinedNode;
  voiceSeconds: number;
  textScore: number;
  combinedStrength: number;
  primaryType: 'voice' | 'text' | 'both';
}

interface GraphData {
  nodes: CombinedNode[];
  links: CombinedEdge[];
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Image cache for avatars (module-level singleton)
const imageCache = new Map<string, HTMLImageElement>();
const loadingCallbacks = new Map<string, Set<() => void>>();
const DEFAULT_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png';

function getOrLoadImage(
  url: string | null,
  onLoad?: () => void
): HTMLImageElement | null {
  const imageUrl = url || DEFAULT_AVATAR;

  if (imageCache.has(imageUrl)) {
    const img = imageCache.get(imageUrl)!;
    if (img.complete && img.naturalWidth > 0) {
      return img;
    }
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
    imageCache.delete(imageUrl);
    loadingCallbacks.delete(imageUrl);
    if (imageUrl !== DEFAULT_AVATAR && onLoad) {
      getOrLoadImage(DEFAULT_AVATAR, onLoad);
    }
  };

  img.src = imageUrl;

  return null;
}

// Helper to get node ID from source/target (which may be string or object after simulation)
function getNodeId(nodeOrId: string | CombinedNode): string {
  return typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.id;
}

export function CombinedConnectionGraph({
  serverId,
}: CombinedConnectionGraphProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('combined');
  const [timeRange, setTimeRange] = useState<ConnectionTimeRange>('30d');
  const [fullGraphData, setFullGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [calculatedAt, setCalculatedAt] = useState<Date | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoveredNode, setHoveredNode] = useState<CombinedNode | null>(null);
  const [activityWeight, setActivityWeight] = useState<ServerActivityWeight | null>(null);
  const [hasVoiceData, setHasVoiceData] = useState(false);
  const [hasTextData, setHasTextData] = useState(false);
  const [, setImagesLoaded] = useState(0);

  const triggerRepaint = useCallback(() => {
    setImagesLoaded((n) => n + 1);
    if (graphRef.current?.refresh) {
      graphRef.current.refresh();
    }
  }, []);

  // Memoized filtered graph data based on view mode
  // Key fix: Create fresh objects for each view mode to avoid position conflicts
  const currentGraphData = useMemo((): GraphData | null => {
    if (!fullGraphData) return null;

    if (viewMode === 'combined') {
      // For combined view, return fresh copies to ensure clean state
      const nodes = fullGraphData.nodes.map(node => ({
        ...node,
        // Don't copy x/y - let simulation calculate fresh positions
      }));
      const links = fullGraphData.links.map(link => ({
        ...link,
        source: getNodeId(link.source),
        target: getNodeId(link.target),
      }));
      return { nodes, links };
    }

    // Filter edges based on view mode
    const filteredLinks = fullGraphData.links.filter((link) => {
      if (viewMode === 'voice') {
        return link.voiceSeconds > 0;
      } else {
        return link.textScore > 0;
      }
    });

    // Get node IDs that are part of filtered edges
    const nodeIds = new Set<string>();
    filteredLinks.forEach((link) => {
      nodeIds.add(getNodeId(link.source));
      nodeIds.add(getNodeId(link.target));
    });

    // Filter and recalculate nodes
    const filteredNodes = fullGraphData.nodes.filter((node) => nodeIds.has(node.id));

    // Recalculate node sizes based on filtered data
    const maxScore = Math.max(
      ...filteredNodes.map((n) => (viewMode === 'voice' ? n.voiceScore : n.textScore)),
      1
    );

    const recalculatedNodes: CombinedNode[] = filteredNodes.map((node) => {
      const score = viewMode === 'voice' ? node.voiceScore : node.textScore;
      return {
        id: node.id,
        username: node.username,
        displayName: node.displayName,
        avatarUrl: node.avatarUrl,
        voiceScore: node.voiceScore,
        textScore: node.textScore,
        combinedScore: node.combinedScore,
        val: 3 + (score / maxScore) * 9,
        // Don't copy x/y - let simulation calculate fresh positions
      };
    });

    // Create fresh link objects with string IDs
    const recalculatedLinks: CombinedEdge[] = filteredLinks.map((link) => ({
      source: getNodeId(link.source),
      target: getNodeId(link.target),
      voiceSeconds: link.voiceSeconds,
      textScore: link.textScore,
      combinedStrength: link.combinedStrength,
      primaryType: link.primaryType,
    }));

    return {
      nodes: recalculatedNodes,
      links: recalculatedLinks,
    };
  }, [fullGraphData, viewMode]);

  // Reheat simulation when view mode changes
  useEffect(() => {
    if (graphRef.current && currentGraphData && currentGraphData.nodes.length > 0) {
      // Small delay to ensure graph has updated
      const timer = setTimeout(() => {
        graphRef.current?.d3ReheatSimulation?.();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [viewMode, currentGraphData]);

  // Combine voice and text data into unified graph
  const buildCombinedGraph = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (voiceConnections: any[], textConnections: any[], weight: ServerActivityWeight): GraphData => {
      const nodeMap = new Map<string, CombinedNode>();
      const edgeMap = new Map<string, CombinedEdge>();

      // Process voice connections
      voiceConnections.forEach((conn) => {
        const edgeKey = [conn.user_id_1, conn.user_id_2].sort().join(':');

        const existingEdge = edgeMap.get(edgeKey) || {
          source: conn.user_id_1,
          target: conn.user_id_2,
          voiceSeconds: 0,
          textScore: 0,
          combinedStrength: 0,
          primaryType: 'voice' as const,
        };
        existingEdge.voiceSeconds = conn.shared_seconds;
        edgeMap.set(edgeKey, existingEdge);

        [
          { id: conn.user_id_1, username: conn.username_1, displayName: conn.display_name_1, avatarUrl: conn.avatar_url_1 },
          { id: conn.user_id_2, username: conn.username_2, displayName: conn.display_name_2, avatarUrl: conn.avatar_url_2 },
        ].forEach((user) => {
          const existing = nodeMap.get(user.id) || {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            voiceScore: 0,
            textScore: 0,
            combinedScore: 0,
            val: 5,
          };
          existing.voiceScore += conn.shared_seconds / 60;
          if (user.username) existing.username = user.username;
          if (user.displayName) existing.displayName = user.displayName;
          if (user.avatarUrl) existing.avatarUrl = user.avatarUrl;
          nodeMap.set(user.id, existing);
        });
      });

      // Process text connections
      textConnections.forEach((conn) => {
        const edgeKey = [conn.user_id_1, conn.user_id_2].sort().join(':');

        const existingEdge = edgeMap.get(edgeKey) || {
          source: conn.user_id_1,
          target: conn.user_id_2,
          voiceSeconds: 0,
          textScore: 0,
          combinedStrength: 0,
          primaryType: 'text' as const,
        };
        existingEdge.textScore = conn.interaction_score;
        if (existingEdge.voiceSeconds > 0) {
          existingEdge.primaryType = 'both';
        }
        edgeMap.set(edgeKey, existingEdge);

        [
          { id: conn.user_id_1, username: conn.username_1, displayName: conn.display_name_1, avatarUrl: conn.avatar_url_1 },
          { id: conn.user_id_2, username: conn.username_2, displayName: conn.display_name_2, avatarUrl: conn.avatar_url_2 },
        ].forEach((user) => {
          const existing = nodeMap.get(user.id) || {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            voiceScore: 0,
            textScore: 0,
            combinedScore: 0,
            val: 5,
          };
          existing.textScore += conn.interaction_score;
          if (user.username) existing.username = user.username;
          if (user.displayName) existing.displayName = user.displayName;
          if (user.avatarUrl) existing.avatarUrl = user.avatarUrl;
          nodeMap.set(user.id, existing);
        });
      });

      // Calculate combined scores for nodes
      const maxVoice = Math.max(...Array.from(nodeMap.values()).map((n) => n.voiceScore), 1);
      const maxText = Math.max(...Array.from(nodeMap.values()).map((n) => n.textScore), 1);

      nodeMap.forEach((node) => {
        const normalizedVoice = (node.voiceScore / maxVoice) * 100;
        const normalizedText = (node.textScore / maxText) * 100;
        node.combinedScore =
          normalizedVoice * weight.voiceWeight + normalizedText * weight.textWeight;
        node.val = 3 + (node.combinedScore / 100) * 9;
      });

      // Calculate combined strength for edges
      const maxEdgeVoice = Math.max(...Array.from(edgeMap.values()).map((e) => e.voiceSeconds), 1);
      const maxEdgeText = Math.max(...Array.from(edgeMap.values()).map((e) => e.textScore), 1);

      edgeMap.forEach((edge) => {
        const normalizedVoice = edge.voiceSeconds / maxEdgeVoice;
        const normalizedText = edge.textScore / maxEdgeText;
        edge.combinedStrength =
          normalizedVoice * weight.voiceWeight + normalizedText * weight.textWeight;
      });

      return {
        nodes: Array.from(nodeMap.values()),
        links: Array.from(edgeMap.values()),
      };
    },
    []
  );

  // Force refresh the cache
  const handleRefresh = useCallback(async () => {
    setCalculating(true);
    try {
      await Promise.all([
        calculateVoiceConnections(serverId, timeRange),
        calculateTextConnections(serverId, timeRange).catch(() => {}),
      ]);

      const [voiceConnections, weight] = await Promise.all([
        getVoiceConnections(serverId, timeRange),
        getServerActivityWeight(serverId),
      ]);

      let textConnections: unknown[] = [];
      try {
        textConnections = await getTextConnections(serverId, timeRange);
      } catch {}

      setHasVoiceData(voiceConnections.length > 0);
      setHasTextData(textConnections.length > 0);
      setActivityWeight(weight);
      const combined = buildCombinedGraph(voiceConnections, textConnections, weight);
      setFullGraphData(combined);
      setCalculatedAt(new Date());

      setTimeout(() => {
        triggerRepaint();
      }, 100);
    } catch (err) {
      console.error('Failed to refresh connections:', err);
    } finally {
      setCalculating(false);
    }
  }, [serverId, timeRange, buildCombinedGraph, triggerRepaint]);

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

    const timer = setTimeout(updateDimensions, 50);
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [fullGraphData]);

  // Load graph data
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [voiceConnections, weight] = await Promise.all([
          getVoiceConnections(serverId, timeRange),
          getServerActivityWeight(serverId),
        ]);

        let textConnections: unknown[] = [];
        try {
          textConnections = await getTextConnections(serverId, timeRange);
        } catch {}

        if (cancelled) return;

        setHasVoiceData(voiceConnections.length > 0);
        setHasTextData(textConnections.length > 0);
        setActivityWeight(weight);
        const combined = buildCombinedGraph(voiceConnections, textConnections, weight);
        setFullGraphData(combined);
        setCalculatedAt(new Date());

        setTimeout(() => {
          if (!cancelled) {
            setImagesLoaded((n) => n + 1);
          }
        }, 100);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load connections:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCalculating(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [serverId, timeRange, buildCombinedGraph]);

  // Handle node click
  const handleNodeClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any) => {
      router.push(`/${serverId}/${node.id}`);
    },
    [router, serverId]
  );

  // Custom node rendering
  const paintNode = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any, ctx: CanvasRenderingContext2D) => {
      if (node.x === undefined || node.y === undefined) return;

      const size = node.val || 5;
      const isHovered = hoveredNode?.id === node.id;

      const img = getOrLoadImage(node.avatarUrl, triggerRepaint);

      ctx.save();

      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.closePath();

      if (img) {
        ctx.clip();
        ctx.drawImage(img, node.x - size, node.y - size, size * 2, size * 2);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);

        // Color based on view mode
        let borderColor: string;
        if (viewMode === 'voice') {
          borderColor = '#7289DA'; // Purple for voice
        } else if (viewMode === 'text') {
          borderColor = '#43B581'; // Green for text
        } else {
          // Combined - blend based on ratio
          const voiceScore = node.voiceScore || 0;
          const textScore = node.textScore || 0;
          const totalScore = voiceScore + textScore;
          const voiceRatio = totalScore > 0 ? voiceScore / totalScore : 0.5;
          const r = Math.round(88 * voiceRatio + 67 * (1 - voiceRatio));
          const g = Math.round(101 * voiceRatio + 181 * (1 - voiceRatio));
          const b = Math.round(242 * voiceRatio + 129 * (1 - voiceRatio));
          borderColor = `rgb(${r}, ${g}, ${b})`;
        }

        ctx.strokeStyle = isHovered ? '#FFFFFF' : borderColor;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = isHovered ? '#5865F2' : '#4752C4';
        ctx.fill();
        ctx.strokeStyle = isHovered ? '#FFFFFF' : '#7289DA';
        ctx.lineWidth = isHovered ? 3 : 1.5;
        ctx.stroke();
        ctx.restore();
      }
    },
    [hoveredNode, triggerRepaint, viewMode]
  );

  // Custom pointer area
  const paintNodePointerArea = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node: any, color: string, ctx: CanvasRenderingContext2D) => {
      if (node.x === undefined || node.y === undefined) return;

      const size = node.val || 5;
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    },
    []
  );

  // Custom link rendering
  const paintLink = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (link: any, ctx: CanvasRenderingContext2D) => {
      const source = link.source;
      const target = link.target;

      // Check for valid positions
      if (
        typeof source !== 'object' ||
        typeof target !== 'object' ||
        source.x === undefined ||
        source.y === undefined ||
        target.x === undefined ||
        target.y === undefined
      ) {
        return;
      }

      const strength = link.combinedStrength || 0.5;
      const lineWidth = 0.5 + strength * 4;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      let color: string;
      const alpha = 0.2 + strength * 0.4;

      if (viewMode === 'voice') {
        color = `rgba(114, 137, 218, ${alpha})`; // Purple
      } else if (viewMode === 'text') {
        color = `rgba(67, 181, 129, ${alpha})`; // Green
      } else {
        // Combined mode - color by type
        if (link.primaryType === 'both') {
          color = `rgba(250, 200, 80, ${alpha})`; // Gold
        } else if (link.primaryType === 'voice') {
          color = `rgba(114, 137, 218, ${alpha})`; // Purple
        } else {
          color = `rgba(67, 181, 129, ${alpha})`; // Green
        }
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    },
    [viewMode]
  );

  if (loading && !fullGraphData) {
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Social Web
                {calculating && (
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                )}
              </CardTitle>
              {viewMode === 'combined' && (
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-[#7289DA]" />
                    Voice
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-[#43B581]" />
                    Text
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-[#FAC850]" />
                    Both
                  </span>
                </div>
              )}
            </div>
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
                <RefreshCw
                  className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 mr-2">Show:</span>
            {VIEW_MODES.map((mode) => {
              // Hide voice/text options if no data
              if (mode.value === 'voice' && !hasVoiceData) return null;
              if (mode.value === 'text' && !hasTextData) return null;

              return (
                <button
                  key={mode.value}
                  onClick={() => setViewMode(mode.value)}
                  disabled={calculating}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                    viewMode === mode.value
                      ? mode.value === 'voice'
                        ? 'bg-[#7289DA] text-white'
                        : mode.value === 'text'
                        ? 'bg-[#43B581] text-white'
                        : 'bg-discord-blurple text-white'
                      : 'bg-discord-darker text-gray-400 hover:text-white'
                  } disabled:opacity-50`}
                >
                  {mode.icon}
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
        {calculatedAt && activityWeight && hasVoiceData && hasTextData && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Server is {Math.round(activityWeight.voiceWeight * 100)}% voice,{' '}
            {Math.round(activityWeight.textWeight * 100)}% text
          </p>
        )}
      </CardHeader>
      <CardContent>
        {!currentGraphData || currentGraphData.nodes.length === 0 ? (
          <div className="w-full h-[500px] flex items-center justify-center text-gray-400">
            <p>
              No{' '}
              {viewMode === 'voice'
                ? 'voice '
                : viewMode === 'text'
                ? 'text '
                : ''}
              connections found for this time period
            </p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative w-full h-[500px] bg-discord-darker rounded-lg overflow-hidden"
          >
            <ForceGraph2D
              key={viewMode} // Force remount on view change for clean simulation
              ref={graphRef}
              graphData={currentGraphData}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor="#1e1f22"
              nodeId="id"
              nodeRelSize={1}
              nodeCanvasObject={paintNode}
              nodePointerAreaPaint={paintNodePointerArea}
              linkCanvasObject={paintLink}
              onNodeClick={handleNodeClick}
              onNodeHover={(node) => setHoveredNode(node as CombinedNode | null)}
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
                {(viewMode === 'combined' || viewMode === 'voice') &&
                  hoveredNode.voiceScore > 0 && (
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <Mic className="w-3 h-3" />
                      {formatTime(hoveredNode.voiceScore * 60)} voice
                    </p>
                  )}
                {(viewMode === 'combined' || viewMode === 'text') &&
                  hoveredNode.textScore > 0 && (
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {Math.round(hoveredNode.textScore)} interactions
                    </p>
                  )}
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3 text-center">
          {viewMode === 'combined'
            ? 'Combined voice + text connections. Line color shows connection type.'
            : viewMode === 'voice'
            ? 'Voice connections based on shared time in voice channels.'
            : 'Text connections based on conversations in the same channels.'}{' '}
          Click a node to view profile.
        </p>
      </CardContent>
    </Card>
  );
}
