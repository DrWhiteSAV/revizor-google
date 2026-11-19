// FileUploadService.ts - ProTalk File Upload Service for PostgreSQL BD ProTalk

const UPLOAD_URL = "https://file.pro-talk.ru/tgf";
const FILESTORE_UP_URL = "https://filestore.pro-talk.ru/up";
const STORAGE_KEY = "protalk_upload_token";
const FILES_MAP_KEY = "protalk_files_map";
const DEFAULT_TOKEN = "YGdRXHFtX1thYlh3GHAgBmE4OgoKMCBmBSV2EAZdHRk7YWF0EydVHQwvcSk7ahQYaGtdWGtjUgVvAH9YAmk";

export interface FileRecord {
  id: number;
  file_key: string;
  name: string;
  original_url: string;
  short_url?: string;
  mime_type: string;
  file_size: number;
  folder_id: number | null;
  folder_ids?: number[];
  owner_id?: string;
  owner_name?: string;
  owner_avatar?: string;
  created_at: string;
}

export interface FileFolder {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface FileMap {
  [key: string]: string; // key -> full URL or short local URL
}

export class FileUploadService {
  private token: string;

  constructor(token?: string) {
    this.token = token || this.getToken();
  }

  private getToken(): string {
    if (typeof window === 'undefined') return DEFAULT_TOKEN;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved || saved === "b2VcU3NrVVttYlh3GHM_AEQ4eA8yDR4FGREODwsaLyUqQjpTEA8HGzMdFB8aORQYaG9dWGpkVQRvAXM") {
      localStorage.setItem(STORAGE_KEY, DEFAULT_TOKEN);
      return DEFAULT_TOKEN;
    }
    return saved;
  }

  public setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, token);
    }
  }

  public getCurrentToken(): string {
    return this.token;
  }

  // Загрузка по URL через ProTalk
  async uploadFromUrl(url: string): Promise<string> {
    const response = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: {
        "X-Upload-Token": this.token
      },
      body: new URLSearchParams({ url })
    });

    if (!response.ok) throw new Error("Ошибка загрузки по URL");
    const data = await response.json();
    return data.url;
  }

  private async parseResponseUrl(response: Response): Promise<string> {
    const text = await response.text();
    const trimmed = text.trim();
    try {
      const data = JSON.parse(trimmed);
      if (typeof data === 'object' && data !== null) {
        return data.url || data.file_url || data.link || '';
      }
      if (typeof data === 'string' && (data.startsWith('http://') || data.startsWith('https://'))) {
        return data;
      }
    } catch {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed.replace(/^"|"$/g, '');
      }
    }
    return '';
  }

  // Загрузка из File с поддержкой прозрачности PNG (X-Preserve-Alpha)
  async uploadFromFile(file: File, preserveAlpha = true): Promise<string> {
    const isPng = file.type === "image/png" || file.name.toLowerCase().endsWith('.png');

    // Primary: Try server proxy route which sends server-to-server request
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/files/upload", {
        method: "POST",
        headers: { "X-Upload-Token": this.token },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.original_url) return data.original_url;
      }
    } catch (e) {
      console.warn("Server proxy upload attempt failed, trying direct client fetch:", e);
    }

    // Direct fetch fallback
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {
      "X-Upload-Token": this.token
    };

    if (preserveAlpha && isPng) {
      headers["X-Preserve-Alpha"] = "true";
    }

    const targetUrl = isPng ? FILESTORE_UP_URL : UPLOAD_URL;

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: formData
      });

      if (response.ok) {
        const url = await this.parseResponseUrl(response);
        if (url) return url;
      }
    } catch (e) {
      console.warn("Primary upload URL error, attempting fallback:", e);
    }

    // Fallback to UPLOAD_URL
    const fallbackResponse = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { "X-Upload-Token": this.token },
      body: formData
    });

    if (!fallbackResponse.ok) throw new Error("Не удалось загрузить файл");
    const fbUrl = await this.parseResponseUrl(fallbackResponse);
    if (!fbUrl) throw new Error("Не удалось получить URL файла");
    return fbUrl;
  }

  // Загрузка из Blob
  async uploadFromBlob(blob: Blob, filename: string): Promise<string> {
    const file = new File([blob], filename, { type: blob.type });
    return this.uploadFromFile(file);
  }

  // Загрузка из base64
  async uploadFromBase64(base64: string, filename: string): Promise<string> {
    const response = await fetch(base64);
    const blob = await response.blob();
    return this.uploadFromBlob(blob, filename);
  }

  // Массовая загрузка нескольких файлов
  async uploadBatch(
    files: File[], 
    folderId?: number | null,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<FileRecord[]> {
    const results: FileRecord[] = [];
    let completed = 0;

    if (onProgress) onProgress(0, files.length);

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (folderId) formData.append("folder_id", String(folderId));

        const res = await fetch("/api/admin/files/upload", {
          method: "POST",
          headers: { "X-Upload-Token": this.token },
          body: formData
        });

        if (res.ok) {
          const registeredFile = await res.json();
          results.push(registeredFile);
        } else {
          // Fallback to uploadFromFile + register
          const originalUrl = await this.uploadFromFile(file);
          const regRes = await fetch("/api/admin/files/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: file.name,
              original_url: originalUrl,
              mime_type: file.type || 'image/png',
              file_size: file.size,
              folder_id: folderId || null
            })
          });
          const registeredFile = await regRes.json();
          results.push(registeredFile);
        }
      } catch (err) {
        console.error("Batch upload item error:", err);
      }

      completed++;
      if (onProgress) onProgress(completed, files.length);
    }

    return results;
  }

  // Генерация 8-символьного ключа
  generateKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Upload and store key mapping
  async uploadAndStore(file: File | string, customKey?: string): Promise<{ key: string; url: string }> {
    let url: string;
    if (typeof file === 'string') {
      url = await this.uploadFromUrl(file);
    } else {
      url = await this.uploadFromFile(file);
    }

    const key = customKey || this.generateKey();
    this.addFileToMap(key, url);

    return { key, url };
  }

  // Get URL by key from map
  getFileUrl(key: string): string | null {
    const map = this.getFileMap();
    return map[key] || null;
  }

  // Замена плейсхолдеров {{key}} на URL
  replaceKeysWithUrls(text: string, map?: FileMap): string {
    const fileMap = map || this.getFileMap();
    let result = text;
    for (const [key, url] of Object.entries(fileMap)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), url);
    }
    return result;
  }

  // Замена URL на плейсхолдеры {{key}}
  replaceUrlsWithKeys(text: string, map?: FileMap): string {
    const fileMap = map || this.getFileMap();
    let result = text;
    for (const [key, url] of Object.entries(fileMap)) {
      result = result.replace(new RegExp(url, 'g'), `{{${key}}}`);
    }
    return result;
  }

  private getFileMap(): FileMap {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem(FILES_MAP_KEY);
    return saved ? JSON.parse(saved) : {};
  }

  public saveFileMap(map: FileMap): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(FILES_MAP_KEY, JSON.stringify(map));
    }
  }

  public addFileToMap(key: string, url: string): void {
    const map = this.getFileMap();
    map[key] = url;
    this.saveFileMap(map);
  }
}

