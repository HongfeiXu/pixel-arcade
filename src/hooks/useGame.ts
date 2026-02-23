import { useRef, useState } from 'react'
import type { GameAction, GameState } from '../games/types'

/**
 * 游戏生命周期 Hook — 桥接 React 与 GameInstance
 *
 * 职责：
 * - 创建 / 销毁游戏实例
 * - 将按钮事件转发给游戏实例
 * - 监听游戏事件（分数变化、游戏结束）更新 React 状态
 * - 处理页面可见性变化（切后台自动暂停）
 * - 读写 localStorage（存档、分数、设置）
 *
 * TODO: 游戏逻辑实现后补全
 */
export function useGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state] = useState<GameState>('idle')
  const [score] = useState(0)

  return {
    canvasRef,
    state,
    score,
    start: () => { /* TODO */ },
    pause: () => { /* TODO */ },
    resume: () => { /* TODO */ },
    handleAction: (_action: GameAction) => { /* TODO */ },
  }
}
