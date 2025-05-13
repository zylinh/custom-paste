export type ClipboardItemType = 'text' | 'image' | 'file';
export type FilterType = 'all' | ClipboardItemType; // Added for UIX-013

export interface ClipboardItem {
  id?: number; // 数据库自增 ID
  content_type: ClipboardItemType;
  text_content: string | null;
  image_path: string | null; // 图片存储的绝对路径
  file_paths: string[] | null; // 文件/文件夹路径列表
  source_app: string | null;
  timestamp: number; // Unix 毫秒时间戳
  is_favorite?: number; // 0 or 1, default 0
  hash: string; // 内容的哈希值
  preview_text?: string; // 文本预览、图片文件名或文件信息 (如数量)
  search_text?: string; // 用于搜索的文本
}