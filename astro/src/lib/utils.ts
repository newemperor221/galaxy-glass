export function bytes(b: number): string {
  if (!b || b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function uptime(s: number): string {
  if (!s || s < 0) return "-";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return d + "天" + h + "时";
  if (h > 0) return h + "时" + m + "分";
  return m + "分";
}

export function age(ts: string | null | undefined): string {
  if (!ts) return "-";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return mins + "分钟前";
  const h = Math.floor(mins / 60);
  if (h < 24) return h + "小时前";
  return Math.floor(h / 24) + "天前";
}

export function metricColorClass(v: number): string {
  return v >= 90 ? "high" : v >= 70 ? "medium" : "low";
}

export function flagEmoji(code?: string): string {
  if (!code) return "";
  const regionMap: Record<string, string> = {
    "东京": "jp", "日本": "jp", "大阪": "jp",
    "香港": "hk", "台湾": "tw",
    "新加坡": "sg",
    "首尔": "kr", "韩国": "kr",
    "洛杉矶": "us", "纽约": "us", "硅谷": "us", "圣何塞": "us",
    "法兰克福": "de", "德国": "de",
    "伦敦": "gb", "英国": "gb",
    "阿姆斯特丹": "nl", "荷兰": "nl",
  };
  const c = code.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(c)) return c.toLowerCase();
  return regionMap[code.trim()] || regionMap[code] || "";
}

export function getOSIcon(os?: string): string {
  if (!os) return "";
  const lower = os.toLowerCase();
  if (lower.includes("debian")) return "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/debian/debian-original.svg";
  if (lower.includes("ubuntu")) return "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ubuntu/ubuntu-plain.svg";
  if (lower.includes("centos")) return "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/centos/centos-original.svg";
  if (lower.includes("fedora")) return "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fedora/fedora-plain.svg";
  if (lower.includes("arch")) return "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/archlinux/archlinux-original.svg";
  if (lower.includes("windows")) return "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/windows8/windows8-original.svg";
  if (lower.includes("freebsd")) return "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/freebsd/freebsd-original.svg";
  if (lower.includes("openbsd")) return "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/openbsd/openbsd-original.svg";
  return "";
}

export function priceTag(price?: number, currency?: string): string {
  if (price === undefined || price === null) return "";
  const sym = currency === "¥" ? "¥" : "$";
  return sym + price.toFixed(2);
}
