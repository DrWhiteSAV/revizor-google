export type CopilotActionType = 'navigate' | 'open_modal' | 'fill_form' | 'open_article';

export interface CopilotActionPayload {
  type: CopilotActionType;
  target?: string;
  tab?: string;
  modal?: string;
  fields?: Record<string, any>;
  articleId?: string;
  articleTitle?: string;
  label?: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  screenshotUrl?: string;
  actions?: CopilotActionPayload[];
  matchedArticleId?: string;
  matchedArticleTitle?: string;
}

export interface CabinetCopilotProps {
  currentUser?: {
    id?: string;
    role?: string;
    name?: string;
    email?: string;
    department?: string;
  } | null;
  activeTab: string;
  onNavigateTab: (tabId: string) => void;
  onOpenModal?: (modalId: string, prefill?: any) => void;
  theme?: 'dark' | 'light';
  onOpenAcademyHelp?: (routeOrId?: string) => void;
}
