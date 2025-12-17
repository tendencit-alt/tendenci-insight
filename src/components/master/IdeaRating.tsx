import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface IdeaRatingProps {
  ideaId: string;
  onRatingChange?: () => void;
}

interface RatingData {
  averageRating: number;
  totalRatings: number;
  userRating: number | null;
}

export function IdeaRating({ ideaId, onRatingChange }: IdeaRatingProps) {
  const { user } = useAuth();
  const [ratingData, setRatingData] = useState<RatingData>({
    averageRating: 0,
    totalRatings: 0,
    userRating: null,
  });
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRatings();
  }, [ideaId, user?.id]);

  const fetchRatings = async () => {
    try {
      // Fetch all ratings for this idea
      const { data: ratings, error } = await supabase
        .from('master_idea_ratings')
        .select('rating, user_id')
        .eq('idea_id', ideaId);

      if (error) throw error;

      const totalRatings = ratings?.length || 0;
      const averageRating = totalRatings > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings 
        : 0;
      const userRating = ratings?.find(r => r.user_id === user?.id)?.rating || null;

      setRatingData({ averageRating, totalRatings, userRating });
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  const handleRate = async (rating: number) => {
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (ratingData.userRating) {
        // Update existing rating
        const { error } = await supabase
          .from('master_idea_ratings')
          .update({ rating })
          .eq('idea_id', ideaId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new rating
        const { error } = await supabase
          .from('master_idea_ratings')
          .insert({
            idea_id: ideaId,
            user_id: user.id,
            rating,
          });

        if (error) throw error;
      }

      await fetchRatings();
      onRatingChange?.();
    } catch (error) {
      console.error('Error rating idea:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoveredRating ?? ratingData.userRating ?? 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(null)}
            disabled={!user || isSubmitting}
            className={cn(
              "transition-colors duration-150",
              !user && "cursor-default",
              isSubmitting && "opacity-50"
            )}
          >
            <Star
              className={cn(
                "h-4 w-4 transition-colors",
                star <= displayRating
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40 hover:text-amber-400/60"
              )}
            />
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {ratingData.averageRating > 0 ? (
          <>
            <span className="font-medium">{ratingData.averageRating.toFixed(1)}</span>
            <span className="mx-1">•</span>
            <span>{ratingData.totalRatings} {ratingData.totalRatings === 1 ? 'voto' : 'votos'}</span>
          </>
        ) : (
          'Sem avaliações'
        )}
      </span>
    </div>
  );
}
