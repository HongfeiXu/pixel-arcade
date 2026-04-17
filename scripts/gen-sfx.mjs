// 用 jsfxr 根据下方参数生成 public/audio/sfx/*.wav
// 用法：npm run gen-sfx
//
// 参数字段参考 sfxr：
//   wave_type: 0=square 1=sawtooth 2=sine 3=noise
//   p_env_attack / p_env_sustain / p_env_punch / p_env_decay  音量包络
//   p_base_freq                                               基础频率 (0..1)
//   p_freq_limit / p_freq_ramp / p_freq_dramp                 频率滑动
//   p_vib_strength / p_vib_speed                              颤音
//   p_arp_mod / p_arp_speed                                   琶音（音高跳变）
//   p_duty / p_duty_ramp                                      方波占空比
//   p_lpf_* / p_hpf_*                                          低/高通滤波
//   sound_vol                                                 音量
//
// 若某个音效生成出来不满意，可以：
//   1. 打开 https://sfxr.me，调到满意
//   2. 点 "Export" 复制 JSON（或从分享 URL 拿 base58 字符串）
//   3. 替换下方对应条目（完整字段粘进来即可）

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { sfxr } from 'jsfxr'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '../public/audio/sfx')

// 公共默认值 —— jsfxr Params 结构，缺的字段会被下方条目覆盖
const BASE = {
  oldParams: true,
  wave_type: 0,
  p_env_attack: 0,
  p_env_sustain: 0.1,
  p_env_punch: 0,
  p_env_decay: 0.2,
  p_base_freq: 0.3,
  p_freq_limit: 0,
  p_freq_ramp: 0,
  p_freq_dramp: 0,
  p_vib_strength: 0,
  p_vib_speed: 0,
  p_arp_mod: 0,
  p_arp_speed: 0,
  p_duty: 0,
  p_duty_ramp: 0,
  p_repeat_speed: 0,
  p_pha_offset: 0,
  p_pha_ramp: 0,
  p_lpf_freq: 1,
  p_lpf_ramp: 0,
  p_lpf_resonance: 0,
  p_hpf_freq: 0,
  p_hpf_ramp: 0,
  sound_vol: 0.25,
  sample_rate: 44100,
  sample_size: 8,
}

const SFX = {
  // 左右移动：极短方波点击
  'move': {
    wave_type: 0,
    p_env_sustain: 0.02,
    p_env_decay: 0.05,
    p_base_freq: 0.42,
    p_duty: 0.3,
    sound_vol: 0.2,
  },

  // 旋转：与 move 同模板，音高略高 + 微小上扬以示区分
  'rotate': {
    wave_type: 0,
    p_env_sustain: 0.02,
    p_env_decay: 0.05,
    p_base_freq: 0.48,
    p_freq_ramp: 0.15,
    p_duty: 0.3,
    sound_vol: 0.2,
  },

  // 软降：快速下滑锯齿
  'soft-drop': {
    wave_type: 1,
    p_env_sustain: 0.04,
    p_env_decay: 0.1,
    p_base_freq: 0.5,
    p_freq_ramp: -0.35,
    sound_vol: 0.22,
  },

  // 消 1~3 行：powerup 风格，短琶音上扬
  'line-clear': {
    wave_type: 0,
    p_env_attack: 0.02,
    p_env_sustain: 0.12,
    p_env_decay: 0.25,
    p_base_freq: 0.45,
    p_arp_mod: 0.52,
    p_arp_speed: 0.55,
    p_duty: 0.3,
    sound_vol: 0.28,
  },

  // 消 4 行 Tetris：基于 line-clear 拉长 + 轻颤音
  'tetris': {
    wave_type: 0,
    p_env_attack: 0.02,
    p_env_sustain: 0.25,
    p_env_decay: 0.4,
    p_base_freq: 0.45,
    p_arp_mod: 0.55,
    p_arp_speed: 0.45,
    p_vib_strength: 0.12,
    p_vib_speed: 0.4,
    p_duty: 0.3,
    sound_vol: 0.28,
  },

  // 游戏结束：FC 风格下行挂掉音（方波 + 下行琶音 + 轻颤音）
  'game-over': {
    wave_type: 0,
    p_env_attack: 0.0,
    p_env_sustain: 0.4,
    p_env_punch: 0.15,
    p_env_decay: 0.6,
    p_base_freq: 0.28,
    p_freq_ramp: -0.12,
    p_arp_mod: -0.5,
    p_arp_speed: 0.55,
    p_duty: 0.5,
    p_vib_strength: 0.15,
    p_vib_speed: 0.3,
    sound_vol: 0.28,
  },
}

mkdirSync(OUT_DIR, { recursive: true })

for (const [name, override] of Object.entries(SFX)) {
  const params = { ...BASE, ...override }
  const wave = sfxr.toWave(params)
  const outPath = resolve(OUT_DIR, `${name}.wav`)
  writeFileSync(outPath, Buffer.from(wave.wav))
  console.log(`  ${name.padEnd(12)} → ${outPath}  (${wave.wav.length} bytes)`)
}

console.log(`\n✔ ${Object.keys(SFX).length} SFX files generated.`)
