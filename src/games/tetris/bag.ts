import type { PieceType } from './types'
import { ALL_PIECE_TYPES } from './pieces'

/**
 * 5-bag 随机生成器（tetris.md #随机方块生成）
 * 将 5 种方块放入袋中打乱，依次取出，取完重新装包。
 */
export class PieceBag {
  private bag: PieceType[] = []

  constructor() {
    this.refill()
  }

  /** 取出下一个方块类型 */
  next(): PieceType {
    if (this.bag.length === 0) {
      this.refill()
    }
    return this.bag.pop()!
  }

  /** 预览下一个方块类型（不消费） */
  peek(): PieceType {
    if (this.bag.length === 0) {
      this.refill()
    }
    return this.bag[this.bag.length - 1]
  }

  private refill(): void {
    this.bag = [...ALL_PIECE_TYPES]
    // Fisher-Yates 洗牌
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
    }
  }

  /** 序列化（用于存档） */
  serialize(): { bag: PieceType[] } {
    return { bag: [...this.bag] }
  }

  /** 反序列化（用于恢复存档） */
  deserialize(data: { bag: PieceType[] }): void {
    this.bag = [...data.bag]
  }
}
