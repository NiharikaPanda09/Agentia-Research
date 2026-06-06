// frontend/lib/api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1_URL = `${API_BASE_URL}/api/v1`;

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_V1_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errData = await response.json();
      errorMsg = errData.detail || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

// Auth API
export const authApi = {
  async register(email: string, fullName: string, password: string): Promise<any> {
    return request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: fullName, password }),
    });
  },

  async login(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_V1_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      let errorMsg = 'Incorrect email or password';
      try {
        const errData = await response.json();
        errorMsg = errData.detail || errorMsg;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    setAuthToken(data.access_token);
    return data;
  },

  async me(): Promise<{ id: string; email: string; full_name: string }> {
    return request('/auth/me');
  },
};

// Workspace API
export interface WorkspaceType {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
}

export const workspaceApi = {
  async list(): Promise<WorkspaceType[]> {
    return request('/workspaces/');
  },

  async create(name: string, description?: string): Promise<WorkspaceType> {
    return request('/workspaces/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
  },

  async addMember(workspaceId: string, email: string, role: string = 'member'): Promise<any> {
    return request(`/workspaces/${workspaceId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
  },
};

// Chat API
export interface ChatType {
  id: string;
  title: string;
  workspace_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CitationType {
  id: string;
  message_id: string;
  source_title: string;
  source_url: string | null;
  snippet: string | null;
  confidence_score: number;
}

export interface MessageType {
  id: string;
  chat_id: string;
  sender: 'user' | 'assistant';
  content: string;
  agent_flow_state?: string;
  created_at: string;
  citations?: CitationType[];
}

export interface ReportType {
  id: string;
  chat_id: string;
  workspace_id: string;
  title: string;
  markdown_content: string;
  generated_at: string;
}

export const chatApi = {
  async list(workspaceId: string): Promise<ChatType[]> {
    return request(`/chats/?workspace_id=${workspaceId}`);
  },

  async create(title: string, workspaceId: string): Promise<ChatType> {
    return request('/chats/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, workspace_id: workspaceId }),
    });
  },

  async getMessages(chatId: string): Promise<MessageType[]> {
    return request(`/chats/${chatId}/messages`);
  },

  getWebSocketUrl(chatId: string): string {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = API_BASE_URL.replace(/^https?:\/\//, '');
    const token = getAuthToken() || '';
    return `${wsProto}//${host}/api/v1/chats/ws/${chatId}?token=${encodeURIComponent(token)}`;
  },
};

// Documents API
export interface UploadedFileType {
  id: string;
  workspace_id: string;
  filename: string;
  filepath: string;
  file_type: string;
  size: number;
  created_at: string;
}

export const documentApi = {
  async list(workspaceId: string): Promise<UploadedFileType[]> {
    return request(`/documents/?workspace_id=${workspaceId}`);
  },

  async upload(workspaceId: string, file: File): Promise<UploadedFileType> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspace_id', workspaceId);

    const token = getAuthToken();
    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_V1_URL}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      let errorMsg = 'Failed to upload document';
      try {
        const errData = await response.json();
        errorMsg = errData.detail || errorMsg;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    return response.json() as Promise<UploadedFileType>;
  },

  async delete(fileId: string): Promise<any> {
    return request(`/documents/${fileId}`, {
      method: 'DELETE',
    });
  },
};

// Reports API
export const reportApi = {
  async list(workspaceId: string): Promise<ReportType[]> {
    return request(`/reports/?workspace_id=${workspaceId}`);
  },

  async get(reportId: string): Promise<ReportType> {
    return request(`/reports/${reportId}`);
  },
};

// Notes API
export interface NoteType {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  linked_chat_id: string | null;
  updated_at: string;
}

export const noteApi = {
  async list(workspaceId: string): Promise<NoteType[]> {
    return request(`/notes/?workspace_id=${workspaceId}`);
  },

  async create(title: string, content: string, workspaceId: string, linkedChatId?: string | null): Promise<NoteType> {
    return request('/notes/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, workspace_id: workspaceId, linked_chat_id: linkedChatId }),
    });
  },

  async update(noteId: string, title: string, content: string, linkedChatId?: string | null): Promise<NoteType> {
    return request(`/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, linked_chat_id: linkedChatId }),
    });
  },

  async delete(noteId: string): Promise<any> {
    return request(`/notes/${noteId}`, {
      method: 'DELETE',
    });
  },
};
