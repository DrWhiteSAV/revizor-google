import React from 'react';
import { AcademyPost } from './types';
import { BookOpen, ArrowRight } from 'lucide-react';

interface AcademyCardProps {
  post: AcademyPost;
  onRead: (post: AcademyPost) => void;
  theme?: 'dark' | 'light';
}

export const AcademyCard: React.FC<AcademyCardProps> = ({ post, onRead, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const href = `/academy/${encodeURIComponent(post.slug || post.id)}`;

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onRead(post);
      }}
      className={`group rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden no-underline ${
        isDark
          ? 'bg-transparent border-amber-400/30 hover:border-[#E7C768] hover:shadow-[0_0_25px_rgba(231,199,104,0.25)] text-stone-100'
          : 'bg-transparent border-amber-900/20 hover:border-amber-700 hover:shadow-md text-amber-950'
      }`}
    >
      <div>
        {post.cover_image && (
          <div className="relative w-full h-44 overflow-hidden border-b border-amber-400/20 bg-black/20">
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
              <span
                className={`text-sm px-2.5 py-0.5 rounded-xl font-medium border backdrop-blur-md ${
                  isDark
                    ? 'bg-[#1A0F02]/85 text-[#F4EE8E] border-amber-400/40'
                    : 'bg-[#FFFBF5]/95 text-amber-950 border-amber-800/30 font-semibold'
                }`}
              >
                {post.category}
              </span>
              {post.target_role && post.target_role !== 'all' && (
                <span
                  className={`text-sm px-2 py-0.5 rounded-xl font-bold border backdrop-blur-md ${
                    isDark
                      ? post.target_role === 'director'
                        ? 'bg-amber-500/25 text-[#F4EE8E] border-amber-400/50'
                        : post.target_role === 'manager'
                        ? 'bg-amber-600/25 text-amber-200 border-amber-500/40'
                        : 'bg-amber-900/30 text-stone-200 border-amber-400/30'
                      : post.target_role === 'director'
                        ? 'bg-amber-200 text-amber-950 border-amber-800/40'
                        : post.target_role === 'manager'
                        ? 'bg-amber-100 text-amber-900 border-amber-800/30'
                        : 'bg-stone-200 text-stone-800 border-stone-400'
                  }`}
                >
                  {post.target_role === 'director' ? 'Директору' : post.target_role === 'manager' ? 'Руководителю' : 'Сотруднику'}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="p-4 sm:p-5">
          <h3
            className={`text-base sm:text-lg font-bold mb-2 transition-colors line-clamp-2 ${
              isDark ? 'text-white group-hover:text-[#F4EE8E]' : 'text-amber-950 group-hover:text-amber-800'
            }`}
          >
            {post.title}
          </h3>

          <p
            className={`text-sm line-clamp-3 leading-relaxed mb-4 ${
              isDark ? 'text-stone-300' : 'text-stone-700'
            }`}
          >
            {post.summary || 'Обучающая инструкция и регламент работы раздела.'}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5 pt-0 flex items-center justify-between border-t border-amber-400/10">
        <span
          className={`text-sm flex items-center gap-1.5 ${
            isDark ? 'text-[#E7C768]' : 'text-amber-900 font-semibold'
          }`}
        >
          <BookOpen size={16} />
          Читать инструкцию
        </span>
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-transform group-hover:translate-x-1 ${
            isDark
              ? 'border-amber-400/40 text-[#F4EE8E] bg-amber-400/10'
              : 'border-amber-800/30 text-amber-950 bg-amber-100/60'
          }`}
        >
          <ArrowRight size={16} />
        </div>
      </div>
    </a>
  );
};
