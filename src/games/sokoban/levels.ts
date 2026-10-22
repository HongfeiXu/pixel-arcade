export interface Level { name: string; hint: string; rows: readonly string[]; source?: { pack: 'Microban'; index: number } }
// # 墙，空格 地板，@ 人，$ 箱，. 目标。每关手工布局。
export const LEVELS: readonly Level[] = [
  { name: '轻轻一推', hint: '向右推一下，把木箱放到菱形上。', rows: ['#####', '#@$.#', '#####'] },
  { name: '走近一点', hint: '先走近木箱，再推到菱形上。', rows: ['#######', '#@ $ .#', '#######'] },
  { name: '向上送达', hint: '这次试试向上推。', rows: ['#####', '# . #', '# $ #', '# @ #', '#####'] },
  { name: '绕到后面', hint: '箱子只能推，不能拉。走到它左边吧。', rows: ['#######', '#     #', '# $ . #', '#  @  #', '#######'] },
  { name: '拐个小弯', hint: '先向右推，再绕到箱子下面向上推。', rows: ['#######', '#   . #', '# $   #', '# @   #', '#     #', '#######'] },
  { name: '两份礼物', hint: '一次推一个箱子，两个都要到家。', rows: ['#######', '# . . #', '# $ $ #', '#  @  #', '#######'] },
  { name: '并肩出发', hint: '走到每个箱子左边，向右送到家。', rows: ['########', '#      #', '# $  . #', '#      #', '# $  . #', '# @    #', '########'] },
  { name: '小柱子', hint: '绕开中间的墙，再把箱子送上去。', rows: ['#######', '#   . #', '#  #  #', '# $   #', '# @   #', '#     #', '#######'] },
  { name: '左右小屋', hint: '两个方向都试试，推过头可以撤销。', rows: ['#########', '#       #', '#. $ $ .#', '#  @    #', '#########'] },
  { name: '转弯送礼', hint: '留出绕行的空间，不要推到角落。', rows: ['########', '# .  . #', '#      #', '#  $$  #', '#  @   #', '#      #', '########'] },
  { name: '三位朋友', hint: '一个一个慢慢来，不用着急。', rows: ['#########', '# . . . #', '# $ $ $ #', '#   @   #', '#########'] },
  { name: '小小仓库', hint: '先看看每个箱子要走哪条路。随时可以撤销。', rows: ['########', '# .  . #', '#      #', '# $ #  #', '#   $  #', '#  @   #', '########'] },
  // Microban © David W. Skinner (April 2000), distributed with credit; see docs/sokoban-expansion-verification.md.
  { name: '第13关', hint: '', source: { pack: 'Microban', index: 21 }, rows: ['####', '#  ####', '# . . #', '# $$#@#', '##    #', ' ######'] },
  { name: '第14关', hint: '', source: { pack: 'Microban', index: 2 }, rows: ['######', '#    #', '# #@ #', '# $* #', '# .* #', '#    #', '######'] },
  { name: '第15关', hint: '', source: { pack: 'Microban', index: 56 }, rows: ['#####', '#   ###', '#  $  #', '##* . #', ' #   @#', ' ######'] },
  { name: '第16关', hint: '', source: { pack: 'Microban', index: 4 }, rows: ['########', '#      #', '# .**$@#', '#      #', '#####  #', '    ####'] },
  { name: '第17关', hint: '', source: { pack: 'Microban', index: 1 }, rows: ['####', '# .#', '#  ###', '#*@  #', '#  $ #', '#  ###', '####'] },
  { name: '第18关', hint: '', source: { pack: 'Microban', index: 51 }, rows: ['####', '#  ###', '#    ###', '#  $*@ #', '### .# #', '  #    #', '  ######'] },
  { name: '第19关', hint: '', source: { pack: 'Microban', index: 28 }, rows: ['#####', '#   #', '# @ #', '# $$###', '##. . #', ' #    #', ' ######'] },
  { name: '第20关', hint: '', source: { pack: 'Microban', index: 9 }, rows: ['#####', '#.  ##', '#@$$ #', '##   #', ' ##  #', '  ##.#', '   ###'] },
  { name: '第21关', hint: '', source: { pack: 'Microban', index: 24 }, rows: ['# #####', '  #   #', '###$$@#', '#   ###', '#     #', '# . . #', '#######'] },
  { name: '第22关', hint: '', source: { pack: 'Microban', index: 30 }, rows: ['####', '#  ###', '# $$ #', '#... #', '# @$ #', '#   ##', '#####'] },
  { name: '第23关', hint: '', source: { pack: 'Microban', index: 31 }, rows: ['  ####', ' ##  #', '##@$.##', '# $$  #', '# . . #', '###   #', '  #####'] },
  { name: '第24关', hint: '', source: { pack: 'Microban', index: 3 }, rows: ['  ####', '###  ####', '#     $ #', '# #  #$ #', '# . .#@ #', '#########'] },
]

export interface Board { width: number; height: number; walls: Set<number>; targets: Set<number>; player: number; boxes: number[] }
export function parseLevel(level: Level): Board {
  const width = Math.max(...level.rows.map(row => row.length))
  const walls = new Set<number>(), targets = new Set<number>(), boxes: number[] = []
  let player = -1
  level.rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const cell = row[x] ?? '#', pos = y * width + x
      if (cell === '#') walls.add(pos)
      if (cell === '.' || cell === '*' || cell === '+') targets.add(pos)
      if (cell === '$' || cell === '*') boxes.push(pos)
      if (cell === '@' || cell === '+') player = pos
    }
  })
  return { width, height: level.rows.length, walls, targets, player, boxes }
}
