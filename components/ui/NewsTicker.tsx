
import React from 'react';
import { NewsArticle } from '../../types';
import { Skeleton } from './skeleton';
import { Newspaper } from '../Icons';
import { format } from '../../utils/helpers';

interface NewsTickerProps {
  news: NewsArticle[];
  isLoading: boolean;
}

export const NewsTicker: React.FC<NewsTickerProps> = ({ news, isLoading }) => {
  if (isLoading) {
    return <Skeleton className="h-12 w-full" />;
  }

  if (!news || news.length === 0) {
    return null;
  }

  const tickerContent = news.map((item, index) => (
    <span 
      key={item.title + index} 
      className="text-sm mx-8 inline-flex items-center"
    >
      <span className="font-semibold text-blue-600 mr-2">{item.source}</span>
      <span className="text-slate-500 text-xs mr-2">({format(new Date(item.date), 'MMM d, yyyy')})</span>
      <span>{item.title}</span>
    </span>
  ));

  return (
    <div className="relative flex overflow-x-hidden bg-white text-slate-800 shadow-sm rounded-lg items-center h-12 border border-slate-200">
       <div className="absolute left-0 top-0 bottom-0 bg-blue-600 text-white flex items-center px-3 z-10 rounded-l-md shadow-md">
          <Newspaper className="w-5 h-5"/>
          <span className="font-bold text-sm ml-2 hidden sm:inline">LATEST NEWS</span>
       </div>
       {/* Duplicate content for seamless looping */}
      <div className="pl-[110px] sm:pl-[145px] animate-marquee whitespace-nowrap flex items-center">
        {tickerContent}
      </div>
      <div className="absolute top-0 py-3 pl-[110px] sm:pl-[145px] animate-marquee2 whitespace-nowrap flex items-center">
        {tickerContent}
      </div>
    </div>
  );
};
