'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserStats, PointAction, POINT_VALUES, USER_LEVELS, BadgeType } from '@/lib/types';

const DEFAULT_STATS: UserStats = {
  points: 0,
  level: 1,
  badges: [],
  totalReports: 0,
  totalUpvotes: 0,
  totalComments: 0,
  tripsCompleted: 0,
  loginStreak: 0,
  lastLoginDate: '',
};

/**
 * Hook to manage user gamification stats.
 */
export function useUserStats(uid: string | null) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user stats
  useEffect(() => {
    if (!uid) {
      setStats(null);
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const data = userSnap.data();
          setStats({
            points: data.points || 0,
            level: data.level || 1,
            badges: data.badges || [],
            totalReports: data.totalReports || 0,
            totalUpvotes: data.totalUpvotes || 0,
            totalComments: data.totalComments || 0,
            tripsCompleted: data.tripsCompleted || 0,
            loginStreak: data.loginStreak || 0,
            lastLoginDate: data.lastLoginDate || '',
            lastReportDate: data.lastReportDate,
          });
        } else {
          setStats(DEFAULT_STATS);
        }
      } catch (error) {
        console.error('Error fetching user stats:', error);
        setStats(DEFAULT_STATS);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [uid]);

  // Calculate level from points
  const calculateLevel = useCallback((points: number): number => {
    for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
      if (points >= USER_LEVELS[i].points) {
        return USER_LEVELS[i].level;
      }
    }
    return 1;
  }, []);

  // Get level title
  const getLevelTitle = useCallback((level: number): string => {
    const levelInfo = USER_LEVELS.find(l => l.level === level);
    return levelInfo?.title || 'Road Observer';
  }, []);

  // Get points to next level
  const getPointsToNextLevel = useCallback((points: number): number => {
    const currentLevel = calculateLevel(points);
    const nextLevel = USER_LEVELS.find(l => l.level === currentLevel + 1);
    if (!nextLevel) return 0;
    return nextLevel.points - points;
  }, [calculateLevel]);

  // Award points to user
  const awardPoints = useCallback(async (action: PointAction, referenceId?: string): Promise<number> => {
    if (!uid) return 0;

    const points = POINT_VALUES[action];
    const today = new Date().toISOString().split('T')[0];

    try {
      const userRef = doc(db, 'users', uid);
      
      // Check for first report of day bonus
      let bonusPoints = 0;
      if (action === PointAction.CREATE_REPORT && stats?.lastReportDate !== today) {
        bonusPoints = POINT_VALUES[PointAction.FIRST_REPORT_OF_DAY];
      }

      const totalPoints = points + bonusPoints;
      const newTotalPoints = (stats?.points || 0) + totalPoints;
      const newLevel = calculateLevel(newTotalPoints);

      // Update user stats
      const updates: any = {
        points: increment(totalPoints),
        level: newLevel,
      };

      // Update specific counters based on action
      switch (action) {
        case PointAction.CREATE_REPORT:
          updates.totalReports = increment(1);
          updates.lastReportDate = today;
          break;
        case PointAction.REPORT_UPVOTED:
          updates.totalUpvotes = increment(1);
          break;
        case PointAction.ADD_COMMENT:
          updates.totalComments = increment(1);
          break;
        case PointAction.COMPLETE_TRIP:
          updates.tripsCompleted = increment(1);
          break;
      }

      await updateDoc(userRef, updates);

      // Record transaction in history
      const historyRef = collection(db, 'users', uid, 'pointHistory');
      await addDoc(historyRef, {
        action,
        points: totalPoints,
        ...(referenceId ? { referenceId } : {}),
        createdAt: serverTimestamp(),
      });

      // Update local state
      setStats(prev => prev ? {
        ...prev,
        points: newTotalPoints,
        level: newLevel,
        totalReports: action === PointAction.CREATE_REPORT ? prev.totalReports + 1 : prev.totalReports,
        totalUpvotes: action === PointAction.REPORT_UPVOTED ? prev.totalUpvotes + 1 : prev.totalUpvotes,
        totalComments: action === PointAction.ADD_COMMENT ? prev.totalComments + 1 : prev.totalComments,
        tripsCompleted: action === PointAction.COMPLETE_TRIP ? prev.tripsCompleted + 1 : prev.tripsCompleted,
        lastReportDate: action === PointAction.CREATE_REPORT ? today : prev.lastReportDate,
      } : null);

      return totalPoints;
    } catch (error) {
      console.error('Error awarding points:', error);
      return 0;
    }
  }, [uid, stats, calculateLevel]);

  // Award badge to user
  const awardBadge = useCallback(async (badge: BadgeType): Promise<boolean> => {
    if (!uid || stats?.badges.includes(badge)) return false;

    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        badges: arrayUnion(badge),
      });

      setStats(prev => prev ? {
        ...prev,
        badges: [...prev.badges, badge],
      } : null);

      return true;
    } catch (error) {
      console.error('Error awarding badge:', error);
      return false;
    }
  }, [uid, stats]);

  // Check and update daily login streak
  const checkDailyLogin = useCallback(async (): Promise<void> => {
    if (!uid) return;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (stats?.lastLoginDate === today) return; // Already logged in today

    try {
      const userRef = doc(db, 'users', uid);
      let newStreak = 1;

      if (stats?.lastLoginDate === yesterday) {
        // Continue streak
        newStreak = (stats.loginStreak || 0) + 1;
      }

      await updateDoc(userRef, {
        lastLoginDate: today,
        loginStreak: newStreak,
      });

      // Award daily login points
      await awardPoints(PointAction.DAILY_LOGIN);

      // Check for weekly warrior badge
      if (newStreak >= 7 && !stats?.badges.includes(BadgeType.WEEKLY_WARRIOR)) {
        await awardBadge(BadgeType.WEEKLY_WARRIOR);
      }

      setStats(prev => prev ? {
        ...prev,
        lastLoginDate: today,
        loginStreak: newStreak,
      } : null);
    } catch (error) {
      console.error('Error updating daily login:', error);
    }
  }, [uid, stats, awardPoints, awardBadge]);

  // Check and award badges based on stats
  const checkBadges = useCallback(async (): Promise<void> => {
    if (!uid || !stats) return;

    // First Report badge
    if (stats.totalReports >= 1 && !stats.badges.includes(BadgeType.FIRST_REPORT)) {
      await awardBadge(BadgeType.FIRST_REPORT);
    }

    // Community Voice badge (10 comments)
    if (stats.totalComments >= 10 && !stats.badges.includes(BadgeType.COMMUNITY_VOICE)) {
      await awardBadge(BadgeType.COMMUNITY_VOICE);
    }

    // Safety First badge (10 trips)
    if (stats.tripsCompleted >= 10 && !stats.badges.includes(BadgeType.SAFETY_FIRST)) {
      await awardBadge(BadgeType.SAFETY_FIRST);
    }
  }, [uid, stats, awardBadge]);

  return {
    stats,
    loading,
    awardPoints,
    awardBadge,
    checkDailyLogin,
    checkBadges,
    calculateLevel,
    getLevelTitle,
    getPointsToNextLevel,
  };
}
