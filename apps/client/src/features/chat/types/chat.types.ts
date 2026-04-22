export interface Message {
  id: string;
  content: string;
  userId: string;
  roomId: string;
  createdAt: string;
  isGuest?: boolean;
  user: {
    id: string;
    username: string;
  };
}

export interface ChatHistoryResponse {
  data: Message[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ChatState {
  isOpen: boolean;
  messages: Message[];
  unreadCount: number;
}
