import { Destination, RecommendationResult } from '../types/index.js';

export function calculateRecommendations(
  destinations: Destination[],
  interests: string[],
  maxBudget: number,
  days: number,
  companion: string,
  pace: string
): RecommendationResult[] {
  return destinations.map(d => {
    let score = 50;
    const reasons: string[] = [];

    const destTags = (d.interest_tags || []).map(t => t.toLowerCase());
    const matchedInterests = (interests || []).filter(i => destTags.includes(i.toLowerCase()));

    if (matchedInterests.length > 0) {
      score += matchedInterests.length * 15;
      reasons.push(`Matches your interests: ${matchedInterests.map(i => i.toUpperCase()).join(', ')}`);
    }

    const estCost = d.budget * (days / Math.max(1, d.days));
    if (estCost <= maxBudget) {
      score += 15;
      reasons.push(`Comfortably fits ₹${maxBudget.toLocaleString()} budget (Est. ₹${Math.round(estCost).toLocaleString()})`);
    } else {
      score -= 10;
    }

    if (companion === 'couple' && (destTags.includes('romantic') || destTags.includes('beach') || destTags.includes('nature'))) {
      score += 12;
      reasons.push('Scenic, romantic ambiance ideal for couples');
    } else if (companion === 'family' && (destTags.includes('heritage') || destTags.includes('nature'))) {
      score += 12;
      reasons.push('Comfortable family-friendly stays & sights');
    } else if (companion === 'friends' && (destTags.includes('adventure') || destTags.includes('beach'))) {
      score += 12;
      reasons.push('Vibrant social atmosphere with adventure trails');
    }

    score += (Number(d.rating) - 4.5) * 10;
    const finalScore = Math.min(99, Math.max(40, Math.round(score)));

    return {
      ...d,
      match_score: finalScore,
      recommendation_reasons: reasons.slice(0, 3)
    };
  }).sort((a, b) => b.match_score - a.match_score);
}
