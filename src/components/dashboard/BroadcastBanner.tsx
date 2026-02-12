import { useState, useEffect } from "react";
import { X, Pin, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BroadcastMessage } from "@/hooks/useBroadcasts";
import { formatDistanceToNow } from "date-fns";

interface BroadcastBannerProps {
  broadcast: BroadcastMessage;
  onDismiss?: (id: string) => void;
}

export function BroadcastBanner({ broadcast, onDismiss }: BroadcastBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);

  // Get type-specific styling
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'critical':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: AlertCircle,
          iconColor: 'text-red-600',
          badge: 'bg-red-100 text-red-800'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200',
          text: 'text-amber-800',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          badge: 'bg-amber-100 text-amber-800'
        };
      default: // info
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          icon: Info,
          iconColor: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-800'
        };
    }
  };

  const config = getTypeConfig(broadcast.type);
  const Icon = config.icon;
  const isLongMessage = broadcast.message.length > 150;

  useEffect(() => {
    // Trigger fade-in animation
    const timer = setTimeout(() => setIsAnimating(false), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onDismiss?.(broadcast.id);
    }, 200);
  };

  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <Card 
      className={`
        ${config.bg} border ${config.text} 
        transition-all duration-300 ease-in-out
        ${isAnimating ? 'opacity-0 transform -translate-y-2' : 'opacity-100 transform translate-y-0'}
        hover:shadow-md
      `}
    >
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-lg">{broadcast.title}</h3>
                {broadcast.is_pinned && (
                  <Pin className="h-4 w-4" />
                )}
                <Badge variant="outline" className={config.badge}>
                  {broadcast.type}
                </Badge>
              </div>
              
              {/* Message */}
              <div className="text-sm leading-relaxed">
                {isLongMessage && !isExpanded ? (
                  <>
                    {broadcast.message.substring(0, 150)}...
                    <Button
                      variant="link"
                      className={`p-0 h-auto text-xs ${config.text} underline ml-2`}
                      onClick={() => setIsExpanded(true)}
                    >
                      Read More
                    </Button>
                  </>
                ) : (
                  <>
                    {broadcast.message}
                    {isLongMessage && isExpanded && (
                      <Button
                        variant="link"
                        className={`p-0 h-auto text-xs ${config.text} underline ml-2`}
                        onClick={() => setIsExpanded(false)}
                      >
                        Show Less
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Timestamp */}
              <div className="text-xs opacity-75 mt-2">
                {formatTimestamp(broadcast.created_at)}
                {broadcast.expires_at && (
                  <span className="ml-3">
                    Expires: {formatTimestamp(broadcast.expires_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dismiss Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className={`h-8 w-8 p-0 rounded-full hover:bg-black/10 ${config.text}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface BroadcastContainerProps {
  broadcasts: BroadcastMessage[];
  className?: string;
}

export function BroadcastContainer({ broadcasts, className = "" }: BroadcastContainerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Load dismissed IDs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dismissed-broadcasts');
      if (stored) {
        setDismissedIds(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('Error loading dismissed broadcasts:', error);
    }
  }, []);

  const handleDismiss = (id: string) => {
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(id);
    setDismissedIds(newDismissed);

    // Save to localStorage
    try {
      localStorage.setItem('dismissed-broadcasts', JSON.stringify(Array.from(newDismissed)));
    } catch (error) {
      console.error('Error saving dismissed broadcast:', error);
    }
  };

  // Filter out dismissed broadcasts
  const activeBroadcasts = broadcasts.filter(b => !dismissedIds.has(b.id));

  if (activeBroadcasts.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {activeBroadcasts.map((broadcast) => (
        <BroadcastBanner
          key={broadcast.id}
          broadcast={broadcast}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}
