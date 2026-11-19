import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Sparkles, CornerDownRight, Smile, Bot } from 'lucide-react';
import { UserProfile } from '../types';
import { MiniAudioField } from './voice/MiniAudioField';
import { CustomAudioPlayer } from './voice/CustomAudioPlayer';

export interface Comment {
  id: string;
  review_id?: string;
  author: string;
  authorRole?: string;
  text: string;
  timestamp: string;
  reactions: Record<string, number>;
  audio_url?: string;
  replies?: Comment[];
}

interface CommentsSectionProps {
  entityId: string;
  entityType: 'post' | 'review';
  entityTitle?: string;
  currentUser: UserProfile | null;
  isLightTheme?: boolean;
}

// Available emojis for reactions
const EMOJI_OPTIONS = ['👍', '❤️', '🚀', '🔥', '👏', '💡'];

export default function CommentsSection({
  entityId,
  entityType,
  entityTitle = '',
  currentUser,
  isLightTheme: propIsLightTheme
}: CommentsSectionProps) {
  const [isLightTheme, setIsLightTheme] = useState(() => {
    if (propIsLightTheme !== undefined) return propIsLightTheme;
    return typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light');
  });

  useEffect(() => {
    if (propIsLightTheme !== undefined) {
      setIsLightTheme(propIsLightTheme);
      return;
    }
    const updateTheme = () => {
      setIsLightTheme(document.documentElement.classList.contains('theme-light'));
    };
    window.addEventListener('theme-changed', updateTheme);
    window.addEventListener('cabinet-theme-change', updateTheme);
    return () => {
      window.removeEventListener('theme-changed', updateTheme);
      window.removeEventListener('cabinet-theme-change', updateTheme);
    };
  }, [propIsLightTheme]);

  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [userReactions, setUserReactions] = useState<Record<string, boolean>>({});
  const [userCommentReactions, setUserCommentReactions] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  
  // New Comment Form states
  const [anonName, setAnonName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentAudioUrl, setCommentAudioUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply states
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyAnonName, setReplyAnonName] = useState('');
  const [replyAudioUrl, setReplyAudioUrl] = useState<string | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // AI Typing simulation indicator
  const [aiTyping, setAiTyping] = useState(false);

  const cleanReviewId = entityId.replace('review-', '');

  // Load user reaction state from localStorage
  useEffect(() => {
    const savedUserReactions = localStorage.getItem(`rr_user_reactions_${entityId}`);
    if (savedUserReactions) {
      try {
        setUserReactions(JSON.parse(savedUserReactions));
      } catch (e) {
        setUserReactions({});
      }
    } else {
      setUserReactions({});
    }

    const savedCommUserReactions = localStorage.getItem(`rr_user_comm_reactions_${entityId}`);
    if (savedCommUserReactions) {
      try {
        setUserCommentReactions(JSON.parse(savedCommUserReactions));
      } catch (e) {
        setUserCommentReactions({});
      }
    } else {
      setUserCommentReactions({});
    }
  }, [entityId]);

  // Load comments & reactions from server PostgreSQL BD ProTalk database
  useEffect(() => {
    if (entityType === 'review') {
      setIsLoadingComments(true);
      
      // Fetch review reactions from DB
      fetch(`/api/landing/reviews`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.reviews)) {
            const currentRev = data.reviews.find((r: any) => r.id === cleanReviewId);
            if (currentRev && currentRev.reactions) {
              setReactions(currentRev.reactions);
            }
          }
        })
        .catch(err => {
          console.warn("Failed to fetch review reactions:", err);
        });

      // Fetch comments for review from DB
      fetch(`/api/landing/reviews/${cleanReviewId}/comments`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.comments)) {
            const formattedComments: Comment[] = data.comments.map((c: any) => ({
              id: c.id,
              review_id: c.review_id,
              author: c.author,
              authorRole: c.authorRole || 'Пользователь',
              text: c.text,
              timestamp: c.timestamp || 'Недавно',
              reactions: c.reactions || {},
              audio_url: c.audio_url || '',
              replies: []
            }));
            setComments(formattedComments);
          } else {
            setComments([]);
          }
        })
        .catch(err => {
          console.error("Failed to fetch comments from server API:", err);
          setComments([]);
        })
        .finally(() => {
          setIsLoadingComments(false);
        });
    }
  }, [entityId, entityType, cleanReviewId]);

  // Review entity reaction toggle: communicates directly with PostgreSQL BD ProTalk database
  const handleToggleEntityReaction = async (emoji: string) => {
    const isAlreadyReacted = !!userReactions[emoji];
    
    // Optimistic UI update
    const nextUserReactions = { ...userReactions, [emoji]: !isAlreadyReacted };
    setUserReactions(nextUserReactions);
    localStorage.setItem(`rr_user_reactions_${entityId}`, JSON.stringify(nextUserReactions));

    try {
      const res = await fetch(`/api/landing/reviews/${cleanReviewId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, remove: isAlreadyReacted })
      });
      const data = await res.json();
      if (data.success && data.reactions) {
        setReactions(data.reactions);
      }
    } catch (e) {
      console.error("Failed to save review reaction to database:", e);
    }
  };

  // Comment reaction toggle: communicates directly with PostgreSQL BD ProTalk database
  const handleToggleCommentReaction = async (commentId: string, emoji: string) => {
    const reactionKey = `${commentId}_${emoji}`;
    const isReacted = !!userCommentReactions[reactionKey];

    // Optimistic UI update
    const nextCommentUserReactions = { ...userCommentReactions, [reactionKey]: !isReacted };
    setUserCommentReactions(nextCommentUserReactions);
    localStorage.setItem(`rr_user_comm_reactions_${entityId}`, JSON.stringify(nextCommentUserReactions));

    try {
      const res = await fetch(`/api/landing/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, remove: isReacted })
      });
      const data = await res.json();
      if (data.success && data.reactions) {
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, reactions: data.reactions } : c));
      }
    } catch (e) {
      console.error("Failed to save comment reaction to database:", e);
    }
  };

  // Triggering server-side AI auto comment response
  const triggerAiAutoCommentResponse = async (userCommentText: string) => {
    setAiTyping(true);
    try {
      const prompt = `Пользователь оставил комментарий к отзыву ("${entityTitle}"): "${userCommentText}". 
Напиши краткий, вежливый, профессиональный ответ от "ИИ Ассистента" (1-2 предложения), благодаря за мнение и поясняя ценность продукта.`;
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          systemPrompt: 'Ты — ИИ Ассистент платформы. Твои комментарии полезные, экспертные, вежливые, без шаблонных фраз и без капслока.'
        })
      });

      let aiText = `Благодарим за ваш комментарий! Мы постоянно развиваем функционал системы для ускорения операционной отчетности.`;
      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          aiText = data.text;
        }
      }

      // Save AI reply in DB
      const saveRes = await fetch(`/api/landing/reviews/${cleanReviewId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: 'ИИ Ассистент',
          authorRole: 'ИИ Аналитик',
          text: aiText,
          reactions: {},
          audio_url: ''
        })
      });

      if (saveRes.ok) {
        const savedData = await saveRes.json();
        if (savedData.comment) {
          setComments(prev => [...prev, savedData.comment]);
        }
      }
    } catch (e) {
      console.error('Failed to trigger AI comment response', e);
    } finally {
      setAiTyping(false);
    }
  };

  // Handle posting a main comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = commentText.trim();
    if (!cleanText && !commentAudioUrl) return;

    let authorName = anonName.trim();
    let authorRoleText = 'Гость платформы';

    if (currentUser) {
      authorName = currentUser.name;
      authorRoleText = currentUser.position || 'Сотрудник';
    } else if (!authorName) {
      authorName = 'Гость';
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/landing/reviews/${cleanReviewId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: authorName,
          authorRole: authorRoleText,
          text: cleanText || 'Голосовой комментарий к отзыву',
          reactions: {},
          audio_url: commentAudioUrl || ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.comment) {
          const createdComment: Comment = {
            id: data.comment.id,
            review_id: cleanReviewId,
            author: data.comment.author,
            authorRole: data.comment.authorRole,
            text: data.comment.text,
            timestamp: data.comment.timestamp || 'Только что',
            reactions: {},
            audio_url: data.comment.audio_url || '',
            replies: []
          };
          setComments(prev => [...prev, createdComment]);
          setCommentText('');
          setCommentAudioUrl(null);
          setAnonName('');

          // Trigger AI auto comment response if not AI speaking
          if (authorName !== 'ИИ Ассистент') {
            await triggerAiAutoCommentResponse(cleanText);
          }
        }
      }
    } catch (e) {
      console.error("Failed to post comment:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle posting an inline reply
  const handleSubmitReply = async (e: React.FormEvent, parentAuthor: string) => {
    e.preventDefault();
    const cleanText = replyText.trim();
    if (!cleanText && !replyAudioUrl) return;

    let authorName = replyAnonName.trim();
    let authorRoleText = 'Гость платформы';

    if (currentUser) {
      authorName = currentUser.name;
      authorRoleText = currentUser.position || 'Сотрудник';
    } else if (!authorName) {
      authorName = 'Гость';
    }

    setIsSubmittingReply(true);
    try {
      const response = await fetch(`/api/landing/reviews/${cleanReviewId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: authorName,
          authorRole: authorRoleText,
          text: `Ответ для ${parentAuthor}: ${cleanText || 'Голосовое сообщение'}`,
          reactions: {},
          audio_url: replyAudioUrl || ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.comment) {
          setComments(prev => [...prev, data.comment]);
          setReplyText('');
          setReplyAudioUrl(null);
          setReplyAnonName('');
          setActiveReplyId(null);
        }
      }
    } catch (e) {
      console.error("Failed to post reply:", e);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Comment Item renderer without avatar icons
  const renderCommentItem = (item: Comment) => {
    const isAi = item.author.toLowerCase().includes('ии') || item.authorRole?.toLowerCase().includes('ии');
    
    return (
      <div 
        key={item.id} 
        className={`group space-y-2.5 transition-all duration-300 border-b pb-4 last:border-0 ${
          isLightTheme ? 'border-amber-900/10' : 'border-amber-400/20'
        }`}
        id={`comment-card-${item.id}`}
      >
        <div className="flex flex-col gap-1.5 w-full">
          {/* Author metadata (NO avatar icon) */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-bold ${
                isAi 
                  ? (isLightTheme ? 'text-amber-800 flex items-center gap-1 font-mono' : 'text-[#F4EE8E] flex items-center gap-1 font-mono')
                  : (isLightTheme ? 'text-amber-950 font-semibold' : 'text-white font-semibold')
              }`}>
                {isAi && <Sparkles size={14} className={isLightTheme ? "text-amber-600" : "text-[#E7C768]"} />}
                {item.author}
              </span>
              {item.authorRole && (
                <span className={`text-sm px-2 py-0.5 rounded font-medium border ${
                  isAi 
                    ? (isLightTheme ? 'bg-amber-100/80 border-amber-300 text-amber-900' : 'bg-[#E7C768]/15 border-[#E7C768]/30 text-[#F4EE8E]')
                    : (isLightTheme ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-white/5 border-amber-400/20 text-zinc-300')
                }`}>
                  {item.authorRole}
                </span>
              )}
            </div>
            <span className={`text-sm font-mono ${isLightTheme ? 'text-amber-900/60' : 'text-zinc-400'}`}>
              {item.timestamp}
            </span>
          </div>

          {/* Audio Player (rendered ABOVE text when audio is present) */}
          {item.audio_url && (
            <div className="my-1.5 max-w-sm">
              <CustomAudioPlayer
                audioUrl={item.audio_url}
                isLightTheme={isLightTheme}
              />
            </div>
          )}

          {/* Comment Text */}
          <p className={`text-sm leading-relaxed mt-1 whitespace-pre-line select-text font-sans ${
            isLightTheme ? 'text-zinc-900' : 'text-zinc-100'
          }`}>
            {item.text}
          </p>

          {/* Actions: Reaction list from DB & Reply button */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* Reaction buttons with counts from database */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              isLightTheme ? 'bg-amber-50/60 border-amber-300/60' : 'bg-[#1A0F02]/60 border-amber-400/30'
            }`}>
              {EMOJI_OPTIONS.map(emoji => {
                const count = item.reactions ? (item.reactions[emoji] || 0) : 0;
                const isReacted = !!userCommentReactions[`${item.id}_${emoji}`];
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleToggleCommentReaction(item.id, emoji)}
                    className={`text-sm transition-all flex items-center gap-1 cursor-pointer hover:scale-110 active:scale-95 ${
                      isReacted 
                        ? 'font-bold scale-105 filter drop-shadow-[0_0_2px_rgba(231,199,104,0.7)]' 
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    title={emoji}
                  >
                    <span>{emoji}</span>
                    {count > 0 && (
                      <span className={`text-sm font-mono font-semibold ${isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Reply trigger */}
            <button
              type="button"
              onClick={() => {
                setActiveReplyId(activeReplyId === item.id ? null : item.id);
                setReplyText('');
                setReplyAudioUrl(null);
              }}
              className={`text-sm font-semibold transition-colors flex items-center gap-1.5 py-1 px-3 rounded-lg cursor-pointer ${
                isLightTheme
                  ? 'text-amber-900 hover:bg-amber-100/70 border border-amber-300/40'
                  : 'text-[#E7C768] hover:bg-white/5 border border-amber-400/30'
              }`}
            >
              <CornerDownRight size={14} />
              <span>Ответить</span>
            </button>
          </div>

          {/* Inline Reply Input form */}
          {activeReplyId === item.id && (
            <form 
              onSubmit={(e) => handleSubmitReply(e, item.author)} 
              className={`mt-3 p-3.5 rounded-xl border space-y-3 animate-fade-in ${
                isLightTheme
                  ? 'bg-[#FFFBF5]/90 border-amber-400/60 shadow-sm'
                  : 'bg-[#1A0F02]/80 border-amber-400/40 shadow-[0_0_20px_rgba(244,238,142,0.1)]'
              }`}
              id={`reply-form-${item.id}`}
            >
              <div className={`flex items-center gap-1.5 text-sm font-bold ${
                isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
              }`}>
                <CornerDownRight size={14} />
                <span>Ваш ответ для {item.author}:</span>
              </div>

              {!currentUser && (
                <div className="w-full sm:w-72">
                  <MiniAudioField
                    value={replyAnonName}
                    onChange={setReplyAnonName}
                    placeholder="Ваше имя (или надиктуйте голосом) *"
                    isLightTheme={isLightTheme}
                    multiline={false}
                    showPlayer={false}
                  />
                </div>
              )}

              <MiniAudioField
                value={replyText}
                onChange={setReplyText}
                audioUrl={replyAudioUrl}
                onAudioUrlChange={setReplyAudioUrl}
                placeholder="Введите текст ответа или надиктуйте голосом..."
                isLightTheme={isLightTheme}
                showPlayer={true}
                multiline={false}
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveReplyId(null);
                    setReplyText('');
                    setReplyAudioUrl(null);
                  }}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-lg border transition-all cursor-pointer ${
                    isLightTheme 
                      ? 'border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-950' 
                      : 'border-amber-400/30 bg-white/5 hover:bg-white/10 text-zinc-300'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReply}
                  className={`px-4 py-1.5 text-sm font-bold rounded-lg border shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    isLightTheme
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 border-amber-600 text-amber-950 hover:brightness-105'
                      : 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] border-[#F4EE8E]/60 text-[#140A01] hover:brightness-110'
                  }`}
                >
                  <span>Отправить ответ</span>
                  <Send size={13} />
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    );
  };

  return (
    <div 
      className={`rounded-2xl border backdrop-blur-md p-5 sm:p-7 space-y-6 relative transition-all ${
        isLightTheme
          ? 'bg-[#FFFBF5]/90 border-amber-400/60 shadow-lg text-amber-950'
          : 'bg-[#1A0F02]/85 border-amber-400/40 shadow-[0_0_30px_rgba(244,238,142,0.15)] text-zinc-100'
      }`}
      id={`comments-section-${entityId}`}
    >
      
      {/* 1. REACTIONS ROW FROM DATABASE */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 select-none ${
        isLightTheme ? 'border-amber-900/10' : 'border-amber-400/20'
      }`}>
        <div className="space-y-1">
          <h4 className={`text-sm font-bold tracking-wide font-mono ${
            isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
          }`}>
            Оцените {entityType === 'post' ? 'публикацию' : 'отзыв'}:
          </h4>
          <p className={`text-sm ${isLightTheme ? 'text-amber-900/70' : 'text-zinc-400'}`}>
            Нажмите на эмодзи ниже, чтобы выразить эмоцию к материалу
          </p>
        </div>
 
        {/* Real emoji reaction buttons with DB counts */}
        <div className="flex flex-wrap gap-2" id="entity-reactions-row">
          {EMOJI_OPTIONS.map(emoji => {
            const count = reactions[emoji] || 0;
            const isReacted = !!userReactions[emoji];
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => handleToggleEntityReaction(emoji)}
                className={`px-3 py-1.5 rounded-full border text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 ${
                  isReacted
                    ? (isLightTheme 
                        ? 'bg-amber-200/90 border-amber-500 text-amber-950 shadow-sm scale-105' 
                        : 'bg-[#E7C768]/20 border-[#F4EE8E] text-[#F4EE8E] scale-105 shadow-[0_0_15px_rgba(244,238,142,0.3)]')
                    : (isLightTheme 
                        ? 'bg-amber-50/80 border-amber-300 text-amber-900 hover:bg-amber-100' 
                        : 'bg-[#140A01]/70 border-amber-400/30 text-zinc-300 hover:text-white hover:border-amber-400/60')
                }`}
              >
                <span className="text-base">{emoji}</span>
                {count > 0 && <span className="text-sm font-mono font-semibold">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. COMMENTS LIST */}
      <div className="space-y-4">
        <div className={`flex items-center justify-between border-b pb-2.5 ${
          isLightTheme ? 'border-amber-900/10' : 'border-amber-400/20'
        }`}>
          <h4 className={`text-sm font-bold flex items-center gap-2 ${
            isLightTheme ? 'text-amber-950' : 'text-white'
          }`}>
            <MessageSquare size={16} className={isLightTheme ? "text-amber-700" : "text-[#E7C768]"} />
            <span>Обсуждение и комментарии ({comments.length})</span>
          </h4>
          {aiTyping && (
            <span className={`text-sm animate-pulse font-mono flex items-center gap-1.5 ${
              isLightTheme ? 'text-amber-800' : 'text-[#F4EE8E]'
            }`}>
              <Sparkles size={13} className="animate-spin" />
              ИИ формирует ответ...
            </span>
          )}
        </div>

        <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1 sm:pr-2 scrollbar-thin">
          {isLoadingComments ? (
            <p className={`text-center py-6 text-sm ${isLightTheme ? 'text-amber-900/70' : 'text-zinc-400'}`}>
              Загрузка комментариев...
            </p>
          ) : comments.length > 0 ? (
            comments.map(c => renderCommentItem(c))
          ) : (
            <p className={`text-center py-6 text-sm ${isLightTheme ? 'text-amber-900/70' : 'text-zinc-400'}`}>
              Здесь пока нет комментариев. Напишите свой первый комментарий или оставьте голосовую аудиозапись ниже!
            </p>
          )}
        </div>
      </div>

      {/* 3. NEW COMMENT FORM WITH MINIAUDIOFIELD */}
      <div className={`border-t pt-5 ${isLightTheme ? 'border-amber-900/10' : 'border-amber-400/20'}`}>
        <h5 className={`text-sm font-bold mb-3.5 flex items-center gap-1.5 ${
          isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'
        }`}>
          <Smile size={15} />
          <span>Написать комментарий:</span>
        </h5>

        <form onSubmit={handleSubmitComment} className="space-y-4">
          {currentUser ? (
            <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
              isLightTheme 
                ? 'bg-amber-100/60 border-amber-300 text-amber-950' 
                : 'bg-[#140A01]/70 border-amber-400/30 text-zinc-200'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isLightTheme ? 'bg-amber-600' : 'bg-[#E7C768]'} animate-pulse`} />
              <span>Вы авторизованы как <strong className={isLightTheme ? 'text-amber-950' : 'text-[#F4EE8E]'}>{currentUser.name}</strong> ({currentUser.position || 'Пользователь'})</span>
            </div>
          ) : (
            <div>
              <label className={`block text-sm font-bold mb-1.5 ${isLightTheme ? 'text-amber-950' : 'text-amber-200/90'}`}>
                Ваше имя *
              </label>
              <div className="w-full sm:w-72">
                <MiniAudioField
                  value={anonName}
                  onChange={setAnonName}
                  placeholder="Представьтесь или надиктуйте имя..."
                  isLightTheme={isLightTheme}
                  multiline={false}
                  showPlayer={false}
                />
              </div>
            </div>
          )}

          <div>
            <label className={`block text-sm font-bold mb-1.5 ${isLightTheme ? 'text-amber-950' : 'text-amber-200/90'}`}>
              Сообщение или голосовая запись *
            </label>
            <MiniAudioField
              multiline={true}
              rows={3}
              value={commentText}
              onChange={setCommentText}
              audioUrl={commentAudioUrl}
              onAudioUrlChange={setCommentAudioUrl}
              placeholder="Введите текст комментария или нажмите микрофон для голосовой записи..."
              isLightTheme={isLightTheme}
              showPlayer={true}
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold border shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                isLightTheme
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-105 border-amber-600 text-amber-950'
                  : 'bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 border-[#F4EE8E]/60 text-[#140A01]'
              }`}
            >
              <span>{isSubmitting ? 'Отправка...' : 'Отправить комментарий'}</span>
              <Send size={14} />
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