// Transliterate Cyrillic to Latin, replace spaces with hyphens, preserve extension
export function slugifyFileName(filename: string, mime_type?: string): string {
  if (!filename) {
    if (mime_type?.startsWith('audio/')) return 'audio.webm';
    if (mime_type?.startsWith('video/')) return 'video.mp4';
    return 'file.png';
  }

  const lastDot = filename.lastIndexOf('.');
  let baseName = lastDot !== -1 ? filename.substring(0, lastDot) : filename;
  let ext = lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';

  if (!ext) {
    if (mime_type?.startsWith('audio/')) {
      if (mime_type.includes('ogg')) ext = '.ogg';
      else if (mime_type.includes('mp3') || mime_type.includes('mpeg')) ext = '.mp3';
      else if (mime_type.includes('wav')) ext = '.wav';
      else ext = '.webm';
    } else if (mime_type?.startsWith('video/')) {
      if (mime_type.includes('webm')) ext = '.webm';
      else ext = '.mp4';
    } else if (mime_type?.startsWith('image/')) {
      if (mime_type.includes('jpeg') || mime_type.includes('jpg')) ext = '.jpg';
      else if (mime_type.includes('webp')) ext = '.webp';
      else if (mime_type.includes('svg')) ext = '.svg';
      else ext = '.png';
    } else {
      ext = '.png';
    }
  }

  const ruToEn: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya'
  };

  let slugged = baseName
    .toLowerCase()
    .split('')
    .map(ch => ruToEn[ch] !== undefined ? ruToEn[ch] : ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slugged) slugged = 'file';
  if (!ext.startsWith('.')) ext = '.' + ext;

  return `${slugged}${ext}`;
}

export function getFileFormattedUrl(file: { id: number | string; file_key?: string; name: string; mime_type?: string }, origin = ''): string {
  const idStr = file.id || file.file_key || '1';
  const slug = slugifyFileName(file.name, file.mime_type);
  const path = `/file/${idStr}/${slug}`;
  return origin ? `${origin}${path}` : path;
}

let uploadService: FileUploadService | null = null;
export function getUploadService(): FileUploadService {
  if (!uploadService) {
    uploadService = new FileUploadService();
  }
  return uploadService;
}
