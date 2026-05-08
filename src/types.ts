export interface StickerRow {
  id: number;
  name: string;
  keywords: string;
  type: string;
  path: string;
  content: string;
  created_at: string;
  last_used_at: string | null;
  usage_count: number;
}

export interface Sticker {
  id: number;
  name: string;
  keywords: string;
  type: "image" | "ascii";
  /** 文件在 .amoji/ 下的相对路径，如 "images/cat.png" "ascii/doge.txt" */
  path: string;
  /** 表情包表达的含义/情绪描述，用于搜索和理解 */
  content: string;
  createdAt: string;
  lastUsedAt: string | null;
  usageCount: number;
}

export function toSticker(row: StickerRow): Sticker {
  return {
    id: row.id,
    name: row.name,
    keywords: row.keywords,
    type: row.type as "image" | "ascii",
    path: row.path,
    content: row.content,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    usageCount: row.usage_count,
  };
}
