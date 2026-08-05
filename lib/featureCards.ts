export type CardRarity = "common" | "rare" | "epic" | "legendary";
export type CardCategory = "shifts" | "team" | "stock" | "analytics" | "premium";

export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  flavor: string;
  icon: string;
  rarity: CardRarity;
  category: CardCategory;
  isPremium: boolean;
  implemented: boolean;
  route?: string;
}

export const RARITY_LABELS: Record<CardRarity, string> = {
  common: "ОБЫЧНАЯ",
  rare: "РЕДКАЯ",
  epic: "ЭПИЧЕСКАЯ",
  legendary: "ЛЕГЕНДАРНАЯ",
};

export const RARITY_COLORS: Record<CardRarity, { border: string; glow: string; label: string; bg: string }> = {
  common:    { border: "#6B7280", glow: "#6B728044", label: "#9CA3AF", bg: "#6B728014" },
  rare:      { border: "#3B82F6", glow: "#3B82F644", label: "#60A5FA", bg: "#3B82F614" },
  epic:      { border: "#8B5CF6", glow: "#8B5CF644", label: "#A78BFA", bg: "#8B5CF614" },
  legendary: { border: "#F59E0B", glow: "#F59E0B66", label: "#FBBF24", bg: "#F59E0B18" },
};

export const FEATURE_CARDS: FeatureCard[] = [
  {
    id: "shift-reminders",
    title: "Напоминания",
    description: "Уведомление за 15 минут до начала смены. Никогда не опоздай и не забудь предупредить команду.",
    flavor: "«Лучший менеджер — тот, кого ждут, а не ищут.»",
    icon: "bell",
    rarity: "common",
    category: "shifts",
    isPremium: false,
    implemented: false,
  },
  {
    id: "custom-checklists",
    title: "Свои чеклисты",
    description: "Создавай неограниченное количество собственных шаблонов чек-листов. Стандартные — лишь начало.",
    flavor: "«Порядок — это привычка, а не случайность.»",
    icon: "check-square",
    rarity: "common",
    category: "shifts",
    isPremium: false,
    implemented: false,
  },
  {
    id: "shift-goals",
    title: "Цели смены",
    description: "Устанавливай план по чаевым перед сменой. Следи за прогрессом в реальном времени.",
    flavor: "«Команда без цели — просто группа людей.»",
    icon: "target",
    rarity: "common",
    category: "shifts",
    isPremium: false,
    implemented: false,
  },
  {
    id: "team-roles",
    title: "Роли команды",
    description: "Назначай роли: Бармен, Барбек, Официант, Хостес. Фильтруй чаевые и смены по ролям.",
    flavor: "«Каждый герой незаменим на своей позиции.»",
    icon: "shield",
    rarity: "rare",
    category: "team",
    isPremium: true,
    implemented: false,
  },
  {
    id: "export-reports",
    title: "Экспорт отчётов",
    description: "Экспорт в PDF и CSV одним нажатием. Отправь владельцу или сохрани для бухгалтерии.",
    flavor: "«Документы — это броня в спорных ситуациях.»",
    icon: "upload",
    rarity: "rare",
    category: "analytics",
    isPremium: true,
    implemented: false,
  },
  {
    id: "weekly-analytics",
    title: "Аналитика",
    description: "Графики динамики чаевых по неделям и месяцам. Лучшие дни, лучшие смены, лучшие бармены.",
    flavor: "«Маг не угадывает — он знает.»",
    icon: "bar-chart-2",
    rarity: "rare",
    category: "analytics",
    isPremium: true,
    implemented: true,
    route: "/stats",
  },
  {
    id: "tips-forecast",
    title: "Прогноз чаевых",
    description: "ИИ анализирует историю и предсказывает ожидаемые чаевые на основе дня недели и сезона.",
    flavor: "«Провидец не видит будущее — он понимает настоящее.»",
    icon: "trending-up",
    rarity: "epic",
    category: "analytics",
    isPremium: true,
    implemented: false,
  },
  {
    id: "smart-stock",
    title: "Умный склад",
    description: "Автоматический список пополнения на основе расхода за смену. Отправляй поставщику в один клик.",
    flavor: "«Алхимик знает: закончившийся ингредиент — это провал зелья.»",
    icon: "package",
    rarity: "epic",
    category: "stock",
    isPremium: true,
    implemented: false,
  },
  {
    id: "bonus-system",
    title: "Бонусная система",
    description: "Автоматические бонусы лучшему сотруднику смены. Мотивируй команду без лишних слов.",
    flavor: "«Паладин не просит уважения — он его заслуживает.»",
    icon: "award",
    rarity: "epic",
    category: "team",
    isPremium: true,
    implemented: false,
  },
  {
    id: "multibar",
    title: "Мультибар",
    description: "Управляй несколькими барами из одного приложения. Полная аналитика и команда по каждой точке.",
    flavor: "«Легендарные артефакты меняют правила игры.»",
    icon: "globe",
    rarity: "legendary",
    category: "premium",
    isPremium: true,
    implemented: false,
  },
];
