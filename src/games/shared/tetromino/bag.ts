import type { PieceType } from './types'
import { ALL_PIECE_TYPES } from './pieces'

/**
 * N-bag 随机生成器（tetris.md #随机方块生成）
 * 将方块放入袋中打乱，依次取出，取完重新装包。
 */
export class PieceBag {
  private bag: PieceType[] = []
  private pieceTypes: PieceType[]

  constructor(pieceTypes: PieceType[] = ALL_PIECE_TYPES) {
    this.pieceTypes = pieceTypes
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
    this.bag = [...this.pieceTypes]
    // Fisher-Yates 洗牌
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
    }
  }

  /** 序列化（用于存档） */
  serialize(): { bag: PieceType[]; pieceTypes: PieceType[] } {
    return { bag: [...this.bag], pieceTypes: [...this.pieceTypes] }
  }

  /** 反序列化（用于恢复存档） */
  deserialize(data: { bag: PieceType[]; pieceTypes?: PieceType[] }): void {
    this.bag = [...data.bag]
    if (data.pieceTypes) this.pieceTypes = [...data.pieceTypes]
  }
}
