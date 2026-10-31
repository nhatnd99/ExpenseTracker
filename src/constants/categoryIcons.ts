/**
 * categoryIcons.ts
 * Standard curated financial category icons mapped to Lucide React and emoji counterparts.
 * Organized into 6 distinct spending and financial groups.
 */
import {
  // Food & Living
  Utensils,
  Coffee,
  ShoppingCart,
  Pizza,
  Apple,
  Store,
  // Transportation
  Fuel,
  Car,
  Bus,
  Train,
  Bike,
  Plane,
  // Housing & Utilities
  Home,
  Lightbulb,
  Droplet,
  Wifi,
  Phone,
  Tv,
  // Personal & Healthcare
  Shirt,
  Sparkles,
  Dumbbell,
  Pill,
  HeartPulse,
  Scissors,
  // Entertainment & Social
  Film,
  Gamepad2,
  Gift,
  PartyPopper,
  Music,
  Wine,
  // Finance & Savings
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
  CreditCard,
  Coins,
  type LucideIcon,
} from 'lucide-react'

export interface StandardIconItem {
  id: string
  nameKey: string
  defaultName: string
  lucideName: string
  iconComponent: LucideIcon
  emoji: string
}

export interface StandardIconGroup {
  groupId: string
  groupNameKey: string
  defaultGroupName: string
  icons: StandardIconItem[]
}

