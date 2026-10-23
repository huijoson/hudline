// H/h/d helmet, F face, K eye, N hair, R/r cape, B/b armour, Y/y hilt,
// S hand, W blade, L legs, O boots; dot is transparent.
export const STAND = ['..hHHd..W.', '.hHHHHd.W.', '.dNFFKF.W.', 'RrNFFFF.W.', 'RRBbBBSyYy', 'RRbBYBB.y.', '.RLL.LL...', '..OO.OO...']
export const WALK_A = ['..hHHd..W.', '.hHHHHd.W.', '.dNFFKF.W.', 'RrNFFFF.W.', 'RRBbBBSyYy', 'RRbBYBB.y.', '.RLL..LL..', '.OO....OO.']
export const WALK_B = ['..hHHd..W.', '.hHHHHd.W.', '.dNFFKF.W.', 'RrNFFFF.W.', 'RRBbBBSyYy', 'RRbBYBB.y.', '.R.LLL....', '...OOO....']
export const ATTACK = ['..hHHd......', '.hHHHHd.....', '.dNFFKF.....', 'RrNFFFF.y...', 'RRBbBBBSYWWW', 'RRbBYBB.y...', '.RLL..LL....', '..OO...OO...']
export const HURT = ['.hHHd.....', 'hHHHHd....', 'dNFFKF...W', 'rNFFFF..W.', 'RRBbBBSY..', 'RRbBYBBy..', 'R.LL.LL...', '..OO..OO..']
export const CHEER = ['..hHHd..W.', '.hHHHHd.W.', '.dNFFKFyYy', 'RrNFFFF.S.', 'RRBbBBBS..', 'RRbBYBB...', '.RLL.LL...', '..OO.OO...']
export const HERO_PALETTE = { H: 0x0058f8, h: 0x3cbcfc, d: 0x0000bc, F: 0xfcd8a8, K: 0x181818, N: 0x881400, R: 0xd82800, r: 0x881400, B: 0x0078f8, b: 0x0058f8, Y: 0xfcbc3c, y: 0xac7c00, S: 0xfcd8a8, W: 0xfcfcfc, L: 0x0000bc, O: 0x503000 }

export const QUEST_ROWS = STAND.length / 2
export const ATTACK_BLADE_LIFT = ATTACK.length - 1 - ATTACK.findIndex(row => row.includes('W'))
