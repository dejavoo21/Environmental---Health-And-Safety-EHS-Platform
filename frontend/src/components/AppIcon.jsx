import {
  AlertTriangle,
  Ban,
  Bomb,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Flame,
  FlaskConical,
  Folder,
  GraduationCap,
  HardHat,
  Info,
  Laptop,
  Link,
  Lock,
  Mail,
  MapPin,
  Moon,
  Palette,
  RefreshCcw,
  Search,
  Sun,
  Upload,
  User,
  Users,
  Wind,
  Wrench,
  Zap,
  XCircle,
  Leaf
} from 'lucide-react';

const iconMap = {
  // Semantic names
  alert: AlertTriangle,
  warning: AlertTriangle,
  ban: Ban,
  bomb: Bomb,
  calendar: Calendar,
  check: CheckCircle2,
  clipboard: ClipboardList,
  clock: Clock,
  document: FileText,
  file: FileText,
  flame: Flame,
  flask: FlaskConical,
  folder: Folder,
  graduation: GraduationCap,
  hardhat: HardHat,
  info: Info,
  link: Link,
  lock: Lock,
  mail: Mail,
  mappin: MapPin,
  moon: Moon,
  palette: Palette,
  refresh: RefreshCcw,
  search: Search,
  sun: Sun,
  upload: Upload,
  user: User,
  users: Users,
  wind: Wind,
  wrench: Wrench,
  zap: Zap,
  leaf: Leaf,
  error: XCircle,
  default: FileText,

  // Emoji keys (unicode escapes to keep ASCII source)
  '\u{1F525}': Flame,
  '\u{1F3D7}': HardHat,
  '\u{1FA9C}': Wrench,
  '\u{1F6A7}': AlertTriangle,
  '\u{1F4CB}': ClipboardList,
  '\u{1F4A3}': Bomb,
  '\u{1F4A8}': Wind,
  '\u{1F33F}': Leaf,
  '\u{1F4DD}': FileText,
  '\u{1F6A8}': AlertTriangle,
  '\u{1F4E7}': Mail,
  '\u{1F4ED}': Mail,
  '\u{1F4C4}': FileText,
  '\u{1F4CD}': MapPin,
  '\u{1F477}': HardHat,
  '\u{1F512}': Lock,
  '\u{1F4E4}': Upload,
  '\u{1F7E2}': CheckCircle2,
  '\u{1F6AB}': Ban,
  '\u{1F393}': GraduationCap,
  '\u{1F534}': AlertTriangle,
  '\u{1F4DC}': FileText,
  '\u{1F517}': Link,
  '\u{1F50D}': Search,
  '\u{26A1}': AlertTriangle,
  '\u{1F9EA}': FlaskConical,
  '\u{1F321}': AlertTriangle,
  '\u{1F6E0}': Wrench,
  '\u{26A0}': AlertTriangle,
  '\u{1F4BB}': Laptop,
  '\u{1F319}': Moon,
  '\u{1F3A8}': Palette,
  '\u{1F4C1}': Folder,
  '\u{1F4C5}': Calendar,
  '\u{1F504}': RefreshCcw,
  '\u{1F464}': User,
  '\u{1F465}': Users
};

const AppIcon = ({ name, size = 16, className }) => {
  if (!name) {
    const DefaultIcon = iconMap.default;
    return <DefaultIcon size={size} className={className} aria-hidden="true" />;
  }

  const key = typeof name === 'string' ? name : '';
  const normalized = key.toLowerCase();
  const emojiKey = key.replace(/\uFE0F/g, '');
  const Icon = iconMap[key] || iconMap[normalized] || iconMap[emojiKey] || iconMap.default;

  return <Icon size={size} className={className} aria-hidden="true" />;
};

export default AppIcon;
