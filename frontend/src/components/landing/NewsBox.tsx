// src/components/landing/NewsBox.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface NewsData {
  content: string;
  enabled: boolean;
  updated_at?: string;
}

export default function NewsBox() {
  const [news, setNews] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const response = await fetch(`${apiUrl}/news`);
        if (response.ok) {
          const text = await response.text();
          // Handle null or empty response
          if (text && text !== 'null') {
            const data = JSON.parse(text);
            if (data && data.content) {
              setNews(data);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading || !news || !news.content) {
    return null;
  }

  return (
    <Card className="bg-blue-50 border-blue-200 shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">📢</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">News</h3>
            <p className="text-blue-800 text-sm whitespace-pre-wrap">{news.content}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
