'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Flag, Report, Comment } from '@/lib/types';

export interface FlagWithContent extends Flag {
  targetContent?: Report | Comment;
  loading: boolean;
}

export function useFlags(maxFlags: number = 50) {
  const [flags, setFlags] = useState<FlagWithContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const flagsQuery = query(
      collection(db, 'flags'),
      orderBy('createdAt', 'desc'),
      limit(maxFlags)
    );

    const unsubscribe = onSnapshot(
      flagsQuery,
      async (snapshot) => {
        const flagsList: FlagWithContent[] = [];
        
        snapshot.forEach((doc) => {
          flagsList.push({
            id: doc.id,
            ...doc.data(),
            loading: true,
          } as FlagWithContent);
        });

        setFlags(flagsList);
        setLoading(false);
        setError(null);

        // Fetch target content for each flag
        flagsList.forEach(async (flag, index) => {
          try {
            const collectionName = flag.targetType === 'report' ? 'reports' : 'comments';
            const targetDoc = await getDoc(doc(db, collectionName, flag.targetId));

            if (targetDoc.exists()) {
              setFlags(prevFlags => {
                const newFlags = [...prevFlags];
                newFlags[index] = {
                  ...newFlags[index],
                  targetContent: {
                    id: targetDoc.id,
                    ...targetDoc.data(),
                  } as Report | Comment,
                  loading: false,
                };
                return newFlags;
              });
            } else {
              setFlags(prevFlags => {
                const newFlags = [...prevFlags];
                newFlags[index] = {
                  ...newFlags[index],
                  loading: false,
                };
                return newFlags;
              });
            }
          } catch (err) {
            console.error('Error fetching target content:', err);
            setFlags(prevFlags => {
              const newFlags = [...prevFlags];
              newFlags[index] = {
                ...newFlags[index],
                loading: false,
              };
              return newFlags;
            });
          }
        });
      },
      (err) => {
        console.error('Error fetching flags:', err);
        setError('Failed to load flags');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [maxFlags]);

  return {
    flags,
    loading,
    error,
  };
}
