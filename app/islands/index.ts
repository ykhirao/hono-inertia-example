/**
 * Island のレジストリ。ここのキーはサーバ側で <Island> に渡す `name` と
 * 一致させること。新しい island を追加するときはここにも追加する。
 */
import { Counter } from './Counter'
import { ThemeToggle } from './ThemeToggle'

export const islands = {
  Counter,
  ThemeToggle
} as const

export type IslandName = keyof typeof islands