export const CATEGORY_ICON_GROUPS: StandardIconGroup[] = [
  {
    groupId: 'food',
    groupNameKey: 'categoryIcons.groupFood',
    defaultGroupName: 'Ăn uống & Sinh hoạt',
    icons: [
      {
        id: 'utensils',
        nameKey: 'categoryIcons.food',
        defaultName: 'Đồ ăn / Bữa ăn',
        lucideName: 'Utensils',
        iconComponent: Utensils,
        emoji: '🍽️',
      },
      {
        id: 'coffee',
        nameKey: 'categoryIcons.coffee',
        defaultName: 'Cà phê & Trà',
        lucideName: 'Coffee',
        iconComponent: Coffee,
        emoji: '☕',
      },
      {
        id: 'shopping-cart',
        nameKey: 'categoryIcons.supermarket',
        defaultName: 'Siêu thị & Tạp hóa',
        lucideName: 'ShoppingCart',
        iconComponent: ShoppingCart,
        emoji: '🛒',
      },
      {
        id: 'pizza',
        nameKey: 'categoryIcons.fastFood',
        defaultName: 'Ăn vặt & Fastfood',
        lucideName: 'Pizza',
        iconComponent: Pizza,
        emoji: '🍕',
      },
      {
        id: 'apple',
        nameKey: 'categoryIcons.groceries',
        defaultName: 'Thực phẩm tươi sống',
        lucideName: 'Apple',
        iconComponent: Apple,
        emoji: '🍎',
      },
      {
        id: 'store',
        nameKey: 'categoryIcons.convenience',
        defaultName: 'Cửa hàng tiện lợi',
        lucideName: 'Store',
        iconComponent: Store,
        emoji: '🏪',
      },
    ],
  },
  {
    groupId: 'transport',
    groupNameKey: 'categoryIcons.groupTransport',
    defaultGroupName: 'Di chuyển & Đi lại',
    icons: [
      {
        id: 'fuel',
        nameKey: 'categoryIcons.fuel',
        defaultName: 'Xăng dầu',
        lucideName: 'Fuel',
        iconComponent: Fuel,
        emoji: '⛽',
      },
      {
        id: 'car',
        nameKey: 'categoryIcons.car',
        defaultName: 'Taxi & Xe công nghệ',
        lucideName: 'Car',
        iconComponent: Car,
        emoji: '🚗',
      },
      {
        id: 'bus',
        nameKey: 'categoryIcons.bus',
        defaultName: 'Xe buýt & Công cộng',
        lucideName: 'Bus',
        iconComponent: Bus,
        emoji: '🚌',
      },
      {
        id: 'train',
        nameKey: 'categoryIcons.train',
        defaultName: 'Tàu điện & Tàu hỏa',
        lucideName: 'Train',
        iconComponent: Train,
        emoji: '🚆',
      },
      {
        id: 'bike',
        nameKey: 'categoryIcons.bike',
        defaultName: 'Xe đạp & Xe máy',
        lucideName: 'Bike',
        iconComponent: Bike,
        emoji: '🚲',
      },
      {
        id: 'plane',
        nameKey: 'categoryIcons.plane',
        defaultName: 'Vé máy bay',
        lucideName: 'Plane',
        iconComponent: Plane,
        emoji: '✈️',
      },
    ],
  },
  {
    groupId: 'housing',
    groupNameKey: 'categoryIcons.groupHousing',
    defaultGroupName: 'Nhà cửa & Hóa đơn',
    icons: [
      {
        id: 'home',
        nameKey: 'categoryIcons.rent',
        defaultName: 'Tiền thuê nhà / Phòng',
        lucideName: 'Home',
        iconComponent: Home,
        emoji: '🏠',
      },
      {
        id: 'lightbulb',
        nameKey: 'categoryIcons.electricity',
        defaultName: 'Tiền điện',
        lucideName: 'Lightbulb',
        iconComponent: Lightbulb,
        emoji: '💡',
      },
      {
        id: 'droplet',
        nameKey: 'categoryIcons.water',
        defaultName: 'Tiền nước',
        lucideName: 'Droplet',
        iconComponent: Droplet,
        emoji: '💧',
      },
      {
        id: 'wifi',
        nameKey: 'categoryIcons.internet',
        defaultName: 'Internet & Cáp',
        lucideName: 'Wifi',
        iconComponent: Wifi,
        emoji: '📶',
      },
      {
        id: 'phone',
        nameKey: 'categoryIcons.phone',
        defaultName: 'Cước điện thoại / 4G',
        lucideName: 'Phone',
        iconComponent: Phone,
        emoji: '📱',
      },
      {
        id: 'tv',
        nameKey: 'categoryIcons.tv',
        defaultName: 'Truyền hình & Thiết bị',
        lucideName: 'Tv',
        iconComponent: Tv,
        emoji: '📺',
      },
    ],
  },
  {
    groupId: 'health',
    groupNameKey: 'categoryIcons.groupHealth',
    defaultGroupName: 'Cá nhân & Y tế',
    icons: [
      {
        id: 'shirt',
        nameKey: 'categoryIcons.clothing',
        defaultName: 'Quần áo & Phụ kiện',
        lucideName: 'Shirt',
        iconComponent: Shirt,
        emoji: '👕',
      },
      {
        id: 'sparkles',
        nameKey: 'categoryIcons.beauty',
        defaultName: 'Mỹ phẩm & Làm đẹp',
        lucideName: 'Sparkles',
        iconComponent: Sparkles,
        emoji: '✨',
      },
      {
        id: 'dumbbell',
        nameKey: 'categoryIcons.fitness',
        defaultName: 'Thể thao & Gym',
        lucideName: 'Dumbbell',
        iconComponent: Dumbbell,
        emoji: '🏋️',
      },
      {
        id: 'pill',
        nameKey: 'categoryIcons.meds',
        defaultName: 'Thuốc men',
        lucideName: 'Pill',
        iconComponent: Pill,
        emoji: '💊',
      },
      {
        id: 'heart-pulse',
        nameKey: 'categoryIcons.hospital',
        defaultName: 'Khám bệnh & Y tế',
        lucideName: 'HeartPulse',
        iconComponent: HeartPulse,
        emoji: '🩺',
      },
      {
        id: 'scissors',
        nameKey: 'categoryIcons.haircut',
        defaultName: 'Cắt tóc & Spa',
        lucideName: 'Scissors',
        iconComponent: Scissors,
        emoji: '✂️',
      },
    ],
  },
  {
    groupId: 'entertainment',
    groupNameKey: 'categoryIcons.groupEntertainment',
    defaultGroupName: 'Giải trí & Xã hội',
    icons: [
      {
        id: 'film',
        nameKey: 'categoryIcons.movies',
        defaultName: 'Phim ảnh & Netflix',
        lucideName: 'Film',
        iconComponent: Film,
        emoji: '🎬',
      },
      {
        id: 'gamepad-2',
        nameKey: 'categoryIcons.gaming',
        defaultName: 'Game & Nạp game',
        lucideName: 'Gamepad2',
        iconComponent: Gamepad2,
        emoji: '🎮',
      },
      {
        id: 'gift',
        nameKey: 'categoryIcons.gifts',
        defaultName: 'Quà tặng & Cưới hỏi',
        lucideName: 'Gift',
        iconComponent: Gift,
        emoji: '🎁',
      },
      {
        id: 'party-popper',
        nameKey: 'categoryIcons.party',
        defaultName: 'Tiệc tùng & Sự kiện',
        lucideName: 'PartyPopper',
        iconComponent: PartyPopper,
        emoji: '🎉',
      },
      {
        id: 'music',
        nameKey: 'categoryIcons.music',
        defaultName: 'Âm nhạc & Spotify',
        lucideName: 'Music',
        iconComponent: Music,
        emoji: '🎵',
      },
      {
        id: 'wine',
        nameKey: 'categoryIcons.bar',
        defaultName: 'Bar & Hẹn hò',
        lucideName: 'Wine',
        iconComponent: Wine,
        emoji: '🍷',
      },
    ],
  },
  {
    groupId: 'finance',
    groupNameKey: 'categoryIcons.groupFinance',
    defaultGroupName: 'Tài chính & Đầu tư',
    icons: [
      {
        id: 'landmark',
        nameKey: 'categoryIcons.bank',
        defaultName: 'Chuyển khoản & Ngân hàng',
        lucideName: 'Landmark',
        iconComponent: Landmark,
        emoji: '🏛️',
      },
      {
        id: 'piggy-bank',
        nameKey: 'categoryIcons.savings',
        defaultName: 'Tiết kiệm',
        lucideName: 'PiggyBank',
        iconComponent: PiggyBank,
        emoji: '🏦',
      },
      {
        id: 'trending-up',
        nameKey: 'categoryIcons.investment',
        defaultName: 'Đầu tư & Chứng khoán',
        lucideName: 'TrendingUp',
        iconComponent: TrendingUp,
        emoji: '📈',
      },
      {
        id: 'wallet',
        nameKey: 'categoryIcons.wallet',
        defaultName: 'Ví tiền mặt',
        lucideName: 'Wallet',
        iconComponent: Wallet,
        emoji: '👛',
      },
      {
        id: 'credit-card',
        nameKey: 'categoryIcons.card',
        defaultName: 'Thẻ tín dụng',
        lucideName: 'CreditCard',
        iconComponent: CreditCard,
        emoji: '💳',
      },
      {
        id: 'coins',
        nameKey: 'categoryIcons.interest',
        defaultName: 'Lãi suất & Tiền thưởng',
        lucideName: 'Coins',
        iconComponent: Coins,
        emoji: '🪙',
      },
    ],
  },
]

/** Flat list of all registered icons for quick lookup */
export const ALL_CATEGORY_ICONS = CATEGORY_ICON_GROUPS.flatMap((g) => g.icons)

/**
 * Maps an icon identifier (Lucide icon name, id, or emoji) to its Lucide component
 */
export const ICON_MAP: Record<string, LucideIcon> = ALL_CATEGORY_ICONS.reduce(
  (acc, item) => {
    acc[item.id] = item.iconComponent
    acc[item.lucideName] = item.iconComponent
    acc[item.emoji] = item.iconComponent
    return acc
  },
  {} as Record<string, LucideIcon>,
)
